<template>
  <main class="beta-container">
    <div class="brand-pill">
      <div class="brand-dot"></div>
      <div class="brand-text">Dreams Talk</div>
    </div>
    <section class="beta-card">
      <div class="sticker-wrap">
        <StickerPlayer :fileId="stickerId" :width="180" :height="180" />
      </div>
      <h1 class="title">Доступ скоро появится</h1>
      <p class="subtitle">Вы одобрены для бета‑теста. Доступ откроется через:</p>
      <div class="countdown">
        <div class="chip">
          <svg class="chip-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          <span class="num">{{ hours }}</span><span class="lbl">час</span>
        </div>
        <div class="chip">
          <svg class="chip-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 12l5 0"/></svg>
          <span class="num">{{ minutes }}</span><span class="lbl">мин</span>
        </div>
        <div class="chip">
          <svg class="chip-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 12l0 5"/></svg>
          <span class="num">{{ seconds }}</span><span class="lbl">сек</span>
        </div>
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
.brand-pill {
  position: absolute;
  top: calc(var(--tma-safe-top, 56px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: #4957FF;
  border-radius: 40px;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.brand-dot { width: 26px; height: 26px; background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 28 28%22><circle cx=%2214%22 cy=%2214%22 r=%2212%22 fill=%22%23fff%22/></svg>') center/contain no-repeat; }
.brand-text { font-weight: 700; font-size: 16px; font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
.beta-card {
  width: 100%;
  max-width: 720px;
  background: linear-gradient(167deg, rgba(191,98,237,1) 0%, rgba(112,30,153,1) 100%);
  border-radius: 36px;
  padding: 28px 18px 20px 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.06);
}
.title { margin: 4px 0 10px; font-size: 24px; color: #fff; font-weight: 600; text-align: center; }
.subtitle { margin: 0 0 14px; opacity: 0.95; color: #fff; text-align: center; }
.sticker-wrap { display: flex; justify-content: center; margin-bottom: 6px; }
.countdown { display: flex; gap: 14px; margin: 12px 0; justify-content: center; }
.chip {
  display: inline-flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 20px; min-width: 92px;
  background: rgba(177,195,213,0.10);
  border: 1px solid #b1c3d5; border-radius: 28px; color: #fff;
}
.chip-ico { width: 36px; height: 36px; opacity: 0.9; }
.num { font-size: 28px; font-weight: 700; }
.lbl { font-size: 12px; opacity: 0.8; }
</style>
