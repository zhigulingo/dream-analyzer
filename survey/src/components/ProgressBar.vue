<template>
  <div class="wrap">
    <div class="label">Вопрос {{ current + 1 }} из {{ total }}</div>
    <div class="bar">
      <div class="fill" :style="{ width: percent + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ current: Number, total: Number });
const percent = computed(() => Math.round(((props.current + 1) / props.total) * 100));
</script>

<style scoped>
.wrap { backdrop-filter: blur(10px) saturate(120%); -webkit-backdrop-filter: blur(10px) saturate(120%); padding: 6px 8px; border-radius: 12px; }
.label { font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 6px; }
.bar { height: 8px; background: rgba(255,255,255,0.25); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg,#6A4DFF,#9A3CFF); }
</style>




