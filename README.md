# COS 配置说明

本项目使用腾讯云 COS 进行文件上传。为了保护您的密钥安全，我们将 COS 配置信息单独放在了 `src/config/cosConfig.js` 文件中，并在 `.gitignore` 中忽略了该文件。

## 配置步骤

1. 复制 `src/config/cosConfig.template.js` 文件并重命名为 `src/config/cosConfig.js`
2. 在 `cosConfig.js` 中填入您的腾讯云 COS 配置信息：
   - SecretId: 您的腾讯云 API 密钥 ID
   - SecretKey: 您的腾讯云 API 密钥
   - Bucket: 您的存储桶名称
   - Region: 您的存储桶所在地域（如 ap-shanghai）

## 安全提示

请勿将包含真实密钥的 `cosConfig.js` 文件提交到代码仓库中。 