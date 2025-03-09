import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response) {
      // 处理401未授权错误
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 登录
export const login = (data) => {
  return api.post('/login', data);
};

// 登出
export const logout = () => {
  return api.post('/logout');
};

// 获取COS临时凭证
export const getCOSCredentials = () => {
  return api.get('/cos/credentials');
};

// 获取订单列表
export const getOrders = (params) => {
  return api.get('/orders', { params });
};

// 获取订单详情
export const getOrder = (id) => {
  return api.get(`/orders/${id}`);
};

// 创建订单
export const createOrder = (data) => {
  return api.post('/orders', data);
};

// 更新订单
export const updateOrder = (id, data) => {
  return api.put(`/orders/${id}`, data);
};

// 删除订单
export const deleteOrder = (id) => {
  return api.delete(`/orders/${id}`);
};

// 获取照片列表
export const getPhotos = (params) => {
  return api.get('/photos', { params });
};

// 删除照片
export const deletePhoto = (id) => {
  return api.delete(`/photos/${id}`);
};

// 获取系统设置
export const getSettings = () => {
  return api.get('/settings');
};

// 更新系统设置
export const updateSettings = (data) => {
  return api.put('/settings', data);
};

export default api; 