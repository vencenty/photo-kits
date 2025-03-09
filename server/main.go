package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 设置Gin模式
	gin.SetMode(gin.DebugMode)

	// 创建Gin引擎
	r := gin.Default()

	// 配置CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 静态文件服务
	r.Static("/static", "./static")

	// API路由
	api := r.Group("/api")
	{
		// 认证相关
		api.POST("/login", handleLogin)
		api.POST("/logout", handleLogout)

		// COS临时凭证
		api.GET("/cos/credentials", handleGetCOSCredentials)

		// 订单相关
		orders := api.Group("/orders")
		{
			orders.GET("", handleListOrders)
			orders.GET("/:id", handleGetOrder)
			orders.POST("", handleCreateOrder)
			orders.PUT("/:id", handleUpdateOrder)
			orders.DELETE("/:id", handleDeleteOrder)
		}

		// 照片相关
		photos := api.Group("/photos")
		{
			photos.GET("", handleListPhotos)
			photos.POST("/upload", handleUploadPhoto)
			photos.DELETE("/:id", handleDeletePhoto)
		}

		// 系统设置
		settings := api.Group("/settings")
		{
			settings.GET("", handleGetSettings)
			settings.PUT("", handleUpdateSettings)
		}
	}

	// 启动服务器
	log.Println("服务器启动在 :8080 端口")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("无法启动服务器: %v", err)
	}
}

// 处理登录请求
func handleLogin(c *gin.Context) {
	var loginReq struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 简单的用户验证，实际应用中应该查询数据库并验证密码
	if loginReq.Username == "admin" && loginReq.Password == "admin" {
		c.JSON(http.StatusOK, gin.H{
			"token": "demo-token",
			"user": gin.H{
				"id":       1,
				"username": "admin",
				"name":     "管理员",
				"role":     "admin",
			},
		})
		return
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
}

// 处理登出请求
func handleLogout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "登出成功"})
}

// 获取COS临时凭证
func handleGetCOSCredentials(c *gin.Context) {
	// 实际应用中应该调用腾讯云STS服务获取临时凭证
	c.JSON(http.StatusOK, gin.H{
		"credentials": gin.H{
			"tmpSecretId":  "临时SecretId",
			"tmpSecretKey": "临时SecretKey",
			"sessionToken": "临时SessionToken",
			"expiredTime":  time.Now().Add(2 * time.Hour).Unix(),
		},
		"bucket": "photo-1253541783",
		"region": "ap-shanghai",
	})
}

// 获取订单列表
func handleListOrders(c *gin.Context) {
	// 模拟订单数据
	orders := []gin.H{
		{
			"id":         "ORD100001",
			"customer":   "张三",
			"phone":      "13812345678",
			"date":       "2023-05-15",
			"amount":     235.50,
			"photoCount": 15,
			"status":     "处理中",
		},
		{
			"id":         "ORD100002",
			"customer":   "李四",
			"phone":      "13912345678",
			"date":       "2023-05-14",
			"amount":     180.00,
			"photoCount": 12,
			"status":     "已完成",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"total":  2,
		"orders": orders,
	})
}

// 获取订单详情
func handleGetOrder(c *gin.Context) {
	id := c.Param("id")

	// 模拟订单数据
	order := gin.H{
		"id":            id,
		"customer":      "张三",
		"phone":         "13812345678",
		"address":       "上海市浦东新区张江高科技园区",
		"date":          "2023-05-15",
		"amount":        235.50,
		"status":        "处理中",
		"paymentMethod": "微信支付",
		"paymentStatus": "已支付",
		"remark":        "请尽快处理，谢谢！",
		"photos": []gin.H{
			{
				"id":         "PHOTO1001",
				"name":       "照片1.jpg",
				"size":       "4inch",
				"url":        "https://picsum.photos/id/101/300/200",
				"uploadTime": "2023-05-15 14:30:45",
				"status":     "已处理",
			},
			{
				"id":         "PHOTO1002",
				"name":       "照片2.jpg",
				"size":       "3inch",
				"url":        "https://picsum.photos/id/102/300/200",
				"uploadTime": "2023-05-15 14:31:22",
				"status":     "处理中",
			},
		},
	}

	c.JSON(http.StatusOK, order)
}

// 创建订单
func handleCreateOrder(c *gin.Context) {
	var orderReq struct {
		Customer string   `json:"customer" binding:"required"`
		Phone    string   `json:"phone" binding:"required"`
		Address  string   `json:"address"`
		Remark   string   `json:"remark"`
		Sizes    []string `json:"sizes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&orderReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 模拟创建订单
	newOrder := gin.H{
		"id":            "ORD100003",
		"customer":      orderReq.Customer,
		"phone":         orderReq.Phone,
		"address":       orderReq.Address,
		"date":          time.Now().Format("2006-01-02"),
		"amount":        0.00,
		"status":        "待付款",
		"paymentMethod": "",
		"paymentStatus": "未支付",
		"remark":        orderReq.Remark,
		"photos":        []gin.H{},
	}

	c.JSON(http.StatusCreated, newOrder)
}

// 更新订单
func handleUpdateOrder(c *gin.Context) {
	id := c.Param("id")

	var orderReq struct {
		Customer      string `json:"customer"`
		Phone         string `json:"phone"`
		Address       string `json:"address"`
		Remark        string `json:"remark"`
		Status        string `json:"status"`
		PaymentMethod string `json:"paymentMethod"`
		PaymentStatus string `json:"paymentStatus"`
	}

	if err := c.ShouldBindJSON(&orderReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 模拟更新订单
	updatedOrder := gin.H{
		"id":            id,
		"customer":      orderReq.Customer,
		"phone":         orderReq.Phone,
		"address":       orderReq.Address,
		"date":          "2023-05-15",
		"amount":        235.50,
		"status":        orderReq.Status,
		"paymentMethod": orderReq.PaymentMethod,
		"paymentStatus": orderReq.PaymentStatus,
		"remark":        orderReq.Remark,
	}

	c.JSON(http.StatusOK, updatedOrder)
}

// 删除订单
func handleDeleteOrder(c *gin.Context) {
	id := c.Param("id")

	// 模拟删除订单
	c.JSON(http.StatusOK, gin.H{
		"message": "订单 " + id + " 已删除",
	})
}

// 获取照片列表
func handleListPhotos(c *gin.Context) {
	// 模拟照片数据
	photos := []gin.H{
		{
			"id":         "PHOTO1001",
			"name":       "照片1.jpg",
			"size":       "4inch",
			"url":        "https://picsum.photos/id/101/300/200",
			"uploadTime": "2023-05-15 14:30:45",
			"status":     "已处理",
			"orderId":    "ORD100001",
		},
		{
			"id":         "PHOTO1002",
			"name":       "照片2.jpg",
			"size":       "3inch",
			"url":        "https://picsum.photos/id/102/300/200",
			"uploadTime": "2023-05-15 14:31:22",
			"status":     "处理中",
			"orderId":    "ORD100001",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"total":  2,
		"photos": photos,
	})
}

// 上传照片
func handleUploadPhoto(c *gin.Context) {
	// 获取表单参数
	orderId := c.PostForm("orderId")
	size := c.PostForm("size")

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文件"})
		return
	}

	// 模拟保存文件
	// 实际应用中应该保存文件到磁盘或云存储
	filename := file.Filename

	// 模拟上传照片
	newPhoto := gin.H{
		"id":         "PHOTO1003",
		"name":       filename,
		"size":       size,
		"url":        "https://picsum.photos/id/103/300/200",
		"uploadTime": time.Now().Format("2006-01-02 15:04:05"),
		"status":     "待处理",
		"orderId":    orderId,
	}

	c.JSON(http.StatusCreated, newPhoto)
}

// 删除照片
func handleDeletePhoto(c *gin.Context) {
	id := c.Param("id")

	// 模拟删除照片
	c.JSON(http.StatusOK, gin.H{
		"message": "照片 " + id + " 已删除",
	})
}

// 获取系统设置
func handleGetSettings(c *gin.Context) {
	// 模拟系统设置
	settings := gin.H{
		"siteName":        "照片管理系统",
		"siteDescription": "专业的照片处理和管理平台",
		"contactPhone":    "400-123-4567",
		"contactEmail":    "support@example.com",
		"address":         "上海市浦东新区张江高科技园区",
		"maxUploadSize":   50,
		"allowedFormats":  []string{"jpg", "jpeg", "png", "gif"},
		"defaultPhotoSize": "4inch",
		"enableWatermark":  true,
		"watermarkText":    "照片管理系统",
		"watermarkOpacity": 0.3,
		"storageType":      "cos",
		"cosSecretId":      "AKIDYyBIMI5gBcsx8A1lKfnlV3PSL2Yr7EBB",
		"cosSecretKey":     "******",
		"cosBucket":        "photo-1253541783",
		"cosRegion":        "ap-shanghai",
		"orderPrefix":      "ORD",
		"orderExpireHours": 24,
		"paymentMethods":   []string{"wechat", "alipay", "cash"},
		"defaultPaymentMethod": "wechat",
		"taxRate":             0,
		"enableInvoice":       true,
	}

	c.JSON(http.StatusOK, settings)
}

// 更新系统设置
func handleUpdateSettings(c *gin.Context) {
	var settingsReq map[string]interface{}

	if err := c.ShouldBindJSON(&settingsReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 模拟更新系统设置
	c.JSON(http.StatusOK, gin.H{
		"message":  "设置已更新",
		"settings": settingsReq,
	})
} 