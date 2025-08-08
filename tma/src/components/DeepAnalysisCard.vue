<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#9C41FF] to-[#C03AFF] text-white overflow-hidden transition-all cursor-pointer"
    :class="[isOpen ? 'pb-20' : 'py-6']"
    @click="toggle"
  >
    <div class="px-8 md:px-16" :class="[isOpen ? 'pt-8' : '']">
      <h3 class="text-xl font-bold">Глубокий Анализ</h3>
      <p class="mt-1">Получите комплексный анализ ваших последних 5 снов.</p>
      <div v-if="userStore?.profile?.deep_analysis_credits" class="mt-2 text-sm opacity-80">
        У вас: {{ userStore.profile.deep_analysis_credits }} кредит(ов) анализа
      </div>
      
      <div v-if="userStore?.isInitiatingDeepPayment" class="mt-4">
        <LoadingSpinner size="xs" variant="white" label="Создаем счёт..." />
      </div>
      <div v-else-if="userStore?.isDoingDeepAnalysis" class="mt-4">
        <ProgressBar 
          :progress="analysisProgress" 
          label="Глубокий анализ"
          :steps="analysisSteps"
          :currentStep="currentStep"
          variant="white"
          size="sm"
          showPercentage
          animated
        />
      </div>
      <div v-if="userStore?.deepAnalysisResult" class="mt-4 p-4 bg-white/10 rounded-lg text-sm">
        <h4 class="font-semibold mb-2">Результат анализа (последний):</h4>
        <p class="text-xs leading-relaxed">{{ userStore.deepAnalysisResult }}</p>
        <div class="mt-2 text-[10px] opacity-80">Сохранено во вкладке «Глубокий анализ»</div>
      </div>
      <div v-if="userStore?.deepAnalysisError" class="mt-4 p-4 bg-red-500/20 rounded-lg text-sm">
        ⚠️ {{ userStore.deepAnalysisError }}
      </div>
    </div>
    <transition name="fade">
      <button
        v-if="isOpen && userStore?.canAttemptDeepAnalysis"
        class="absolute bottom-4 left-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-colors"
        @click.stop="requestAnalysis"
      >
        {{ userStore?.profile?.deep_analysis_credits > 0 ? 'Выполнить анализ' : 'Получить анализ (1 ⭐️)' }}
      </button>
    </transition>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ProgressBar from '@/components/ProgressBar.vue'

const props = defineProps(['userStore'])

const isOpen = ref(false)

// Прогресс анализа
const analysisProgress = ref(0)
const currentStep = ref(0)
const analysisSteps = ref([
  { title: 'Сбор данных', description: 'Получение последних 5 снов', duration: '2-3 сек' },
  { title: 'Анализ паттернов', description: 'Поиск повторяющихся тем', duration: '8-12 сек' },
  { title: 'Глубокая интерпретация', description: 'Психологический анализ', duration: '10-15 сек' },
  { title: 'Формирование отчета', description: 'Создание персонального анализа', duration: '3-5 сек' }
])

// Симуляция прогресса при глубоком анализе
watch(() => props.userStore?.isDoingDeepAnalysis, (isAnalyzing) => {
  if (isAnalyzing) {
    analysisProgress.value = 0
    currentStep.value = 0
    simulateProgress()
  } else {
    // Сброс через небольшую задержку
    setTimeout(() => {
      analysisProgress.value = 0
      currentStep.value = 0
      analysisSteps.value.forEach(s => s.status = 'pending')
    }, 2000)
  }
})

const simulateProgress = () => {
  const updateProgress = (step, progress) => {
    currentStep.value = step
    analysisProgress.value = progress
    
    analysisSteps.value.forEach((s, index) => {
      if (index < step) {
        s.status = 'completed'
      } else if (index === step) {
        s.status = 'loading'
      } else {
        s.status = 'pending'
      }
    })
  }
  
  setTimeout(() => updateProgress(0, 15), 500)
  setTimeout(() => updateProgress(1, 35), 2000)
  setTimeout(() => updateProgress(2, 65), 5000)
  setTimeout(() => updateProgress(3, 90), 12000)
}

const toggle = () => {
  isOpen.value = !isOpen.value
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
}

const requestAnalysis = () => {
  if (props.userStore?.canAttemptDeepAnalysis) {
    if (window.triggerHaptic) {
      window.triggerHaptic('medium')
    }
    
    // Если у пользователя есть кредиты, выполняем анализ напрямую
    if (props.userStore?.profile?.deep_analysis_credits > 0) {
      props.userStore.performDeepAnalysis()
    } else {
      // Если кредитов нет, инициируем покупку
      props.userStore.initiateDeepAnalysisPayment()
    }
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>