<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#9C41FF] to-[#C03AFF] text-white overflow-hidden transition-all cursor-pointer py-6"
    :class="[isOpen ? 'pb-20' : 'min-h-[8rem]']"
    @click="toggle"
  >
    <div class="px-8 md:px-16 py-2">
      <h3 class="text-xl font-bold">Глубокий Анализ</h3>
      <p class="mt-1">Получите комплексный анализ ваших последних 5 снов.</p>
      <!-- Количество токенов/кредитов не показываем в ТМА (мобильный UX) -->
      
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
      <!-- Сообщения внутри баннера -->
      <div v-if="userStore?.deepAnalysisError" class="mt-4 p-4 bg-red-500/20 rounded-lg text-sm">
        ⚠️ {{ userStore.deepAnalysisError }}
      </div>
      <div v-else-if="userStore?.deepAnalysisSuccess" class="mt-4 p-4 bg-green-500/20 rounded-lg text-sm">
        ✅ Глубокий анализ выполнен! Результат доступен во вкладке «Глубокий анализ» ниже.
      </div>
    </div>
    <div class="absolute left-4 right-4 transition-all duration-300"
         :class="isOpen && userStore?.canAttemptDeepAnalysis ? 'bottom-4 opacity-100' : '-bottom-24 opacity-0 pointer-events-none'">
      <button
        class="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-colors"
        @click.stop="requestAnalysis"
      >
        {{ ((userStore?.profile?.deep_analysis_credits || 0) > 0) || ((userStore?.profile?.free_deep_analysis || 0) > 0) ? 'Выполнить анализ' : 'Получить анализ (1 ⭐️)' }}
      </button>
    </div>
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
    if ((props.userStore?.profile?.deep_analysis_credits || 0) > 0 || (props.userStore?.profile?.free_deep_analysis || 0) > 0) {
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