import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    // Set environment variables for web application
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
    ),
    'import.meta.env.VITE_WEB_LOGIN_API_URL': JSON.stringify(
      process.env.VITE_WEB_LOGIN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login'
    ),
    'import.meta.env.VITE_REFRESH_TOKEN_API_URL': JSON.stringify(
      process.env.VITE_REFRESH_TOKEN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token'
    ),
    'import.meta.env.VITE_LOGOUT_API_URL': JSON.stringify(
      process.env.VITE_LOGOUT_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout'
    ),
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})