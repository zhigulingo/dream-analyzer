<template>
  <article
    class="relative rounded-xl bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white overflow-hidden transition-all duration-500"
    :class="[isOpen ? 'pb-32' : 'min-h-[4.5rem]']"
    @click="toggle"
  >
    <!-- Loading overlay для профиля -->
    <LoadingSpinner 
      v-if="userStore?.isLoadingProfile && !isOpen"
      overlay
      variant="white"
      size="sm"
      label="Загрузка профиля..."
    />
    
    <div class="px-8 md:px-16 py-4" :class="[isOpen ? 'fade-seq is-open seq-offset-0' : 'flex items-center justify-between']">
      <div class="flex items-center" :class="[isOpen ? 'mb-4' : 'mb-0 flex-1']">
        <div class="relative">
          <img class="w-10 h-10 rounded-full object-cover" :src="userAvatar" />
          <LoadingSpinner 
            v-if="userStore?.isLoadingProfile"
            class="absolute inset-0"
            size="sm"
            variant="white"
          />
        </div>
        <span class="ml-4 truncate">{{ userDisplayName }}</span>
      </div>
      
      <!-- Скелет для badges при загрузке -->
      <template v-if="userStore?.isLoadingProfile">
        <div v-if="isOpen" class="mb-4 flex gap-2 flex-wrap">
          <SkeletonLoader type="line" width="w-20" height="h-6" />
          <SkeletonLoader type="line" width="w-24" height="h-6" />
        </div>
        <div v-if="!isOpen" class="flex flex-col gap-2 ml-auto">
          <SkeletonLoader type="line" width="w-16" height="h-5" />
          <SkeletonLoader type="line" width="w-12" height="h-5" />
        </div>
      </template>
      
      <!-- Обычное содержимое -->
       <template v-else>
        <div v-if="isOpen" class="mb-4 flex gap-2 flex-wrap fade-seq is-open seq-offset-0">
          <Badge class="whitespace-nowrap">{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
          <Badge class="whitespace-nowrap">{{ subscriptionInfo }}</Badge>
        </div>
        <div v-else class="flex flex-col gap-1 ml-auto items-end">
          <Badge class="whitespace-nowrap">{{ `Токенов: ${userStore?.profile?.tokens || 0}` }}</Badge>
          <Badge class="whitespace-nowrap">{{ userStore?.profile?.subscription_type || 'Free' }}</Badge>
        </div>
       </template>
       <div v-if="isOpen" class="space-y-2 text-sm fade-seq is-open seq-offset-160">
        <!-- Показываем скелет статистики при загрузке -->
        <template v-if="userStore?.isLoadingProfile">
          <div v-for="i in 4" :key="i" class="flex justify-between">
            <SkeletonLoader type="line" width="w-24" height="h-4" />
            <SkeletonLoader type="line" width="w-8" height="h-4" />
          </div>
        </template>
        
        <!-- Обычная статистика -->
        <template v-else>
          <div class="flex justify-between">
            <span class="opacity-80">Пользователь уже:</span>
            <span>{{ userExperienceTime }}</span>
          </div>
          <div class="flex justify-between">
            <span class="opacity-80">Проанализировано снов:</span>
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
        </template>
      </div>
    </div>
    <div class="absolute left-4 right-4 bottom-4 space-y-2 transition-opacity duration-200 ease-out fade-seq is-open seq-offset-320"
         :class="isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'">
      <button
        class="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center"
        @click.stop="openTariff"
        :disabled="userStore?.isLoadingProfile"
      >
        <LoadingSpinner 
          v-if="userStore?.isLoadingProfile"
          size="xs"
          variant="white"
          class="mr-2"
        />
        Сменить тариф
      </button>
      <button
        class="w-full bg-white/10 text-white/60 rounded-xl py-3 font-semibold cursor-not-allowed"
        disabled
      >
        Получить токены
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Badge from '@/components/Badge.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

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
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
}

const subscriptionInfo = computed(() => {
  const type = props.userStore?.profile?.subscription_type || 'Free'
  if (props.userStore?.profile?.subscription_end) {
    const date = new Date(props.userStore.profile.subscription_end)
    const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    return `${type} до ${formattedDate}`
  }
  return type
})

const userExperienceTime = computed(() => {
  // Ищем дату первого анализа в истории
  const history = props.userStore?.history
  if (!history || history.length === 0) {
    return 'недавно'
  }
  
  // Находим самый старый анализ
  const firstAnalysis = history.reduce((oldest, current) => {
    const currentDate = new Date(current.created_at)
    const oldestDate = new Date(oldest.created_at)
    return currentDate < oldestDate ? current : oldest
  })
  
  const firstDate = new Date(firstAnalysis.created_at)
  const now = new Date()
  const diffTime = Math.abs(now - firstDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 7) {
    return `${diffDays} дн${diffDays === 1 ? 'ень' : diffDays < 5 ? 'я' : 'ей'}`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} недел${weeks === 1 ? 'ю' : weeks < 5 ? 'и' : 'ь'}`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} месяц${months === 1 ? '' : months < 5 ? 'а' : 'ев'}`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years} год${years === 1 ? '' : years < 5 ? 'а' : 'ов'}`
  }
})

const openTariff = () => {
  if (window.triggerHaptic) {
    window.triggerHaptic('medium')
  }
  props.userStore?.openSubscriptionModal()
}

// (debug toggles removed by request)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>