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
        <div :key="currentIndex" class="chart-content">
          <!-- Chart Title -->
          <div class="text-sm font-semibold mb-2 flex items-center justify-between">
            <span>{{ currentMetric.metric }}</span>
            <span class="text-xs opacity-70">{{ currentValues[currentValues.length - 1] }}/10</span>
          </div>
          
          <!-- SVG Chart (80% width with Y-axis labels) -->
          <div class="chart-svg-container">
            <!-- Y-axis labels -->
            <div class="y-axis-labels">
              <span class="y-label">10</span>
              <span class="y-label">5</span>
              <span class="y-label">0</span>
            </div>
            
            <!-- Chart SVG -->
            <div class="chart-svg-wrapper">
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
                  stroke-opacity="0.15" 
                  stroke-width="1"
                />
                
                <!-- Data line -->
                <polyline 
                  :points="linePoints" 
                  fill="none" 
                  stroke="white" 
                  stroke-width="2.5" 
                  stroke-linejoin="round" 
                  stroke-linecap="round"
                />
                
                <!-- Data points -->
                <circle 
                  v-for="(point, idx) in dataPoints" 
                  :key="`point-${idx}`"
                  :cx="point.x" 
                  :cy="point.y" 
                  r="4" 
                  fill="white"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
          
          <!-- Interpretation -->
          <div class="mt-3 text-xs opacity-80 leading-relaxed">
            {{ currentMetric.interpretation }}
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

// Calculate line points for SVG with padding
const dataPoints = computed(() => {
  const values = currentValues.value
  if (values.length === 0) return []
  
  const innerWidth = chartWidth - padding * 2
  const innerHeight = chartHeight - padding * 2
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0
  
  return values.map((val, idx) => ({
    x: padding + idx * stepX,
    y: padding + innerHeight - (val / 10) * innerHeight
  }))
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
</style>
