import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://192.168.1.85:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://192.168.1.85:3000',
        changeOrigin: true,
      },
    },
  },
})
