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
)

// Minio配置
const (
	MinioEndpoint  = "s3.vencenty.cn"
	MinioAccessKey = "IrBtP7ySGrQf82L22njM"
	MinioSecretKey = "gFUR5eWc47yRDXVNZqwcRVPtEc1veKOPPOXGhmxh"
	MinioUseSSL    = true
	MinioBucket    = "user-photos" // 存储桶名称
)

// 初始化Minio客户端
func initMinioClient() (*minio.Client, error) {
	client, err := minio.New(MinioEndpoint, MinioAccessKey, MinioSecretKey, MinioUseSSL)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// 确保存储桶存在
func ensureBucketExists(client *minio.Client, bucketName string) error {
	exists, err := client.BucketExists(bucketName)
	if err != nil {
		fmt.Println(err)
		return fmt.Errorf("检查存储桶是否存在失败: %w", err)
	}

	if !exists {
		err = client.MakeBucket(bucketName, "")
		if err != nil {
			return fmt.Errorf("创建存储桶失败: %w", err)
		}
		log.Printf("成功创建存储桶: %s", bucketName)

		// 设置存储桶为公共访问
		policy := `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::` + bucketName + `/*"]}]}`
		err = client.SetBucketPolicy(bucketName, policy)
		if err != nil {
			return fmt.Errorf("设置存储桶策略失败: %w", err)
		}
		log.Printf("成功设置存储桶策略为公共访问: %s", bucketName)
	}

	return nil
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
	minioClient *minio.Client
}

// NewUploadHandler 创建上传处理器实例
func NewUploadHandler() (*UploadHandler, error) {
	// 初始化Minio客户端
	minioClient, err := initMinioClient()
	if err != nil {
		return nil, err
	}

	// 确保存储桶存在
	//err = ensureBucketExists(minioClient, MinioBucket)
	//if err != nil {
	//	return nil, err
	//}

	return &UploadHandler{
		minioClient: minioClient,
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

	// 执行上传
	n, err := h.minioClient.PutObject(MinioBucket, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "上传到Minio失败: " + err.Error(),
		})
		return
	}

	// 构建文件URL
	fileURL := fmt.Sprintf("https://%s/%s/%s", MinioEndpoint, MinioBucket, objectName)

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
