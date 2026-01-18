<template>
  <Teleport to="body">
    <div v-if="dream" class="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm" @click="onBackdropClick">
      <div
        class="absolute inset-0 overflow-y-auto"
        ref="scrollerRef"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="pb-6 overlay-pad">
          <div ref="cardRef" @click.stop>
            <DreamCard :dream="dream" :active="true" :overlayMode="true" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, nextTick, watch } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import DreamCard from '@/components/DreamCard.vue'
import { useUserStore } from '@/stores/user.js'

dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps<{ dream: any | null, anchorY?: number | null }>()
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
    if (!tg?.BackButton) return
    tg.BackButton.show()
    // Always remove before adding to prevent stacking
    tg.BackButton.offClick(handleBack)
    tg.BackButton.onClick(handleBack)
  } catch (e) { console.error('Error showing back button:', e) }
}
function hideBackButton() {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    if (!tg?.BackButton) return
    tg.BackButton.hide()
    tg.BackButton.offClick(handleBack)
  } catch (e) { console.error('Error hiding back button:', e) }
}
function handleBack(){
  const userStore = useUserStore()
  if (userStore.activeCategoryModal) {
    userStore.activeCategoryModal = null
    if (window.triggerHaptic) window.triggerHaptic('light')
    return
  }
  emit('close')
}

const cardRef = ref<HTMLElement | null>(null)

function onBackdropClick(e: MouseEvent) {
  const el = cardRef.value
  if (el && el.contains(e.target as Node)) return
  emit('close')
}

onMounted(() => {
  // Инициализируем кнопку, если оверлей открыт при монтировании
  if (props.dream) {
    try { document.body.style.overflow = 'hidden' } catch {}
    showBackButton()
  }
})

watch(() => props.dream, (val) => {
  const userStore = useUserStore()
  if (val) {
    // При открытии нового сна ВСЕГДА сбрасываем состояние вложенных окон,
    // чтобы не открывался старый экран (например, символы) при смене сна.
    userStore.activeCategoryModal = null
    try { document.body.style.overflow = 'hidden' } catch {}
    showBackButton()
  } else {
    // При закрытии оверлея очищаем и состояние вложенных окон
    userStore.activeCategoryModal = null
    hideBackButton()
    try { document.body.style.overflow = '' } catch {}
  }
})
onBeforeUnmount(() => {
  hideBackButton()
  try { document.body.style.overflow = '' } catch {}
})

// Fixed padding handled via CSS (.overlay-pad)

// Pull-down to close (gesture)
const scrollerRef = ref<HTMLElement | null>(null)
let startY = 0
let dragging = false
let startedAtTop = false
let dragDelta = 0

function onTouchStart(e: TouchEvent) {
  try {
    const scroller = scrollerRef.value
    if (!scroller) return
    startedAtTop = scroller.scrollTop <= 0
    if (!startedAtTop) return
    startY = e.touches[0].clientY
    dragDelta = 0
    dragging = true
  } catch {}
}
function onTouchMove(e: TouchEvent) {
  if (!dragging || !startedAtTop) return
  const y = e.touches[0].clientY
  dragDelta = Math.max(0, y - startY)
  if (dragDelta > 0) {
    e.preventDefault()
    const el = cardRef.value as HTMLElement | null
    if (el) el.style.transform = `translateY(${Math.min(120, dragDelta)}px)`
  }
}
function onTouchEnd() {
  if (dragging && startedAtTop && dragDelta >= 120) {
    emit('close')
  } else {
    const el = cardRef.value as HTMLElement | null
    if (el) el.style.transform = ''
  }
  dragging = false
  startedAtTop = false
  startY = 0
  dragDelta = 0
}
</script>

<style scoped>
/* Ensure visible top gap on devices with notches/status bar */
.overlay-pad {
  /* Fixed gap so header never hides under Telegram UI */
  padding-top: 64px;
  /* If we know safe area (via CSS var or env()), add it on top of fixed gap */
  padding-top: calc(var(--tg-safe-top, env(safe-area-inset-top, 0px)) + 64px);
}
</style>
