import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-serve-json',
      closeBundle() {
        copyFileSync('serve.json', 'dist/serve.json')
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/auth': {
        target: process.env.VITE_AUTH_URL || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
