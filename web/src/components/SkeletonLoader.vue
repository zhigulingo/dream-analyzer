<template>
  <div class="skeleton-loader" :class="containerClass">
    <!-- Предустановленные типы скелетов -->
    <template v-if="type === 'user-profile'">
      <div class="flex items-center space-x-4 p-4">
        <div class="skeleton-circle w-12 h-12"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton-line h-4 w-3/4"></div>
          <div class="skeleton-line h-3 w-1/2"></div>
        </div>
      </div>
    </template>

    <template v-else-if="type === 'dream-history'">
      <div class="space-y-4">
        <div v-for="i in (count || 3)" :key="i" class="border rounded p-3">
          <div class="flex justify-between items-center mb-2">
            <div class="skeleton-line h-4 w-24"></div>
            <div class="skeleton-line h-3 w-8"></div>
          </div>
          <div class="skeleton-line h-3 w-full"></div>
          <div class="skeleton-line h-3 w-3/4 mt-1"></div>
          <div class="skeleton-line h-3 w-5/6 mt-1"></div>
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

<script>
export default {
  name: 'SkeletonLoader',
  props: {
    type: {
      type: String,
      default: 'line',
      validator: value => ['line', 'circle', 'square', 'user-profile', 'dream-history', 'text-block', 'custom'].includes(value)
    },
    width: {
      type: [String, Number],
      default: ''
    },
    height: {
      type: [String, Number],
      default: ''
    },
    size: {
      type: String,
      default: 'md',
      validator: value => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    lines: {
      type: Number,
      default: 3
    },
    count: {
      type: Number,
      default: 3
    },
    animated: {
      type: Boolean,
      default: true
    },
    rounded: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    containerClass() {
      const classes = ['skeleton-container']
      if (this.animated) {
        classes.push('animate-pulse')
      }
      return classes.join(' ')
    },
    sizeClass() {
      const sizeClasses = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6', 
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
      }
      
      if (this.size) {
        return sizeClasses[this.size]
      }
      return ''
    },
    heightClass() {
      if (this.height) {
        if (typeof this.height === 'number') {
          return `h-${this.height}`
        }
        return this.height.startsWith('h-') ? this.height : `h-[${this.height}]`
      }
      return 'h-4'
    },
    widthClass() {
      if (this.width) {
        if (typeof this.width === 'number') {
          return `w-${this.width}`
        }
        return this.width.startsWith('w-') ? this.width : `w-[${this.width}]`
      }
      return 'w-full'
    }
  },
  methods: {
    getLineWidth(lineIndex, totalLines) {
      // Варьируем ширину линий для более реалистичного вида
      const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3']
      
      if (lineIndex === totalLines) {
        // Последняя строка обычно короче
        return widths[Math.min(lineIndex + 1, widths.length - 1)]
      }
      
      return widths[lineIndex % widths.length] || 'w-full'
    }
  }
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
    rgb(243, 244, 246) 0%, 
    rgb(229, 231, 235) 50%, 
    rgb(243, 244, 246) 100%);
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Утилитарные классы */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.flex-1 { flex: 1 1 0%; }
.space-x-4 > * + * { margin-left: 1rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-4 > * + * { margin-top: 1rem; }

.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-1 { margin-top: 0.25rem; }

.border { border-width: 1px; border-color: #e5e7eb; }
.rounded { border-radius: 0.25rem; }

/* Размеры */
.w-4 { width: 1rem; }
.h-4 { height: 1rem; }
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.w-8 { width: 2rem; }
.h-8 { height: 2rem; }
.w-12 { width: 3rem; }
.h-12 { height: 3rem; }
.w-16 { width: 4rem; }
.h-16 { height: 4rem; }
.w-24 { width: 6rem; }
.w-full { width: 100%; }
.w-1\/2 { width: 50%; }
.w-2\/3 { width: 66.666667%; }
.w-3\/4 { width: 75%; }
.w-4\/5 { width: 80%; }
.w-5\/6 { width: 83.333333%; }
.h-3 { height: 0.75rem; }

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
</style>