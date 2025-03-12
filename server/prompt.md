# 照片上传与管理系统重建指南

## 项目概述

创建一个完整的照片上传与管理系统，包括前端和后端。该系统允许用户上传照片，管理照片，并将照片同步到本地目录。系统分为客户端和管理端两个部分。

## 技术栈

### 后端
- 语言：Go
- Web框架：Gin
- 数据库：MySQL
- ORM：GORM
- 对象存储：MinIO
- 配置管理：TOML

### 前端
- 框架：React
- UI库：Ant Design
- 状态管理：React Hooks
- 路由：React Router
- HTTP客户端：Axios

## 数据库设计

### 订单表 (orders)
```sql
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_sn` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0未处理，1已下载到本地。',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order` (`order_sn`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 照片表 (photos)
```sql
CREATE TABLE `photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` int DEFAULT NULL,
  `unit` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '寸' COMMENT '英寸',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 后端架构

### 目录结构
```
server/
├── api/                  # API处理器
│   ├── photo_handler.go  # 照片相关API
│   ├── upload_handler.go # 上传相关API
│   └── routes.go         # 路由配置
├── cmd/                  # 命令行工具
│   └── sync_photos.go    # 照片同步工具
├── config/               # 配置文件
│   └── config.toml       # 主配置文件
├── internal/             # 内部包
│   ├── model/            # 数据模型
│   ├── service/          # 业务逻辑
│   └── utils/            # 工具函数
├── main.go               # 主入口
└── go.mod                # Go模块文件
```

### 核心功能

1. **照片上传**
   - 支持单文件上传
   - 支持分块上传大文件
   - 上传进度显示
   - 文件类型验证

2. **照片管理**
   - 按订单分组照片
   - 照片尺寸分类
   - 照片状态管理

3. **数据同步**
   - 将照片同步到本地目录
   - 按订单号和尺寸组织目录结构
   - 转换所有照片为JPG格式
   - 更新订单状态

## 前端架构

### 目录结构
```
web/
├── client/              # 客户端
│   ├── public/          # 静态资源
│   └── src/             # 源代码
│       ├── components/  # 组件
│       ├── pages/       # 页面
│       ├── utils/       # 工具函数
│       ├── App.jsx      # 主应用
│       └── index.jsx    # 入口文件
└── admin/               # 管理端
    ├── public/          # 静态资源
    └── src/             # 源代码
        ├── components/  # 组件
        ├── pages/       # 页面
        ├── utils/       # 工具函数
        ├── App.jsx      # 主应用
        └── index.jsx    # 入口文件
```

### 核心功能

1. **客户端**
   - 照片上传界面
   - 上传进度显示
   - 订单信息填写
   - 上传完成确认页

2. **管理端**
   - 订单列表查看
   - 照片管理
   - 订单状态更新
   - 数据统计

## API设计

### 上传相关
- `POST /api/upload` - 普通文件上传
- `POST /api/upload/chunk/init` - 初始化分块上传
- `POST /api/upload/chunk/upload` - 上传文件块
- `POST /api/upload/chunk/complete` - 完成分块上传

### 照片相关
- `POST /api/photos/batch-upload` - 批量上传照片信息
- `GET /api/photos` - 获取照片列表
- `GET /api/photos/:id` - 获取单个照片详情
- `PUT /api/photos/:id` - 更新照片信息
- `DELETE /api/photos/:id` - 删除照片

### 订单相关
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取单个订单详情
- `PUT /api/orders/:id` - 更新订单信息
- `DELETE /api/orders/:id` - 删除订单

## 实现细节

### 照片上传流程
1. 前端检查文件大小
2. 小于5MB的文件直接上传
3. 大于5MB的文件使用分块上传
   - 初始化上传获取uploadId
   - 将文件分割成2MB的块
   - 并行上传所有块
   - 所有块上传完成后，调用完成接口

### 照片同步流程
1. 获取所有未处理订单(status=0)
2. 获取每个订单下的所有照片
3. 按照订单号和照片尺寸创建本地目录结构
4. 下载照片并转换为JPG格式
5. 保存用户备注信息
6. 更新订单状态为已处理(status=1)

## 错误处理

1. **前端错误处理**
   - 网络请求错误提示
   - 表单验证错误提示
   - 上传失败重试机制

2. **后端错误处理**
   - 请求参数验证
   - 数据库错误处理
   - 文件操作错误处理
   - 日志记录

## 部署指南

### 后端部署
1. 安装Go环境
2. 配置MySQL数据库
3. 安装MinIO对象存储
4. 配置config.toml文件
5. 编译并运行服务

### 前端部署
1. 安装Node.js环境
2. 安装依赖: `npm install`
3. 构建生产版本: `npm run build`
4. 使用Nginx部署静态文件

## 扩展功能

1. **用户认证**
   - 添加用户登录/注册
   - 权限控制

2. **照片处理**
   - 照片裁剪
   - 照片滤镜
   - 照片批量处理

3. **订单管理**
   - 订单状态跟踪
   - 订单通知
   - 订单导出

4. **数据备份**
   - 自动备份机制
   - 数据恢复功能 