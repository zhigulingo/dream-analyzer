import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

// Telegram WebApp readiness for proper UI behavior (e.g., close())
try {
  const tg = window?.Telegram?.WebApp;
  if (tg && typeof tg.ready === 'function') {
    tg.ready();
    try { tg.expand && tg.expand(); } catch {}
  }
} catch {}




