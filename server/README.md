# 照片同步工具

这是一个用于将数据库中的订单和照片数据同步到本地目录的工具。

## 功能

- 从数据库获取未处理的订单（status=0）
- 获取每个订单下的所有照片
- 按照订单号和照片尺寸创建本地目录结构
- 下载照片并转换为JPG格式
- 保存用户备注信息
- 更新订单状态为已处理（status=1）
- 支持多协程并行处理，提高同步效率
- 内置定时任务，无需依赖外部crontab

## 目录结构

同步后的目录结构如下：

```
~/syncData/
  └── 订单号/
      ├── 4寸/
      │   ├── photo_1.jpg
      │   ├── photo_2.jpg
      │   └── ...
      ├── 5寸/
      │   ├── photo_1.jpg
      │   ├── photo_2.jpg
      │   └── ...
      └── 用户备注.txt
```

## 依赖

- Go 1.20 或更高版本
- MySQL 数据库
- GORM ORM库
- ImageMagick（用于图片格式转换）

## 安装 ImageMagick

### macOS

```bash
brew install imagemagick
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install imagemagick
```

### CentOS/RHEL

```bash
sudo yum install imagemagick
```

## 配置

脚本会自动从`server/config/config.toml`文件中读取数据库配置信息。请确保配置文件格式如下：

```toml
# 服务器配置
[server]
port = 8484
mode = "debug"

# 数据库配置
[database]
host = "localhost"
port = 3306
user = "root"
password = "your_password"
dbname = "photo_kits"

# 同步配置
[sync]
interval = 60       # 同步间隔，单位分钟
max_workers = 5     # 订单处理的最大协程数
max_photo_tasks = 10 # 每个订单内照片处理的最大协程数
```

您也可以修改脚本中的同步目录配置：

```go
// 本地同步目录
const SyncDir = "~/syncData"
```

## 命令行参数

脚本支持以下命令行参数：

```
-once      只运行一次，不启动定时任务
-log       指定日志文件路径，默认输出到标准输出
-config    指定配置文件路径，默认自动查找
```

## 编译和运行

```bash
# 安装依赖
go mod tidy

# 编译
go build -o sync_photos cmd/sync_photos.go

# 运行（启动定时任务）
./sync_photos

# 只运行一次
./sync_photos -once

# 指定日志文件
./sync_photos -log sync.log

# 指定配置文件
./sync_photos -config /path/to/config.toml
```

## 并发处理

脚本使用Go协程实现并行处理：

1. 多个订单并行处理，通过`max_workers`控制并发数
2. 每个订单内的照片也并行处理，通过`max_photo_tasks`控制并发数
3. 自动处理协程间的同步和错误收集

## 定时任务

脚本内置定时任务功能，无需依赖外部crontab：

1. 通过配置文件的`interval`参数控制同步间隔
2. 支持优雅退出，可以通过Ctrl+C终止程序
3. 支持只运行一次的模式，适合手动触发或外部调度

## 日志

脚本运行时会输出详细的日志信息，包括：

- 找到的未处理订单数量
- 每个订单的照片数量
- 照片下载和转换过程
- 错误信息（如果有）
- 数据库操作日志
- 协程工作状态
- 任务执行时间统计

## 数据库连接

脚本使用GORM连接数据库，提供以下功能：

- 自动连接池管理
- 日志记录
- 模型映射
- 事务支持

## 错误处理

脚本包含完善的错误处理机制：

- 每个协程的错误都会被收集并记录
- 即使部分照片处理失败，其他照片仍会继续处理
- 所有错误会在任务结束时汇总报告
- HTTP请求增加超时设置，避免长时间阻塞

## 故障排除

如果遇到问题，请检查：

1. 配置文件路径是否正确
2. 数据库连接配置是否正确
3. 是否安装了 ImageMagick
4. 同步目录是否有写入权限
5. 网络连接是否正常（用于下载照片）
6. 日志文件是否有详细错误信息 