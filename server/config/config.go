package config

import (
	"fmt"
	"github.com/spf13/viper"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config 应用配置
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	Minio       MinioConfig
	AliyunMinio AliyunMinioConfig
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port int
	Mode string // debug, release, test
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
}

// MinioConfig Minio对象存储配置
type MinioConfig struct {
	Endpoint    string
	AccessKey   string
	SecretKey   string
	UseSSL      bool
	Bucket      string
	ThumbBucket string
}

type AliyunMinioConfig struct {
	Endpoint    string
	AccessKey   string
	SecretKey   string
	UseSSL      bool
	Bucket      string
	ThumbBucket string
}

// GetDSN 获取数据库连接字符串
func (d *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.DBName)
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	var config *Config
	viper.SetConfigName("config")   // 不带扩展名
	viper.SetConfigType("toml")     // 这里指定为 TOML
	viper.AddConfigPath("./config") // 配置文件所在目录

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("读取配置失败: %v", err)
	}

	// 监听配置变更
	// 默认配置
	config = &Config{
		Server: ServerConfig{
			Port: viper.GetInt("server.port"),
			Mode: viper.GetString("server.mode"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("database.host"),
			Port:     viper.GetInt("database.port"),
			User:     viper.GetString("database.user"),
			Password: viper.GetString("database.password"),
			DBName:   viper.GetString("database.dbname"),
		},
		Minio: MinioConfig{
			Endpoint:    viper.GetString("minio.endpoint"),
			AccessKey:   viper.GetString("minio.access_key"),
			SecretKey:   viper.GetString("minio.secret_key"),
			UseSSL:      viper.GetBool("minio.use_ssl"),
			Bucket:      viper.GetString("minio.bucket"),
			ThumbBucket: viper.GetString("minio.thumb_bucket"),
		},
		AliyunMinio: AliyunMinioConfig{
			Endpoint:    viper.GetString("aliyun_minio.endpoint"),
			AccessKey:   viper.GetString("aliyun_minio.access_key"),
			SecretKey:   viper.GetString("aliyun_minio.secret_key"),
			UseSSL:      viper.GetBool("aliyun_minio.use_ssl"),
			Bucket:      viper.GetString("aliyun_minio.bucket"),
			ThumbBucket: viper.GetString("aliyun_minio.thumb_bucket"),
		},
	}

	// 尝试从配置文件加载
	configFile := getEnv("CONFIG_FILE", "config/config.toml")
	if err := loadFromTOML(configFile, config); err != nil {
		log.Printf("警告: 无法从配置文件加载: %v", err)
		log.Println("使用默认配置和环境变量")
	}

	return config
}

// 从TOML文件加载配置
func loadFromTOML(filePath string, config *Config) error {
	// 读取文件内容
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return fmt.Errorf("获取绝对路径失败: %w", err)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %w", err)
	}

	// 简单解析TOML
	lines := strings.Split(string(data), "\n")
	var section string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// 解析节
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = strings.TrimPrefix(strings.TrimSuffix(line, "]"), "[")
			continue
		}

		// 解析键值对
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		// 去除引号
		value = strings.Trim(value, "\"'")

		// 根据节和键设置配置
		switch section {
		case "server":
			switch key {
			case "port":
				if port, err := strconv.Atoi(value); err == nil {
					config.Server.Port = port
				}
			case "mode":
				config.Server.Mode = value
			}
		case "database":
			switch key {
			case "host":
				config.Database.Host = value
			case "port":
				if port, err := strconv.Atoi(value); err == nil {
					config.Database.Port = port
				}
			case "user":
				config.Database.User = value
			case "password":
				config.Database.Password = value
			case "dbname":
				config.Database.DBName = value
			}
		case "minio":
			switch key {
			case "endpoint":
				config.Minio.Endpoint = value
			case "access_key":
				config.Minio.AccessKey = value
			case "secret_key":
				config.Minio.SecretKey = value
			case "use_ssl":
				config.Minio.UseSSL = value == "true"
			case "bucket":
				config.Minio.Bucket = value
			}
		}
	}

	return nil
}

// 辅助函数：从环境变量获取字符串，如果不存在则使用默认值
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// 辅助函数：从环境变量获取整数，如果不存在或无法解析则使用默认值
func getEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
