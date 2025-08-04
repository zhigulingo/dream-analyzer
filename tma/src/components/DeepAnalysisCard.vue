<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#9C41FF] to-[#C03AFF] text-white overflow-hidden transition-all cursor-pointer"
    :class="[isOpen ? 'pb-20' : 'py-6']"
    @click="toggle"
  >
    <div class="px-8 md:px-16" :class="[isOpen ? 'pt-8' : '']">
      <h3 class="text-xl font-bold">Глубокий Анализ</h3>
      <p class="mt-1">Получите комплексный анализ ваших последних 5 снов.</p>
      
      <div v-if="userStore?.isInitiatingDeepPayment" class="mt-4 text-sm opacity-80">
        Создаем счёт...
      </div>
      <div v-else-if="userStore?.isDoingDeepAnalysis" class="mt-4 text-sm opacity-80">
        Выполняем анализ...
      </div>
      <div v-if="userStore?.deepAnalysisResult" class="mt-4 p-4 bg-white/10 rounded-lg text-sm">
        <h4 class="font-semibold mb-2">Результат анализа:</h4>
        <p class="text-xs leading-relaxed">{{ userStore.deepAnalysisResult }}</p>
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
        Получить анализ (1 ⭐️)
      </button>
    </transition>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps(['userStore'])

const isOpen = ref(false)

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
    props.userStore.initiateDeepAnalysisPayment()
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