import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // relative base so the build works from any GitHub Pages sub-path
  base: './',
  plugins: [react()],
  build: {
    // antd is a single large-but-cacheable chunk
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks (id) {
          if (/node_modules\/(antd|@ant-design|rc-|@rc-component)/.test(id)) return 'antd'
          if (/node_modules\/(react|react-dom|scheduler|mobx)/.test(id)) return 'vendor'
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false
  }
})
