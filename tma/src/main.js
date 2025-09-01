// tma/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue' // Ваш корневой компонент Vue
// import router from './router' // Раскомментируйте, если используете Vue Router

// Импортируйте ваши глобальные стили, если есть
import "./index.css"
// import './assets/main.css'

// ПРОСТАЯ ИНИЦИАЛИЗАЦИЯ TELEGRAM API
// Создаем базовые заглушки для Telegram API
if (typeof window !== 'undefined') {
  if (!window.Telegram) {
    window.Telegram = {
      WebApp: {
        ready: () => {},
        requestFullscreen: () => {},
        exitFullscreen: () => {},
        expand: () => {},
        disableVerticalSwipes: () => {},
        enableClosingConfirmation: () => {},
        MainButton: {
          hide: () => {},
          show: () => {},
          setParams: () => {},
          offClick: () => {},
          onClick: () => {}
        },
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 600,
        viewportChanged: () => {},
        onEvent: () => {},
        HapticFeedback: {
          impactOccurred: () => {}
        }
      }
    };
  }

  if (!window.TelegramGameProxy) {
    window.TelegramGameProxy = {
      receiveEvent: () => {},
      initParams: {},
      sendData: () => {}
    };
  }

  // Простая инициализация
  if (window.Telegram?.WebApp?.ready) {
    window.Telegram.WebApp.ready();
  }
}

console.log('🚀 [MAIN] Starting Vue app initialization... v1.2.1');
console.log('🚀 [MAIN] Current URL:', window.location.href);
console.log('🚀 [MAIN] Timestamp:', new Date().toISOString());
console.log('🚀 [MAIN] Telegram WebApp available:', typeof window !== 'undefined' && window.Telegram?.WebApp);

const app = createApp(App)

app.use(createPinia()) // Подключаем Pinia
// app.use(router) // Подключаем роутер, если есть

app.mount('#app') // Монтируем приложение в <div id="app"> из index.html

console.log('✅ [MAIN] Vue app mounted successfully');

// ПРОСТЫЕ ГЛОБАЛЬНЫЕ ФУНКЦИИ
window.triggerHaptic = (type = 'light') => {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (error) {
    console.error('❌ [HAPTIC] Error:', error);
  }
};
