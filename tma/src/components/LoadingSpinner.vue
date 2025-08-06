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

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'white' | 'dark'
  label?: string
  overlay?: boolean
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  label: '',
  overlay: false,
  centered: false
})

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const variantClasses = {
  primary: 'border-[#5461FF] border-t-transparent',
  secondary: 'border-gray-400 border-t-transparent',
  white: 'border-white border-t-transparent',
  dark: 'border-gray-800 border-t-transparent'
}

const labelSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

const containerClass = computed(() => {
  const classes = []
  if (props.overlay) {
    classes.push('loading-overlay')
  }
  if (props.centered) {
    classes.push('flex flex-col items-center justify-center')
  } else {
    classes.push('inline-flex flex-col items-center')
  }
  return classes.join(' ')
})

const spinnerClass = computed(() => {
  return [
    sizeClasses[props.size],
    'animate-spin rounded-full border-2',
    variantClasses[props.variant]
  ].join(' ')
})

const spinnerStyle = computed(() => {
  return {
    animationDuration: '1s'
  }
})

const labelClass = computed(() => {
  const classes = [labelSizeClasses[props.size], 'mt-2']
  if (props.variant === 'white') {
    classes.push('text-white')
  } else if (props.variant === 'dark') {
    classes.push('text-gray-800')
  } else {
    classes.push('text-gray-600')
  }
  return classes.join(' ')
})
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

/* Доступность */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner,
  .spinner-ring {
    animation-duration: 3s;
  }
}

/* Улучшенная анимация для разных размеров */
.w-3.h-3 .spinner-ring,
.w-4.h-4 .spinner-ring {
  border-width: 1px;
}

.w-8.h-8 .spinner-ring,
.w-12.h-12 .spinner-ring {
  border-width: 3px;
}
</style>