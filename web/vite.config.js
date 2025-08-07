import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    // Set default environment variables if not provided
    'import.meta.env.VITE_WEB_LOGIN_API_URL': JSON.stringify(
      process.env.VITE_WEB_LOGIN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login'
    ),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
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