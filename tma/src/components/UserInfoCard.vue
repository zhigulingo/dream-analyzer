<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white overflow-hidden transition-all"
    :class="[isOpen ? 'pb-20' : 'h-[10vh] md:h-[9rem]']"
    @click="toggle"
  >
    <div class="px-8 md:px-16" :class="[isOpen ? 'pt-8' : 'flex items-center h-full']">
      <div class="flex items-center">
        <img class="w-10 h-10 rounded-full object-cover" :src="userAvatar" />
        <span class="ml-4 flex-1 truncate">{{ userDisplayName }}</span>
      </div>
      <div class="flex flex-col gap-2" :class="[isOpen ? 'mt-4' : 'ml-auto flex-row']">
        <Badge>{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
        <Badge>{{ userStore?.profile?.subscription_type || 'Free' }}</Badge>
      </div>
      <div v-if="isOpen" class="mt-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="opacity-80">Подписка до:</span>
          <span>{{ subscriptionEndDate }}</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-80">Глубоких анализов:</span>
          <span>{{ userStore?.profile?.deep_analyses_count || 0 }}</span>
        </div>
      </div>
    </div>
    <transition name="fade">
      <button
        v-if="isOpen"
        class="absolute bottom-4 left-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-colors"
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

const subscriptionEndDate = computed(() => {
  if (props.userStore?.profile?.subscription_end_date) {
    const date = new Date(props.userStore.profile.subscription_end_date)
    return date.toLocaleDateString('ru-RU')
  }
  return 'Не активна'
})

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