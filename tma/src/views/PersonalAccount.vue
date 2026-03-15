<template>
  <ErrorBoundary 
    @retry="handleRetry"
    @error="handleError"
    :show-retry="true"
  >
    
    
    <!-- Offline indicator -->
    <div v-if="!isOnline" class="offline-banner">
      <span>⚠️ Нет подключения к интернету</span>
      <span v-if="pendingOperations.length > 0" class="pending-count">
        ({{ pendingOperations.length }} операций в очереди)
      </span>
    </div>

    <!-- Full-page skeleton on initial load -->
    <div v-if="userStore.isLoadingProfile && !userStore.history?.length" class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 pt-4 items-center w-full">
      <!-- Greeting skeleton -->
      <div class="w-full max-w-72r">
        <div class="page-skeleton h-6 w-40 rounded-xl"></div>
      </div>
      <!-- Avatar + name skeleton (UserInfoCard) -->
      <div class="w-full max-w-72r rounded-xl bg-white/10 p-5 flex items-center gap-4">
        <div class="page-skeleton w-12 h-12 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="page-skeleton h-4 w-32 rounded-lg"></div>
          <div class="page-skeleton h-3 w-24 rounded-lg"></div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="page-skeleton h-5 w-16 rounded-full"></div>
          <div class="page-skeleton h-5 w-12 rounded-full"></div>
        </div>
      </div>
      <!-- Stats skeleton -->
      <div class="w-full max-w-72r rounded-xl bg-white/10 p-4 space-y-3">
        <div v-for="i in 4" :key="i" class="flex justify-between">
          <div class="page-skeleton h-3 w-28 rounded"></div>
          <div class="page-skeleton h-3 w-8 rounded"></div>
        </div>
      </div>
      <!-- Cards skeleton -->
      <div v-for="j in 2" :key="j" class="w-full max-w-72r rounded-xl bg-white/10 px-8 py-5">
        <div class="flex items-center gap-3 py-2">
          <div class="page-skeleton w-8 h-8 rounded-full shrink-0"></div>
          <div class="space-y-2 flex-1">
            <div class="page-skeleton h-4 w-36 rounded"></div>
            <div class="page-skeleton h-3 w-20 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <main v-else class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 pb-safe-area items-center">
      <!-- Contextual greeting -->
      <section class="account-block w-full max-w-72r pt-1 pb-0">
        <div class="greeting-line">
          <span class="greeting-emoji">{{ greetingEmoji }}</span>
          <span class="greeting-text">{{ greetingText }}</span>
        </div>
      </section>
      <section class="account-block w-full max-w-72r" data-user-anchor>
        <UserInfoCard :user-store="userStore" />
      </section>
      <section class="account-block w-full max-w-72r mb-0">
        <FactsCarouselV2 />
      </section>
      <section v-if="showDemographicsBanner" class="account-block w-full max-w-72r">
        <DemographicsBanner @dismiss="dismissedDemo = true" />
      </section>
      <section v-if="showDeepAnalysisBanner" class="account-block w-full max-w-72r">
        <DeepAnalysisCard :user-store="userStore" />
      </section>
      <section class="account-block w-full max-w-72r">
        <AnalysisHistoryList :user-store="userStore" />
      </section>
      
      <!-- Subscription Modal -->
      <SubscriptionModal
        v-if="userStore.showSubscriptionModal"
        @close="userStore.closeSubscriptionModal"
      />
    </main>

    <!-- Sticky CTA: Записать сон (открывает бот) -->
    <div class="fab-wrapper">
      <button class="fab-cta" @click="openBotChat" aria-label="Записать сон">
        <span class="fab-icon">✍️</span>
        <span class="fab-label">Записать сон</span>
      </button>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { useOfflineDetection } from '@/composables/useOfflineDetection.js'
import { errorService } from '@/services/errorService.js'
import { defineAsyncComponent } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

// DebugInfo удалён из production-сборки

// Lazy-loaded компоненты для оптимизации bundle
const UserInfoCard = defineAsyncComponent(() => import('@/components/UserInfoCard.vue'))
const FactsCarousel = defineAsyncComponent(() => import('@/components/FactsCarousel.vue'))
const FactsCarouselV2 = defineAsyncComponent(() => import('@/components/FactsCarouselV2.vue'))
const DeepAnalysisCard = defineAsyncComponent(() => import('@/components/DeepAnalysisCard.vue'))
const AnalysisHistoryList = defineAsyncComponent(() => import('@/components/AnalysisHistoryList.vue'))
const SubscriptionModal = defineAsyncComponent(() => import('@/components/SubscriptionModal.vue'))
const DemographicsBanner = defineAsyncComponent(() => import('@/components/DemographicsBanner.vue'))

const userStore = useUserStore()
const { isOnline, pendingOperations } = useOfflineDetection()

const showDeepAnalysisBanner = computed(() => userStore.history && userStore.history.length >= 5)
const dismissedDemo = ref(false)
const showDemographicsBanner = computed(() => {
  const p: any = userStore.profile || {}
  return !dismissedDemo.value && (!p.age_range || !p.gender)
})
// Global error handlers for ErrorBoundary
const handleError = (errorEvent) => {
  console.error('PersonalAccount error caught by ErrorBoundary:', errorEvent);
  errorService.handleError(errorEvent.error, { 
    component: 'PersonalAccount',
    context: 'error_boundary'
  });
};

const handleRetry = async () => {
  console.log('PersonalAccount retry triggered');
  
  // Retry all failed operations
  if (userStore.errorProfile && !userStore.isLoadingProfile) {
    await userStore.retryFetchProfile();
  }
  
  if (userStore.errorHistory && !userStore.isLoadingHistory) {
    await userStore.retryFetchHistory();
  }
};

// Загрузка профиля/истории выполняется на уровне App.vue. Здесь не дублируем вызовы,
// чтобы избежать повторных запросов и мигания прелоадера.

// Contextual greeting
const greetingEmoji = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '🌅'
  if (hour >= 12 && hour < 18) return '☀️'
  if (hour >= 18 && hour < 22) return '🌆'
  return '🌙'
})

const greetingText = computed(() => {
  const hour = new Date().getHours()
  const tg = (window as any)?.Telegram?.WebApp
  const firstName = tg?.initDataUnsafe?.user?.first_name || ''
  const name = firstName ? `, ${firstName}` : ''
  const dreams = userStore.history?.filter((d: any) => !d.is_deep_analysis)?.length || 0
  
  if (hour >= 5 && hour < 12) {
    if (dreams === 0) return `Доброе утро${name}! Был интересный сон?`
    return `Доброе утро${name}! Запиши свежий сон прямо сейчас`
  }
  if (hour >= 12 && hour < 18) {
    return `Добрый день${name}! Дневник снов ждёт`
  }
  if (hour >= 18 && hour < 22) {
    return `Добрый вечер${name}! Скоро время снов`
  }
  return `Ночь глубока${name}... Хорошие сны ✨`
})

const openBotChat = () => {
  if (window.triggerHaptic) window.triggerHaptic('medium')
  try {
    const tg = (window as any)?.Telegram?.WebApp
    if (tg?.close) { tg.close(); return }
  } catch (_) {}
}
</script>

<style scoped>
/* Offline banner styles */
.offline-banner {
  background-color: #fbbf24;
  color: #92400e;
  padding: 0.75rem 1rem;
  text-align: center;
  font-weight: 500;
  border-bottom: 1px solid #f59e0b;
  margin-bottom: 1rem;
}

.pending-count {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Greeting */
.greeting-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.greeting-emoji { font-size: 20px; line-height: 1; }
.greeting-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--tg-theme-text-color, #fff);
  opacity: 0.85;
  letter-spacing: 0.01em;
}

/* Sticky FAB CTA */
.fab-wrapper {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}
.fab-cta {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #7C3AED 0%, #9C41FF 100%);
  color: #fff;
  border: none;
  border-radius: 28px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.45), 0 2px 8px rgba(0,0,0,0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  white-space: nowrap;
  animation: glowPulse 3s ease-in-out infinite;
}
.fab-cta:active {
  transform: scale(0.96) !important;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35) !important;
  animation: none;
}
.fab-icon { font-size: 18px; }
.fab-label { letter-spacing: 0.01em; }

/* Page-level skeleton shimmer */
.page-skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.07) 75%);
  background-size: 400% 100%;
  animation: page-shimmer 1.4s ease-in-out infinite;
}
@keyframes page-shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: -200% 0; }
}
</style>