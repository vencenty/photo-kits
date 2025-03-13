/**
 * API请求工具
 * 提供统一的API请求方法
 */

// API基础URL - 可以根据环境变量或其他条件来设置
const API_BASE_URL = 'http://photo-kits-api.vencenty.cn';

/**
 * 发送GET请求
 * @param {string} endpoint - API端点路径（不包含基础URL）
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
export const get = async (endpoint, options = {}) => {
  // 确保endpoint以/开头
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  
  console.log(`发送GET请求到: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * 发送POST请求
 * @param {string} endpoint - API端点路径（不包含基础URL）
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
export const post = async (endpoint, data, options = {}) => {
  // 确保endpoint以/开头
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  
  console.log(`发送POST请求到: ${url}`, data);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * 发送PUT请求
 * @param {string} endpoint - API端点路径（不包含基础URL）
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
export const put = async (endpoint, data, options = {}) => {
  // 确保endpoint以/开头
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  
  console.log(`发送PUT请求到: ${url}`, data);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * 发送DELETE请求
 * @param {string} endpoint - API端点路径（不包含基础URL）
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
export const del = async (endpoint, options = {}) => {
  // 确保endpoint以/开头
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  
  console.log(`发送DELETE请求到: ${url}`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// 默认导出所有API方法
export default {
  get,
  post,
  put,
  delete: del,
}; 