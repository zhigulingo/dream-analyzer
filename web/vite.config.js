import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    // Set environment variables for web application
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://dream-analyzer-bot.vercel.app/api'),
    'import.meta.env.VITE_WEB_LOGIN_API_URL': JSON.stringify('https://dream-analyzer-bot.vercel.app/api/web-login'),
    'import.meta.env.VITE_REFRESH_TOKEN_API_URL': JSON.stringify('https://dream-analyzer-bot.vercel.app/api/refresh-token'),
    'import.meta.env.VITE_LOGOUT_API_URL': JSON.stringify('https://dream-analyzer-bot.vercel.app/api/logout'),
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})