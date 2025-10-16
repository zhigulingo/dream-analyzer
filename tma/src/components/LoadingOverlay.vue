<template>
  <div v-if="visible" class="overlay">
    <div class="content">
      <!-- МИМИКРИЯ ПОД РЕАЛЬНУЮ ВЁРСТКУ PersonalAccount -->
      <main class="flex flex-col gap-6 px-4 sm:px-6 md:px-8 items-center w-full">
        <!-- UserInfoCard -->
        <section class="account-block w-full max-w-72r">
          <!-- Повторяем реальную высоту закрытой карточки профиля: ~92px (py-4 + два бейджа), но видим только аватар+имя -->
          <div class="rounded-xl shimmer px-8 md:px-16 py-4 min-h-[92px] flex items-center justify-between">
            <div class="flex items-center">
              <div class="shimmer rounded-full w-10 h-10"></div>
              <div class="ml-4 shimmer h-4 w-40 rounded"></div>
            </div>
            <!-- Невидимый блок для точной высоты, без отображения бейджей -->
            <div class="opacity-0 pointer-events-none select-none h-[60px] w-0"></div>
          </div>
        </section>

        <!-- FactsCarouselV2 (full-bleed cards) -->
        <section class="account-block w-full max-w-72r">
          <div class="w-full">
            <div class="flex justify-center">
              <div class="rounded-xl fact-card shimmer w-full"></div>
            </div>
          </div>
        </section>

        <!-- DeepAnalysisCard banner -->
        <section class="account-block w-full max-w-72r">
          <div class="rounded-xl shimmer px-8 md:px-16 py-6 min-h-[8rem] flex items-center">
            <div class="shimmer h-4 w-1/2 rounded"></div>
          </div>
        </section>

        <!-- AnalysisHistoryList: 3 DreamCard placeholders -->
        <section class="account-block w-full max-w-72r">
          <div class="flex flex-col gap-4 pb-[5vh]">
            <div v-for="i in 3" :key="i" class="rounded-xl shimmer px-8 md:px-16 py-6 overflow-hidden min-h-[4.5rem]">
              <div class="flex justify-between items-center py-2 min-h-[2.5rem]">
                <div class="shimmer h-4 w-40 rounded"></div>
                <div class="shimmer h-4 w-12 rounded"></div>
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
  padding: var(--tma-safe-top, 56px) 0 28px; /* только top/bottom как в приложении; горизонтальные отступы через main px-4 */
}
.content { flex: 1; display: flex; flex-direction: column; gap: 16px; pointer-events: none; }
/* размеры карточек в слайдере фактов — подгонка под FactsCarouselV2 */
.fact-card { height: 224px; border-radius: 14px; }

/* shimmer */
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }

:host, .overlay { background-color: var(--tg-theme-bg-color, #121a12); }
</style>
