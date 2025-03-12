# 照片上传API使用示例

## 批量上传照片

### 请求

```http
POST /api/photos/batch-upload
Content-Type: application/json

{
  "orderId": "42",
  "remark": "这是一个测试订单",
  "photos": [
    {
      "size": "3inch",
      "unit": "inch",
      "urls": ["https://photo-1253541783.cos.ap-shanghai.myqcloud.com/undefined/3inch/测试一下.jpg"]
    },
    {
      "size": "4",
      "unit": "inch",
      "urls": ["https://photo-1253541783.cos.ap-shanghai.myqcloud.com/undefined/4inch/测试一下.jpg"]
    },
    {
      "size": "7inch",
      "unit": "inch",
      "urls": [
        "https://photo-1253541783.cos.ap-shanghai.myqcloud.com/undefined/7inch/20231107-_H5A0028-2.jpg",
        "https://photo-1253541783.cos.ap-shanghai.myqcloud.com/undefined/7inch/20231107-_H5A0021.jpg"
      ]
    },
    {
      "size": "12",
      "unit": "inch",
      "urls": ["https://photo-1253541783.cos.ap-shanghai.myqcloud.com/undefined/A4/测试一下.jpg"]
    }
  ]
}
```

### 响应

```json
{
  "success": true,
  "total_photos": 5,
  "message": "照片上传成功"
}
```

## 数据结构说明

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| orderId | string | 是 | 订单号 |
| remark | string | 否 | 订单备注 |
| photos | array | 是 | 照片数组 |

### photos 数组元素

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| size | string | 是 | 照片尺寸，可以是纯数字或带有"inch"后缀 |
| unit | string | 是 | 尺寸单位，如"inch"、"寸"、"A4"等 |
| urls | array | 是 | 照片URL数组 |

### 响应参数

| 参数名 | 类型 | 说明 |
|-------|------|------|
| success | boolean | 是否成功 |
| total_photos | number | 上传的照片总数 |
| message | string | 响应消息 |

## 注意事项

1. 订单号必须提供，否则会返回错误
2. 如果订单不存在，系统会自动创建新订单
3. 照片尺寸可以是纯数字（如"4"）或带有"inch"后缀（如"3inch"）
4. 单位可以是任意字符串，常用的有"inch"、"寸"、"A4"等
5. 特殊尺寸"A4"会被特殊处理
6. 每个尺寸可以上传多张照片
7. 空URL会被自动忽略 