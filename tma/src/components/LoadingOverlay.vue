<template>
  <div v-if="visible" class="overlay">
    <div class="content">
      <!-- Header row: avatar + three rounded chips + debug button circle -->
      <div class="row header">
        <div class="logo shimmer"></div>
        <div class="chips">
          <div class="chip shimmer" style="width:96px"></div>
          <div class="chip shimmer" style="width:88px"></div>
          <div class="chip shimmer" style="width:120px"></div>
        </div>
        <div class="close shimmer"></div>
      </div>

      <!-- Big top card placeholder (UserInfoCard area) -->
      <div class="card shimmer"></div>

      <!-- Facts carousel stripes -->
      <div class="facts">
        <div class="fact shimmer"></div>
        <div class="fact shimmer"></div>
        <div class="fact shimmer"></div>
      </div>

      <!-- Deep analysis banner slot -->
      <div class="banner shimmer"></div>

      <!-- History list placeholders: 3 items -->
      <div class="history">
        <div class="history-item" v-for="i in 3" :key="i">
          <div class="history-top">
            <div class="h-badge shimmer"></div>
            <div class="h-date shimmer"></div>
          </div>
          <div class="h-line shimmer"></div>
          <div class="h-line short shimmer"></div>
        </div>
      </div>
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
.chips { display: flex; gap: 12px; overflow: hidden; }
.chip { width: 64px; height: 20px; border-radius: 10px; }
.close { width: 32px; height: 32px; border-radius: 50%; justify-self: end; }
.card { width: 100%; height: 220px; border-radius: 16px; }
.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.fact { height: 72px; border-radius: 14px; }
.banner { height: 84px; border-radius: 16px; }
.history { display: flex; flex-direction: column; gap: 12px; }
.history-item { border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.06); }
.history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.h-badge { width: 72px; height: 16px; border-radius: 999px; }
.h-date { width: 64px; height: 12px; border-radius: 8px; }
.h-line { width: 100%; height: 14px; border-radius: 8px; }
.h-line.short { width: 70%; }

/* shimmer */
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }

:host, .overlay { background-color: var(--tg-theme-bg-color, #121a12); }
</style>
