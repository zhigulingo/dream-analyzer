<template>
  <ErrorBoundary 
    @retry="handleRetry"
    @error="handleError"
    :show-retry="true"
  >
    <!-- Debug Info Component -->
    <DebugInfo />
    
    <!-- Offline indicator -->
    <div v-if="!isOnline" class="offline-banner">
      <span>⚠️ Нет подключения к интернету</span>
      <span v-if="pendingOperations.length > 0" class="pending-count">
        ({{ pendingOperations.length }} операций в очереди)
      </span>
    </div>

    <main class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 pb-safe-area items-center">
      <section class="account-block w-full max-w-72r">
        <UserInfoCard :user-store="userStore" />
      </section>
      <section class="account-block w-full max-w-72r">
        <FactsCarousel />
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
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { useOfflineDetection } from '@/composables/useOfflineDetection.js'
import { errorService } from '@/services/errorService.js'
import { defineAsyncComponent } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

// Debug component (always loaded for diagnostic purposes)
import DebugInfo from '@/components/DebugInfo.vue'

// Lazy-loaded компоненты для оптимизации bundle
const UserInfoCard = defineAsyncComponent(() => import('@/components/UserInfoCard.vue'))
const FactsCarousel = defineAsyncComponent(() => import('@/components/FactsCarousel.vue'))
const DeepAnalysisCard = defineAsyncComponent(() => import('@/components/DeepAnalysisCard.vue'))
const AnalysisHistoryList = defineAsyncComponent(() => import('@/components/AnalysisHistoryList.vue'))
const SubscriptionModal = defineAsyncComponent(() => import('@/components/SubscriptionModal.vue'))

const userStore = useUserStore()
const { isOnline, pendingOperations } = useOfflineDetection()

const showDeepAnalysisBanner = computed(() => userStore.history && userStore.history.length >= 5)
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

onMounted(async () => {
  userStore.initServices()
  await userStore.fetchProfile()
  await userStore.fetchHistory()
})
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
</style>