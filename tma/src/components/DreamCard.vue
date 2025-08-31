<template>
  <article
    class="rounded-xl bg-gradient-to-br from-[#4A58FF] to-[#5664FF] text-white px-8 md:px-16 transition-all overflow-hidden cursor-pointer py-6"
    :class="[active ? '' : 'min-h-[4.5rem]']"
    @click="handleToggle"
  >
    <div class="flex justify-between items-center py-2 min-h-[2.5rem]">
      <h2 class="truncate text-lg font-semibold">{{ displayTitle }}</h2>
      <span class="bg-white/10 rounded-full px-2 py-1 text-lg font-semibold min-w-[3rem] text-center whitespace-nowrap">
        {{ relativeDate }}
      </span>
    </div>
    <div v-if="active" class="mt-4 space-y-4 text-lg fade-seq is-open flex-1 flex flex-col">
      <div v-if="displayTags.length" class="flex flex-wrap gap-2">
        <span v-for="tag in displayTags" :key="tag" class="inline-flex items-center px-2 py-1 rounded-full text-lg font-medium bg-white/15 text-white">
          {{ tag }}
        </span>
      </div>
      <div class="flex-1">
        <h2 class="font-semibold mb-2">Сон:</h2>
        <p class="leading-relaxed">{{ dream.dream_text }}</p>
      </div>
      <div class="flex-1">
        <h2 class="font-semibold mb-2">Анализ:</h2>
        <p class="leading-relaxed">{{ dream.analysis }}</p>
      </div>
      <div class="mt-auto flex gap-2">
        <button
          class="flex-1 rounded-xl py-3 text-lg font-medium transition-colors"
          :class="localFeedback === 1 ? 'bg-green-500/30 text-white ring-2 ring-green-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleLike"
        >
          👍 Нравится
        </button>
        <button
          class="flex-1 rounded-xl py-3 text-lg font-medium transition-colors"
          :class="localFeedback === 2 ? 'bg-red-500/30 text-white ring-2 ring-red-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleDislike"
        >
          👎 Не нравится
        </button>
        <button
          class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl py-3 text-lg font-medium transition-colors"
          @click.stop="handleDelete"
        >
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
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps<{ dream: any; active: boolean }>()
const emit = defineEmits(['toggle'])

const handleToggle = () => {
  emit('toggle')
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
}

import api from '@/services/api.js'
import { useUserStore } from '@/stores/user.js'
import { useNotificationStore } from '@/stores/notifications.js'
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const localFeedback = computed({
  get: () => (props.dream?.user_feedback ?? props.dream?.deep_source?.user_feedback ?? 0),
  set: (v) => {
    if (!props.dream) return
    props.dream.user_feedback = v
    // Дублируем в deep_source для совместимости
    if (!props.dream.deep_source) props.dream.deep_source = {}
    props.dream.deep_source.user_feedback = v
  }
})

const sending = { like: false, dislike: false, delete: false }

const sendFeedback = async (target) => {
  if (sending.like || sending.dislike) return
  const next = target === 1
    ? (localFeedback.value === 1 ? 0 : 1)
    : (localFeedback.value === 2 ? 0 : 2)
  const prev = localFeedback.value
  localFeedback.value = next
  try {
    if (window.triggerHaptic) window.triggerHaptic('medium')
    if (target === 1) sending.like = true; else sending.dislike = true
    await api.postAnalysisFeedback(props.dream.id, next)
    // Snackbar
    if (next === 0) notificationStore.info('Оценка снята')
    else if (next === 1) notificationStore.success('Добавлено: нравится')
    else if (next === 2) notificationStore.success('Добавлено: не нравится')
  } catch (e) {
    // rollback
    localFeedback.value = prev
    console.error('Feedback error', e)
    notificationStore.error('Не удалось сохранить оценку')
  } finally {
    sending.like = sending.dislike = false
  }
}

const handleLike = () => sendFeedback(1)

const handleDislike = () => sendFeedback(2)

const handleDelete = async () => {
  if (sending.delete) return
  const tg = window.Telegram?.WebApp
  const confirmed = await new Promise((resolve) => {
    if (tg?.showPopup) {
      tg.showPopup({ title: 'Удалить запись?', message: 'Действие необратимо', buttons: [{ id: 'yes', type: 'destructive', text: 'Удалить' }, { id: 'no', type: 'cancel', text: 'Отмена' }] }, (id) => resolve(id === 'yes'))
    } else {
      resolve(window.confirm('Удалить запись?'))
    }
  })
  if (!confirmed) return

  try {
    sending.delete = true
    if (window.triggerHaptic) window.triggerHaptic('heavy')
    await api.deleteAnalysis(props.dream.id)
    // Убираем из локального стора истории
    const idx = userStore.history.findIndex(d => d.id === props.dream.id)
    if (idx > -1) userStore.history.splice(idx, 1)
    // Обновляем профиль (счетчики)
    userStore.fetchProfile()
    // Snackbar подтверждения
    notificationStore.success('Запись удалена')
  } catch (e) {
    console.error('Delete error', e)
    notificationStore.error('Не удалось удалить запись')
  } finally {
    sending.delete = false
  }
}

const stopwords = new Set([
  'и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','была','сам','чтоб','без','будто','чего','раз','тоже','себе','под','будет','ж','тогда','кто','этот','того','потому','этого','какой','совсем','ним','здесь','этом','один','почти','мой','тем','чтобы','нее','кажется','сейчас','были','куда','зачем','всех','никогда','можно','при','наконец','два','об','другой','хоть','после','над','больше','тот','через','эти','нас','про','всего','них','какая','много','разве','три','эту','моя','впрочем','хорошо','свою','этой','перед','иногда','лучше','чуть','том','нельзя','такой','им','более','всегда','конечно','всю','между'
])

function toTitleCase(text) {
  return text.replace(/\s+/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function extractTitleFromText(text) {
  if (!text) return ''
  const firstSentence = String(text).split(/[.!?\n]/)[0]
  const words = firstSentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter(w => w && !stopwords.has(w) && w.length > 3)

  const picked = words.slice(0, 3)
  if (picked.length === 0) {
    return firstSentence.slice(0, 40)
  }
  return toTitleCase(picked.join(' '))
}

const displayTitle = computed(() => {
  // Prefer explicit title if backend ever provides it
  const anyTitle = (props.dream && (props.dream.title || props.dream?.deep_source?.title)) || ''
  if (anyTitle) return anyTitle

  const isDeep = !!props.dream?.is_deep_analysis || props.dream?.dream_text === '[DEEP_ANALYSIS_SOURCE]'
  if (isDeep) {
    const t = extractTitleFromText(props.dream?.analysis)
    return t ? t : 'Глубокий анализ'
  }
  // Fallback to dream text
  const t = extractTitleFromText(props.dream?.dream_text)
  return t || 'Без названия'
})

const displayTags = computed(() => {
  const tags = props.dream?.deep_source?.tags
  if (Array.isArray(tags)) return tags.slice(0, 5)
  return []
})

const relativeDate = computed(() => {
  if (!props.dream.created_at) return ''
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess()
    const date = dayjs.utc(props.dream.created_at).tz(userTz).startOf('day')
    const now = dayjs().tz(userTz).startOf('day')
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