<template>
  <div>
    <h2 class="text-2xl font-semibold mb-4 text-white">История снов</h2>
    <div v-if="userStore?.isLoadingHistory" class="text-center text-white/60 py-8">
      Загрузка истории...
    </div>
    <div v-else-if="userStore?.errorHistory" class="text-center text-red-400 py-8">
      Ошибка загрузки: {{ userStore.errorHistory }}
    </div>
    <div v-else-if="!userStore?.history?.length" class="text-center text-white/60 py-8">
      У вас пока нет сохраненных анализов
    </div>
    <div v-else class="flex flex-col gap-4">
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
import DreamCard from '@/components/DreamCard.vue'

const props = defineProps(['userStore'])

const activeId = ref(null)
const pageSize = ref(5)

const visibleDreams = computed(() => {
  if (!props.userStore?.history) return []
  return props.userStore.history.slice(0, pageSize.value)
})

const canLoadMore = computed(() => {
  if (!props.userStore?.history) return false
  return props.userStore.history.length > pageSize.value
})

const loadMore = () => {
  pageSize.value += 5
}
</script>