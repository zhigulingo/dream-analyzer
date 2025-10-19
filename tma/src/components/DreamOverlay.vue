<template>
  <Teleport to="body">
    <div v-if="dream" class="fixed inset-0 z-[9998] bg-black/70" @wheel.prevent @touchmove.prevent>
      <div class="absolute inset-0 overflow-y-auto">
        <div class="w-[92vw] max-w-[720px] mx-auto my-4 md:my-6 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#0c110c)] text-white shadow-2xl border border-white/10">
          <div class="px-8 md:px-16 py-5">
            <h2 class="text-2xl font-semibold leading-tight">{{ displayTitle }}</h2>
            <div class="text-sm opacity-80 mt-1">{{ fullDate }}</div>
          </div>
          <div class="px-8 md:px-16 pb-6">
            <DreamCard :dream="dream" :active="true" :overlayMode="true" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import DreamCard from '@/components/DreamCard.vue'

dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps<{ dream: any | null }>()
const emit = defineEmits(['close'])

// Title derivation (aligned with DreamCard)
const stopwords = new Set([
  'и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','была','сам','чтоб','без','будто','чего','раз','тоже','себе','под','будет','ж','тогда','кто','этот','того','потому','этого','какой','совсем','ним','здесь','этом','один','почти','мой','тем','чтобы','нее','кажется','сейчас','были','куда','зачем','всех','никогда','можно','при','наконец','два','об','другой','хоть','после','над','больше','тот','через','эти','нас','про','всего','них','какая','много','разве','три','эту','моя','впрочем','хорошо','свою','этой','перед','иногда','лучше','чуть','том','нельзя','такой','им','более','всегда','конечно','всю','между'
])
const toTitleCase = (text:string) => String(text||'').replace(/\s+/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const extractTitleFromText = (text:string) => {
  if (!text) return ''
  const firstSentence = String(text).split(/[.!?\n]/)[0]
  const words = firstSentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter(w => w && !stopwords.has(w) && w.length > 3)
  const picked = words.slice(0, 3)
  if (picked.length === 0) return firstSentence.slice(0, 40)
  return toTitleCase(picked.join(' '))
}
const refineTitle = (t:string) => {
  if (!t) return ''
  let s = String(t).toLowerCase().replace(/["'«»]/g,'').trim()
  s = s.replace(/^(приснилось|снилось|сон о|сон про|сон|мне снится|мне приснилось)\s+/i,'')
  s = s.replace(/\s+/g,' ').trim()
  const words = s.split(' ').filter(Boolean).slice(0,3)
  if (!words.length) return ''
  return words.join(' ')
}
const toSentenceCase = (s:string) => {
  if (!s) return ''
  const lower = String(s).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
const displayTitle = computed(() => {
  const deepTitle = refineTitle(String(props.dream?.deep_source?.title || ''))
  if (deepTitle) return toSentenceCase(deepTitle)
  const raw = (props.dream?.deep_source?.tags || []).filter(Boolean)
  const normalizeTag = (s:string)=>{
    let t = String(s||'').trim()
    t = t.split(/[\\/,(;:—–-]/)[0]?.trim() || ''
    if (!t) return ''
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }
  const tags = raw.map(normalizeTag).filter(Boolean)
  if (tags.length) {
    const title = tags.slice(0,2).join(' и ')
    return toSentenceCase(title || 'Без названия')
  }
  const t = refineTitle(extractTitleFromText(String(props.dream?.dream_text || '')))
  return toSentenceCase(t || 'Без названия')
})

const fullDate = computed(() => {
  const created = props.dream?.created_at
  if (!created) return ''
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess()
    return dayjs.utc(created).tz(tz).format('D MMMM YYYY, HH:mm')
  } catch { return created }
})

function showBackButton() {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.show?.()
    tg?.BackButton?.onClick?.(handleBack)
  } catch {}
}
function hideBackButton() {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.hide?.()
    tg?.BackButton?.offClick?.(handleBack)
  } catch {}
}
function handleBack(){
  emit('close')
}

onMounted(() => {
  try { document.body.style.overflow = 'hidden' } catch {}
  showBackButton()
})
onBeforeUnmount(() => {
  hideBackButton()
  try { document.body.style.overflow = '' } catch {}
})
</script>

<style scoped>
</style>
