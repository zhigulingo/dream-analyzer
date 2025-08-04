<template>
  <article
    class="rounded-xl bg-gradient-to-br from-[#4A58FF] to-[#5664FF] text-white px-8 md:px-16 transition-all overflow-hidden cursor-pointer"
    :class="[active ? 'pb-20' : 'py-6 h-[4.5rem]']"
    @click="$emit('toggle')"
  >
    <div class="flex justify-between items-center" :class="[active ? 'pt-8' : '']">
      <h3 class="truncate">{{ dreamTitle }}</h3>
      <span class="bg-white/10 rounded-full px-4 py-1 text-sm w-16 text-center">
        {{ relativeDate }}
      </span>
    </div>
    <div v-if="active" class="mt-4 space-y-3 text-sm">
      <div>
        <h4 class="font-semibold mb-1">Сон:</h4>
        <p class="leading-snug opacity-90">{{ dream.dream_text }}</p>
      </div>
      <div>
        <h4 class="font-semibold mb-1">Анализ:</h4>
        <p class="leading-snug opacity-90">{{ dream.analysis }}</p>
      </div>
      <div class="absolute bottom-4 left-4 right-4 flex gap-2">
        <button class="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 text-sm font-medium transition-colors">
          👍 Нравится
        </button>
        <button class="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 text-sm font-medium transition-colors">
          👎 Не нравится
        </button>
        <button class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl py-2 text-sm font-medium transition-colors">
          🗑️ Удалить
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')

const props = defineProps<{ dream: any; active: boolean }>()

const dreamTitle = computed(() => {
  if (!props.dream.dream_text) return 'Без названия'
  const title = props.dream.dream_text.length > 50 
    ? props.dream.dream_text.substring(0, 47) + '...' 
    : props.dream.dream_text
  return title
})

const relativeDate = computed(() => {
  if (!props.dream.created_at) return ''
  try {
    const date = dayjs(props.dream.created_at)
    const now = dayjs()
    const diffDays = now.diff(date, 'day')
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)
    
    if (diffDays === 0) return 'сегодня'
    if (diffDays === 1) return 'вчера'
    if (diffDays < 7) return `${diffDays} д`
    if (diffDays < 30) return `${diffWeeks} н`
    if (diffDays < 365) return `${diffMonths} м`
    return `${diffYears} г`
  } catch (e) {
    return props.dream.created_at
  }
})
</script>