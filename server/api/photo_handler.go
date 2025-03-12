package api

import (
	"github.com/gin-gonic/gin"
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
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 验证请求数据
	if req.OrderSn == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "订单号不能为空",
		})
		return
	}

	if len(req.Photos) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "照片数据不能为空",
		})
		return
	}

	// 调用服务层处理上传
	resp, err := h.photoService.BatchUploadPhotos(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}
