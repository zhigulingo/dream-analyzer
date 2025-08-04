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
    const tg = window.Telegram.WebApp;
    
    tg.ready();
    
    // Максимальное раскрытие в полный экран
    tg.expand();
    
    // Дополнительные настройки для полного экрана
    setTimeout(() => {
        tg.expand();
        
        // Устанавливаем размеры viewport
        if (tg.viewportHeight) {
            document.documentElement.style.height = tg.viewportHeight + 'px';
            document.body.style.height = tg.viewportHeight + 'px';
        }
        
        // Убираем возможность скролла за пределы приложения
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        
        // Принудительно устанавливаем полноэкранный режим
        if (tg.MainButton) {
            tg.MainButton.hide();
        }
        
        console.log('Viewport height:', tg.viewportHeight);
        console.log('Is expanded:', tg.isExpanded);
    }, 100);
    
    console.log("Telegram WebApp is ready.");
    
    // Создаем глобальную функцию для хаптиков
    window.triggerHaptic = (type = 'light') => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(type);
        }
    };
    
} else {
    console.warn("Telegram WebApp script not loaded or executed.");
    
    // Fallback для тестирования вне Telegram
    window.triggerHaptic = () => {};
}
