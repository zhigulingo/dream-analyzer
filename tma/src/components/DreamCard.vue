<template>
  <article
    class="rounded-xl bg-gradient-to-br from-[#4A58FF] to-[#5664FF] text-white px-8 md:px-16 transition-all overflow-hidden cursor-pointer py-6"
    :class="[active ? '' : 'min-h-[4.5rem]']"
    @click="handleToggle"
  >
    <div class="flex justify-between items-center py-2 min-h-[2.5rem]">
      <h3 class="truncate">{{ displayTitle }}</h3>
      <span class="bg-white/10 rounded-full px-2 py-1 text-sm min-w-[3rem] text-center whitespace-nowrap">
        {{ relativeDate }}
      </span>
    </div>
    <div v-if="active" class="mt-4 space-y-4 text-sm fade-seq is-open">
      <div v-if="displayTags.length" class="flex flex-wrap gap-2">
        <span v-for="tag in displayTags" :key="tag" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/15 text-white">
          {{ tag }}
        </span>
      </div>
      <div>
        <h4 class="font-semibold mb-1">Сон:</h4>
        <p class="leading-snug opacity-90">{{ dream.dream_text }}</p>
      </div>

      <div class="space-y-2">
        <div v-for="sec in sections" :key="sec.key" class="rounded-lg bg-white/10">
          <button class="w-full text-left px-3 py-2 font-semibold flex items-center justify-between" @click.stop="toggleSection(sec.key)">
            <span>{{ sec.title }}</span>
            <span class="opacity-80">{{ expanded[sec.key] ? '−' : '+' }}</span>
          </button>
          <div v-if="expanded[sec.key]" class="px-3 pb-3 text-white/90 leading-snug space-y-2">
            <div v-html="sec.html"></div>
            <div v-if="sec.key==='emp'" class="pt-2">
              <button class="rounded-lg bg-white/20 hover:bg-white/25 px-3 py-2 text-sm" @click.stop="openDemographics()">Улучшить анализ</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button 
          class="flex-1 rounded-xl py-2 text-sm font-medium text-center transition-colors"
          :class="localFeedback === 1 ? 'bg-green-500/30 text-white ring-2 ring-green-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleLike"
        >
          👍
        </button>
        <button 
          class="flex-1 rounded-xl py-2 text-sm font-medium text-center transition-colors"
          :class="localFeedback === 2 ? 'bg-red-500/30 text-white ring-2 ring-red-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleDislike"
        >
          👎
        </button>
        <button 
          class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl py-2 text-sm font-medium text-center transition-colors"
          @click.stop="handleDelete"
        >
          🗑️
        </button>
      </div>

      <div v-if="showDemo" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60" @click.self="closeDemographics">
        <div class="w-[90vw] max-w-[420px] rounded-xl bg-[#0c110c] text-white p-4">
          <h3 class="text-lg font-semibold mb-2">Уточнить данные</h3>
          <div v-if="demoStep===1" class="space-y-3">
            <p class="opacity-90">Ваш возрастной диапазон:</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="a in ages" :key="a" :class="['px-3 py-2 rounded-lg', age===a ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="age=a">{{ a }}</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-3 py-2 rounded-lg bg-white/10" @click="closeDemographics">Отмена</button>
              <button class="px-3 py-2 rounded-lg bg-white/20" :disabled="!age" @click="demoStep=2">Далее</button>
            </div>
          </div>
          <div v-else class="space-y-3">
            <p class="opacity-90">Ваш пол:</p>
            <div class="grid grid-cols-2 gap-2">
              <button :class="['px-3 py-2 rounded-lg', gender==='male' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='male'">Мужской</button>
              <button :class="['px-3 py-2 rounded-lg', gender==='female' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='female'">Женский</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-3 py-2 rounded-lg bg-white/10" @click="closeDemographics">Отмена</button>
              <button class="px-3 py-2 rounded-lg bg-white/20" :disabled="!gender" @click="saveDemographics">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
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

// Форматирование анализа с подзаголовками
function sanitize(text:string){
  return String(text||'')
    .replace(/^```[\s\S]*?\n/, '')
    .replace(/```$/,'')
}

const sections = computed(() => {
  const raw = sanitize(props.dream?.analysis || '')
  if (!raw) return [] as any[]
  const map: Record<string,{key:string,title:string,text:string}> = {
    arch: { key:'arch', title:'Архетипическая история', text:'' },
    func: { key:'func', title:'Возможная функция сна', text:'' },
    freud:{ key:'freud',title:'По Фрейду', text:'' },
    jung: { key:'jung', title:'По Юнгу', text:'' },
    emp:  { key:'emp',  title:'Эмпирический слой', text:'' }
  }
  const parts: {title:string; start:number; end:number}[] = []
  const re = /\*\*([^*]+)\*\*/g
  let m
  while((m=re.exec(raw))){ parts.push({ title:m[1].trim(), start:m.index, end: m.index + m[0].length }) }
  // Арха до первого **
  const firstStart = parts[0]?.start ?? raw.length
  map.arch.text = raw.slice(0, firstStart).trim()
  for(let i=0;i<parts.length;i++){
    const t = parts[i].title.toLowerCase()
    const body = raw.slice(parts[i].end, parts[i+1]?.start ?? raw.length).trim()
    if (t.includes('возможная функция')) map.func.text = body
    else if (t.includes('по фрейду')) map.freud.text = body
    else if (t.includes('по юнгу')) map.jung.text = body
    else if (t.includes('эмпир')) map.emp.text = body
  }
  const toHtml = (txt:string) => txt
    .replace(/\n\n+/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1')
  const res = Object.values(map).map(s=>({ ...s, html: toHtml(s.text||'') }))
  return res
})

const expanded = reactive<Record<string,boolean>>({ arch:true, func:false, freud:false, jung:false, emp:false })
function toggleSection(key:string){ expanded[key] = !expanded[key] }

// Demographics dialog
const showDemo = ref(false)
const demoStep = ref(1)
const ages = ['0-20','20-30','30-40','40-50','50+']
const age = ref('')
const gender = ref('')
function openDemographics(){ showDemo.value = true; demoStep.value=1; age.value=''; gender.value='' }
function closeDemographics(){ showDemo.value = false }
async function saveDemographics(){
  try {
    await api.setDemographics(age.value, gender.value)
    notificationStore.success('Информация сохранена')
    showDemo.value = false
  } catch(e){ notificationStore.error('Не удалось сохранить') }
}

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