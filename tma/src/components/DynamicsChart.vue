<template>
  <div class="dynamics-chart-container">
    <!-- Pagination dots (Top) -->
    <div v-if="dynamics.length > 1" class="pagination-dots">
      <div
        v-for="(_, idx) in dynamics"
        :key="`dot-${idx}`"
        class="dot"
        :class="{ active: idx === currentIndex }"
      ></div>
    </div>

    <Swiper
      :modules="modules"
      slides-per-view="auto"
      :centered-slides="true"
      :space-between="16"
      @swiper="onSwiper"
      @slideChange="onSlideChange"
      class="w-full"
    >
      <SwiperSlide 
        v-for="(metric, idx) in dynamics" 
        :key="idx" 
        class="!w-full"
      >
        <div class="chart-content bg-white/10 rounded-2xl p-5 border border-white/5 backdrop-blur-sm h-full">
          <!-- Chart Title -->
          <div class="text-lg font-bold mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                <LineChart :size="18" class="text-yellow-400" />
              </div>
              <span class="opacity-90">{{ metric.category || metric.metric }}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-2xl font-bold leading-none">{{ metric.values[metric.values.length - 1] }}%</span>
              <span class="text-[10px] uppercase tracking-wider opacity-50 mt-1">текущий уровень</span>
            </div>
          </div>
          
          <!-- SVG Chart -->
          <div class="chart-svg-container my-6">
            <div class="y-axis-labels pr-2 border-r border-white/10 mr-2">
              <span class="y-label">{{ yAxisScale.labels[0] }}%</span>
              <span class="y-label text-[10px]">{{ yAxisScale.labels[1] }}%</span>
              <span class="y-label">{{ yAxisScale.labels[2] }}%</span>
            </div>
            
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
                  :x1="0" :x2="chartWidth" 
                  :y1="(chartHeight / 2) * (i - 1)" 
                  :y2="(chartHeight / 2) * (i - 1)"
                  stroke="white" stroke-opacity="0.08" stroke-width="1"
                />
                
                <!-- Data line -->
                <polyline 
                  :points="getLinePoints(metric.values)" 
                  fill="none" 
                  stroke="url(#chartGradient)" 
                  stroke-width="3" 
                  stroke-linejoin="round" 
                  stroke-linecap="round"
                />
                
                <!-- Data points -->
                <circle 
                  v-for="(val, vIdx) in metric.values" 
                  :key="vIdx"
                  :cx="getDataPoint(metric.values, vIdx).x" 
                  :cy="getDataPoint(metric.values, vIdx).y" 
                  r="3.5" 
                  fill="white"
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
            <div v-if="metric.analysis" class="dynamics-analysis">
              <p class="text-base opacity-90 leading-relaxed font-medium">{{ metric.analysis }}</p>
            </div>
            <div v-if="metric.insight" class="insight-box bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
              <div class="flex gap-3">
                <Sparkles :size="18" class="text-yellow-400 shrink-0 mt-0.5" />
                <p class="text-[15px] opacity-90 leading-relaxed italic">{{ metric.insight }}</p>
              </div>
            </div>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard } from 'swiper/modules'
import 'swiper/css'
import { LineChart, Sparkles } from 'lucide-vue-next'

interface DynamicMetric {
  metric: string
  values: number[]
  interpretation: string
  analysis?: string
  insight?: string
  category?: string
}

const props = defineProps<{
  dynamics: DynamicMetric[]
  userAge?: string
  userGender?: string
}>()

const modules = [A11y, Keyboard]
const swiperInstance = ref<any>(null)
const currentIndex = ref(0)

const chartWidth = 300
const chartHeight = 80
const padding = 6

const onSwiper = (swiper: any) => {
  swiperInstance.value = swiper
}

const onSlideChange = () => {
  if (swiperInstance.value) {
    currentIndex.value = swiperInstance.value.activeIndex
    if (window.triggerHaptic) window.triggerHaptic('light')
  }
}

// Helpers for individual slide point calculation
const getLinePoints = (values: number[]) => {
  if (!values.length) return ''
  const { min, max } = yAxisScale.value
  const innerWidth = chartWidth - padding * 2
  const innerHeight = chartHeight - padding * 2
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0
  
  return values.map((val, idx) => {
    const normalizedValue = (val - min) / (max - min)
    const x = padding + idx * stepX
    const y = padding + innerHeight - normalizedValue * innerHeight
    return `${x},${y}`
  }).join(' ')
}

const getDataPoint = (values: number[], idx: number) => {
  const { min, max } = yAxisScale.value
  const innerWidth = chartWidth - padding * 2
  const innerHeight = chartHeight - padding * 2
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0
  const val = values[idx]
  const normalizedValue = (val - min) / (max - min)
  return {
    x: padding + idx * stepX,
    y: padding + innerHeight - normalizedValue * innerHeight
  }
}

const yAxisScale = computed(() => {
  if (!props.dynamics || props.dynamics.length === 0) return { min: 0, max: 10, labels: [10, 5, 0] }
  const allValues: number[] = []
  props.dynamics.forEach(m => { if (Array.isArray(m.values)) allValues.push(...m.values) })
  if (allValues.length === 0) return { min: 0, max: 10, labels: [10, 5, 0] }
  const min = Math.floor(Math.min(...allValues))
  const max = Math.ceil(Math.max(...allValues))
  return { min, max, labels: [max, Math.round((max + min) / 2), min] }
})
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
