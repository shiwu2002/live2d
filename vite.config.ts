import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/live2d/',
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
