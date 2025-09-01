// tma/src/App.vue
<template>
  <div class="tma-app-container">
    <DebugInfo />
    <PersonalAccount v-if="!onboardingVisible && appReady" />
    <NotificationSystem />
    <Onboarding :visible="onboardingVisible" @visible-change="onboardingVisible = $event" />
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

// ЛОГИКА ПОКАЗА ОНБОРДИНГА
const shouldShowOnboarding = computed(() => {
  if (!userStore.profile) return false

  const subType = userStore.profile.subscription_type
  const onboardingStage = userStore.profile.onboarding_stage

  // Показываем онбординг ТОЛЬКО если:
  // 1. Тип подписки = 'onboarding1' (не onboarding2!)
  // 2. И onboarding_stage не завершен (не stage3)
  return subType === 'onboarding1' &&
         (!onboardingStage || onboardingStage !== 'stage3')
})

onMounted(async () => {
  // Глобальная загрузка данных, чтобы оверлей корректно скрывался даже при активном онбординге
  try {
    userStore.initServices()
    await userStore.fetchProfile()
    // Историю грузим в фоне, чтобы не держать прелоадер
    userStore.fetchHistory().catch(() => {})

    // Проверяем нужно ли показывать онбординг ПОСЛЕ загрузки профиля
    if (shouldShowOnboarding.value) {
      onboardingVisible.value = true
    }
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

/* Базовые стили для всех устройств */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-bg-color);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overscroll-behavior: none;
}

/* Полноэкранные стили ТОЛЬКО для мобильных устройств */
@media (max-width: 768px), (max-height: 1024px) and (orientation: portrait) {
  body {
    min-height: 100dvh;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    overscroll-behavior-y: none;
    overscroll-behavior-x: none;
    -webkit-overflow-scrolling: auto;
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }
}

/* Стили для имитированного fullscreen режима */
.simulated-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  outline: none !important;
  z-index: 999999 !important;
}

/* Дополнительные стили для мобильного fullscreen */
@media (max-width: 768px) {
  .simulated-fullscreen {
    -webkit-transform: none !important;
    transform: none !important;
    -webkit-transition: none !important;
    transition: none !important;
  }

  /* Скрываем scrollbars в fullscreen режиме */
  .simulated-fullscreen::-webkit-scrollbar {
    display: none !important;
  }

  .simulated-fullscreen {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
}

/* СТИЛИ ДЛЯ ОГРАНИЧЕНИЯ РАЗМЕРА НА ДЕСКТОПЕ */
@media (min-width: 1025px) {
  html, body {
    max-height: 600px !important;
    height: 600px !important;
    overflow: hidden !important;
  }

  #app {
    max-height: 600px !important;
    height: 600px !important;
  }

  /* Предотвращаем любые попытки изменения размера */
  html, body, #app {
    resize: none !important;
    -webkit-resize: none !important;
  }
}

/* Базовые стили для #app */
#app {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Полноэкранные стили для #app ТОЛЬКО на мобильных */
@media (max-width: 768px), (max-height: 1024px) and (orientation: portrait) {
  #app {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
}

/* Базовые стили для контейнера */
.tma-app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
}

/* СТИЛИ ДЛЯ ОНБОРДИНГА */
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.opaque {
  backdrop-filter: blur(8px);
}

.onboarding-card {
  background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  border-radius: 16px;
  padding: 32px;
  margin: 8px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 8px 32px rgba(106, 77, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.onboarding-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.headline {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
}

.centered {
  text-align: center;
}

.slidePeek {
  transform: scale(0.92);
  opacity: 0.7;
}

.center-card {
  transform: scale(1);
  opacity: 1;
  transition: all 0.25s ease;
}

.onboarding-card.center-card {
  transform: scale(1);
  opacity: 1;
}

/* Swiper стили для онбординга */
.swiper {
  width: 100%;
  height: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.swiper-wrapper {
  height: 100%;
}

.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: auto !important;
}

.swiper-slide-active.center-card {
  transform: scale(1) !important;
  opacity: 1 !important;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .swiper {
    max-width: 90vw;
  }

  .onboarding-card {
    padding: 24px;
    min-height: 180px;
  }

  .headline {
    font-size: 20px;
  }
}

/* Полноэкранные стили для контейнера ТОЛЬКО на мобильных */
@media (max-width: 768px), (max-height: 1024px) and (orientation: portrait) {
  .tma-app-container {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
