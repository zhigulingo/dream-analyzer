<template>
  <div>
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
.label { font-size: 14px; color: #555; margin-bottom: 8px; }
.bar { height: 8px; background: #eee; border-radius: 999px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg,#6366f1,#22c55e); }
</style>




