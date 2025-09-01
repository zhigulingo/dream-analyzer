// tma/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue' // Ваш корневой компонент Vue
// import router from './router' // Раскомментируйте, если используете Vue Router

// Импортируйте ваши глобальные стили, если есть
import "./index.css"
// import './assets/main.css'

// БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ TELEGRAM API
const initTelegramSafely = () => {
  try {
    // Проверяем наличие window
    if (typeof window === 'undefined') {
      console.log('🚫 [MAIN] Window not available, skipping Telegram initialization');
      return false;
    }

    // Создаем безопасную заглушку для Telegram API
    if (!window.Telegram) {
      console.log('🚫 [MAIN] Telegram not available, creating safe stub');
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
          viewportHeight: window.innerHeight,
          viewportChanged: () => {},
          onEvent: () => {},
          HapticFeedback: {
            impactOccurred: () => {}
          }
        }
      };
    }

    // Создаем безопасную заглушку для TelegramGameProxy
    if (!window.TelegramGameProxy) {
      console.log('🚫 [MAIN] TelegramGameProxy not available, creating safe stub');
      window.TelegramGameProxy = {
        receiveEvent: () => {},
        initParams: {},
        sendData: () => {}
      };
    }

    console.log('✅ [MAIN] Telegram API safely initialized');
    return true;

  } catch (error) {
    console.error('❌ [MAIN] Error initializing Telegram API:', error);
    return false;
  }
};

// Инициализируем Telegram API безопасно
initTelegramSafely();

console.log('🚀 [MAIN] Starting Vue app initialization...');
console.log('🚀 [MAIN] Current URL:', window.location.href);
console.log('🚀 [MAIN] Telegram WebApp available:', typeof window !== 'undefined' && window.Telegram?.WebApp);

const app = createApp(App)

app.use(createPinia()) // Подключаем Pinia
// app.use(router) // Подключаем роутер, если есть

app.mount('#app') // Монтируем приложение в <div id="app"> из index.html

console.log('✅ [MAIN] Vue app mounted successfully');

// Функция детекции типа устройства с расширенным логированием
const detectDevice = () => {
  console.log('🔍 [DETECT] Starting device detection...');

  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const platform = navigator.platform;

  console.log('🔍 [DETECT] UserAgent:', userAgent);
  console.log('🔍 [DETECT] Screen size:', screenWidth + 'x' + screenHeight);
  console.log('🔍 [DETECT] Platform:', platform);

  // ПРОВЕРКА: это Telegram WebApp?
  const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
  console.log('🔍 [DETECT] Is Telegram WebApp:', isTelegramWebApp);

  // УЛУЧШЕННАЯ ДЕТЕКЦИЯ МОБИЛЬНЫХ
  const isMobileByUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
  const isMobileByScreen = (screenWidth <= 768 && screenHeight <= 1024);
  const hasTouch = ('ontouchstart' in window);
  const isPortrait = screenWidth <= screenHeight && screenWidth < 768;

  console.log('🔍 [DETECT] Mobile by UA:', isMobileByUA);
  console.log('🔍 [DETECT] Mobile by screen:', isMobileByScreen);
  console.log('🔍 [DETECT] Has touch:', hasTouch);
  console.log('🔍 [DETECT] Is portrait:', isPortrait);

  // ОСНОВНАЯ ЛОГИКА: мобильное устройство ТОЛЬКО если маленький экран ИЛИ touch
  const isMobile = isMobileByUA || isMobileByScreen || hasTouch || isPortrait;

  // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: большие экраны не считаем мобильными
  const isLargeScreen = screenWidth > 1024 && screenHeight > 768;
  const finalIsMobile = isMobile && !isLargeScreen;

  console.log('🔍 [DETECT] Initial mobile result:', isMobile);
  console.log('🔍 [DETECT] Is large screen:', isLargeScreen);
  console.log('🔍 [DETECT] FINAL MOBILE DECISION:', finalIsMobile);

  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  // ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ ДЛЯ ДЕСКТОПА
  const isDesktopByUA = /windows|macintosh|linux/i.test(userAgent) &&
                       !/mobile|tablet|android|iphone|ipad|ipod/i.test(userAgent);
  const isDesktopByScreen = screenWidth > 1024 && screenHeight > 768;
  const isDesktop = isDesktopByUA && isDesktopByScreen && !finalIsMobile;

  console.log('🔍 [DETECT] Desktop by UA:', isDesktopByUA);
  console.log('🔍 [DETECT] Desktop by screen:', isDesktopByScreen);
  console.log('🔍 [DETECT] FINAL DESKTOP DECISION:', isDesktop);

  const result = {
    isMobile: finalIsMobile,
    isDesktop,
    isIOS,
    isAndroid,
    screenWidth,
    screenHeight,
    userAgent,
    platform,
    isTelegramWebApp,
    hasTouch,
    isLargeScreen
  };

  console.log('🔍 [DETECT] Final device info:', result);
  return result;
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
  if (!window.Telegram?.WebApp) {
    console.log('📱 [MOBILE] Telegram WebApp not available');
    return false;
  }
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
    console.log('💻 [DESKTOP] Telegram WebApp not available, using standalone mode');
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
  // ПРОВЕРКА: только для мобильных устройств
  if (!window.isMobileDevice) {
    return;
  }

  // ПРОВЕРКА: наличие Telegram API
  if (!window.Telegram?.WebApp) {
    console.log('🔒 [SWIPE] Telegram WebApp not available, skipping swipe protection');
    return;
  }

  // ПРОВЕРКА: не чаще чем раз в 2 секунды
  const now = Date.now();
  if (window.lastSwipeProtectionTime && now - window.lastSwipeProtectionTime < 2000) {
    return;
  }
  window.lastSwipeProtectionTime = now;

  const tg = window.Telegram?.WebApp;
  if (tg?.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
    console.log('🔒 Swipe protection reapplied');
  }
  if (tg?.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
    console.log('🔒 Closing confirmation reapplied');
  }
};

// Функция настройки полноэкранного режима для мобильных устройств
const setupMobileFullscreen = (tg) => {
  if (!tg) {
    console.log('📱 [MOBILE] No Telegram WebApp provided');
    return;
  }

  console.log('🚀 Setting up mobile fullscreen mode');
  console.log('📱 Telegram WebApp available:', !!tg);
  console.log('📱 Telegram WebApp requestFullscreen:', !!tg.requestFullscreen);

  // ПРОВЕРКА: если уже инициализировано, выходим
  if (window.mobileFullscreenInitialized) {
    console.log('📱 Mobile fullscreen already initialized, skipping');
    return;
  }
  window.mobileFullscreenInitialized = true;

  // АГРЕССИВНЫЙ ПОДХОД ДЛЯ TELEGRAM MINI APP

  // Попытка 1: Telegram WebApp fullscreen API
  const tryTelegramFullscreen = () => {
    console.log('🔄 Trying Telegram WebApp fullscreen...');
    return new Promise((resolve, reject) => {
      try {
        if (tg.requestFullscreen) {
          tg.requestFullscreen();
          console.log('✅ Telegram requestFullscreen() called');

          // Проверяем результат через небольшую задержку
          setTimeout(() => {
            console.log('📊 Checking Telegram fullscreen result...');
            resolve();
          }, 500);
        } else {
          console.log('❌ Telegram requestFullscreen not available');
          reject(new Error('Telegram requestFullscreen not available'));
        }
      } catch (error) {
        console.log('❌ Telegram fullscreen failed:', error);
        reject(error);
      }
    });
  };

  // Попытка 2: Браузерный fullscreen API
  const tryBrowserFullscreen = () => {
    console.log('🔄 Trying browser fullscreen API...');
    return enterBrowserFullscreen().then(() => {
      console.log('✅ Browser fullscreen API succeeded');
    }).catch(err => {
      console.log('❌ Browser fullscreen API failed, trying simulation:', err);
      // Попытка 3: CSS имитация fullscreen
      return simulateMobileFullscreen();
    });
  };

  // Попытка 4: Принудительная активация через события
  const forceFullscreenActivation = () => {
    console.log('🔄 Force activating fullscreen via events...');

    // Имитируем пользовательское взаимодействие
    const events = ['touchstart', 'touchend', 'click'];

    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      document.dispatchEvent(event);
    });

    // Повторная попытка всех методов после имитации взаимодействия
    setTimeout(() => {
      tryTelegramFullscreen()
        .catch(() => tryBrowserFullscreen())
        .catch(err => {
          console.log('❌ All fullscreen attempts failed:', err);
        });
    }, 200);
  };

  // ГЛАВНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ ПОПЫТОК

  // Начинаем с Telegram API
  tryTelegramFullscreen().catch(() => {
    console.log('🔄 Telegram fullscreen failed, trying browser API...');
    // Если Telegram не сработал, пробуем браузерный API
    tryBrowserFullscreen().catch(() => {
      console.log('🔄 Browser fullscreen failed, trying force activation...');
      // Если браузерный тоже не сработал, используем принудительную активацию
      forceFullscreenActivation();
    });
  });

  // ДОПОЛНИТЕЛЬНЫЕ ПОВТОРНЫЕ ПОПЫТКИ
  setTimeout(() => {
    console.log('🔄 Additional fullscreen attempt after 1s...');
    tryTelegramFullscreen().catch(() => tryBrowserFullscreen());
  }, 1000);

  setTimeout(() => {
    console.log('🔄 Final fullscreen attempt after 3s...');
    tryTelegramFullscreen().catch(() => tryBrowserFullscreen());
  }, 3000);

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

  // Периодическая повторная блокировка ТОЛЬКО ДЛЯ МОБИЛЬНЫХ (на случай сброса Telegram)
  if (window.isMobileDevice) {
    setInterval(reapplySwipeProtection, 10000); // Увеличили интервал до 10 секунд
    console.log('📱 Mobile: periodic swipe protection enabled (10s interval)');
  }

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
  console.log('💻 Setting up desktop mode');
  console.log('💻 Telegram WebApp provided:', !!tg);

  // Для десктопа работаем без Telegram API (fallback mode)
  document.body.style.backgroundColor = '#121a12';
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';

  // АГРЕССИВНОЕ СВОРАЧИВАНИЕ ДЕСКТОПА
  if (tg) {
    try {
      tg.ready();
      console.log('💻 Desktop Telegram: basic setup completed');

      // ПРИНУДИТЕЛЬНО СВОРАЧИВАЕМ ДЕСКТОП
      setTimeout(() => {
        console.log('💻 Desktop: attempting to collapse window');

        // Проверяем текущее состояние viewport
        console.log('💻 Desktop viewport state:', {
          height: tg.viewportHeight,
          isExpanded: tg.isExpanded,
          isStateStable: tg.isStateStable
        });

        // Если приложение развернуто, пытаемся свернуть
        if (tg.viewportHeight && tg.viewportHeight > 600) {
          console.log('💻 Desktop: detected expanded state, attempting to minimize');

          // Устанавливаем минимальную высоту viewport
          document.documentElement.style.height = '600px';
          document.body.style.height = '600px';
          document.body.style.maxHeight = '600px';

          // Добавляем CSS для ограничения размера
          const style = document.createElement('style');
          style.textContent = `
            html, body {
              max-height: 600px !important;
              height: 600px !important;
              overflow: hidden !important;
            }
            #app {
              max-height: 600px !important;
              height: 600px !important;
            }
          `;
          document.head.appendChild(style);

          console.log('💻 Desktop: collapse styles applied');
        }
      }, 1000);

    } catch (error) {
      console.warn('💻 Desktop Telegram setup failed:', error);
    }
  } else {
    console.log('💻 Desktop mode: standalone (no Telegram API)');
  }

  // НЕ применяем fullscreen функции
  // НЕ блокируем свайпы (не актуально для десктопа)
};

// ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: перехватываем любые изменения размера ТОЛЬКО НА ДЕСКТОПЕ
if (typeof window !== 'undefined' && window.isMobileDevice === false) {
  window.addEventListener('resize', function() {
    if (window.innerHeight > 650) {
      console.log('🚨 [RESIZE] Detected height increase on desktop, blocking...');
      enforceDesktopSizeLimit();
    }
  });
  console.log('🚨 [RESIZE] Resize listener active for desktop');
} else {
  console.log('📱 [MOBILE] Skipping desktop resize listener');
}

// ФУНКЦИЯ ПРИНУДИТЕЛЬНОГО ОГРАНИЧЕНИЯ РАЗМЕРА ДЕСКТОПА
function enforceDesktopSizeLimit() {
  // ПРОВЕРКА: только для десктопа и только если window определен
  if (typeof window === 'undefined' || window.isMobileDevice === true) {
    console.log('📱 [ENFORCE] Skipping enforcement on mobile device or undefined window');
    return;
  }

  console.log('🔒 [ENFORCE] Enforcing desktop size limit');

  // Устанавливаем жесткие ограничения
  const style = document.createElement('style');
  style.id = 'desktop-size-limiter';
  style.textContent = `
    html, body, #app {
      max-height: 600px !important;
      height: 600px !important;
      overflow: hidden !important;
      resize: none !important;
    }

    /* Блокируем любые трансформации */
    html, body, #app {
      transform: none !important;
      -webkit-transform: none !important;
      transition: none !important;
    }
  `;

  // Удаляем старый стиль если существует
  const oldStyle = document.getElementById('desktop-size-limiter');
  if (oldStyle) {
    oldStyle.remove();
  }

  document.head.appendChild(style);

  // Применяем стили напрямую
  document.documentElement.style.height = '600px';
  document.documentElement.style.maxHeight = '600px';
  document.documentElement.style.overflow = 'hidden';

  document.body.style.height = '600px';
  document.body.style.maxHeight = '600px';
  document.body.style.overflow = 'hidden';

  const app = document.getElementById('app');
  if (app) {
    app.style.height = '600px';
    app.style.maxHeight = '600px';
    app.style.overflow = 'hidden';
  }

  console.log('🔒 [ENFORCE] Desktop size limit enforced');
}

// ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: MutationObserver для отслеживания изменений ТОЛЬКО НА ДЕСКТОПЕ
if (typeof window !== 'undefined' && window.isMobileDevice === false) {
  console.log('👁️ [OBSERVER] Setting up mutation observer for desktop protection');

  const observer = new MutationObserver(function(mutations) {
    let shouldEnforce = false;

    mutations.forEach(function(mutation) {
      // Проверяем изменения стилей
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        const height = target.offsetHeight || target.clientHeight;

        if (height > 650) {
          console.log('👁️ [OBSERVER] Detected style change with large height:', height);
          shouldEnforce = true;
        }
      }

      // Проверяем добавление новых элементов
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const height = node.offsetHeight || node.clientHeight;
            if (height > 650) {
              console.log('👁️ [OBSERVER] New element with large height detected:', height);
              shouldEnforce = true;
            }
          }
        });
      }
    });

    if (shouldEnforce) {
      enforceDesktopSizeLimit();
    }
  });

  // Начинаем наблюдение
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    childList: true,
    subtree: true
  });

  // Также наблюдаем за изменениями в documentElement
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style']
  });

  console.log('👁️ [OBSERVER] Mutation observer active');
} else {
  console.log('📱 [MOBILE] Skipping mutation observer for desktop protection');
}

// ПЕРИОДИЧЕСКАЯ ПРОВЕРКА РАЗМЕРА ТОЛЬКО ДЛЯ ДЕСКТОПА - С ДОПОЛНИТЕЛЬНОЙ ЗАЩИТОЙ
if (typeof window !== 'undefined' && window.isMobileDevice === false) {
  console.log('💻 [PERIODIC] Starting periodic desktop size checks');

  const periodicCheck = () => {
    try {
      if (typeof window !== 'undefined' && window.innerHeight > 650 && window.isMobileDevice === false) {
        console.log('⏰ [PERIODIC] Periodic check detected large height:', window.innerHeight);
        if (typeof enforceDesktopSizeLimit === 'function') {
          enforceDesktopSizeLimit();
        }
      }
    } catch (error) {
      console.error('⏰ [PERIODIC] Error in periodic check:', error);
    }
  };

  setInterval(periodicCheck, 5000); // Увеличил интервал до 5 секунд для меньшего спама
  console.log('⏰ [PERIODIC] Periodic size check active for desktop');
} else {
  console.log('📱 [MOBILE] Skipping periodic desktop size checks (mobile device or window undefined)');
}

// СНАЧАЛА определяем тип устройства и устанавливаем глобальный флаг
console.log('🎯 [INIT] Starting Telegram WebApp initialization...');
const deviceInfo = detectDevice();
console.log('📊 [INIT] Device detection completed:', deviceInfo);

// Устанавливаем глобальный флаг устройства СРАЗУ
window.isMobileDevice = deviceInfo.isMobile;
console.log('🚩 [INIT] Global mobile flag set:', window.isMobileDevice);

// ФУНКЦИЯ ОЖИДАНИЯ ЗАГРУЗКИ TELEGRAM SDK
function waitForTelegramSDK(maxAttempts = 50) {
  return new Promise((resolve) => {
    let attempts = 0;

    const checkTelegram = () => {
      attempts++;
      console.log(`⏳ [WAIT] Attempt ${attempts}/${maxAttempts} - Checking Telegram SDK...`);

      // Проверяем наличие Telegram WebApp
      const hasTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
      const hasWebView = typeof window !== 'undefined' && window.TelegramWebviewProxy;

      console.log(`⏳ [WAIT] Telegram WebApp: ${hasTelegram}`);
      console.log(`⏳ [WAIT] TelegramWebviewProxy: ${hasWebView}`);

      if (hasTelegram || hasWebView || attempts >= maxAttempts) {
        console.log(`✅ [WAIT] Telegram SDK ready after ${attempts} attempts`);
        resolve(hasTelegram);
      } else {
        setTimeout(checkTelegram, 100);
      }
    };

    checkTelegram();
  });
}

// ЖДЕМ ЗАГРУЗКИ TELEGRAM SDK
waitForTelegramSDK().then((hasTelegram) => {
  console.log(`🎯 [INIT] Telegram SDK loaded: ${hasTelegram}`);

  // Инициализируем Telegram в зависимости от типа устройства
  let telegramInitialized = false;

  console.log('🎯 [INIT] Starting device-specific initialization...');

  // ЭКСТРЕННОЕ ПРИМЕНЕНИЕ ОГРАНИЧЕНИЙ ДЛЯ ДЕСКТОПА
if (!deviceInfo.isMobile) {
  console.log('💻 [INIT] Desktop detected - applying immediate size restrictions');
  enforceDesktopSizeLimit();

  // Повторяем через короткое время для гарантии
  setTimeout(enforceDesktopSizeLimit, 100);
  setTimeout(enforceDesktopSizeLimit, 500);
  }

  if (deviceInfo.isMobile) {
  console.log('📱 [INIT] Mobile device detected - initializing mobile mode');
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
    console.log('📱 [INIT] Mobile fallback: Telegram not available, using browser fullscreen');
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
  console.log('💻 [INIT] Desktop device detected - initializing desktop mode');
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
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    } else {
      console.log('🔊 [HAPTIC] Haptic feedback not available');
    }
  } catch (error) {
    console.error('❌ [HAPTIC] Error triggering haptic feedback:', error);
  }
});

console.log('✅ [MAIN] Telegram initialization completed');

// Глобальные функции для браузерного fullscreen
window.enterBrowserFullscreen = enterBrowserFullscreen;
window.exitBrowserFullscreen = exitBrowserFullscreen;
