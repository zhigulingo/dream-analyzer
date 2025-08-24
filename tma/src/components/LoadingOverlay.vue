<template>
  <div v-if="visible" class="overlay">
    <div class="content">
      <div class="row header">
        <div class="logo shimmer"></div>
        <div class="chips">
          <div class="chip shimmer" v-for="i in 5" :key="i"></div>
        </div>
        <div class="close shimmer"></div>
      </div>
      <div class="card shimmer"></div>
      <div class="line shimmer"></div>
      <div class="line short shimmer"></div>
      <div class="card shimmer"></div>
      <div class="line shimmer"></div>
      <div class="line short shimmer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{ visible: boolean }>()
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--tg-theme-bg-color, #121a12);
  pointer-events: auto; /* intercept events so фон не кликается */
  z-index: 2000;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 28px;
}
.content { flex: 1; display: flex; flex-direction: column; gap: 16px; pointer-events: none; }
/* no top message per spec */
.row.header { display: grid; grid-template-columns: 40px 1fr 32px; align-items: center; gap: 12px; }
.logo { width: 40px; height: 40px; border-radius: 12px; }
.chips { display: flex; gap: 12px; }
.chip { width: 64px; height: 20px; border-radius: 10px; }
.close { width: 32px; height: 32px; border-radius: 50%; justify-self: end; }
.card { width: 100%; height: 260px; border-radius: 16px; }
.line { width: 60%; height: 18px; border-radius: 9px; }
.line.short { width: 36%; }

/* shimmer */
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }

:host, .overlay { background-color: var(--tg-theme-bg-color, #121a12); }
</style>
