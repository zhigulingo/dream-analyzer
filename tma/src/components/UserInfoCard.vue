<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white overflow-hidden transition-all"
    :class="[isOpen ? 'pb-32' : 'h-[11vh] md:h-[10rem]']"
    @click="toggle"
  >
    <div class="px-8 md:px-16" :class="[isOpen ? 'pt-8' : 'flex items-center h-full']">
      <div class="flex items-center" :class="[isOpen ? 'mb-4' : 'flex-1']">
        <img class="w-10 h-10 rounded-full object-cover" :src="userAvatar" />
        <span class="ml-4 truncate">{{ userDisplayName }}</span>
        <div v-if="isOpen" class="ml-4 flex gap-2">
          <Badge>{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
          <Badge>{{ subscriptionInfo }}</Badge>
        </div>
      </div>
      <div v-if="!isOpen" class="flex gap-2 ml-auto">
        <Badge>{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
        <Badge>{{ userStore?.profile?.subscription_type || 'Free' }}</Badge>
      </div>
      <div v-if="isOpen" class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="opacity-80">Дата регистрации:</span>
          <span>{{ registrationDate }}</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-80">Интерпретировано снов:</span>
          <span>{{ userStore?.profile?.total_dreams_count || 0 }}</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-80">Глубоких анализов:</span>
          <span>{{ userStore?.profile?.deep_analyses_count || 0 }}</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-80">Приглашено друзей:</span>
          <span>{{ userStore?.profile?.invited_friends_count || 0 }}</span>
        </div>
      </div>
    </div>
    <transition name="fade">
      <div v-if="isOpen" class="absolute bottom-4 left-4 right-4 space-y-2">
        <button
          class="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-colors"
          @click.stop="openTariff"
        >
          Сменить тариф
        </button>
        <button
          class="w-full bg-white/10 text-white/60 rounded-xl py-3 font-semibold cursor-not-allowed"
          disabled
        >
          Получить токены
        </button>
      </div>
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

const subscriptionInfo = computed(() => {
  const type = props.userStore?.profile?.subscription_type || 'Free'
  if (props.userStore?.profile?.subscription_end_date) {
    const date = new Date(props.userStore.profile.subscription_end_date)
    const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    return `${type} до ${formattedDate}`
  }
  return type
})

const registrationDate = computed(() => {
  if (props.userStore?.profile?.created_at) {
    const date = new Date(props.userStore.profile.created_at)
    return date.toLocaleDateString('ru-RU')
  }
  return 'Неизвестно'
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