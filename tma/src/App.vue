// tma/src/App.vue
<template>
  <div class="tma-app-container">
    <PersonalAccount />
    <NotificationSystem />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

// Lazy-loaded компоненты для уменьшения начального bundle
const PersonalAccount = defineAsyncComponent({
  loader: () => import('./views/PersonalAccount.vue'),
  // Loading component для лучшего UX
  loadingComponent: () => import('./components/LoadingSpinner.vue'),
  // Delay before showing loading component
  delay: 200,
  // Error component в случае ошибки загрузки
  errorComponent: () => import('./components/ErrorBoundary.vue'),
  // Timeout для загрузки компонента
  timeout: 30000
})

const NotificationSystem = defineAsyncComponent({
  loader: () => import('./components/NotificationSystem.vue'),
  delay: 100
})
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
  display: flex;
  flex-direction: column;
}

#app {
  flex: 1;
  display: flex;
  flex-direction: column;
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
}
</style>
