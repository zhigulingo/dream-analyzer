// tma/src/App.vue
<template>
  <!-- Use router-view instead of directly rendering PersonalAccount -->
  <router-view />
</template>

<script setup>
// No need to import PersonalAccount here anymore, routing will handle it
</script>

<style>
/* Глобальные стили или стили для App.vue */
/* Можно импортировать CSS-файл: @import './assets/base.css'; */

/* Пример использования переменных Telegram для всего приложения */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--tg-theme-text-color, #000);
  background-color: var(--tg-theme-bg-color, #fff);
}
</style>
