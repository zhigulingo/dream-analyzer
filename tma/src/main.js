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

// Функция детекции типа устройства
const detectDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent) ||
                   (screenWidth <= 768 && screenHeight <= 1024) ||
                   ('ontouchstart' in window) ||
                   (screenWidth <= screenHeight && screenWidth < 768);

  const isDesktop = /windows|macintosh|linux/i.test(userAgent) &&
                    !/mobile|tablet|android|iphone|ipad|ipod/i.test(userAgent) &&
                    screenWidth > 1024 &&
                    screenHeight > 768;

  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  return {
    isMobile,
    isDesktop,
    isIOS,
    isAndroid,
    screenWidth,
    screenHeight,
    userAgent
  };
};

// Функция для браузерного полноэкранного режима
const enterBrowserFullscreen = () => {
  const doc = document.documentElement;

  if (doc.requestFullscreen) {
    return doc.requestFullscreen();
  } else if (doc.webkitRequestFullscreen) {
    return doc.webkitRequestFullscreen();
  } else if (doc.mozRequestFullScreen) {
    return doc.mozRequestFullScreen();
  } else if (doc.msRequestFullscreen) {
    return doc.msRequestFullscreen();
  } else {
    console.warn('Fullscreen API not supported');
    return Promise.reject(new Error('Fullscreen not supported'));
  }
};

// Функция для выхода из браузерного полноэкранного режима
const exitBrowserFullscreen = () => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
};

// Инициализация Telegram WebApp API для мобильных устройств
const initTelegramMobile = () => {
  if (!window.Telegram?.WebApp) return false;
  const tg = window.Telegram.WebApp;

  try {
    tg.ready();

    // Для мобильных устройств в Telegram используем tg.expand()
    tg.expand();
    console.log('Mobile Telegram: expanded app');

    // Дополнительно пробуем браузерный fullscreen
    enterBrowserFullscreen().catch(err => {
      console.log('Browser fullscreen failed (expected in Telegram):', err);
    });

  } catch (error) {
    console.error('Error initializing Telegram mobile:', error);
  }

  return true;
};

// Инициализация Telegram WebApp API для десктопа
const initTelegramDesktop = () => {
  if (!window.Telegram?.WebApp) return false;
  const tg = window.Telegram.WebApp;

  try {
    tg.ready();

    // Для десктопа НЕ расширяем приложение
    // Оставляем обычное окно браузера
    console.log('Desktop Telegram: keeping regular window size');

    // Пробуем браузерный fullscreen для десктопа
    enterBrowserFullscreen().catch(err => {
      console.log('Browser fullscreen failed on desktop:', err);
    });

  } catch (error) {
    console.error('Error initializing Telegram desktop:', error);
  }

  return true;
};

// Общая инициализация (fallback)
const initTelegram = () => {
  if (!window.Telegram?.WebApp) return false;
  const tg = window.Telegram.WebApp;
  try { tg.ready(); } catch (_) {}
  return true;
};

// Функция защиты от свайпов (только для мобильных)
const preventSwipeClose = (e) => {
  if (e.touches && e.touches[0]) {
    const touch = e.touches[0];
    if (touch.clientY < 100) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
};

// Функция повторного применения защиты от свайпов
const reapplySwipeProtection = () => {
  const tg = window.Telegram?.WebApp;
  if (tg?.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg?.enableClosingConfirmation) tg.enableClosingConfirmation();
};

// Функция настройки полноэкранного режима для мобильных устройств
const setupMobileFullscreen = (tg) => {
  if (!tg) return;

  console.log('Setting up mobile fullscreen mode');

  // Расширяем приложение через Telegram API
  tg.expand();

  // Устанавливаем фоновый цвет для status bar
  document.body.style.backgroundColor = '#121a12';

  // Настраиваем viewport для мобильных
  const viewport = tg.viewportHeight;
  if (viewport) {
    document.documentElement.style.height = viewport + 'px';
    document.body.style.height = viewport + 'px';
    document.body.style.minHeight = viewport + 'px';
  }

  // Убираем скролл за пределы приложения
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';

  // Защита от свайпов через Telegram API
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
    console.log('✅ Vertical swipes disabled');
  }

  if (typeof tg.enableClosingConfirmation === 'function') {
    tg.enableClosingConfirmation();
    console.log('✅ Closing confirmation enabled');
  }

  // CSS защита от свайпов
  document.body.style.touchAction = 'none';
  document.documentElement.style.touchAction = 'none';

  // Добавляем обработчики touch событий
  document.addEventListener('touchstart', preventSwipeClose, { passive: false });
  document.addEventListener('touchmove', preventSwipeClose, { passive: false });
  document.addEventListener('touchend', preventSwipeClose, { passive: false });

  // Периодическая повторная блокировка свайпов
  setInterval(reapplySwipeProtection, 5000);

  // Обработка изменения размера viewport
  tg.onEvent('viewportChanged', () => {
    const newViewport = tg.viewportHeight;
    if (newViewport) {
      document.documentElement.style.height = newViewport + 'px';
      document.body.style.height = newViewport + 'px';
      document.body.style.minHeight = newViewport + 'px';
    }
    // Повторно применяем защиту после изменения viewport
    setTimeout(() => {
      reapplySwipeProtection();
    }, 100);
  });

  // Предотвращаем зум
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

  // Предотвращаем двойной тап зум
  document.addEventListener('dblclick', (e) => {
    e.preventDefault();
  });

  console.log('Mobile fullscreen setup completed');
};

// Функция настройки режима для десктопа
const setupDesktopMode = (tg) => {
  if (!tg) return;

  console.log('Setting up desktop mode (regular window)');

  // Для десктопа НЕ расширяем приложение
  // tg.expand() НЕ вызывается

  // Устанавливаем базовые стили без fullscreen
  document.body.style.backgroundColor = '#121a12';

  // Убираем только нежелательный скролл, но оставляем обычное поведение
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';

  console.log('Desktop mode setup completed');
};

// Определяем тип устройства
const deviceInfo = detectDevice();
console.log('Device detection:', deviceInfo);

// Инициализируем Telegram в зависимости от типа устройства
let telegramInitialized = false;

if (deviceInfo.isMobile) {
  // Инициализация для мобильных устройств
  if (initTelegramMobile()) {
    telegramInitialized = true;
    const tg = window.Telegram.WebApp;

    // Настраиваем полноэкранный режим для мобильных
    setupMobileFullscreen(tg);

    // Дополнительные настройки для мобильных
    setTimeout(() => {
      if (tg.MainButton) {
        tg.MainButton.hide();
      }
      console.log('Mobile viewport height:', tg.viewportHeight);
    }, 100);
  }
} else if (deviceInfo.isDesktop) {
  // Инициализация для десктопа
  if (initTelegramDesktop()) {
    telegramInitialized = true;
    const tg = window.Telegram.WebApp;

    // Настраиваем обычный режим для десктопа
    setupDesktopMode(tg);

    // Дополнительные настройки для десктопа
    setTimeout(() => {
      if (tg.MainButton) {
        tg.MainButton.hide();
      }
      console.log('Desktop mode: regular window');
    }, 100);
  }
}

// Fallback инициализация (если не удалось определить тип устройства)
if (!telegramInitialized) {
  if (initTelegram()) {
    telegramInitialized = true;
    const tg = window.Telegram.WebApp;

    // Для неизвестных устройств используем мобильную логику
    console.log('Unknown device type, using mobile fullscreen as fallback');
    setupMobileFullscreen(tg);

    setTimeout(() => {
      if (tg.MainButton) {
        tg.MainButton.hide();
      }
    }, 100);
  }
}

// Обработка случаев, когда Telegram SDK еще не загрузился
if (!telegramInitialized) {
  console.warn("Telegram WebApp not available yet, waiting for SDK...");
  let attempts = 0;
  const maxAttempts = 20; // ~2s

  const timer = setInterval(() => {
    attempts++;

    if (telegramInitialized) {
      clearInterval(timer);
      return;
    }

    // Повторно определяем устройство и инициализируем
    const currentDeviceInfo = detectDevice();

    if (currentDeviceInfo.isMobile) {
      if (initTelegramMobile()) {
        clearInterval(timer);
        const tg = window.Telegram.WebApp;
        setupMobileFullscreen(tg);
        telegramInitialized = true;
        return;
      }
    } else if (currentDeviceInfo.isDesktop) {
      if (initTelegramDesktop()) {
        clearInterval(timer);
        const tg = window.Telegram.WebApp;
        setupDesktopMode(tg);
        telegramInitialized = true;
        return;
      }
    }

    // Fallback
    if (initTelegram()) {
      clearInterval(timer);
      const tg = window.Telegram.WebApp;
      setupMobileFullscreen(tg); // Используем мобильную логику по умолчанию
      telegramInitialized = true;
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);
      console.warn("Telegram WebApp script not loaded. Running in fallback mode.");

      // Настраиваем базовые стили для тестирования вне Telegram
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.minHeight = '100vh';
      document.documentElement.style.minHeight = '100vh';

      // Создаем глобальную функцию для хаптиков (заглушка)
      window.triggerHaptic = () => {};
    }
  }, 100);
}

// Глобальные функции для работы с полноэкранным режимом
window.enterFullscreen = enterBrowserFullscreen;
window.exitFullscreen = exitBrowserFullscreen;

// Глобальная функция для хаптиков
window.triggerHaptic = (type = 'light') => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(type);
  }
};
