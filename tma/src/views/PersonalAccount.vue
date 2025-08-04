<template>
  <main class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 pb-safe-area items-center">
    <section class="account-block w-full max-w-72r">
      <UserInfoCard :user-store="userStore" />
    </section>
    <section class="account-block w-full max-w-72r">
      <FactsCarousel />
    </section>
    <section v-if="showDeepAnalysis" class="account-block w-full max-w-72r">
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
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import UserInfoCard from '@/components/UserInfoCard.vue'
import FactsCarousel from '@/components/FactsCarousel.vue'
import DeepAnalysisCard from '@/components/DeepAnalysisCard.vue'
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue'
import SubscriptionModal from '@/components/SubscriptionModal.vue'

const userStore = useUserStore()
const showDeepAnalysis = computed(() => userStore.history && userStore.history.length >= 5)

onMounted(async () => {
  await userStore.fetchProfile()
  await userStore.fetchHistory()
})
</script>