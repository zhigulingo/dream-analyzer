<template>
  <article
    class="relative rounded-[3.75rem] bg-gradient-to-br from-[#9C41FF] to-[#C03AFF] text-white overflow-hidden transition-all cursor-pointer"
    :class="[isOpen ? 'pb-20' : 'py-6']"
    @click="toggle"
  >
    <div class="px-8 md:px-16">
      <h3 class="text-xl font-bold">Глубокий Анализ</h3>
      <p class="mt-1">Получите комплексный анализ ваших последних 5 снов.</p>
    </div>
    <transition name="fade">
      <button
        v-if="isOpen"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-tg-link text-tg-button-text rounded-xl py-3 px-8 font-semibold"
        @click.stop="requestAnalysis"
      >
        {{ isProcessing ? processingLabel : 'Получить анализ' }}
      </button>
    </transition>
  </article>
</template>

<script setup>
import { ref } from 'vue'

const isOpen = ref(false)
const isProcessing = ref(false)
const processingLabel = ref('Обработка...')

const toggle = () => {
  isOpen.value = !isOpen.value
}

const requestAnalysis = () => {
  isProcessing.value = true
  // Логика для запроса анализа
  setTimeout(() => {
    isProcessing.value = false
  }, 2000)
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