package api

import (
	"bytes"
	"fmt"
	"github.com/pkg/errors"
	"io"
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
		return nil, errors.Wrapf(err, "minio init err")
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

	// 读取整个文件内容
	fileContent, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取文件内容失败: " + err.Error(),
		})
		return
	}

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

	// 上传原始文件到Minio
	_, err = h.minioClient.PutObject(
		h.config.AliyunMinio.Bucket,
		objectName,
		bytes.NewReader(fileContent),
		int64(len(fileContent)),
		minio.PutObjectOptions{ContentType: contentType},
	)
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
	response := gin.H{
		"success": true,
		"message": "文件上传成功",
		"data": gin.H{
			"filename":    file.Filename,
			"size":        len(fileContent),
			"object_name": objectName,
			"url":         fileURL,
		},
	}

	c.JSON(http.StatusOK, response)
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

	// 调用服务层处理上传
	resp, err := h.photoService.BatchUploadPhotos(&req)
	if err != nil {
		log.Printf("处理上传失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "处理上传失败: " + err.Error(),
		})
		return
	}

	// 打印响应数据
	log.Printf("上传成功: 总照片数=%d", resp.TotalPhotos)

	c.JSON(http.StatusOK, resp)
}
