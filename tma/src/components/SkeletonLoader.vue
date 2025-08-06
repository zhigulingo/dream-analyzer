<template>
  <div class="skeleton-loader" :class="containerClass">
    <!-- Предустановленные типы скелетов -->
    <template v-if="type === 'user-card'">
      <div class="flex items-center space-x-4 p-4">
        <div class="skeleton-circle w-10 h-10"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton-line h-4 w-3/4"></div>
          <div class="skeleton-line h-3 w-1/2"></div>
        </div>
      </div>
    </template>

    <template v-else-if="type === 'dream-card'">
      <div class="space-y-4 p-4">
        <div class="flex justify-between items-center">
          <div class="skeleton-line h-4 w-1/4"></div>
          <div class="skeleton-line h-3 w-16"></div>
        </div>
        <div class="space-y-2">
          <div class="skeleton-line h-3 w-full"></div>
          <div class="skeleton-line h-3 w-5/6"></div>
          <div class="skeleton-line h-3 w-4/5"></div>
        </div>
        <div class="skeleton-line h-6 w-1/3"></div>
      </div>
    </template>

    <template v-else-if="type === 'history-list'">
      <div class="space-y-3">
        <div v-for="i in (count || 3)" :key="i" class="border rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <div class="skeleton-line h-4 w-24"></div>
            <div class="skeleton-line h-3 w-8"></div>
          </div>
          <div class="skeleton-line h-3 w-full"></div>
          <div class="skeleton-line h-3 w-3/4 mt-1"></div>
        </div>
      </div>
    </template>

    <template v-else-if="type === 'text-block'">
      <div class="space-y-2">
        <div v-for="i in (lines || 3)" :key="i" 
             class="skeleton-line h-4" 
             :class="getLineWidth(i, lines || 3)">
        </div>
      </div>
    </template>

    <!-- Кастомный скелет через слоты -->
    <template v-else-if="type === 'custom'">
      <slot />
    </template>

    <!-- Простые примитивы -->
    <template v-else>
      <div v-if="type === 'circle'" 
           class="skeleton-circle" 
           :class="sizeClass">
      </div>
      
      <div v-else-if="type === 'square'" 
           class="skeleton-square" 
           :class="sizeClass">
      </div>
      
      <div v-else 
           class="skeleton-line" 
           :class="[heightClass, widthClass]">
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'line' | 'circle' | 'square' | 'user-card' | 'dream-card' | 'history-list' | 'text-block' | 'custom'
  width?: string | number
  height?: string | number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  lines?: number
  count?: number
  animated?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'line',
  animated: true,
  rounded: true
})

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6', 
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const containerClass = computed(() => {
  const classes = ['skeleton-container']
  if (props.animated) {
    classes.push('animate-pulse')
  }
  return classes.join(' ')
})

const sizeClass = computed(() => {
  if (props.size) {
    return sizeClasses[props.size]
  }
  return ''
})

const heightClass = computed(() => {
  if (props.height) {
    if (typeof props.height === 'number') {
      return `h-${props.height}`
    }
    return props.height.startsWith('h-') ? props.height : `h-[${props.height}]`
  }
  return 'h-4'
})

const widthClass = computed(() => {
  if (props.width) {
    if (typeof props.width === 'number') {
      return `w-${props.width}`
    }
    return props.width.startsWith('w-') ? props.width : `w-[${props.width}]`
  }
  return 'w-full'
})

const getLineWidth = (lineIndex: number, totalLines: number) => {
  // Варьируем ширину линий для более реалистичного вида
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3']
  
  if (lineIndex === totalLines) {
    // Последняя строка обычно короче
    return widths[Math.min(lineIndex + 1, widths.length - 1)]
  }
  
  return widths[lineIndex % widths.length] || 'w-full'
}
</script>

<style scoped>
.skeleton-container {
  user-select: none;
}

.skeleton-line,
.skeleton-circle,
.skeleton-square {
  background: linear-gradient(90deg, 
    rgb(243 244 246) 0%, 
    rgb(229 231 235) 50%, 
    rgb(243 244 246) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-square {
  border-radius: 0.375rem;
}

.skeleton-line {
  border-radius: 0.25rem;
  min-height: 0.75rem;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Темная тема поддержка */
@media (prefers-color-scheme: dark) {
  .skeleton-line,
  .skeleton-circle,
  .skeleton-square {
    background: linear-gradient(90deg, 
      rgb(55 65 81) 0%, 
      rgb(75 85 99) 50%, 
      rgb(55 65 81) 100%);
    background-size: 200% 100%;
  }
}

/* Уменьшенная анимация для людей с ограниченными возможностями */
@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-circle,
  .skeleton-square {
    animation-duration: 3s;
  }
  
  .animate-pulse {
    animation-duration: 3s;
  }
}

/* Адаптивные размеры */
@media (max-width: 640px) {
  .skeleton-line {
    min-height: 0.625rem;
  }
}
</style>