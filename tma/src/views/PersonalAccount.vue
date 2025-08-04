<template>
  <main class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 pb-safe-area items-center">
    <section class="account-block w-full max-w-72r">
      <UserInfoCard />
    </section>
    <section class="account-block w-full max-w-72r">
      <FactsCarousel />
    </section>
    <section v-if="showDeepAnalysis" class="account-block w-full max-w-72r">
      <DeepAnalysisCard />
    </section>
    <section class="account-block w-full max-w-72r">
      <AnalysisHistoryList />
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useHistoryStore } from '@/stores/history.js'
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue'
import FactsCarousel from '@/components/FactsCarousel.vue'
import UserInfoCard from '@/components/UserInfoCard.vue'
import DeepAnalysisCard from '@/components/DeepAnalysisCard.vue'

const historyStore = useHistoryStore()
const showDeepAnalysis = computed(() => historyStore.count >= 5)
</script>

<style scoped>
.account-block {
  /* Add any specific styling for account blocks if needed */
}
</style>