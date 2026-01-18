<template>
  <div class="dynamics-chart-container">
    <!-- Swipeable chart area -->
    <div 
      class="chart-wrapper"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <transition :name="transitionName" mode="out-in">
        <div :key="currentIndex" class="chart-content bg-white/10 rounded-2xl p-5 border border-white/5 backdrop-blur-sm">
          <!-- Chart Title -->
          <div class="text-lg font-bold mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">📊</span>
              <span>{{ currentMetric.category || currentMetric.metric }}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-2xl font-bold leading-none">{{ currentValues[currentValues.length - 1] }}%</span>
              <span class="text-[10px] uppercase tracking-wider opacity-50 mt-1">текущий уровень</span>
            </div>
          </div>
          
          <!-- SVG Chart -->
          <div class="chart-svg-container my-6">
            <!-- Y-axis labels -->
            <div class="y-axis-labels pr-2 border-r border-white/10 mr-2">
              <span class="y-label">{{ yAxisScale.labels[0] }}%</span>
              <span class="y-label text-[10px]">{{ yAxisScale.labels[1] }}%</span>
              <span class="y-label">{{ yAxisScale.labels[2] }}%</span>
            </div>
            
            <!-- Chart SVG -->
            <div class="chart-svg-wrapper flex-1">
              <svg 
                :viewBox="`0 0 ${chartWidth} ${chartHeight}`" 
                class="chart-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <!-- Grid lines -->
                <line 
                  v-for="i in 3" 
                  :key="`grid-${i}`"
                  :x1="0" 
                  :x2="chartWidth" 
                  :y1="(chartHeight / 2) * (i - 1)" 
                  :y2="(chartHeight / 2) * (i - 1)"
                  stroke="white" 
                  stroke-opacity="0.08" 
                  stroke-width="1"
                />
                
                <!-- Data line -->
                <polyline 
                  :points="linePoints" 
                  fill="none" 
                  stroke="url(#chartGradient)" 
                  stroke-width="3" 
                  stroke-linejoin="round" 
                  stroke-linecap="round"
                />
                
                <!-- Data points with glow -->
                <circle 
                  v-for="(point, idx) in dataPoints" 
                  :key="`point-${idx}`"
                  :cx="point.x" 
                  :cy="point.y" 
                  r="3.5" 
                  fill="white"
                  class="chart-point"
                />

                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#FFD700" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          <!-- Analysis and Insight -->
          <div class="space-y-4">
            <div v-if="currentMetric.analysis" class="dynamics-analysis">
              <p class="text-base opacity-90 leading-relaxed font-medium">{{ currentMetric.analysis }}</p>
            </div>
            <div v-if="currentMetric.insight" class="insight-box bg-white/5 rounded-xl p-4 border-l-4 border-yellow-400/60">
              <div class="flex gap-3">
                <span class="text-xl">💡</span>
                <p class="text-sm opacity-95 leading-snug italic">{{ currentMetric.insight }}</p>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
    
    <!-- Pagination dots -->
    <div class="pagination-dots">
      <button
        v-for="(metric, idx) in dynamics"
        :key="`dot-${idx}`"
        class="dot"
        :class="{ active: idx === currentIndex }"
        @click="goToIndex(idx)"
      >
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DynamicMetric {
  metric: string
  values: number[]
  interpretation: string
}

const props = defineProps<{
  dynamics: DynamicMetric[]
  userAge?: string // e.g., "25-34"
  userGender?: string // "male" or "female"
}>()

const currentIndex = ref(0)
const touchStartX = ref(0)
const touchEndX = ref(0)
const transitionName = ref('slide-left')

const chartWidth = 300
const chartHeight = 80
const padding = 6 // padding to prevent clipping circles

const currentMetric = computed(() => props.dynamics[currentIndex.value] || { metric: '', values: [], interpretation: '' })
const currentValues = computed(() => currentMetric.value.values || [])

// Dynamic Y-axis scale based on ALL data across all metrics
const yAxisScale = computed(() => {
  if (!props.dynamics || props.dynamics.length === 0) {
    return { min: 0, max: 10, labels: [10, 5, 0] }
  }
  
  // Collect all values from all metrics
  const allValues: number[] = []
  props.dynamics.forEach(metric => {
    if (Array.isArray(metric.values)) {
      allValues.push(...metric.values)
    }
  })
  
  if (allValues.length === 0) {
    return { min: 0, max: 10, labels: [10, 5, 0] }
  }
  
  const min = Math.floor(Math.min(...allValues))
  const max = Math.ceil(Math.max(...allValues))
  
  // Calculate 3 labels (top, middle, bottom)
  const labels = [
    max,
    Math.round((max + min) / 2),
    min
  ]
  
  return { min, max, labels }
})

// Demographic norms (approximate averages by age/gender)
const demographicNorm = computed(() => {
  const metric = currentMetric.value.metric
  if (!props.userAge || !props.userGender) return null
  
  // Simplified demographic norms for HVdC metrics
  // These would ideally come from a database
  const norms: Record<string, Record<string, Record<string, number>>> = {
    'Персонажи': {
      '18-24': { male: 6.5, female: 7.0 },
      '25-34': { male: 6.0, female: 6.5 },
      '35-44': { male: 5.5, female: 6.0 },
      '45+': { male: 5.0, female: 5.5 }
    },
    'Эмоции': {
      '18-24': { male: 6.0, female: 7.0 },
      '25-34': { male: 5.5, female: 6.5 },
      '35-44': { male: 5.0, female: 6.0 },
      '45+': { male: 4.5, female: 5.5 }
    },
    'Действия': {
      '18-24': { male: 7.0, female: 6.5 },
      '25-34': { male: 6.5, female: 6.0 },
      '35-44': { male: 6.0, female: 5.5 },
      '45+': { male: 5.5, female: 5.0 }
    },
    'Сцены': {
      '18-24': { male: 6.5, female: 6.5 },
      '25-34': { male: 6.0, female: 6.0 },
      '35-44': { male: 5.5, female: 5.5 },
      '45+': { male: 5.0, female: 5.0 }
    }
  }
  
  const ageNorms = norms[metric]?.[props.userAge]
  if (!ageNorms) return null
  
  const normValue = ageNorms[props.userGender]
  if (normValue === undefined) return null
  
  return normValue
})

// Calculate demographic zone Y position
const demographicZoneY = computed(() => {
  const norm = demographicNorm.value
  if (norm === null) return null
  
  const { min, max } = yAxisScale.value
  const innerHeight = chartHeight - padding * 2
  const normalizedValue = (norm - min) / (max - min)
  
  return padding + innerHeight - normalizedValue * innerHeight
})

// Calculate line points for SVG with padding and dynamic scale
const dataPoints = computed(() => {
  const values = currentValues.value
  if (values.length === 0) return []
  
  const { min, max } = yAxisScale.value
  const innerWidth = chartWidth - padding * 2
  const innerHeight = chartHeight - padding * 2
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0
  
  return values.map((val, idx) => {
    const normalizedValue = (val - min) / (max - min)
    return {
      x: padding + idx * stepX,
      y: padding + innerHeight - normalizedValue * innerHeight
    }
  })
})

const linePoints = computed(() => {
  return dataPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})

// Touch handlers for swipe navigation
function handleTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0].clientX
}

function handleTouchMove(e: TouchEvent) {
  touchEndX.value = e.touches[0].clientX
}

function handleTouchEnd() {
  const diff = touchStartX.value - touchEndX.value
  const threshold = 50 // minimum swipe distance
  
  if (Math.abs(diff) > threshold) {
    if (diff > 0 && currentIndex.value < props.dynamics.length - 1) {
      // Swipe left - next
      transitionName.value = 'slide-left'
      currentIndex.value++
      triggerHaptic()
    } else if (diff < 0 && currentIndex.value > 0) {
      // Swipe right - previous
      transitionName.value = 'slide-right'
      currentIndex.value--
      triggerHaptic()
    }
  }
  
  touchStartX.value = 0
  touchEndX.value = 0
}

function goToIndex(idx: number) {
  if (idx === currentIndex.value) return
  transitionName.value = idx > currentIndex.value ? 'slide-left' : 'slide-right'
  currentIndex.value = idx
  triggerHaptic()
}

function triggerHaptic() {
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
}
</script>

<style scoped>
.dynamics-chart-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-wrapper {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
}

.chart-content {
  width: 100%;
}

.chart-svg-container {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
}

.y-axis-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2px 0;
  min-width: 24px;
}

.y-label {
  font-size: 0.75rem;
  opacity: 0.6;
  line-height: 1;
  text-align: right;
}

.chart-svg-wrapper {
  flex: 0 0 80%;
  display: flex;
  align-items: center;
}

.chart-svg {
  display: block;
  width: 100%;
}

.pagination-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.3);
}

/* Slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Dynamics Analysis Styles */
.dynamics-analysis {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.analysis-text {
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.9;
  margin: 0;
}

.insight-box {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid rgba(255, 223, 0, 0.6);
}

.insight-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.insight-text {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.95;
  margin: 0;
  font-style: italic;
}
</style>
