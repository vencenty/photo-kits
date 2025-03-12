package model

// PhotoUploadRequest 照片上传请求
type PhotoUploadRequest struct {
	OrderID string       `json:"orderId"`
	Remark  string       `json:"remark"`
	Photos  []PhotoBatch `json:"photos"`
}

// PhotoBatch 批量照片信息
type PhotoBatch struct {
	Size string   `json:"size"`
	Unit string   `json:"unit"`
	URLs []string `json:"urls"`
}

// PhotoUploadResponse 照片上传响应
type PhotoUploadResponse struct {
	Success     bool   `json:"success"`
	TotalPhotos int    `json:"total_photos"`
	Message     string `json:"message,omitempty"`
} 