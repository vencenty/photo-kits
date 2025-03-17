package model

// Config 配置结构体
type Config struct {
	Server   ServerConfig   `toml:"server"`
	Database DatabaseConfig `toml:"database"`
	Sync     SyncConfig     `toml:"sync"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port int    `toml:"port"`
	Mode string `toml:"mode"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string `toml:"host"`
	Port     int    `toml:"port"`
	User     string `toml:"user"`
	Password string `toml:"password"`
	DBName   string `toml:"dbname"`
}

// SyncConfig 同步配置
type SyncConfig struct {
	Interval      int    `toml:"interval"` // 同步间隔，单位分钟
	MaxWorkers    int    `toml:"max_workers"`
	MaxPhotoTasks int    `toml:"max_photo_tasks"`
	SyncDir       string `toml:"sync_dir"` // 同步目录
}