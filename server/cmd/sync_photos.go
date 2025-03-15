package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/BurntSushi/toml"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// 配置结构体
type Config struct {
	Server   ServerConfig   `toml:"server"`
	Database DatabaseConfig `toml:"database"`
	Sync     SyncConfig     `toml:"sync"`
}

type ServerConfig struct {
	Port int    `toml:"port"`
	Mode string `toml:"mode"`
}

type DatabaseConfig struct {
	Host     string `toml:"host"`
	Port     int    `toml:"port"`
	User     string `toml:"user"`
	Password string `toml:"password"`
	DBName   string `toml:"dbname"`
}

type SyncConfig struct {
	Interval      int `toml:"interval"` // 同步间隔，单位分钟
	MaxWorkers    int `toml:"max_workers"`
	MaxPhotoTasks int `toml:"max_photo_tasks"`
}

// 本地同步目录
const SyncDir = "~/syncData"

// 默认配置
var defaultConfig = SyncConfig{
	Interval:      1,  // 默认1分钟同步一次（仅用于测试）
	MaxWorkers:    5,  // 默认5个订单处理协程
	MaxPhotoTasks: 10, // 默认10个照片处理协程
}

// Order 订单结构体
type Order struct {
	ID        uint      `gorm:"primaryKey"`
	OrderSn   string    `gorm:"column:order_sn"`
	Remark    string    `gorm:"column:remark"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
	Status    int       `gorm:"column:status"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

// TableName 设置表名
func (Order) TableName() string {
	return "orders"
}

// Photo 照片结构体
type Photo struct {
	ID        uint      `gorm:"primaryKey"`
	OrderID   uint      `gorm:"column:order_id"`
	URL       string    `gorm:"column:url"`
	Size      int       `gorm:"column:size"`
	Unit      string    `gorm:"column:unit"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

// TableName 设置表名
func (Photo) TableName() string {
	return "photos"
}

// 数据库连接实例
var DB *gorm.DB

// 命令行参数
var (
	runOnce    bool
	logFile    string
	configPath string
)

func init() {
	flag.BoolVar(&runOnce, "once", false, "只运行一次，不启动定时任务")
	flag.StringVar(&logFile, "log", "", "日志文件路径，默认输出到标准输出")
	flag.StringVar(&configPath, "config", "", "配置文件路径，默认自动查找")
	flag.Parse()
}

func main() {
	// 设置日志输出
	setupLogger()

	// 捕获系统信号
	ctx, cancel := context.WithCancel(context.Background())
	setupSignalHandler(cancel)

	// 加载配置文件
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("加载配置文件失败: %v", err)
	}

	// 应用默认配置
	if config.Sync.Interval <= 0 {
		config.Sync.Interval = defaultConfig.Interval
	}
	if config.Sync.MaxWorkers <= 0 {
		config.Sync.MaxWorkers = defaultConfig.MaxWorkers
	}
	if config.Sync.MaxPhotoTasks <= 0 {
		config.Sync.MaxPhotoTasks = defaultConfig.MaxPhotoTasks
	}

	// 连接数据库
	DB, err = connectDB(config.Database)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// 如果只运行一次
	if runOnce {
		log.Println("开始执行一次性同步任务...")
		if err := syncPhotos(ctx, config.Sync); err != nil {
			log.Fatalf("同步任务失败: %v", err)
		}
		log.Println("一次性同步任务完成")
		return
	}

	// 启动定时任务
	log.Printf("启动定时同步任务，间隔: %d分钟", config.Sync.Interval)
	ticker := time.NewTicker(time.Duration(config.Sync.Interval) * time.Second)
	defer ticker.Stop()

	// 立即执行一次
	if err := syncPhotos(ctx, config.Sync); err != nil {
		log.Printf("同步任务失败: %v", err)
	}

	// 定时执行
	for {
		select {
		case <-ticker.C:
			log.Println("开始执行定时同步任务...")
			if err := syncPhotos(ctx, config.Sync); err != nil {
				log.Printf("同步任务失败: %v", err)
			}
			log.Println("定时同步任务完成")
		case <-ctx.Done():
			log.Println("收到退出信号，停止定时任务")
			return
		}
	}
}

// 设置日志输出
func setupLogger() {
	if logFile != "" {
		f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatalf("无法打开日志文件: %v", err)
		}
		log.SetOutput(f)
	}
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}

// 设置信号处理
func setupSignalHandler(cancel context.CancelFunc) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		log.Println("收到终止信号，准备退出...")
		cancel()
	}()
}

// 同步照片主函数
func syncPhotos(ctx context.Context, config SyncConfig) error {
	startTime := time.Now()
	log.Println("开始同步照片...")

	// 获取未处理的订单
	orders, err := getUnprocessedOrders()
	if err != nil {
		return fmt.Errorf("获取未处理订单失败: %v", err)
	}

	log.Printf("找到 %d 个未处理订单", len(orders))
	if len(orders) == 0 {
		return nil
	}

	// 创建工作池
	var wg sync.WaitGroup
	orderCh := make(chan Order, len(orders))
	errCh := make(chan error, len(orders))

	// 启动工作协程
	for i := 0; i < config.MaxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for order := range orderCh {
				select {
				case <-ctx.Done():
					log.Printf("工作协程 %d: 收到取消信号，停止处理", workerID)
					return
				default:
					log.Printf("工作协程 %d: 开始处理订单 %s", workerID, order.OrderSn)
					if err := processOrder(ctx, order, config.MaxPhotoTasks); err != nil {
						log.Printf("工作协程 %d: 处理订单 %s 失败: %v", workerID, order.OrderSn, err)
						errCh <- fmt.Errorf("处理订单 %s 失败: %v", order.OrderSn, err)
					} else {
						log.Printf("工作协程 %d: 订单 %s 处理完成", workerID, order.OrderSn)
					}
				}
			}
		}(i)
	}

	// 分发订单
	for _, order := range orders {
		select {
		case <-ctx.Done():
			log.Println("收到取消信号，停止分发订单")
			close(orderCh)
			return fmt.Errorf("任务被取消")
		case orderCh <- order:
			// 订单已分发
		}
	}
	close(orderCh)

	// 等待所有工作完成
	wg.Wait()
	close(errCh)

	// 收集错误
	var errs []string
	for err := range errCh {
		errs = append(errs, err.Error())
	}

	if len(errs) > 0 {
		return fmt.Errorf("同步过程中发生 %d 个错误: %s", len(errs), strings.Join(errs, "; "))
	}

	log.Printf("同步完成，耗时: %v", time.Since(startTime))
	return nil
}

// 加载配置文件
func loadConfig() (*Config, error) {
	// 如果指定了配置文件路径
	if configPath != "" {
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			return nil, fmt.Errorf("指定的配置文件不存在: %s", configPath)
		}
		log.Printf("使用指定的配置文件: %s", configPath)
		var config Config
		if _, err := toml.DecodeFile(configPath, &config); err != nil {
			return nil, fmt.Errorf("解析配置文件失败: %v", err)
		}
		return &config, nil
	}

	// 自动查找配置文件
	workDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("获取工作目录失败: %v", err)
	}

	// 尝试多个可能的配置文件路径
	possiblePaths := []string{
		filepath.Join(workDir, "config", "config.toml"),
		filepath.Join(workDir, "..", "config", "config.toml"),
		filepath.Join(workDir, "config.toml"),
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			log.Printf("使用配置文件: %s", path)
			var config Config
			if _, err := toml.DecodeFile(path, &config); err != nil {
				return nil, fmt.Errorf("解析配置文件失败: %v", err)
			}
			return &config, nil
		}
	}

	return nil, fmt.Errorf("找不到配置文件")
}

// 连接数据库
func connectDB(dbConfig DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local&timeout=60s",
		dbConfig.User, dbConfig.Password, dbConfig.Host, dbConfig.Port, dbConfig.DBName)

	// 配置GORM日志
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second, // 慢SQL阈值
			LogLevel:                  logger.Info, // 日志级别
			IgnoreRecordNotFoundError: true,        // 忽略记录未找到错误
			Colorful:                  true,        // 彩色打印
		},
	)

	// 连接数据库
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return nil, err
	}

	// 获取底层SQL DB以配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Printf("成功连接到数据库 %s:%d", dbConfig.Host, dbConfig.Port)
	return db, nil
}

// 获取未处理的订单
func getUnprocessedOrders() ([]Order, error) {
	var orders []Order
	result := DB.Where("status = ?", 0).Find(&orders)
	if result.Error != nil {
		return nil, result.Error
	}
	return orders, nil
}

// 获取订单下的所有照片
func getOrderPhotos(orderID uint) ([]Photo, error) {
	var photos []Photo
	result := DB.Where("order_id = ?", orderID).Find(&photos)
	if result.Error != nil {
		return nil, result.Error
	}
	return photos, nil
}

// 处理单个订单
func processOrder(ctx context.Context, order Order, maxPhotoTasks int) error {
	log.Printf("开始处理订单: %s (ID: %d)", order.OrderSn, order.ID)

	// 获取订单下的所有照片
	photos, err := getOrderPhotos(order.ID)
	if err != nil {
		return fmt.Errorf("获取订单照片失败: %v", err)
	}

	log.Printf("订单 %s 有 %d 张照片", order.OrderSn, len(photos))

	// 如果没有照片，直接更新订单状态
	if len(photos) == 0 {
		log.Printf("订单 %s 没有照片，直接标记为已处理", order.OrderSn)
		return updateOrderStatus(order.ID)
	}

	// 创建订单目录
	orderDir := expandPath(filepath.Join(SyncDir, order.OrderSn))
	if err := os.MkdirAll(orderDir, 0755); err != nil {
		return fmt.Errorf("创建订单目录失败: %v", err)
	}

	// 保存备注信息
	if order.Remark != "" {
		remarkPath := filepath.Join(orderDir, "用户备注.txt")
		if err := os.WriteFile(remarkPath, []byte(order.Remark), 0644); err != nil {
			log.Printf("保存备注信息失败: %v", err)
		}
	}

	// 按尺寸分组照片
	photosBySize := make(map[string][]Photo)
	for _, photo := range photos {
		sizeKey := fmt.Sprintf("%d%s", photo.Size, photo.Unit)
		photosBySize[sizeKey] = append(photosBySize[sizeKey], photo)
	}

	// 处理每个尺寸的照片
	var wg sync.WaitGroup
	errCh := make(chan error, len(photos))

	for sizeKey, sizePhotos := range photosBySize {
		// 创建尺寸目录
		sizeDir := filepath.Join(orderDir, sizeKey)
		if err := os.MkdirAll(sizeDir, 0755); err != nil {
			log.Printf("创建尺寸目录 %s 失败: %v", sizeKey, err)
			continue
		}

		// 创建照片处理通道
		photoCh := make(chan struct {
			photo Photo
			index int
		}, len(sizePhotos))

		// 启动照片处理协程
		workerCount := min(maxPhotoTasks, len(sizePhotos))
		for i := 0; i < workerCount; i++ {
			wg.Add(1)
			go func(workerID int, dir string) {
				defer wg.Done()
				for task := range photoCh {
					select {
					case <-ctx.Done():
						log.Printf("照片处理协程 %d: 收到取消信号，停止处理", workerID)
						return
					default:
						log.Printf("照片处理协程 %d: 开始处理照片 %s", workerID, task.photo.URL)
						if err := downloadAndConvertPhoto(task.photo, dir, task.index); err != nil {
							log.Printf("照片处理协程 %d: 处理照片 %s 失败: %v", workerID, task.photo.URL, err)
							errCh <- fmt.Errorf("处理照片 %s 失败: %v", task.photo.URL, err)
						} else {
							log.Printf("照片处理协程 %d: 照片 %s 处理完成", workerID, task.photo.URL)
						}
					}
				}
			}(i, sizeDir)
		}

		// 分发照片任务
		for i, photo := range sizePhotos {
			select {
			case <-ctx.Done():
				log.Println("收到取消信号，停止分发照片任务")
				close(photoCh)
				return fmt.Errorf("任务被取消")
			case photoCh <- struct {
				photo Photo
				index int
			}{photo, i + 1}:
				// 照片任务已分发
			}
		}
		close(photoCh)
	}

	// 等待所有照片处理完成
	wg.Wait()
	close(errCh)

	// 收集错误
	var photoErrors []string
	for err := range errCh {
		photoErrors = append(photoErrors, err.Error())
	}

	// 即使有照片处理失败，也更新订单状态
	if err := updateOrderStatus(order.ID); err != nil {
		return fmt.Errorf("更新订单状态失败: %v", err)
	}

	if len(photoErrors) > 0 {
		return fmt.Errorf("订单 %s 处理过程中有 %d 个照片处理失败: %s",
			order.OrderSn, len(photoErrors), strings.Join(photoErrors, "; "))
	}

	log.Printf("订单 %s 处理完成", order.OrderSn)
	return nil
}

// 下载并转换照片
func downloadAndConvertPhoto(photo Photo, sizeDir string, index int) error {
	// 从URL中提取文件名
	urlParts := strings.Split(photo.URL, "/")
	originalFilename := urlParts[len(urlParts)-1]

	// 处理文件扩展名
	ext := strings.ToLower(filepath.Ext(originalFilename))
	baseName := fmt.Sprintf("photo_%d", index)

	// 临时文件路径
	tempPath := filepath.Join(sizeDir, baseName+ext)

	// 最终文件路径（JPG格式）
	finalPath := filepath.Join(sizeDir, baseName+".jpg")

	// 下载文件
	log.Printf("下载照片: %s", photo.URL)
	err := downloadFile(photo.URL, tempPath)
	if err != nil {
		return fmt.Errorf("下载照片失败: %v", err)
	}

	// 如果不是JPG格式，则转换
	if ext != ".jpg" && ext != ".jpeg" {
		log.Printf("转换照片格式: %s -> jpg", ext)
		err = convertToJPG(tempPath, finalPath)
		if err != nil {
			return fmt.Errorf("转换照片格式失败: %v", err)
		}

		// 删除原始文件
		if err := os.Remove(tempPath); err != nil {
			log.Printf("删除临时文件 %s 失败: %v", tempPath, err)
		}
	} else {
		// 如果已经是JPG，直接重命名
		err = os.Rename(tempPath, finalPath)
		if err != nil {
			return fmt.Errorf("重命名照片失败: %v", err)
		}
	}

	return nil
}

// 下载文件
func downloadFile(url, filepath string) error {
	// 创建HTTP请求
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("创建HTTP请求失败: %v", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("执行HTTP请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载失败，HTTP状态码: %d", resp.StatusCode)
	}

	// 创建目标文件
	out, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("创建文件失败: %v", err)
	}
	defer out.Close()

	// 写入文件
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("写入文件失败: %v", err)
	}

	return nil
}

// 转换图片为JPG格式
func convertToJPG(inputPath, outputPath string) error {
	// 使用ImageMagick转换图片格式
	cmd := exec.Command("convert", inputPath, outputPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("转换失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// 更新订单状态
func updateOrderStatus(orderID uint) error {
	result := DB.Model(&Order{}).Where("id = ?", orderID).Update("status", 1).Update("updated_at", time.Now())
	return result.Error
}

// 展开路径中的波浪号
func expandPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("获取用户主目录失败: %v", err)
			return path
		}
		return filepath.Join(homeDir, path[2:])
	}
	return path
}

// min函数，返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
