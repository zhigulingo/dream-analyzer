// tma/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue' // Ваш корневой компонент Vue
// import router from './router' // Раскомментируйте, если используете Vue Router

// Импортируйте ваши глобальные стили, если есть
import "./index.css"
// import './assets/main.css'

const app = createApp(App)

app.use(createPinia()) // Подключаем Pinia
// app.use(router) // Подключаем роутер, если есть

app.mount('#app') // Монтируем приложение в <div id="app"> из index.html

// Инициализация Telegram WebApp API (не обязательно здесь, но удобно)
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand(); // Раскрываем окно приложения в полный экран
    window.Telegram.WebApp.enableClosingConfirmation(); // Подтверждение закрытия
    console.log("Telegram WebApp is ready.");
    
    // Добавляем хаптик на все клики
    document.addEventListener('click', () => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
    
    // Добавляем хаптик на все тапы (для мобильных устройств)
    document.addEventListener('touchstart', () => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
} else {
    console.warn("Telegram WebApp script not loaded or executed.");
}
