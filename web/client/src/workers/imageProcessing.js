// 图片处理 Web Worker

// 处理图片并返回压缩后的 base64 数据
async function processImage(imageData, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    try {
        // 创建一个离屏 canvas
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d');

        // 创建图片对象
        const img = await createImageBitmap(imageData);

        // 计算缩放比例
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }

        // 设置 canvas 尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 Blob
        const blob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: quality
        });

        // 转换为 base64
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw new Error('图片处理失败: ' + error.message);
    }
}

// 监听主线程消息
self.addEventListener('message', async (e) => {
    try {
        const { id, file, maxWidth, maxHeight, quality } = e.data;
        const result = await processImage(file, maxWidth, maxHeight, quality);
        self.postMessage({ id, result, success: true });
    } catch (error) {
        self.postMessage({ id: e.data.id, error: error.message, success: false });
    }
}); 