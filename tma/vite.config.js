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
    // Set API base URL for TMA application
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