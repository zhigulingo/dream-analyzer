<template>
  <main class="gate-container">
    <section class="gate-card">
      <h1 class="title">Доступ скоро появится</h1>
      <p class="subtitle">Вы одобрены для бета-теста. Доступ к приложению откроется через:</p>
      <div class="countdown">
        <div class="cell"><span class="num">{{ hours }}</span><span class="lbl">час</span></div>
        <div class="cell"><span class="num">{{ minutes }}</span><span class="lbl">мин</span></div>
        <div class="cell"><span class="num">{{ seconds }}</span><span class="lbl">сек</span></div>
      </div>
      <p class="hint">Мы пришлём сообщение в бот, когда доступ откроется автоматически.</p>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
const userStore = useUserStore()

const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
let timer = null

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
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.gate-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-height: calc(100vh - var(--tma-safe-top, 56px));
}
.gate-card {
  width: 100%;
  max-width: 720px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
}
.title { margin: 0 0 8px; font-size: 20px; }
.subtitle { margin: 0 0 12px; opacity: 0.9; }
.hint { margin: 12px 0 0; color: var(--tg-theme-hint-color); }
.countdown { display: flex; gap: 12px; margin: 12px 0; }
.cell { display: flex; flex-direction: column; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 10px; }
.num { font-size: 28px; font-weight: 700; }
.lbl { font-size: 12px; opacity: 0.8; }
</style>
