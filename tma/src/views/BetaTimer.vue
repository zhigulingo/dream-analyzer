<template>
  <main class="beta-container">
    <section class="beta-card">
      <div class="sticker-wrap">
        <StickerPlayer :fileId="stickerId" :width="180" :height="180" />
      </div>
      <h1 class="title">Добро пожаловать в бета‑тест!</h1>
      <p class="subtitle">До начала тестирования:</p>
      <div class="countdown">
        <div class="chip"><span class="num">{{ hours }}</span><span class="lbl">час</span></div>
        <div class="chip"><span class="num">{{ minutes }}</span><span class="lbl">мин</span></div>
        <div class="chip"><span class="num">{{ seconds }}</span><span class="lbl">сек</span></div>
      </div>
      <p class="hint">Мы пришлём сообщение в бот, когда доступ к анализу и личному кабинету откроется.</p>
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
/* Fullscreen center without scroll */
.beta-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}

.beta-card {
  width: 100%;
  max-width: 720px;
  background: linear-gradient(167deg, rgba(191,98,237,1) 0%, rgba(112,30,153,1) 100%);
  border-radius: 60px;
  padding: 32px 22px 26px 22px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  border: none;
}

.title {
  margin: 4px 0 10px;
  font-size: 24px;
  color: #ffffff;
  font-weight: 600;
  text-align: center;
}

.subtitle {
  margin: 0 0 14px;
  opacity: 0.95;
  color: #ffffff;
  text-align: center;
}

.sticker-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 6px;
}

.countdown {
  display: flex;
  gap: 14px;
  margin: 12px 0;
  justify-content: center;
}

.chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px;
  min-width: 120px;
  background: rgba(177,195,213,0.10);
  border: 1px solid #b1c3d5;
  border-radius: 28px;
  color: #ffffff;
}

.num {
  font-size: 28px;
  font-weight: 700;
}

.lbl {
  font-size: 12px;
  opacity: 0.8;
}
</style>