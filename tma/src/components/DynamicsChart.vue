<template>
  <div class="dynamics-chart-container">
    <!-- HVDC subtitle / explanation -->
    <div class="hvdc-header">
      <div class="hvdc-title-row">
        <span class="hvdc-title">Динамика снов</span>
        <button class="hvdc-info-btn" @click="showHvdcTooltip = !showHvdcTooltip" aria-label="Что такое HVDC">
          <span>?</span>
        </button>
      </div>
      <div v-if="showHvdcTooltip" class="hvdc-tooltip">
        <strong>HVDC</strong> — модель анализа снов по четырём осям:<br/>
        Действия, Эмоции, Обстановка, Персонажи.<br/>
        График показывает, как менялась каждая ось от сна к сну.
        <button class="hvdc-tooltip-close" @click="showHvdcTooltip = false">✕</button>
      </div>
      <p v-else class="hvdc-subtitle">Свайпай → чтобы увидеть все 4 оси</p>
    </div>

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
            <span>{{ translatedCategory }}</span>
            <span class="text-xs opacity-70">{{ currentValues[currentValues.length - 1] }}</span>
          </div>
          
          <!-- SVG Chart (80% width with Y-axis labels) -->
          <div class="chart-svg-container">
            <!-- Y-axis labels -->
            <div class="y-axis-labels">
              <span class="y-label">{{ yAxisScale.labels[0] }}</span>
              <span class="y-label">{{ yAxisScale.labels[1] }}</span>
              <span class="y-label">{{ yAxisScale.labels[2] }}</span>
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
                
                <!-- Demographic norm zone (if available) -->
                <rect
                  v-if="demographicZoneY !== null"
                  :x="0"
                  :y="demographicZoneY - 8"
                  :width="chartWidth"
                  :height="16"
                  fill="yellow"
                  opacity="0.15"
                />
                <line
                  v-if="demographicZoneY !== null"
                  :x1="0"
                  :x2="chartWidth"
                  :y1="demographicZoneY"
                  :y2="demographicZoneY"
                  stroke="yellow"
                  stroke-opacity="0.6"
                  stroke-width="1.5"
                  stroke-dasharray="4,3"
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
                
                <!-- Data points (interactive) -->
                <circle 
                  v-for="(point, idx) in dataPoints" 
                  :key="`point-${idx}`"
                  :cx="point.x" 
                  :cy="point.y" 
                  r="5" 
                  fill="white"
                  vector-effect="non-scaling-stroke"
                  class="cursor-pointer"
                  @mouseenter="showTooltip(idx, $event)"
                  @mouseleave="hideTooltip"
                  @touchstart.prevent="showTooltip(idx, $event)"
                  @touchend.prevent="hideTooltip"
                />
              </svg>
            </div>
          </div>
          
          <!-- Tooltip -->
          <div v-if="tooltip.visible" class="tooltip-bubble" :style="{ left: tooltip.x + 'px' }">
            <span class="font-semibold">{{ tooltip.value }}</span>
            <span class="text-xs opacity-75 ml-1">{{ tooltip.label }}</span>
          </div>

          <!-- X-axis labels (dream numbers) -->
          <div class="x-axis-labels" v-if="currentValues.length > 1">
            <span v-for="(_, idx) in currentValues" :key="`x-${idx}`" class="x-label">{{ idx + 1 }}</span>
          </div>

          <!-- Legend -->
          <div class="chart-legend">
            <span class="legend-line"></span>
            <span class="legend-text">{{ translatedCategory }}</span>
          </div>

          <!-- Analysis (new format) or Interpretation (legacy) -->
          <div v-if="currentMetric.analysis" class="mt-4">
            <div class="dynamics-analysis">
              <p class="analysis-text">{{ currentMetric.analysis }}</p>
              <div v-if="currentMetric.insight" class="insight-box">
                <span class="insight-icon">💡</span>
                <p class="insight-text">{{ currentMetric.insight }}</p>
              </div>
            </div>
          </div>
          <div v-else-if="currentMetric.interpretation" class="mt-3 text-xs opacity-80 leading-relaxed">
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
  userAge?: string // e.g., "25-34"
  userGender?: string // "male" or "female"
}>()

const currentIndex = ref(0)
const touchStartX = ref(0)
const touchEndX = ref(0)
const transitionName = ref('slide-left')
const showHvdcTooltip = ref(false)

// Перевод категорий HVDC на русский с emoji
const categoryLabels: Record<string, string> = {
  'actions': 'Действия 🏃',
  'emotions': 'Эмоции 💫',
  'settings': 'Обстановка 🌍',
  'characters': 'Персонажи 👥',
  // legacy / Russian keys
  'Действия': 'Действия 🏃',
  'Эмоции': 'Эмоции 💫',
  'Сцены': 'Обстановка 🌍',
  'Персонажи': 'Персонажи 👥',
}

const translatedCategory = computed(() => {
  const raw = currentMetric.value.category || currentMetric.value.metric || ''
  return categoryLabels[raw] || raw
})

// Tooltip state
const tooltip = ref({ visible: false, x: 0, value: 0, label: '' })

function showTooltip(idx: number, event: MouseEvent | TouchEvent) {
  const values = currentValues.value
  if (!values[idx] === undefined) return
  const containerEl = (event.target as SVGElement)?.closest('.chart-svg-wrapper')
  const rect = containerEl?.getBoundingClientRect()
  const point = dataPoints.value[idx]
  if (!rect || !point) return
  // x ratio from 0..chartWidth → real px width
  const xRatio = point.x / chartWidth
  const xPx = xRatio * rect.width
  tooltip.value = {
    visible: true,
    x: Math.min(Math.max(xPx, 20), rect.width - 50),
    value: values[idx],
    label: `сон ${idx + 1}`
  }
  if (window.triggerHaptic) window.triggerHaptic('light')
}

function hideTooltip() {
  tooltip.value.visible = false
}

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
  gap: 0.75rem;
}

/* HVDC header */
.hvdc-header {
  margin-bottom: 2px;
}

.hvdc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hvdc-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.55;
}

.hvdc-info-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.hvdc-info-btn:hover {
  background: rgba(255,255,255,0.2);
}

.hvdc-subtitle {
  font-size: 11px;
  opacity: 0.45;
  margin: 2px 0 0 0;
  line-height: 1;
}

.hvdc-tooltip {
  position: relative;
  background: rgba(30, 20, 60, 0.95);
  border: 1px solid rgba(167,139,250,0.3);
  border-radius: 12px;
  padding: 12px 32px 12px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,0.9);
  margin-top: 6px;
  backdrop-filter: blur(8px);
}

.hvdc-tooltip-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
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
  position: relative;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  padding: 2px 0 0 28px; /* offset for y-axis */
  margin-top: 2px;
}

.x-label {
  font-size: 0.65rem;
  opacity: 0.5;
  line-height: 1;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  opacity: 0.75;
}

.legend-line {
  display: inline-block;
  width: 20px;
  height: 2px;
  background: white;
  border-radius: 2px;
}

.legend-text {
  font-size: 0.7rem;
  line-height: 1;
}

.tooltip-bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
  backdrop-filter: blur(4px);
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
  font-size: 14px;
  line-height: 1.65;
  opacity: 0.92;
  margin: 0;
}

.insight-box {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  border-left: 3px solid rgba(255, 223, 0, 0.7);
}

.insight-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.insight-text {
  font-size: 13px;
  line-height: 1.55;
  opacity: 0.97;
  margin: 0;
  font-style: italic;
}
</style>
