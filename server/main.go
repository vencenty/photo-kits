package main

import (
	"fmt"
	"log"
	"photo-kits/api"
	"photo-kits/config"
	"photo-kits/pkg/database"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()
	fmt.Println(cfg)
	log.Printf("配置加载完成，数据库连接: %s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)

	// 设置Gin模式
	if cfg.Server.Mode != "" {
		fmt.Printf("Running in %s mode\n", cfg.Server.Mode)
	}

	// 初始化数据库连接
	if err := database.InitDB(&cfg.Database); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer database.CloseDB()

	// 设置路由
	r := api.SetupRouter(cfg)

	// 启动服务器
	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Server.Port)
	fmt.Printf("服务器启动在 http://%s\n", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
