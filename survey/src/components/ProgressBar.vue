<template>
  <div class="wrap">
    <div class="label">Вопрос {{ current + 1 }} из {{ total }}</div>
    <div class="bar">
      <div class="fill-answered" :style="{ width: answeredPercent + '%' }"></div>
      <div class="fill-current" :style="{ width: currentPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ current: Number, total: Number, answeredUntil: { type: Number, default: -1 } });
const currentPercent = computed(() => Math.round(((props.current + 1) / props.total) * 100));
const answeredPercent = computed(() => {
  const answeredCount = props.answeredUntil >= 0 ? props.answeredUntil + 1 : 0;
  return Math.max(0, Math.min(100, Math.round((answeredCount / props.total) * 100)));
});
</script>

<style scoped>
.wrap { backdrop-filter: blur(10px) saturate(120%); -webkit-backdrop-filter: blur(10px) saturate(120%); padding: 8px 10px; border-radius: 14px; }
.label { font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 6px; }
.bar { position: relative; height: 10px; background: rgba(255,255,255,0.22); border-radius: 999px; overflow: hidden; }
.fill-answered { position: absolute; inset: 0 auto 0 0; height: 100%; background: rgba(255,255,255,0.45); }
.fill-current { position: absolute; inset: 0 auto 0 0; height: 100%; background: linear-gradient(90deg,#6A4DFF,#9A3CFF); }
</style>




