import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/live2d/',
  server: {
    proxy: {
      // 代理 API 请求
      '/api': {
        target: 'https://shiwu.shop',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 代理认证请求
      '/auth': {
        target: 'https://shiwu.shop',
        changeOrigin: true,
        secure: true
      },
      // 代理 WebSocket 请求
      '/ws': {
        target: 'wss://shiwu.shop',
        changeOrigin: true,
        secure: true,
        ws: true
      }
    }
  }
})
