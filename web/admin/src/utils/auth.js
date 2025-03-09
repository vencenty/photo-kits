// 获取token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 设置token
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// 移除token
export const removeToken = () => {
  localStorage.removeItem('token');
};

// 获取用户信息
export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 设置用户信息
export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// 移除用户信息
export const removeUser = () => {
  localStorage.removeItem('user');
};

// 检查是否已登录
export const isLoggedIn = () => {
  return !!getToken();
};

// 登出
export const logout = () => {
  removeToken();
  removeUser();
};

// 登录
export const login = (token, user) => {
  setToken(token);
  setUser(user);
}; 