// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    vue({
      // Enable script setup for better tree-shaking
      script: {
        defineModel: true
      }
    }),
    
    // Gzip compression для assets
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Сжимать файлы больше 1KB
      deleteOriginFile: false
    }),
    
    // Brotli compression для современных браузеров
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // Bundle analyzer для анализа размера
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // 'sunburst', 'treemap', 'network'
    })
  ],
  build: {
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Enable minification
    minify: 'esbuild',
    
    // Source maps for debugging (can be disabled for production)
    sourcemap: false,
    
    // Chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vue ecosystem
          vue: ['vue', 'pinia'],
          
          // Utilities and JWT
          utils: ['axios', 'jsonwebtoken'],
          
          // Separate vendor chunk for build tools
          vendor: ['@vitejs/plugin-vue']
        },
        
        // Optimize chunk filenames for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            // Dynamic imports get descriptive names
            const fileName = facadeModuleId.split('/').pop()?.replace(/\.(vue|js|ts)$/, '') || 'chunk'
            return `chunks/${fileName}-[hash].js`
          }
          return 'chunks/[name]-[hash].js'
        },
        
        // Optimize asset filenames
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info.pop()
          const name = info.join('.')
          
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `styles/${name}-[hash].${ext}`
          }
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(assetInfo.name || '')) {
            return `images/${name}-[hash].${ext}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return `fonts/${name}-[hash].${ext}`
          }
          return `assets/${name}-[hash].${ext}`
        }
      },
      
      // Tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Inline small assets as base64
    assetsInlineLimit: 4096,
    
    // Enable CSS minification
    cssMinify: 'esbuild'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      'pinia',
      'axios',
      'jsonwebtoken'
    ],
    exclude: []
  }
})
