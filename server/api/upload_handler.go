package api

import (
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/minio/minio-go"
	"photo-kits/config"
	"photo-kits/internal/model"
	"photo-kits/internal/service"
)

// 初始化Minio客户端
func initMinioClient(cfg *config.Config) (*minio.Client, error) {
	//client, err := minio.New(cfg.Endpoint, cfg.AccessKey, cfg.SecretKey, cfg.UseSSL)
	client, err := minio.New(cfg.AliyunMinio.Endpoint, cfg.AliyunMinio.AccessKey, cfg.AliyunMinio.SecretKey, cfg.AliyunMinio.UseSSL)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// 生成唯一的文件名
func generateUniqueFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	name := filepath.Base(originalFilename)
	name = name[:len(name)-len(ext)]

	// 使用UUID和时间戳生成唯一文件名
	timestamp := time.Now().Format("20060102-150405")
	uuid := uuid.New().String()[:8]

	return fmt.Sprintf("%s-%s-%s%s", name, timestamp, uuid, ext)
}

// UploadHandler 文件上传处理器
type UploadHandler struct {
	minioClient  *minio.Client
	config       *config.Config
	photoService service.PhotoService
}

// NewUploadHandler 创建上传处理器实例
func NewUploadHandler(cfg *config.Config, photoService service.PhotoService) (*UploadHandler, error) {
	// 初始化Minio客户端
	minioClient, err := initMinioClient(cfg)
	if err != nil {
		return nil, err
	}

	return &UploadHandler{
		minioClient:  minioClient,
		config:       cfg,
		photoService: photoService,
	}, nil
}

// UploadFile 上传文件处理
func (h *UploadHandler) UploadFile(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "获取上传文件失败: " + err.Error(),
		})
		return
	}

	// 打开文件
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "打开文件失败: " + err.Error(),
		})
		return
	}
	defer src.Close()

	// 获取自定义路径前缀（如果有）
	prefix := c.DefaultPostForm("prefix", "")

	// 生成唯一的文件名
	filename := generateUniqueFilename(file.Filename)

	// 构建对象名称（可能包含路径前缀）
	var objectName string
	if prefix != "" {
		objectName = prefix + "/" + filename
	} else {
		objectName = filename
	}

	// 获取内容类型
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 上传文件到Minio
	n, err := h.minioClient.PutObject(h.config.AliyunMinio.Bucket, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "上传文件到Oss失败: " + err.Error(),
		})
		return
	}

	// 构建文件URL
	fileURL := fmt.Sprintf("https://%s/%s/%s", h.config.AliyunMinio.Endpoint, h.config.AliyunMinio.Bucket, objectName)

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "文件上传成功",
		"data": gin.H{
			"filename":   file.Filename,
			"size":       n,
			"objectName": objectName,
			"url":        fileURL,
		},
	})
}

// BatchUploadPhotos 批量上传照片处理
func (h *UploadHandler) BatchUploadPhotos(c *gin.Context) {
	var req model.PhotoUploadRequest

	// 读取请求体并解析JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("解析JSON失败: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 打印解析后的请求数据
	log.Printf("解析后的请求数据: %+v", req)

	// 验证请求数据
	if req.OrderSn == "" {
		log.Printf("订单号为空")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "订单号不能为空",
		})
		return
	}

	// 验证收货人姓名
	if req.Receiver == "" {
		log.Printf("收货人姓名为空")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "收货人姓名不能为空",
		})
		return
	}

	if len(req.Photos) == 0 {
		log.Printf("照片数据为空")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "照片数据不能为空",
		})
		return
	}

	// 打印照片数据
	for i, photo := range req.Photos {
		log.Printf("照片[%d]: 尺寸=%d, 单位=%s, URL数量=%d",
			i, photo.Size, photo.Unit, len(photo.URLs))
		if len(photo.URLs) > 0 {
			log.Printf("第一个URL: %s", photo.URLs[0])
		}
	}

	// 调用服务层处理上传
	resp, err := h.photoService.BatchUploadPhotos(&req)
	if err != nil {
		log.Printf("处理上传失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 打印响应数据
	log.Printf("上传成功: 总照片数=%d", resp.TotalPhotos)

	c.JSON(http.StatusOK, resp)
}
