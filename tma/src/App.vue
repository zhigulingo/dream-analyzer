// tma/src/App.vue
<template>
  <div class="tma-app-container">
    <DebugInfo />
    <PersonalAccount v-if="!onboardingVisible && appReady" />
    <NotificationSystem />
    <Onboarding @visible-change="onboardingVisible = $event" />
    <LoadingOverlay :visible="isLoadingGlobal && !onboardingVisible" />
  </div>
</template>

<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'

// Lazy-loaded компоненты для уменьшения начального bundle
const PersonalAccount = defineAsyncComponent(() => import('./views/PersonalAccount.vue'))
const NotificationSystem = defineAsyncComponent(() => import('./components/NotificationSystem.vue'))
const DebugInfo = defineAsyncComponent(() => import('./components/DebugInfo.vue'))
const Onboarding = defineAsyncComponent(() => import('./components/Onboarding.vue'))
const LoadingOverlay = defineAsyncComponent(() => import('./components/LoadingOverlay.vue'))

const onboardingVisible = ref(false)
const userStore = useUserStore()
// Готовность считаем по факту загрузки профиля (историю можно догрузить чуть позже, чтобы не зависать)
const appReady = computed(() => !userStore.isLoadingProfile && !!userStore.profile)
const isLoadingGlobal = computed(() => userStore.isLoadingProfile)
onMounted(async () => {
  // Глобальная загрузка данных, чтобы оверлей корректно скрывался даже при активном онбординге
  try {
    userStore.initServices()
    await userStore.fetchProfile()
    // Историю грузим в фоне, чтобы не держать прелоадер
    userStore.fetchHistory().catch(() => {})
  } catch (e) {
    // Ошибки уже обработаются в errorService внутри стора
  }
})
// no message on overlay per spec
</script>

<style>
@import "./theme.css";
/* Глобальные стили или стили для App.vue */
/* Можно импортировать CSS-файл: @import './assets/base.css'; */

:root {
  /* Fallback values in case Telegram WebApp variables are not available */
  --tg-theme-bg-color: var(--color-bg, #121a12);
  --tg-theme-text-color: var(--color-text, #ffffff);
  --tg-theme-hint-color: var(--color-muted, #b1c3d5);
  --tg-theme-link-color: var(--color-accent, #366832);
  --tg-theme-button-color: var(--color-accent, #366832);
  --tg-theme-button-text-color: #ffffff;
  --tg-theme-secondary-bg-color: var(--color-card, #0c110c);
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-bg-color);
  min-height: 100vh;
  min-height: 100dvh; /* Для современных браузеров */
  display: flex;
  flex-direction: column;
  overscroll-behavior: none;
  position: fixed; /* Фиксируем позицию для предотвращения скролла */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

#app {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  height: 100dvh; /* Для современных браузеров */
  overflow: hidden; /* Предотвращаем скролл */
}

.tma-app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto; /* Разрешаем вертикальный скролл внутри контейнера */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Плавный скролл на iOS */
}
</style>
