package service

import (
	"errors"
	"photo-kits/internal/dao"
	"photo-kits/internal/model"
	"strconv"
	"strings"
	"time"
)

// PhotoService 照片服务接口
type PhotoService interface {
	BatchUploadPhotos(req *model.PhotoUploadRequest) (*model.PhotoUploadResponse, error)
}

// photoService 照片服务实现
type photoService struct {
	photoRepo dao.PhotoRepository
}

// NewPhotoService 创建照片服务实例
func NewPhotoService(photoRepo dao.PhotoRepository) PhotoService {
	return &photoService{
		photoRepo: photoRepo,
	}
}

// BatchUploadPhotos 批量上传照片
func (s *photoService) BatchUploadPhotos(req *model.PhotoUploadRequest) (*model.PhotoUploadResponse, error) {
	if req.OrderID == "" {
		return nil, errors.New("订单号不能为空")
	}

	// 检查订单是否存在，不存在则创建
	order, err := s.photoRepo.GetOrderByOrderSN(req.OrderID)
	if err != nil {
		// 创建新订单
		order = &model.Order{
			OrderSN:   req.OrderID,
			Remark:    req.Remark,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := s.photoRepo.CreateOrder(order); err != nil {
			return nil, errors.New("创建订单失败: " + err.Error())
		}
	}

	// 处理照片数据
	var photos []*model.Photo
	totalPhotos := 0

	for _, photoBatch := range req.Photos {
		// 解析尺寸
		size, unit := parseSizeAndUnit(photoBatch.Size, photoBatch.Unit)

		// 添加每个URL对应的照片记录
		for _, url := range photoBatch.URLs {
			if url == "" {
				continue
			}

			photo := &model.Photo{
				OrderID:   req.OrderID,
				URL:       url,
				Size:      size,
				Unit:      unit,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			photos = append(photos, photo)
			totalPhotos++
		}
	}

	// 保存照片记录
	if len(photos) > 0 {
		if err := s.photoRepo.CreatePhotos(photos); err != nil {
			return nil, errors.New("保存照片记录失败: " + err.Error())
		}
	}

	return &model.PhotoUploadResponse{
		Success:     true,
		TotalPhotos: totalPhotos,
		Message:     "照片上传成功",
	}, nil
}

// parseSizeAndUnit 解析尺寸和单位
func parseSizeAndUnit(sizeStr, unitStr string) (int, string) {
	// 如果提供了单位，则使用提供的单位
	if unitStr != "" {
		unit := unitStr
		
		// 处理特殊情况
		if sizeStr == "A4" {
			return 0, "A4"
		}
		
		// 移除"inch"后缀（如果有）
		sizeStr = strings.TrimSuffix(sizeStr, "inch")
		
		// 尝试将尺寸转换为数字
		size, err := strconv.Atoi(sizeStr)
		if err != nil {
			// 如果转换失败，返回默认值
			return 0, unit
		}
		
		return size, unit
	}
	
	// 如果没有提供单位，使用旧的解析逻辑
	return parseSize(sizeStr)
}

// parseSize 解析尺寸字符串，返回尺寸数值和单位（向后兼容）
func parseSize(sizeStr string) (int, string) {
	// 默认单位为"寸"
	unit := "寸"

	// 处理特殊情况
	if sizeStr == "A4" {
		return 0, "A4"
	}

	// 移除"inch"后缀并转换为数字
	sizeStr = strings.TrimSuffix(sizeStr, "inch")
	size, err := strconv.Atoi(sizeStr)
	if err != nil {
		// 如果转换失败，返回默认值
		return 0, unit
	}

	return size, unit
}
