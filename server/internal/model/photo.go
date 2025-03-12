package model

import (
	"time"
)

// Photo 照片模型
type Photo struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	OrderID   uint      `gorm:"column:order_id;size:255" json:"order_id"`
	URL       string    `gorm:"column:url;size:255" json:"url"`
	Size      int       `gorm:"column:size" json:"size"`
	Unit      string    `gorm:"column:unit;size:8;default:'寸'" json:"unit"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (Photo) TableName() string {
	return "photos"
}
