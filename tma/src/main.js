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

// Функция для браузерного полноэкранного режима с улучшенной поддержкой мобильных
const enterBrowserFullscreen = () => {
  const doc = document.documentElement;
  const body = document.body;

  // Сначала пробуем стандартный API
  if (doc.requestFullscreen) {
    return doc.requestFullscreen();
  }

  // WebKit префикс (iOS Safari, старые Chrome)
  if (doc.webkitRequestFullscreen) {
    return doc.webkitRequestFullscreen();
  }

  // Firefox префикс
  if (doc.mozRequestFullScreen) {
    return doc.mozRequestFullScreen();
  }

  // IE/Edge префикс
  if (doc.msRequestFullscreen) {
    return doc.msRequestFullscreen();
  }

  // Если fullscreen API не поддерживается, имитируем через CSS
  console.warn('Fullscreen API not supported, using CSS simulation');
  return simulateMobileFullscreen();
};

// Функция имитации полноэкранного режима через CSS (для мобильных устройств)
const simulateMobileFullscreen = () => {
  return new Promise((resolve, reject) => {
    try {
      // Применяем CSS для имитации fullscreen
      const html = document.documentElement;
      const body = document.body;

      // Сохраняем оригинальные стили
      const originalHtmlStyles = {
        position: html.style.position,
        top: html.style.top,
        left: html.style.left,
        right: html.style.right,
        bottom: html.style.bottom,
        width: html.style.width,
        height: html.style.height
      };

      const originalBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        bottom: body.style.bottom,
        width: body.style.width,
        height: body.style.height,
        margin: body.style.margin,
        padding: body.style.padding
      };

      // Применяем fullscreen стили
      Object.assign(html.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh'
      });

      Object.assign(body.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '0'
      });

      // Добавляем класс для CSS управления
      document.documentElement.classList.add('simulated-fullscreen');
      document.body.classList.add('simulated-fullscreen');

      // Функция для выхода из имитированного fullscreen
      const exitSimulatedFullscreen = () => {
        // Восстанавливаем оригинальные стили
        Object.assign(html.style, originalHtmlStyles);
        Object.assign(body.style, originalBodyStyles);

        // Убираем классы
        document.documentElement.classList.remove('simulated-fullscreen');
        document.body.classList.remove('simulated-fullscreen');
      };

      // Сохраняем функцию выхода в глобальной области
      window.exitSimulatedFullscreen = exitSimulatedFullscreen;

      console.log('✅ Simulated fullscreen enabled via CSS');
      resolve();

    } catch (error) {
      console.error('❌ Simulated fullscreen failed:', error);
      reject(error);
    }
  });
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

    // НЕ используем tg.expand() - он конфликтует с requestFullscreen()
    // tg.expand(); // УБРАНО!
    console.log('Mobile Telegram: using requestFullscreen only');

  } catch (error) {
    console.error('Error initializing Telegram mobile:', error);
  }

  return true;
};

// Инициализация Telegram WebApp API для десктопа
const initTelegramDesktop = () => {
  // Проверяем наличие Telegram API
  if (!window.Telegram?.WebApp) {
    console.log('Desktop mode: Telegram WebApp not available, using standalone mode');
    return false;
  }

  // Проверяем, что это действительно Telegram среда, а не ошибка с window.TelegramGameProxy
  if (!window.Telegram.WebApp.ready || typeof window.Telegram.WebApp.ready !== 'function') {
    console.log('Desktop mode: Telegram WebApp not properly initialized, using standalone mode');
    return false;
  }

  const tg = window.Telegram.WebApp;

  try {
    tg.ready();

    // Для десктопа НЕ расширяем приложение
    // tg.expand() НЕ ВЫЗЫВАЕМ - оставляем обычное окно браузера
    console.log('Desktop Telegram: keeping regular window size');

    return true;

  } catch (error) {
    console.error('Error initializing Telegram desktop:', error);
    // В случае ошибки возвращаем false, чтобы использовать fallback
    return false;
  }
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

  // МНОЖЕСТВЕННЫЕ ПОПЫТКИ ДОСТИЧЬ ПОЛНОЭКРАННОГО РЕЖИМА

  // Попытка 1: Браузерный fullscreen API
  const tryBrowserFullscreen = () => {
    return enterBrowserFullscreen().then(() => {
      console.log('✅ Browser fullscreen API succeeded');
    }).catch(err => {
      console.log('Browser fullscreen API failed, trying simulation:', err);
      // Попытка 2: CSS имитация fullscreen
      return simulateMobileFullscreen();
    });
  };

  // Попытка 3: Принудительная активация через события
  const forceFullscreenActivation = () => {
    // Имитируем пользовательское взаимодействие
    const events = ['touchstart', 'touchend', 'click'];

    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      document.dispatchEvent(event);
    });

    // Повторная попытка fullscreen после имитации взаимодействия
    setTimeout(() => {
      tryBrowserFullscreen().catch(err => {
        console.log('All fullscreen attempts failed:', err);
      });
    }, 100);
  };

  // Начинаем с браузерного fullscreen
  tryBrowserFullscreen().catch(() => {
    console.log('Initial fullscreen attempt failed, trying with user interaction simulation');
    forceFullscreenActivation();
  });

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

  // ЗАЩИТА ОТ СВАЙПОВ - ОСНОВНЫЕ МЕТОДЫ
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
    console.log('✅ Vertical swipes disabled');
  }

  if (typeof tg.enableClosingConfirmation === 'function') {
    tg.enableClosingConfirmation();
    console.log('✅ Closing confirmation enabled');
  }

  // ДОПОЛНИТЕЛЬНАЯ CSS ЗАЩИТА
  document.body.style.touchAction = 'none';
  document.documentElement.style.touchAction = 'none';

  // Обработчики touch событий для дополнительной защиты
  document.addEventListener('touchstart', preventSwipeClose, { passive: false });
  document.addEventListener('touchmove', preventSwipeClose, { passive: false });
  document.addEventListener('touchend', preventSwipeClose, { passive: false });

  // Периодическая повторная блокировка (на случай сброса Telegram)
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

  // Предотвращаем зум жесты
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
  console.log('Setting up desktop mode');

  // Для десктопа работаем без Telegram API (fallback mode)
  document.body.style.backgroundColor = '#121a12';
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';

  // Если есть Telegram API, инициализируем его
  if (tg) {
    try {
      tg.ready();
      console.log('Desktop Telegram: basic setup completed');
    } catch (error) {
      console.warn('Desktop Telegram setup failed:', error);
    }
  } else {
    console.log('Desktop mode: standalone (no Telegram API)');
  }

  // НЕ применяем fullscreen функции
  // НЕ блокируем свайпы (не актуально для десктопа)
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
  } else {
    // Fallback для мобильных без Telegram API
    console.log('Mobile fallback: Telegram not available, using browser fullscreen');
    telegramInitialized = true;

    // Применяем браузерный fullscreen сразу для мобильных без Telegram
    enterBrowserFullscreen().then(() => {
      console.log('✅ Mobile fallback fullscreen enabled');
    }).catch(err => {
      console.log('Mobile fallback fullscreen failed:', err);
    });

    // Настраиваем базовые стили для мобильных
    document.body.style.backgroundColor = '#121a12';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
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
  } else {
    // Fallback для десктопа без Telegram API
    console.log('Desktop fallback: Telegram not available, using standalone mode');
    telegramInitialized = true;

    // Настраиваем обычный режим для десктопа
    setupDesktopMode(null);

    // Для десктопа НЕ применяем fullscreen
    console.log('Desktop standalone: regular browser window');
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

// Глобальные функции для работы с Telegram Mini Apps
// Глобальная функция для хаптиков
window.triggerHaptic = (type = 'light') => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(type);
  }
};

// Глобальные функции для браузерного fullscreen
window.enterBrowserFullscreen = enterBrowserFullscreen;
window.exitBrowserFullscreen = exitBrowserFullscreen;
