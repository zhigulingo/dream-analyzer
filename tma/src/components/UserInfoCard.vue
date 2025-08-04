<template>
  <article
    class="relative rounded-[2rem] bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white overflow-hidden transition-all"
    :class="[isOpen ? 'pb-20' : 'h-[10vh] md:h-[9rem]']"
    @click="toggle"
  >
    <div class="flex items-center h-full px-8 md:px-16">
      <img class="w-10 h-10 rounded-full object-cover" :src="userAvatar" />
      <span class="ml-4 flex-1 truncate">{{ userDisplayName }}</span>
      <Badge>{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
      <Badge class="ml-2">{{ userStore?.profile?.subscription_type || 'Free' }}</Badge>
    </div>
    <transition name="fade">
      <button
        v-if="isOpen"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 hover:text-white text-sm underline"
        @click.stop="openTariff"
      >
        Сменить тариф
      </button>
    </transition>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Badge from '@/components/Badge.vue'

const props = defineProps(['userStore'])

const isOpen = ref(false)

const userAvatar = computed(() => {
  const tg = window.Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.photo_url) {
    return tg.initDataUnsafe.user.photo_url
  }
  // Fallback to generic avatar
  return 'https://via.placeholder.com/40/5461FF/ffffff?text=U'
})

const userDisplayName = computed(() => {
  const tg = window.Telegram?.WebApp
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '')
    return name
  }
  return 'Пользователь'
})

const toggle = () => {
  isOpen.value = !isOpen.value
}

const openTariff = () => {
  props.userStore?.openSubscriptionModal()
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