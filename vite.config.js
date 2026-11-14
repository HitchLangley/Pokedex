import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // "/" when served by our Node server, "/<repo>/" for the static GitHub Pages build
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' }
  },
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
