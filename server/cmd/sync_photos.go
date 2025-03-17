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

// 错误类型定义
type PhotoError struct {
	Type      string // 错误类型：download, convert, system
	Message   string // 错误信息
	Retryable bool   // 是否可重试
	OrderID   uint   // 关联的订单ID
	PhotoURL  string // 关联的照片URL
}

// 错误处理策略
type ErrorStrategy struct {
	MaxRetries int           // 最大重试次数
	RetryDelay time.Duration // 重试延迟
	OnFailure  func(error)   // 失败回调
}

// 订单状态
type OrderStatus struct {
	OrderID    uint
	Status     string
	ErrorCount int
	LastError  error
	RetryCount int
	UpdatedAt  time.Time
}

// 结构化日志
type LogEntry struct {
	Timestamp time.Time
	OrderID   uint
	Operation string
	Status    string
	Error     error
	Details   map[string]interface{}
}

// 监控指标
type Metrics struct {
	TotalOrders    int64
	FailedOrders   int64
	RetryCount     int64
	ProcessingTime time.Duration
	ErrorRates     map[string]float64
}

// 扩展配置结构体
type SyncConfig struct {
	Interval       int           `toml:"interval"` // 同步间隔，单位分钟
	MaxWorkers     int           `toml:"max_workers"`
	MaxPhotoTasks  int           `toml:"max_photo_tasks"`
	MaxRetries     int           `toml:"max_retries"`     // 最大重试次数
	RetryDelay     time.Duration `toml:"retry_delay"`     // 重试延迟
	Timeout        time.Duration `toml:"timeout"`         // 操作超时时间
	MaxConcurrent  int           `toml:"max_concurrent"`  // 最大并发数
	ErrorThreshold int           `toml:"error_threshold"` // 错误阈值
}

// 本地同步目录
const SyncDir = "~/syncData"

// 默认配置
var defaultConfig = SyncConfig{
	Interval:       10,               // 默认10分钟同步一次
	MaxWorkers:     5,                // 默认5个订单处理协程
	MaxPhotoTasks:  10,               // 默认10个照片处理协程
	MaxRetries:     3,                // 默认最大重试3次
	RetryDelay:     5 * time.Second,  // 默认重试延迟5秒
	Timeout:        30 * time.Second, // 默认超时30秒
	MaxConcurrent:  10,               // 默认最大并发10
	ErrorThreshold: 5,                // 默认错误阈值5次
}

// Order 订单结构体
type Order struct {
	ID        uint      `gorm:"primaryKey"`
	OrderSn   string    `gorm:"column:order_sn"`
	Receiver  string    `gorm:"column:receiver"`
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
	syncDir    string
)

// 全局变量
var (
	metrics = &Metrics{
		ErrorRates: make(map[string]float64),
	}
	errorStrategies = make(map[string]ErrorStrategy)
)

func init() {
	flag.BoolVar(&runOnce, "once", false, "只运行一次，不启动定时任务")
	flag.StringVar(&logFile, "log", "", "日志文件路径，默认输出到标准输出")
	flag.StringVar(&configPath, "config", "", "配置文件路径，默认自动查找")
	flag.StringVar(&syncDir, "sync-dir", "/vol2/1000/Sync/user-photos", "同步目录路径，默认为 /vol2/1000/Sync/user-photos")
	flag.Parse()
}

func main() {
	// 设置日志输出
	setupLogger()

	// 初始化错误处理策略
	initErrorStrategies()

	// 检查系统依赖
	if err := checkSystemDependencies(); err != nil {
		log.Fatalf("系统依赖检查失败: %v", err)
	}

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
	log.Printf("同步目录：%v", syncDir)

	// 启动定时任务
	log.Printf("启动定时同步任务，间隔: %d秒", config.Sync.Interval)
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
	logEntry := LogEntry{
		Timestamp: time.Now(),
		Operation: "sync_photos",
		Status:    "started",
		Details:   map[string]interface{}{"config": config},
	}
	logStructured(logEntry)

	// 获取待处理订单
	orders, err := getUnprocessedOrders()
	if err != nil {
		logEntry.Status = "failed"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("get_orders", time.Since(startTime), err)
		return fmt.Errorf("获取待处理订单失败: %v", err)
	}

	if len(orders) == 0 {
		log.Println("没有待处理的订单")
		logEntry.Status = "completed"
		logStructured(logEntry)
		updateMetrics("sync_photos", time.Since(startTime), nil)
		return nil
	}

	log.Printf("找到 %d 个待处理订单", len(orders))

	// 创建订单处理通道
	orderCh := make(chan Order, len(orders))
	errCh := make(chan error, len(orders))

	// 启动订单处理协程
	var wg sync.WaitGroup
	for i := 0; i < config.MaxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for order := range orderCh {
				select {
				case <-ctx.Done():
					log.Printf("订单处理协程 %d: 收到取消信号，停止处理", workerID)
					return
				default:
					log.Printf("订单处理协程 %d: 开始处理订单 %s", workerID, order.OrderSn)
					if err := processOrder(ctx, order, config.MaxPhotoTasks); err != nil {
						log.Printf("订单处理协程 %d: 处理订单 %s 失败: %v", workerID, order.OrderSn, err)
						errCh <- fmt.Errorf("处理订单 %s 失败: %v", order.OrderSn, err)
					} else {
						log.Printf("订单处理协程 %d: 订单 %s 处理完成", workerID, order.OrderSn)
					}
				}
			}
		}(i)
	}

	// 分发订单任务
	for _, order := range orders {
		select {
		case <-ctx.Done():
			log.Println("收到取消信号，停止分发订单任务")
			close(orderCh)
			return fmt.Errorf("任务被取消")
		case orderCh <- order:
			// 订单任务已分发
		}
	}
	close(orderCh)

	// 等待所有订单处理完成
	wg.Wait()
	close(errCh)

	// 收集错误
	var orderErrors []string
	for err := range errCh {
		orderErrors = append(orderErrors, err.Error())
	}

	if len(orderErrors) > 0 {
		err := fmt.Errorf("同步过程中有 %d 个订单处理失败: %s",
			len(orderErrors), strings.Join(orderErrors, "; "))
		logEntry.Status = "completed_with_errors"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("sync_photos", time.Since(startTime), err)
		return err
	}

	logEntry.Status = "completed"
	logStructured(logEntry)
	updateMetrics("sync_photos", time.Since(startTime), nil)
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
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
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
	startTime := time.Now()
	logEntry := LogEntry{
		Timestamp: time.Now(),
		OrderID:   order.ID,
		Operation: "order_processing",
		Status:    "started",
		Details:   map[string]interface{}{"order_sn": order.OrderSn},
	}
	logStructured(logEntry)

	// 获取订单下的所有照片
	photos, err := getOrderPhotos(order.ID)
	if err != nil {
		logEntry.Status = "failed"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("get_photos", time.Since(startTime), err)
		return fmt.Errorf("获取订单照片失败: %v", err)
	}

	log.Printf("订单 %s 有 %d 张照片", order.OrderSn, len(photos))

	// 如果没有照片，直接更新订单状态
	if len(photos) == 0 {
		log.Printf("订单 %s 没有照片，直接标记为已处理", order.OrderSn)
		if err := updateOrderStatus(order.ID); err != nil {
			logEntry.Status = "failed"
			logEntry.Error = err
			logStructured(logEntry)
			updateMetrics("update_status", time.Since(startTime), err)
			return fmt.Errorf("更新订单状态失败: %v", err)
		}
		logEntry.Status = "completed"
		logStructured(logEntry)
		updateMetrics("order_processing", time.Since(startTime), nil)
		return nil
	}

	// 获取当前月份作为目录名
	currentMonth := time.Now().Format("200601")

	// 创建订单目录，使用新的路径结构
	orderDir := expandPath(filepath.Join(syncDir, currentMonth, fmt.Sprintf("【%v】%v", order.OrderSn, order.Receiver)))
	if err := os.MkdirAll(orderDir, 0755); err != nil {
		logEntry.Status = "failed"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("create_directory", time.Since(startTime), err)
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
		logEntry.Status = "failed"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("update_status", time.Since(startTime), err)
		return fmt.Errorf("更新订单状态失败: %v", err)
	}

	if len(photoErrors) > 0 {
		err := fmt.Errorf("订单 %s 处理过程中有 %d 个照片处理失败: %s",
			order.OrderSn, len(photoErrors), strings.Join(photoErrors, "; "))
		logEntry.Status = "completed_with_errors"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("order_processing", time.Since(startTime), err)
		return err
	}

	logEntry.Status = "completed"
	logStructured(logEntry)
	updateMetrics("order_processing", time.Since(startTime), nil)
	return nil
}

// 下载并转换照片
func downloadAndConvertPhoto(photo Photo, sizeDir string, index int) error {
	startTime := time.Now()
	logEntry := LogEntry{
		Timestamp: time.Now(),
		OrderID:   photo.OrderID,
		Operation: "photo_processing",
		Status:    "started",
		Details:   map[string]interface{}{"photo_url": photo.URL},
	}
	logStructured(logEntry)

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
	err := withRetry(func() error {
		return downloadFile(photo.URL, tempPath)
	}, errorStrategies["download"].MaxRetries, errorStrategies["download"].RetryDelay)

	if err != nil {
		logEntry.Status = "failed"
		logEntry.Error = err
		logStructured(logEntry)
		updateMetrics("download", time.Since(startTime), err)
		return fmt.Errorf("下载照片失败: %v", err)
	}

	// 如果不是JPG格式，则转换
	if ext != ".jpg" && ext != ".jpeg" {
		err = withRetry(func() error {
			return convertToJPG(tempPath, finalPath)
		}, errorStrategies["convert"].MaxRetries, errorStrategies["convert"].RetryDelay)

		if err != nil {
			logEntry.Status = "failed"
			logEntry.Error = err
			logStructured(logEntry)
			updateMetrics("convert", time.Since(startTime), err)
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
			logEntry.Status = "failed"
			logEntry.Error = err
			logStructured(logEntry)
			updateMetrics("rename", time.Since(startTime), err)
			return fmt.Errorf("重命名照片失败: %v", err)
		}
	}

	logEntry.Status = "completed"
	logStructured(logEntry)
	updateMetrics("photo_processing", time.Since(startTime), nil)
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

// 初始化错误处理策略
func initErrorStrategies() {
	errorStrategies["download"] = ErrorStrategy{
		MaxRetries: 3,
		RetryDelay: 5 * time.Second,
		OnFailure: func(err error) {
			log.Printf("下载失败: %v", err)
			metrics.FailedOrders++
		},
	}

	errorStrategies["convert"] = ErrorStrategy{
		MaxRetries: 2,
		RetryDelay: 3 * time.Second,
		OnFailure: func(err error) {
			log.Printf("转换失败: %v", err)
			metrics.FailedOrders++
		},
	}

	errorStrategies["system"] = ErrorStrategy{
		MaxRetries: 1,
		RetryDelay: 1 * time.Second,
		OnFailure: func(err error) {
			log.Printf("系统错误: %v", err)
			metrics.FailedOrders++
		},
	}
}

// 检查系统依赖
func checkSystemDependencies() error {
	// 检查 ImageMagick
	if _, err := exec.LookPath("convert"); err != nil {
		return fmt.Errorf("未找到 ImageMagick，请先安装: %v", err)
	}
	return nil
}

// 重试函数
func withRetry(operation func() error, maxRetries int, delay time.Duration) error {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		if err := operation(); err != nil {
			lastErr = err
			metrics.RetryCount++
			log.Printf("操作失败，第%d次重试: %v", i+1, err)
			time.Sleep(delay)
			continue
		}
		return nil
	}
	return fmt.Errorf("重试%d次后仍然失败: %v", maxRetries, lastErr)
}

// 错误类型判断
func isNetworkError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "connection refused") ||
		strings.Contains(err.Error(), "timeout") ||
		strings.Contains(err.Error(), "network")
}

func isConversionError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "convert") ||
		strings.Contains(err.Error(), "ImageMagick")
}

// 错误恢复处理
func recoverFromError(err error, order Order) error {
	switch {
	case isNetworkError(err):
		return handleNetworkError(err, order)
	case isConversionError(err):
		return handleConversionError(err, order)
	default:
		return handleUnknownError(err, order)
	}
}

// 网络错误处理
func handleNetworkError(err error, order Order) error {
	strategy := errorStrategies["download"]
	return withRetry(func() error {
		// 实现重试逻辑
		return nil
	}, strategy.MaxRetries, strategy.RetryDelay)
}

// 转换错误处理
func handleConversionError(err error, order Order) error {
	strategy := errorStrategies["convert"]
	return withRetry(func() error {
		// 实现重试逻辑
		return nil
	}, strategy.MaxRetries, strategy.RetryDelay)
}

// 未知错误处理
func handleUnknownError(err error, order Order) error {
	strategy := errorStrategies["system"]
	return withRetry(func() error {
		// 实现重试逻辑
		return nil
	}, strategy.MaxRetries, strategy.RetryDelay)
}

// 记录结构化日志
func logStructured(entry LogEntry) {
	log.Printf("[%s] OrderID: %d, Operation: %s, Status: %s, Error: %v, Details: %+v",
		entry.Timestamp.Format(time.RFC3339),
		entry.OrderID,
		entry.Operation,
		entry.Status,
		entry.Error,
		entry.Details)
}

// 更新监控指标
func updateMetrics(operation string, duration time.Duration, err error) {
	metrics.TotalOrders++
	if err != nil {
		metrics.FailedOrders++
		metrics.ErrorRates[operation] = float64(metrics.FailedOrders) / float64(metrics.TotalOrders)
	}
	metrics.ProcessingTime += duration
}
