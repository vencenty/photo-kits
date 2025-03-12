/**
 * 文件上传工具函数
 */

/**
 * 上传文件到服务器
 * @param {Object} options 上传选项
 * @param {File} options.file 要上传的文件
 * @param {string} options.key 文件路径/名称
 * @param {Function} options.onProgress 上传进度回调
 * @param {Function} options.onSuccess 上传成功回调
 * @param {Function} options.onError 上传失败回调
 */
export const uploadToServer = async (options) => {
    const { file, key, onProgress, onSuccess, onError } = options;
    
    try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);
        
        // 如果有key，作为路径前缀
        if (key) {
            const prefix = key.split('/').slice(0, -1).join('/');
            if (prefix) {
                formData.append('prefix', prefix);
            }
        }
        
        // 创建XMLHttpRequest对象
        const xhr = new XMLHttpRequest();
        
        // 监听上传进度
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = event.loaded / event.total;
                onProgress({ percent });
            }
        });
        
        // 处理请求完成
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        onSuccess && onSuccess(response.data);
                    } else {
                        onError && onError(new Error(response.message || '上传失败'));
                    }
                } catch (error) {
                    onError && onError(new Error('解析响应失败'));
                }
            } else {
                onError && onError(new Error(`上传失败，状态码: ${xhr.status}`));
            }
        });
        
        // 处理请求错误
        xhr.addEventListener('error', () => {
            onError && onError(new Error('网络错误'));
        });
        
        // 处理请求中止
        xhr.addEventListener('abort', () => {
            onError && onError(new Error('上传已取消'));
        });
        
        // 发送请求
        xhr.open('POST', 'http://localhost:8484/api/upload');
        xhr.send(formData);
        
    } catch (error) {
        onError && onError(error);
    }
}; 