<template>
  <div class="progress-container" :class="containerClass">
    <!-- Заголовок и общий прогресс -->
    <div v-if="label || showPercentage" class="progress-header">
      <div v-if="label" class="progress-label">{{ label }}</div>
      <div v-if="showPercentage" class="progress-percentage">{{ Math.round(progress) }}%</div>
    </div>

    <!-- Основная прогресс-полоса -->
    <div class="progress-track" :class="trackClass">
      <div 
        class="progress-fill" 
        :class="fillClass"
        :style="{ width: `${progress}%` }"
      >
        <div v-if="animated" class="progress-shimmer"></div>
      </div>
    </div>

    <!-- Этапы анализа -->
    <div v-if="steps && steps.length" class="progress-steps">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="progress-step"
        :class="getStepClass(index)"
      >
        <div class="step-indicator">
          <LoadingSpinner 
            v-if="isStepLoading(index)" 
            size="xs" 
            :variant="getStepSpinnerVariant(index)"
          />
          <div v-else-if="isStepCompleted(index)" class="step-check">✓</div>
          <div v-else class="step-number">{{ index + 1 }}</div>
        </div>
        <div class="step-content">
          <div class="step-title">{{ step.title }}</div>
          <div v-if="step.description" class="step-description">{{ step.description }}</div>
          <div v-if="step.duration && isStepLoading(index)" class="step-duration">
            ~{{ step.duration }}
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщение о статусе -->
    <div v-if="statusMessage" class="progress-status" :class="statusClass">
      {{ statusMessage }}
    </div>

    <!-- Детализированная информация -->
    <div v-if="details && showDetails" class="progress-details">
      <div v-for="(value, key) in details" :key="key" class="detail-item">
        <span class="detail-key">{{ key }}:</span>
        <span class="detail-value">{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import LoadingSpinner from './LoadingSpinner.vue'

export default {
  name: 'ProgressBar',
  components: {
    LoadingSpinner
  },
  props: {
    progress: {
      type: Number,
      default: 0,
      validator: value => value >= 0 && value <= 100
    },
    label: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'primary',
      validator: value => ['primary', 'success', 'warning', 'error'].includes(value)
    },
    size: {
      type: String,
      default: 'md',
      validator: value => ['xs', 'sm', 'md', 'lg'].includes(value)
    },
    animated: {
      type: Boolean,
      default: true
    },
    showPercentage: {
      type: Boolean,
      default: false
    },
    steps: {
      type: Array,
      default: () => []
    },
    currentStep: {
      type: Number,
      default: 0
    },
    statusMessage: {
      type: String,
      default: ''
    },
    statusType: {
      type: String,
      default: 'info',
      validator: value => ['info', 'success', 'warning', 'error'].includes(value)
    },
    details: {
      type: Object,
      default: () => ({})
    },
    showDetails: {
      type: Boolean,
      default: false
    },
    rounded: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    containerClass() {
      const classes = ['progress-wrapper']
      if (this.size) classes.push(`progress-${this.size}`)
      return classes.join(' ')
    },
    trackClass() {
      const classes = ['progress-track-base']
      if (this.rounded) classes.push('rounded-full')
      return classes.join(' ')
    },
    fillClass() {
      const classes = ['progress-fill-base']
      if (this.rounded) classes.push('rounded-full')
      
      // Варианты цветов
      switch (this.variant) {
        case 'success':
          classes.push('bg-green-500')
          break
        case 'warning':
          classes.push('bg-yellow-500')
          break
        case 'error':
          classes.push('bg-red-500')
          break
        default:
          classes.push('bg-blue-600')
      }
      
      return classes.join(' ')
    },
    statusClass() {
      const classes = ['status-base']
      
      switch (this.statusType) {
        case 'success':
          classes.push('text-green-600')
          break
        case 'warning':
          classes.push('text-yellow-600')
          break
        case 'error':
          classes.push('text-red-600')
          break
        default:
          classes.push('text-gray-600')
      }
      
      return classes.join(' ')
    }
  },
  methods: {
    isStepLoading(index) {
      if (!this.steps) return false
      return this.steps[index]?.status === 'loading' || 
             (this.currentStep === index && this.steps[index]?.status !== 'completed')
    },
    isStepCompleted(index) {
      if (!this.steps) return false
      return this.steps[index]?.status === 'completed' || index < this.currentStep
    },
    getStepClass(index) {
      const classes = ['step-base']
      
      if (this.isStepCompleted(index)) {
        classes.push('step-completed')
      } else if (this.isStepLoading(index)) {
        classes.push('step-loading')
      } else if (this.steps?.[index]?.status === 'error') {
        classes.push('step-error')
      } else {
        classes.push('step-pending')
      }
      
      return classes.join(' ')
    },
    getStepSpinnerVariant(index) {
      if (this.variant === 'primary') return 'primary'
      return this.variant
    }
  }
}
</script>

<style scoped>
.progress-container {
  width: 100%;
  user-select: none;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.progress-percentage {
  font-weight: 600;
  color: #2563eb;
  font-size: 0.875rem;
}

/* Размеры прогресс-бара */
.progress-xs .progress-track-base { height: 0.25rem; }
.progress-sm .progress-track-base { height: 0.375rem; }
.progress-md .progress-track-base { height: 0.5rem; }
.progress-lg .progress-track-base { height: 0.75rem; }

.progress-track-base {
  width: 100%;
  background-color: #E5E7EB;
  position: relative;
  overflow: hidden;
}

.progress-fill-base {
  height: 100%;
  transition: width 0.3s ease-in-out;
  position: relative;
  overflow: hidden;
}

.progress-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.rounded-full {
  border-radius: 9999px;
}

.bg-blue-600 { background-color: #2563eb; }
.bg-green-500 { background-color: #10b981; }
.bg-yellow-500 { background-color: #f59e0b; }
.bg-red-500 { background-color: #ef4444; }

/* Этапы анализа */
.progress-steps {
  margin-top: 1rem;
}

.progress-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.step-indicator {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-base .step-indicator {
  border: 2px solid #E5E7EB;
  background: #F9FAFB;
  color: #6B7280;
}

.step-completed .step-indicator {
  background: #10B981;
  border-color: #10B981;
  color: white;
}

.step-loading .step-indicator {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.step-error .step-indicator {
  background: #EF4444;
  border-color: #EF4444;
  color: white;
}

.step-check {
  font-size: 0.875rem;
  font-weight: bold;
}

.step-number {
  font-size: 0.75rem;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-weight: 500;
  color: #1F2937;
  font-size: 0.875rem;
  line-height: 1.25;
}

.step-description {
  color: #6B7280;
  font-size: 0.75rem;
  margin-top: 0.125rem;
  line-height: 1.3;
}

.step-duration {
  color: #2563eb;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-style: italic;
}

/* Статус */
.progress-status {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(134, 142, 150, 0.1);
}

.status-base {}
.text-green-600 { color: #059669; }
.text-yellow-600 { color: #d97706; }
.text-red-600 { color: #dc2626; }
.text-gray-600 { color: #4b5563; }

/* Детали */
.progress-details {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #F9FAFB;
  border-radius: 0.5rem;
  border: 1px solid #E5E7EB;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.detail-key {
  color: #6B7280;
  font-weight: 500;
}

.detail-value {
  color: #1F2937;
  font-weight: 600;
}

/* Анимации доступности */
@media (prefers-reduced-motion: reduce) {
  .progress-fill-base,
  .step-indicator {
    transition: none;
  }
  
  .progress-shimmer {
    animation: none;
  }
}
</style>