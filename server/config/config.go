package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
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

// GetDSN 获取数据库连接字符串
func (d *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.DBName)
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	// 默认配置
	config := &Config{
		Server: ServerConfig{
			Port: getEnvAsInt("SERVER_PORT", 8080),
			Mode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 3306),
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "photo-kits"),
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
