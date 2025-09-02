<template>
  <div>
    <h1>Бета‑тест Dream Analyzer</h1>
    <p>Мы готовим закрытый бета‑тест. Ответьте на 10 вопросов, чтобы подать заявку.</p>
    <div v-if="countdown && countdown.totalMs > 0" class="timer">
      Старт через: {{ countdown.days }}д {{ countdown.hours }}ч {{ countdown.minutes }}м {{ countdown.seconds }}с
    </div>
    <button class="start" :disabled="!isOpen" @click="$emit('start')">
      Начать опрос
    </button>
    <p v-if="!isOpen">Опрос ещё не начался.</p>
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
h1 { font-size: 22px; margin: 0 0 8px; }
p { color: #555; }
.timer { margin: 12px 0; color: #111; font-weight: 600; }
.start { margin-top: 16px; padding: 12px 16px; border-radius: 10px; background: #16a34a; color: #fff; border: none; cursor: pointer; }
.start:disabled { background: #a7f3d0; cursor: not-allowed; }
</style>


