<template>
  <!-- Mini-dashboard strip (visible when card is closed) -->
  <div v-if="showMiniDashboard && !isOpen" class="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
    <div class="mini-stat-chip shrink-0">
      <span class="mini-stat-icon">🔥</span>
      <span class="mini-stat-value">{{ currentStreak }}</span>
      <span class="mini-stat-label">{{ currentStreak === 1 ? 'день' : (currentStreak < 5 ? 'дня' : 'дней') }} подряд</span>
    </div>
    <div v-if="topDreamType" class="mini-stat-chip shrink-0">
      <span class="mini-stat-icon">{{ topDreamType.emoji }}</span>
      <span class="mini-stat-label">{{ topDreamType.label }}</span>
    </div>
    <div class="mini-stat-chip shrink-0">
      <span class="mini-stat-icon">🔮</span>
      <span class="mini-stat-value">{{ userStore?.profile?.deep_analyses_count || 0 }}</span>
      <span class="mini-stat-label">{{ (userStore?.profile?.deep_analyses_count || 0) === 1 ? 'анализ' : ((userStore?.profile?.deep_analyses_count || 0) < 5 ? 'анализа' : 'анализов') }}</span>
    </div>
  </div>

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
          <Badge class="whitespace-nowrap">{{ `🪙 ${userStore?.profile?.tokens || 0} токен${tokenSuffix}` }}</Badge>
          <Badge class="whitespace-nowrap">{{ subscriptionInfo }}</Badge>
        </div>
        <div v-else class="flex flex-col gap-1 ml-auto items-end">
          <Badge class="whitespace-nowrap">{{ `🪙 ${userStore?.profile?.tokens || 0} токен${tokenSuffix}` }}</Badge>
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
          <div class="flex justify-between items-center">
            <span class="opacity-75">🗓 В дневнике уже:</span>
            <span class="font-medium">{{ userExperienceTime }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="opacity-75">💭 Снов записано:</span>
            <span class="font-medium">{{ userStore?.profile?.total_dreams_count || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="opacity-75">🔮 Глубоких анализов:</span>
            <span class="font-medium">{{ userStore?.profile?.deep_analyses_count || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="opacity-75">👥 Приглашено друзей:</span>
            <span class="font-medium">{{ userStore?.profile?.invited_friends_count || 0 }}</span>
          </div>
        </template>
      </div>
    </div>
    <div class="absolute left-4 right-4 space-y-2 transition-all duration-300"
         :class="isOpen ? 'bottom-4 opacity-100' : '-bottom-24 opacity-0 pointer-events-none'">
      <button
        class="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-3 font-semibold transition-all flex items-center justify-center fade-seq is-open seq-offset-500"
        @click.stop="openTariff"
        :disabled="userStore?.isLoadingProfile"
      >
        <LoadingSpinner 
          v-if="userStore?.isLoadingProfile"
          size="xs"
          variant="white"
          class="mr-2"
        />
        🪙 Пополнить токены
      </button>
      <button
        class="w-full bg-white/10 text-white/60 rounded-xl py-3 font-semibold transition-all fade-seq is-open seq-offset-600 relative"
        @click.stop="showTokensHint"
        :class="tokensHintVisible ? 'bg-white/15' : ''"
      >
        <span v-if="tokensHintVisible" class="absolute inset-x-0 -top-9 text-center text-xs bg-white/20 rounded-lg py-1.5 px-2 backdrop-blur-sm">
          🔜 Скоро появится!
        </span>
        🪙 Получить токены
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
const tokensHintVisible = ref(false)

// Mini-dashboard computeds
const regularDreams = computed(() => {
  return (props.userStore?.history || []).filter((d: any) => !d.is_deep_analysis)
})

const showMiniDashboard = computed(() => regularDreams.value.length >= 3)

const currentStreak = computed(() => {
  const dreams = regularDreams.value
  if (!dreams.length) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dreamDates = dreams.map((d: any) => {
    const dt = new Date(d.created_at)
    dt.setHours(0, 0, 0, 0)
    return dt.getTime()
  }).sort((a, b) => b - a)
  const uniqueDates = [...new Set(dreamDates)]
  let streak = 0
  let checkDate = today.getTime()
  // Allow today or yesterday as start
  if (uniqueDates[0] !== checkDate) checkDate -= 86400000
  for (const date of uniqueDates) {
    if (date === checkDate) {
      streak++
      checkDate -= 86400000
    } else {
      break
    }
  }
  return streak
})

function heuristicTypeDominant(text: string | undefined | null): string | null {
  try {
    const s = String(text || '').toLowerCase()
    const count = (arr: string[]) => arr.reduce((a, k) => a + (s.includes(k) ? 1 : 0), 0)
    const e = count(['страх','ужас','паник','тревог','стыд','гнев','плак','слез','кошмар'])
    const a = count(['экзам','выступл','собесед','защит','завтра','ожидан','волнен','нов','интервью'])
    const m = count(['вчера','сегодня','работ','школ','универ','дом','улиц','друг','родител'])
    const scores: [string, number][] = [['emotion', e], ['anticipation', a], ['memory', m]]
    scores.sort((x, y) => y[1] - x[1])
    if (scores[0][1] === 0) return 'memory'
    return scores[0][0]
  } catch { return null }
}

const topDreamType = computed(() => {
  const dreams = regularDreams.value
  if (!dreams.length) return null
  const counts: Record<string, number> = { emotion: 0, memory: 0, anticipation: 0 }
  for (const d of dreams) {
    const t = d?.deep_source?.dream_type?.dominant || heuristicTypeDominant(d?.dream_text)
    if (t && counts[t] !== undefined) counts[t]++
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] === 0) return null
  const map: Record<string, { label: string, emoji: string }> = {
    emotion: { label: 'Эмоциональные', emoji: '💫' },
    memory: { label: 'По памяти', emoji: '🧠' },
    anticipation: { label: 'Ожидание', emoji: '✨' },
  }
  return map[top[0]] || null
})

const userAvatar = computed(() => {
  const tg = window.Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.photo_url) {
    return tg.initDataUnsafe.user.photo_url
  }
  // Offline-safe SVG fallback avatar
  const initials = userDisplayName.value?.charAt(0)?.toUpperCase() || 'U'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#5461FF"/><text x="20" y="26" font-family="system-ui,sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">${initials}</text></svg>`)}`
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

const tokenSuffix = computed(() => {
  const n = props.userStore?.profile?.tokens || 0
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'ов'
  if (n1 > 1 && n1 < 5) return 'а'
  if (n1 === 1) return ''
  return 'ов'
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

const showTokensHint = () => {
  if (window.triggerHaptic) window.triggerHaptic('light')
  tokensHintVisible.value = true
  setTimeout(() => { tokensHintVisible.value = false }, 2000)
}

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

/* Mini-dashboard */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.mini-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 13px;
  color: var(--tg-theme-text-color, #fff);
}
.mini-stat-icon { font-size: 15px; line-height: 1; }
.mini-stat-value { font-weight: 700; color: var(--tg-theme-text-color, #fff); }
.mini-stat-label { opacity: 0.7; }
</style>