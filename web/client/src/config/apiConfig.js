/**
 * API配置文件
 * 集中管理所有API请求的基础URL
 */

// API基础URL
export const API_BASE_URL = 'https://photo-kits-api.vencenty.cn';

// 导出API端点
export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/api/upload`,
  // 可以添加更多API端点
  // PHOTOS: `${API_BASE_URL}/api/photos`,
  // ALBUMS: `${API_BASE_URL}/api/albums`,
  // 等等...
};

// 默认导出API配置
export default {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS
}; 