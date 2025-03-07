import COS from 'cos-js-sdk-v5';
import cosConfig from '../config/cosConfig';

// 初始化COS实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

/**
 * 上传文件到COS
 * @param {Object} options - 上传选项
 * @param {File} options.file - 要上传的文件
 * @param {string} options.key - 对象键（存储路径）
 * @param {Function} options.onProgress - 上传进度回调
 * @param {Function} options.onSuccess - 上传成功回调
 * @param {Function} options.onError - 上传失败回调
 */
const uploadToCOS = (options) => {
  const { file, key, onProgress, onSuccess, onError } = options;
  
  cos.uploadFile({
    Bucket: cosConfig.Bucket,
    Region: cosConfig.Region,
    Key: key,
    Body: file,
    onProgress: (progressData) => {
      if (onProgress) {
        onProgress(progressData);
      }
    }
  }, function(err, data) {
    if (err) {
      console.error('上传失败', err);
      if (onError) {
        onError(err);
      }
    } else {
      console.log('上传成功', data);
      if (onSuccess) {
        onSuccess(data);
      }
    }
  });
};

export { cos, uploadToCOS }; 