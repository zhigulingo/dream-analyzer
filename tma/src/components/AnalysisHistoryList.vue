<template>
  <div class="history-list">
    <div v-for="item in history" :key="item.id" class="history-item bg-[#4A58FF] text-white rounded-[3.75rem] px-8 md:px-16 py-14 mb-6">
      <div class="history-summary cursor-pointer" @click="toggleItem(item.id)">
        <h3 class="dream-title">{{ getDreamTitle(item.dream_text) }}</h3>
        <span class="dream-date">{{ formatRelativeDate(item.created_at) }}</span>
      </div>
      <div v-if="openItems.includes(item.id)" class="history-details mt-4">
        <p><strong>Сон:</strong></p>
        <p class="dream-text">{{ item.dream_text }}</p>
        <hr class="my-4 border-white/30">
        <p><strong>Анализ:</strong></p>
        <p class="analysis-text">{{ item.analysis }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')

defineProps({
  history: {
    type: Array,
    required: true,
  },
});

const openItems = ref([])

const toggleItem = (itemId) => {
  const index = openItems.value.indexOf(itemId)
  if (index > -1) {
    openItems.value.splice(index, 1)
  } else {
    openItems.value.push(itemId)
  }
}

const getDreamTitle = (dreamText) => {
  if (!dreamText) return 'Без названия'
  const title = dreamText.length > 50 ? dreamText.substring(0, 47) + '...' : dreamText
  return title
}

const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = dayjs(dateString)
    const now = dayjs()
    const diffDays = now.diff(date, 'day')
    
    if (diffDays === 0) return 'Сегодня'
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дня назад`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недели назад`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяца назад`
    return `${Math.floor(diffDays / 365)} года назад`
  } catch (e) {
    return dateString;
  }
};
</script>

<style scoped>
.history-list {
  @apply space-y-4;
}

.history-item {
  @apply transition-transform duration-200;
}

.history-item:active {
  @apply scale-95;
}

.history-summary {
  @apply flex justify-between items-center;
}

.dream-title {
  @apply text-xl font-medium text-white overflow-hidden text-ellipsis whitespace-nowrap flex-1 mr-4;
  max-width: calc(100% - 150px);
}

.dream-date {
  @apply text-white/80 text-sm whitespace-nowrap;
}

.history-details {
  @apply text-white/90;
}

.dream-text, .analysis-text {
  @apply whitespace-pre-wrap break-words text-sm leading-relaxed mt-2;
}
</style>
