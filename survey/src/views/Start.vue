<template>
  <div class="start-wrap">
    <div class="start-card">
      <h1>Бета‑тест Dream Analyzer</h1>
      <p class="lead">Ответьте на 10 вопросов, чтобы участвовать в закрытом тесте.</p>
      <div v-if="countdown && countdown.totalMs > 0" class="timer">
        Старт через: {{ countdown.days }}д {{ countdown.hours }}ч {{ countdown.minutes }}м {{ countdown.seconds }}с
      </div>
      <button class="start" :disabled="!isOpen" @click="$emit('start')">
        Начать опрос
      </button>
      <p class="muted" v-if="!isOpen">Опрос ещё не начался.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { getSurveyStatus } from '../services/api';

const isOpen = ref(true);
const countdown = ref(null);
let t;

function computeCountdown(targetIso) {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const totalMs = Math.max(0, target - now);
  const days = Math.floor(totalMs / (24*3600e3));
  const hours = Math.floor((totalMs % (24*3600e3)) / 3600e3);
  const minutes = Math.floor((totalMs % 3600e3) / 60e3);
  const seconds = Math.floor((totalMs % 60e3) / 1e3);
  return { totalMs, days, hours, minutes, seconds };
}

onMounted(async () => {
  try {
    const data = await getSurveyStatus();
    if (data.startAt) {
      countdown.value = computeCountdown(data.startAt);
      isOpen.value = data.isOpen;
      t = setInterval(() => {
        countdown.value = computeCountdown(data.startAt);
      }, 1000);
    } else {
      isOpen.value = data.isOpen;
    }
  } catch {
    isOpen.value = true; // локальный фолбэк
  }
});

onUnmounted(() => { if (t) clearInterval(t); });
</script>

<style scoped>
.start-wrap { display: flex; justify-content: center; }
.start-card {
  width: 100%; max-width: 560px; margin-top: 24px; padding: 24px;
  border-radius: 20px; color: #fff;
  background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  box-shadow: 0 12px 28px rgba(0,0,0,0.16);
}
h1 { font-size: 22px; margin: 0 0 8px; }
.lead { opacity: 0.95; }
.muted { opacity: 0.8; }
.timer { margin: 12px 0; color: #fff; font-weight: 600; }
.start { margin-top: 16px; padding: 12px 16px; border-radius: 12px; background: #ffffff; color: #111827; border: none; cursor: pointer; }
.start:disabled { background: rgba(255,255,255,0.6); cursor: not-allowed; }
</style>


