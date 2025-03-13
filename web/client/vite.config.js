import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 注释掉代理配置，使用直接请求
    // proxy: {
    //   '/api': {
    //     target: 'https://photo-kits-api.vencenty.cn',
    //     changeOrigin: true,
    //     rewrite: (path) => path
    //   }
    // }
  }
}) 