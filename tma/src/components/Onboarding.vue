<template>
  <!-- ОНБОРДИНГ ОВЕРЛЕЙ - ПОЛНОЭКРАННЫЙ С ПЕРЕКРЫТИЕМ ОСНОВНОГО ИНТЕРФЕЙСА -->
  <div v-if="props.visible" class="onboarding-overlay-fullscreen">
    <!-- Debug info -->
    <div class="debug-info">
      DEBUG: visible={{ props.visible }}, isFreeFlow={{ isFreeFlow }}, flow={{ flow }}
    </div>

    <!-- КОНТЕНТ ОНБОРДИНГА -->
    <div class="onboarding-content">
      <Swiper
        v-if="isFreeFlow"
        :modules="modules"
        direction="vertical"
        :spaceBetween="20"
        :slidesOffsetBefore="60"
        :slidesOffsetAfter="60"
        slides-per-view="auto"
        :centeredSlides="true"
        :autoplay="autoplay"
        class="onboarding-swiper"
        @swiper="onSwiperInit"
        @slideChange="onSlideChange"
      >
        <SwiperSlide class="onboarding-slide">
          <div class="onboarding-card-simple">
            <h2 class="onboarding-title">Добро пожаловать в Dream Analyzer!</h2>
            <p class="onboarding-text">Мы поможем вам понять и интерпретировать ваши сны</p>
          </div>
        </SwiperSlide>
        <SwiperSlide class="onboarding-slide">
          <div class="onboarding-card-simple">
            <h2 class="onboarding-title">Как это работает</h2>
            <p class="onboarding-text">Просто опишите свой сон в чате и получите подробный анализ</p>
          </div>
        </SwiperSlide>
        <SwiperSlide class="onboarding-slide">
          <div class="onboarding-card-simple">
            <h2 class="onboarding-title">Начнем!</h2>
            <p class="onboarding-text">Отправьте описание вашего сна в чат</p>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/autoplay'

console.log('🎯 [ONBOARDING] Imports loaded successfully')
// ПРОСТЫЕ ПЕРЕМЕННЫЕ
const flow = ref<'none' | 'free'>('none')
const step = ref<number>(1)
const emit = defineEmits<{ (e: 'visible-change', value: boolean): void }>()

// ПРОСТАЯ КОНФИГУРАЦИЯ
console.log('🎯 [ONBOARDING] Setting up Swiper modules')
const modules = [Autoplay]
const autoplay = { delay: 3000, disableOnInteraction: true }

console.log('🎯 [ONBOARDING] Swiper modules:', modules)
console.log('🎯 [ONBOARDING] Autoplay config:', autoplay)

// ПРОСТЫЕ ФУНКЦИИ
const closeOnboarding = () => {
  console.log('🎯 [ONBOARDING] Closing onboarding')
  flow.value = 'none'
  emit('visible-change', false)
}

const onSwiperInit = (swiper: any) => {
  console.log('🎯 [ONBOARDING] Swiper initialized:', swiper)
  console.log('🎯 [ONBOARDING] Swiper params:', swiper.params)
  console.log('🎯 [ONBOARDING] Swiper slides:', swiper.slides)
  console.log('🎯 [ONBOARDING] Swiper wrapper:', swiper.wrapperEl)
}

const onSlideChange = (swiper: any) => {
  step.value = (swiper?.activeIndex || 0) + 1
  console.log('🎯 [ONBOARDING] Slide changed to:', step.value, 'swiper:', swiper)

  if (step.value === 3) {
    console.log('🎯 [ONBOARDING] Last slide reached, auto-closing in 2 seconds')
    setTimeout(closeOnboarding, 2000) // Автозакрытие через 2 секунды на последнем слайде
  }
}

// ПРОСТЫЕ COMPUTED СВОЙСТВА
const isFreeFlow = computed(() => {
  const result = flow.value === 'free'
  console.log('🎯 [ONBOARDING] isFreeFlow:', result, 'flow:', flow.value)
  return result
})

// ПРОПСЫ КОМПОНЕНТА
const props = defineProps<{
  visible: boolean
}>()

// СИНХРОНИЗАЦИЯ ПРОПСА С ВНУТРЕННИМ СОСТОЯНИЕМ
watch(() => props.visible, (newVisible) => {
  console.log('🎯 [ONBOARDING] visible prop changed:', newVisible, 'current flow:', flow.value)

  if (newVisible && flow.value === 'none') {
    console.log('🎯 [ONBOARDING] Setting flow to free')
    flow.value = 'free' // Показываем простой онбординг
  } else if (!newVisible) {
    console.log('🎯 [ONBOARDING] Setting flow to none')
    flow.value = 'none'
  }
}, { immediate: true })
</script>
