package dao

import (
	"photo-kits/internal/model"
	"photo-kits/pkg/database"
)

// PhotoRepository 照片仓库接口
type PhotoRepository interface {
	CreateOrder(order *model.Order) error
	GetOrderByOrderSN(orderSN string) (*model.Order, error)
	UpdateOrder(order *model.Order) error
	CreatePhotos(photos []*model.Photo) error
	CountPhotosByOrderID(orderID string) (int64, error)
	DeletePhotosByOrderID(orderID uint) error
}

// photoRepository 照片仓库实现
type photoRepository struct{}

// NewPhotoRepository 创建照片仓库实例
func NewPhotoRepository() PhotoRepository {
	return &photoRepository{}
}

// CreateOrder 创建订单
func (r *photoRepository) CreateOrder(order *model.Order) error {
	return database.DB.Create(order).Error
}

// GetOrderByOrderSN 根据订单号获取订单
func (r *photoRepository) GetOrderByOrderSN(orderSN string) (*model.Order, error) {
	var order model.Order
	err := database.DB.Where("order_sn = ?", orderSN).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// UpdateOrder 更新订单信息
func (r *photoRepository) UpdateOrder(order *model.Order) error {
	return database.DB.Model(&model.Order{}).Where("order_sn = ?", order.OrderSN).Updates(map[string]interface{}{
		"reciver_name": order.ReceiverName,
		"remark":       order.Remark,
		"updated_at":   order.UpdatedAt,
	}).Error
}

// CreatePhotos 批量创建照片
func (r *photoRepository) CreatePhotos(photos []*model.Photo) error {
	return database.DB.Create(&photos).Error
}

// CountPhotosByOrderID 统计订单的照片数量
func (r *photoRepository) CountPhotosByOrderID(orderID string) (int64, error) {
	var count int64
	err := database.DB.Model(&model.Photo{}).Where("order_id = ?", orderID).Count(&count).Error
	return count, err
}

// DeletePhotosByOrderID 删除订单关联的所有照片
func (r *photoRepository) DeletePhotosByOrderID(orderID uint) error {
	return database.DB.Where("order_id = ?", orderID).Delete(&model.Photo{}).Error
}
