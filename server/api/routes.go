package api

import (
	"log"
	"photo-kits/internal/dao"
	"photo-kits/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter 配置路由
func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 配置CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 设置上传文件大小限制
	r.MaxMultipartMemory = 8 << 20 // 8 MiB

	// 健康检查
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// 初始化依赖

	photoRepo := dao.NewPhotoRepository()
	photoService := service.NewPhotoService(photoRepo)
	photoHandler := NewPhotoHandler(photoService)

	// 初始化上传处理器
	uploadHandler, err := NewUploadHandler()
	if err != nil {
		log.Fatalf("初始化上传处理器失败: %v", err)
	}

	// API路由组
	api := r.Group("/api")

	// 照片相关路由
	photoGroup := api.Group("/photos")
	{
		photoGroup.POST("/batch-upload", photoHandler.BatchUploadPhotos)
	}

	// 文件上传路由
	api.POST("/upload", uploadHandler.UploadFile)

	return r
}
