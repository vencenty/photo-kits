// 系统配置
const settings = {
  // 系统名称
  title: '照片管理系统',
  
  // 系统描述
  description: '专业的照片处理和管理平台',
  
  // 版本号
  version: '0.1.0',
  
  // 版权信息
  copyright: '© 2023 照片管理系统',
  
  // 主题配置
  theme: {
    primaryColor: '#1890ff',
    layout: 'side', // side 或 top
    contentWidth: 'fluid', // fluid 或 fixed
    fixedHeader: true,
    fixedSidebar: true,
    colorWeak: false,
  },
  
  // 路由配置
  routes: [
    {
      path: '/',
      name: '控制台',
      icon: 'dashboard',
    },
    {
      path: '/orders',
      name: '订单管理',
      icon: 'shopping',
    },
    {
      path: '/settings',
      name: '系统设置',
      icon: 'setting',
    },
  ],
};

export default settings; 