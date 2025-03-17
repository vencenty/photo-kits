package model

import (
	"time"
)

// Order 订单模型
type Order struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	OrderSN   string    `gorm:"column:order_sn;size:128;unique" json:"order_sn"`
	Receiver  string    `gorm:"column:receiver;size:32" json:"receiver"`
	Remark    string    `gorm:"size:255" json:"remark"`
	Status    int       `gorm:"default:0" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Photos    []Photo   `gorm:"foreignKey:OrderID;references:OrderSN" json:"photos,omitempty"`
}

// TableName 指定表名
func (Order) TableName() string {
	return "orders"
}
