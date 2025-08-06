<template>
  <div class="loading-spinner-container" :class="containerClass">
    <div class="loading-spinner" :class="spinnerClass" :style="spinnerStyle">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    </div>
    <div v-if="label" class="loading-label" :class="labelClass">
      {{ label }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    size: {
      type: String,
      default: 'md',
      validator: value => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    variant: {
      type: String,
      default: 'primary',
      validator: value => ['primary', 'secondary', 'white', 'dark'].includes(value)
    },
    label: {
      type: String,
      default: ''
    },
    overlay: {
      type: Boolean,
      default: false
    },
    centered: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    containerClass() {
      const classes = []
      if (this.overlay) {
        classes.push('loading-overlay')
      }
      if (this.centered) {
        classes.push('flex flex-col items-center justify-center')
      } else {
        classes.push('inline-flex flex-col items-center')
      }
      return classes.join(' ')
    },
    spinnerClass() {
      const sizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
      }
      
      const variantClasses = {
        primary: 'border-blue-600 border-t-transparent',
        secondary: 'border-gray-400 border-t-transparent',
        white: 'border-white border-t-transparent',
        dark: 'border-gray-800 border-t-transparent'
      }
      
      return [
        sizeClasses[this.size],
        'animate-spin rounded-full border-2',
        variantClasses[this.variant]
      ].join(' ')
    },
    spinnerStyle() {
      return {
        animationDuration: '1s'
      }
    },
    labelClass() {
      const labelSizeClasses = {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
      }
      
      const classes = [labelSizeClasses[this.size], 'mt-2']
      if (this.variant === 'white') {
        classes.push('text-white')
      } else if (this.variant === 'dark') {
        classes.push('text-gray-800')
      } else {
        classes.push('text-gray-600')
      }
      return classes.join(' ')
    }
  }
}
</script>

<style scoped>
.loading-spinner-container {
  user-select: none;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  position: relative;
}

.spinner-ring {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 50%;
  width: 100%;
  height: 100%;
  animation: pulse 2s ease-in-out infinite;
}

.spinner-ring:nth-child(1) {
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  animation-delay: 0.2s;
}

.spinner-ring:nth-child(3) {
  animation-delay: 0.4s;
}

.spinner-ring:nth-child(4) {
  animation-delay: 0.6s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Анимация спиннера */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Размеры */
.w-3 { width: 0.75rem; }
.h-3 { height: 0.75rem; }
.w-4 { width: 1rem; }
.h-4 { height: 1rem; }
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.w-8 { width: 2rem; }
.h-8 { height: 2rem; }
.w-12 { width: 3rem; }
.h-12 { height: 3rem; }

/* Цвета границ */
.border-blue-600 { border-color: #2563eb; }
.border-gray-400 { border-color: #9ca3af; }
.border-white { border-color: white; }
.border-gray-800 { border-color: #1f2937; }
.border-t-transparent { border-top-color: transparent; }

/* Текст */
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-white { color: white; }
.text-gray-600 { color: #4b5563; }
.text-gray-800 { color: #1f2937; }

/* Flexbox */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.inline-flex { display: inline-flex; }

/* Отступы */
.mt-2 { margin-top: 0.5rem; }

/* Доступность */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner,
  .spinner-ring,
  .animate-spin {
    animation-duration: 3s;
  }
}
</style>