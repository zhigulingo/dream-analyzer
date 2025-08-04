<template>
  <article
    class="relative rounded-[3.75rem] bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white overflow-hidden transition-all"
    :class="[isOpen ? 'pb-20' : 'h-[10vh] md:h-[9rem]']"
    @click="toggle"
  >
    <div class="flex items-center h-full px-8 md:px-16">
      <img class="w-10 h-10 rounded-full object-cover" :src="avatar" />
      <span class="ml-4 flex-1 truncate">{{ username }}</span>
      <span class="bg-white/20 rounded-full px-3 py-1 text-sm">{{ `Токенов: ${tokens}` }}</span>
      <span class="ml-2 bg-white/20 rounded-full px-3 py-1 text-sm">{{ plan }}</span>
    </div>
    <transition name="fade">
      <button
        v-if="isOpen"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-tg-link text-tg-button-text rounded-xl py-3 px-8 font-semibold"
        @click.stop="openTariff"
      >
        Сменить тариф
      </button>
    </transition>
  </article>
</template>

<script setup>
import { ref } from 'vue'

// Mock data - replace with actual props/store data
const isOpen = ref(false)
const avatar = ref('https://via.placeholder.com/40')
const username = ref('Пользователь')
const tokens = ref(10)
const plan = ref('Premium')

const toggle = () => {
  isOpen.value = !isOpen.value
}

const openTariff = () => {
  // Open tariff modal logic
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