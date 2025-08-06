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

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface ProgressStep {
  title: string
  description?: string
  duration?: string
  status?: 'pending' | 'loading' | 'completed' | 'error'
}

interface Props {
  progress: number // 0-100
  label?: string
  variant?: 'primary' | 'success' | 'warning' | 'error'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  animated?: boolean
  showPercentage?: boolean
  steps?: ProgressStep[]
  currentStep?: number
  statusMessage?: string
  statusType?: 'info' | 'success' | 'warning' | 'error'
  details?: Record<string, string | number>
  showDetails?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  variant: 'primary',
  size: 'md',
  animated: true,
  showPercentage: false,
  currentStep: 0,
  statusType: 'info',
  showDetails: false,
  rounded: true
})

const containerClass = computed(() => {
  const classes = ['progress-wrapper']
  if (props.size) classes.push(`progress-${props.size}`)
  return classes.join(' ')
})

const trackClass = computed(() => {
  const classes = ['progress-track-base']
  if (props.rounded) classes.push('rounded-full')
  return classes.join(' ')
})

const fillClass = computed(() => {
  const classes = ['progress-fill-base']
  if (props.rounded) classes.push('rounded-full')
  
  // Варианты цветов
  switch (props.variant) {
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
      classes.push('bg-[#5461FF]')
  }
  
  return classes.join(' ')
})

const statusClass = computed(() => {
  const classes = ['status-base']
  
  switch (props.statusType) {
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
})

const isStepLoading = (index: number) => {
  if (!props.steps) return false
  return props.steps[index]?.status === 'loading' || 
         (props.currentStep === index && props.steps[index]?.status !== 'completed')
}

const isStepCompleted = (index: number) => {
  if (!props.steps) return false
  return props.steps[index]?.status === 'completed' || index < props.currentStep
}

const getStepClass = (index: number) => {
  const classes = ['step-base']
  
  if (isStepCompleted(index)) {
    classes.push('step-completed')
  } else if (isStepLoading(index)) {
    classes.push('step-loading')
  } else if (props.steps?.[index]?.status === 'error') {
    classes.push('step-error')
  } else {
    classes.push('step-pending')
  }
  
  return classes.join(' ')
}

const getStepSpinnerVariant = (index: number) => {
  if (props.variant === 'primary') return 'primary'
  return props.variant
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
  color: #5461FF;
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

/* Этапы анализа */
.progress-steps {
  margin-top: 1rem;
  space-y: 0.75rem;
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
  background: #5461FF;
  border-color: #5461FF;
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
  color: #5461FF;
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

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .progress-label,
  .step-title {
    color: #E5E7EB;
  }
  
  .progress-track-base {
    background-color: #374151;
  }
  
  .step-base .step-indicator {
    background: #4B5563;
    border-color: #6B7280;
    color: #E5E7EB;
  }
  
  .progress-details {
    background: #374151;
    border-color: #4B5563;
  }
  
  .detail-key {
    color: #9CA3AF;
  }
  
  .detail-value {
    color: #E5E7EB;
  }
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