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

const displayTitle = computed(() => {
  const t = String(props.dream?.deep_source?.title || '').trim()
  if (t) return t.replace(/["'«»]/g,'').trim()
  return 'Сон'
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
