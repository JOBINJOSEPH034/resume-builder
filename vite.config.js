import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html'],
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@sentry/react', 'lucide-react', 'mammoth', 'pdfjs-dist'],
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: false,
    hmr: false,
    watch: {
      ignored: ['**/venv/**', '**/.git/**', '**/.runtime/**', '**/server/staticfiles/**'],
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8010',
        changeOrigin: true,
      }
    }
  }
})
