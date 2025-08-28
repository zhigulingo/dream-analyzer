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

// Инициализация Telegram WebApp API (ожидаем загрузку SDK на мобильных)
const initTelegram = () => {
  if (!window.Telegram?.WebApp) return false;
  const tg = window.Telegram.WebApp;
  try { tg.ready(); } catch (_) {}
  try { tg.expand(); } catch (_) {}
  return true;
};

if (initTelegram()) {
    const tg = window.Telegram.WebApp;
    
    tg.ready();
    
    // Включаем полноэкранный режим
    tg.expand();
    
    // Запрашиваем полноэкранный режим браузера
    const requestFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    };
    
    // Дополнительные настройки для полного экрана
    setTimeout(() => {
        tg.expand();
        
        // Пытаемся войти в полноэкранный режим на мобильных устройствах
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            requestFullscreen();
        }
        
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
    
    // Добавляем подтверждение закрытия приложения
    const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Вы уверены, что хотите закрыть приложение?';
        return 'Вы уверены, что хотите закрыть приложение?';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Также обрабатываем событие закрытия Telegram WebApp
    if (tg.onEvent) {
        tg.onEvent('viewportChanged', () => {
            if (tg.isClosing) {
                const confirm = window.confirm('Вы уверены, что хотите закрыть приложение?');
                if (!confirm) {
                    tg.expand();
                }
            }
        });
    }
    
    console.log("Telegram WebApp is ready.");
    
    // Создаем глобальную функцию для хаптиков
    window.triggerHaptic = (type = 'light') => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(type);
        }
    };
    
    // Глобальная функция для входа в полноэкранный режим
    window.enterFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    };
    
} else {
    // Подождем загрузки SDK, что бывает в мобильном Telegram
    console.warn("Telegram WebApp not available yet, waiting for SDK...");
    let attempts = 0;
    const maxAttempts = 20; // ~2s
    const timer = setInterval(() => {
      attempts++;
      if (initTelegram()) {
        clearInterval(timer);
        const tg = window.Telegram.WebApp;
        setTimeout(() => {
          tg?.expand?.();
        }, 50);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.warn("Telegram WebApp script not loaded. Running in fallback mode.");
        // Fallback для тестирования вне Telegram
        window.triggerHaptic = () => {};
      }
    }, 100);
}
