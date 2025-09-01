<template>
  <div v-if="props.visible" class="onboarding-overlay opaque">
    <!-- Простой онбординг -->
    <Swiper
      v-if="isFreeFlow"
      :modules="modules"
      direction="vertical"
      :spaceBetween="18"
      :slidesOffsetBefore="48"
      :slidesOffsetAfter="48"
      slides-per-view="auto"
      :centeredSlides="true"
      :autoplay="autoplay"
      class="w-full h-full"
    >
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-body">
          <h2 class="headline centered">Добро пожаловать в Dream Analyzer!</h2>
          <p class="text-center mt-4 text-white/80">Мы поможем вам понять и интерпретировать ваши сны</p>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-body">
          <h2 class="headline centered">Как это работает</h2>
          <p class="text-center mt-4 text-white/80">Просто опишите свой сон в чате и получите подробный анализ</p>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-body">
          <h2 class="headline centered">Начнем!</h2>
          <p class="text-center mt-4 text-white/80">Отправьте описание вашего сна в чат</p>
        </div>
      </SwiperSlide>
      @slideChange="onSlideChange"
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
// ПРОСТЫЕ ПЕРЕМЕННЫЕ
const flow = ref<'none' | 'free'>('none')
const step = ref<number>(1)
const emit = defineEmits<{ (e: 'visible-change', value: boolean): void }>()

// ПРОСТАЯ КОНФИГУРАЦИЯ
const modules = [Autoplay]
const autoplay = { delay: 3000, disableOnInteraction: true }

// ПРОСТЫЕ ФУНКЦИИ
const closeOnboarding = () => {
  flow.value = 'none'
  emit('visible-change', false)
}

const onSlideChange = (swiper: any) => {
  step.value = (swiper?.activeIndex || 0) + 1
  if (step.value === 3) {
    setTimeout(closeOnboarding, 2000) // Автозакрытие через 2 секунды на последнем слайде
  }
}

// ПРОСТЫЕ COMPUTED СВОЙСТВА
const isFreeFlow = computed(() => flow.value === 'free')

// ПРОПСЫ КОМПОНЕНТА
const props = defineProps<{
  visible: boolean
}>()

// СИНХРОНИЗАЦИЯ ПРОПСА С ВНУТРЕННИМ СОСТОЯНИЕМ
watch(() => props.visible, (newVisible) => {
  if (newVisible && flow.value === 'none') {
    flow.value = 'free' // Показываем простой онбординг
  } else if (!newVisible) {
    flow.value = 'none'
  }
}, { immediate: true })
</script>
