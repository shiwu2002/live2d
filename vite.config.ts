import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/live2d/',
  
  // 开发服务器配置
  server: {
    port: 5173,
    proxy: {
      // 代理 API 请求到后端服务器，解决 CORS 问题
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 代理认证接口
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 手动拆分较大的依赖，降低首屏包体积并提升缓存命中
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@pixi/')) return 'pixi'
            if (id.includes('pixi-live2d-display')) return 'live2d'
          }
        }
      }
    }
  }
})
