import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': 'http://localhost:5001',
      '/washOrder': 'http://localhost:5001',
      '/waterOrder': 'http://localhost:5001',
      '/transaction': 'http://localhost:5001',
    }
  }
})