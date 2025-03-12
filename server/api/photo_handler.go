package api

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"photo-kits/internal/model"
	"photo-kits/internal/service"
)

// PhotoHandler 照片API处理器
type PhotoHandler struct {
	photoService service.PhotoService
}

// NewPhotoHandler 创建照片处理器实例
func NewPhotoHandler(photoService service.PhotoService) *PhotoHandler {
	return &PhotoHandler{
		photoService: photoService,
	}
}

// BatchUploadPhotos 批量上传照片
func (h *PhotoHandler) BatchUploadPhotos(c *gin.Context) {
	var req model.PhotoUploadRequest

	// 读取请求体
	body, err := c.GetRawData()
	if err != nil {
		log.Printf("读取请求体失败: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "读取请求体失败: " + err.Error(),
		})
		return
	}

	// 打印原始请求数据
	log.Printf("收到的原始请求数据: %s", string(body))

	// 解析JSON
	if err := json.Unmarshal(body, &req); err != nil {
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
