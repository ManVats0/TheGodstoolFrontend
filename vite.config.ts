import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
  plugins: [
    react(),
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
