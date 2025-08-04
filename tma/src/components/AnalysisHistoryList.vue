<template>
  <div>
    <h2 class="text-2xl font-semibold mb-4 text-white">История снов</h2>
    <div class="flex flex-col gap-4">
      <DreamCard
        v-for="dream in visibleDreams"
        :key="dream.id"
        :dream="dream"
        :active="activeId === dream.id"
        @toggle="activeId = activeId === dream.id ? null : dream.id"
      />
      <button
        v-if="canLoadMore"
        class="self-center text-tg-link underline text-sm my-2"
        @click="loadMore"
      >
        Загрузить ещё
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history.js'
import DreamCard from '@/components/DreamCard.vue'

const historyStore = useHistoryStore()
const activeId = ref(null)
const pageSize = ref(5)

const visibleDreams = computed(() => {
  return historyStore.dreams.slice(0, pageSize.value)
})

const canLoadMore = computed(() => {
  return historyStore.dreams.length > pageSize.value
})

const loadMore = () => {
  pageSize.value += 5
}
</script>