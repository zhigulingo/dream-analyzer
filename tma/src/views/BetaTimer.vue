<template>
  <main class="beta-container">
    <section class="beta-card">
      <div class="sticker-wrap">
        <StickerPlayer :fileId="stickerId" :width="180" :height="180" />
      </div>
      <h1 class="title">Доступ скоро появится</h1>
      <p class="subtitle">Вы одобрены для бета‑теста. Доступ откроется через:</p>
      <div class="countdown">
        <div class="chip"><span class="num">{{ hours }}</span><span class="lbl">час</span></div>
        <div class="chip"><span class="num">{{ minutes }}</span><span class="lbl">мин</span></div>
        <div class="chip"><span class="num">{{ seconds }}</span><span class="lbl">сек</span></div>
      </div>
      <p class="hint">Мы пришлём сообщение в бот, когда доступ откроется автоматически.</p>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import StickerPlayer from '@/components/StickerPlayer.vue'
const userStore = useUserStore()

const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
let timer = null
const stickerId = 'CAACAgEAAxkBAAEPf8Zo4QXOaaTjfwVq2EdaYp2t0By4UAAC-gEAAoyxIER4c3iI53gcxDYE'

function updateCountdown() {
  const target = new Date(userStore.profile?.beta_access_at || Date.now()).getTime()
  const now = Date.now()
  let diff = Math.max(0, Math.floor((target - now) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  hours.value = String(h).padStart(2, '0')
  minutes.value = String(m).padStart(2, '0')
  seconds.value = String(s).padStart(2, '0')
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
  try {
    const tg = window?.Telegram?.WebApp
    if (tg?.MainButton) {
      tg.MainButton.setParams({ text: 'Закрыть', is_active: true, is_visible: true, color: '#FFFFFF', text_color: '#000000' })
      tg.MainButton.onClick(closeApp)
      tg.MainButton.show()
    }
  } catch (_) {}
})

function closeApp() {
  try { window?.Telegram?.WebApp?.close?.() } catch (_) {}
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
  try {
    const tg = window?.Telegram?.WebApp
    if (tg?.MainButton) {
      tg.MainButton.hide();
      tg.MainButton.offClick(closeApp)
    }
  } catch (_) {}
})
</script>

<style scoped>
.beta-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-height: calc(100vh - var(--tma-safe-top, 56px));
}
.beta-card {
  width: 100%;
  max-width: 720px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 20px 16px 18px 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
}
.title { margin: 0 0 8px; font-size: 20px; }
.subtitle { margin: 0 0 12px; opacity: 0.9; }
.hint { margin: 12px 0 0; color: var(--tg-theme-hint-color); }
.sticker-wrap { display: flex; justify-content: center; margin-bottom: 6px; }
.countdown { display: flex; gap: 8px; margin: 10px 0; justify-content: center; }
.chip { display: flex; flex-direction: column; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.08); border-radius: 12px; min-width: 72px; }
.num { font-size: 28px; font-weight: 700; }
.lbl { font-size: 12px; opacity: 0.8; }
</style>
