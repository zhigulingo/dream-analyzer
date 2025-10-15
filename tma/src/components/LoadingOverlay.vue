<template>
  <div v-if="visible" class="overlay">
    <div class="content">
      <!-- МИМИКРИЯ ПОД РЕАЛЬНУЮ ВЁРСТКУ PersonalAccount -->
      <main class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 items-center w-full">
        <!-- UserInfoCard -->
        <section class="account-block w-full max-w-72r">
          <div class="rounded-xl bg-white/5 px-8 md:px-16 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="shimmer rounded-full w-10 h-10"></div>
                <div class="ml-4 shimmer h-4 w-32 rounded"></div>
              </div>
              <div class="flex flex-col gap-2 ml-auto items-end">
                <div class="shimmer h-5 w-24 rounded-full"></div>
                <div class="shimmer h-5 w-16 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- FactsCarouselV2 (full-bleed cards) -->
        <section class="account-block w-full max-w-72r -mx-4 sm:-mx-6 md:-mx-8">
          <div class="w-screen px-4 sm:px-6 md:px-8">
            <div class="flex gap-2 justify-center">
              <div class="fact-card shimmer"></div>
              <div class="fact-card shimmer hidden sm:block"></div>
              <div class="fact-card shimmer hidden md:block"></div>
            </div>
          </div>
        </section>

        <!-- DeepAnalysisCard banner -->
        <section class="account-block w-full max-w-72r">
          <div class="rounded-xl bg-white/5 px-8 md:px-16 py-6">
            <div class="shimmer h-6 w-40 rounded mb-2"></div>
            <div class="shimmer h-4 w-3/4 rounded mb-4"></div>
            <div class="shimmer h-10 w-full rounded-xl"></div>
          </div>
        </section>

        <!-- AnalysisHistoryList: 3 DreamCard placeholders -->
        <section class="account-block w-full max-w-72r">
          <div class="flex flex-col gap-4 pb-[5vh]">
            <div v-for="i in 3" :key="i" class="rounded-xl bg-gradient-to-br from-[#4A58FF] to-[#5664FF] text-white px-8 md:px-16 py-6 overflow-hidden">
              <div class="flex justify-between items-center py-2 min-h-[2.5rem]">
                <div class="shimmer h-4 w-40 rounded"></div>
                <div class="shimmer h-4 w-12 rounded"></div>
              </div>
              <div class="mt-4 space-y-2">
                <div class="shimmer h-3 w-full rounded"></div>
                <div class="shimmer h-3 w-5/6 rounded"></div>
                <div class="shimmer h-3 w-2/3 rounded"></div>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-2">
                <div class="shimmer h-6 rounded-full"></div>
                <div class="shimmer h-6 rounded-full"></div>
                <div class="shimmer h-6 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>
      </main>
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
.content { flex: 1; display: flex; flex-direction: column; gap: 16px; pointer-events: none; padding-top: var(--tma-safe-top, 56px); }
/* размеры карточек в слайдере фактов — подгонка под FactsCarouselV2 */
.fact-card { height: 224px; width: min(86vw, 1152px); border-radius: 14px; }

/* shimmer */
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }

:host, .overlay { background-color: var(--tg-theme-bg-color, #121a12); }
</style>
