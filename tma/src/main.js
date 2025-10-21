// tma/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/user.js'

import App from './App.vue' // Ваш корневой компонент Vue
// import router from './router' // Раскомментируйте, если используете Vue Router

// Импортируйте ваши глобальные стили, если есть
import "./index.css"
// import './assets/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia) // Подключаем Pinia
// app.use(router) // Подключаем роутер, если есть

app.mount('#app') // Монтируем приложение в <div id="app"> из index.html

// --- Debug helpers (console) ---
try {
  const userStore = useUserStore(pinia)

  const normalizeTag = (s) => {
    let t = String(s || '').trim()
    t = t.split(/[\\/,(;:—–-]/)[0]?.trim() || ''
    if (!t) return ''
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }

  const heuristicDreamType = (text) => {
    try {
      const s = String(text || '').toLowerCase()
      const count = (arr) => arr.reduce((a, k) => a + (s.includes(k) ? 1 : 0), 0)
      const emotion = ['страх','ужас','паник','тревог','стыд','гнев','плак','слез','кошмар','тоска','грусть']
      const anticip = ['экзам','выступл','собесед','защит','проект','подготов','завтра','ожидан','волнен','поездк','путешеств','нов','интервью']
      const memory  = ['вчера','сегодня','работ','школ','универ','дом','улиц','друг','родител','коллег','город']
      const e = count(emotion), a = count(anticip), m = count(memory)
      let es = e > 0 ? Math.min(1, e / 3) : 0
      let as = a > 0 ? Math.min(1, a / 3) : 0
      let ms = m > 0 ? Math.min(1, 0.5 + m / 5) : 0
      if (es === 0 && as === 0 && ms === 0) { ms = 0.6; es = 0.2; as = 0.2 }
      const arr = [ ['memory', ms], ['emotion', es], ['anticipation', as] ]
      arr.sort((x, y) => y[1] - x[1])
      const conf = +(Math.max(0, (arr[0][1] - arr[1][1])).toFixed(2))
      return { schema: 'dream_type_v1', scores: { memory: +ms.toFixed(2), emotion: +es.toFixed(2), anticipation: +as.toFixed(2) }, dominant: arr[0][0], confidence: conf }
    } catch { return null }
  }

  const tg = () => window.Telegram?.WebApp
  const query = new URLSearchParams(window.location.search)
  const debugEnabled = query.get('debug') === '1' || localStorage.getItem('da_debug') === '1'

  window.DreamDebug = {
    enable() { localStorage.setItem('da_debug', '1'); return 'enabled' },
    disable() { localStorage.removeItem('da_debug'); return 'disabled' },
    status() {
      return {
        env: import.meta.env.MODE,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        telegram: {
          available: !!tg(),
          initData: !!tg()?.initData,
          initDataLength: tg()?.initData?.length || 0
        },
        profileLoaded: !!userStore.profile?.id,
        historyCount: Array.isArray(userStore.history) ? userStore.history.length : 0
      }
    },
    async fetchAll() {
      await userStore.fetchProfile();
      await userStore.fetchHistory();
      return this.status()
    },
    dumpHistory(limit = 10) {
      const hist = (userStore.history || []).slice(0, limit)
      return hist.map(d => ({
        id: d.id,
        created_at: d.created_at,
        is_deep: !!d.is_deep_analysis,
        title_raw: d?.deep_source?.title || null,
        title_ui: (d?.deep_source?.title || '')?.toString().trim(),
        tags_raw: Array.isArray(d?.deep_source?.tags) ? d.deep_source.tags : [],
        tags_norm: (Array.isArray(d?.deep_source?.tags) ? d.deep_source.tags : []).map(normalizeTag),
        dream_type: d?.deep_source?.dream_type || heuristicDreamType(d?.dream_text) || null,
        hvdc_present: !!d?.deep_source?.hvdc
      }))
    },
    dumpOne(idOrIndex) {
      const hist = userStore.history || []
      let d = null
      if (typeof idOrIndex === 'number') d = hist[idOrIndex] || null
      else d = hist.find(x => String(x.id) === String(idOrIndex)) || null
      if (!d) return null
      return {
        id: d.id,
        created_at: d.created_at,
        is_deep: !!d.is_deep_analysis,
        dream_text: d.dream_text,
        analysis_len: String(d.analysis || '').length,
        deep_source: d.deep_source || null,
        tags_norm: (Array.isArray(d?.deep_source?.tags) ? d.deep_source.tags : []).map(normalizeTag),
        dream_type_ui: d?.deep_source?.dream_type || heuristicDreamType(d?.dream_text) || null
      }
    }
  }

  if (debugEnabled) {
    console.log('[DreamDebug] Enabled. Useful commands:')
    console.log(' - DreamDebug.status()')
    console.log(' - DreamDebug.fetchAll()')
    console.log(' - DreamDebug.dumpHistory(5)')
    console.log(' - DreamDebug.dumpOne(<id|index>)')
  }
} catch (_) {}

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
    // На старте гарантированно прячем BackButton, чтобы Telegram показал Close
    try {
        tg.BackButton?.hide?.();
        tg.BackButton?.offClick?.(() => {});
    } catch (_) {}
    
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
        
        // Пробрасываем высоту viewport в CSS‑переменную (для адаптивных отступов),
        // но НЕ фиксируем высоту документа — чтобы работал скролл на главной
        if (tg.viewportHeight) {
            document.documentElement.style.setProperty('--tg-viewport-height', tg.viewportHeight + 'px');
        }
        // Expose safe area top for CSS (used by overlay padding)
        const safeTop = (tg.safeAreaInset && typeof tg.safeAreaInset.top === 'number') ? tg.safeAreaInset.top : 0;
        document.documentElement.style.setProperty('--tg-safe-top', safeTop + 'px');
        // Не запрещаем скролл документа; только отключаем резиновые перетяжки
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
            // Update CSS vars on viewport changes
            try {
                if (tg.viewportHeight) {
                    document.documentElement.style.setProperty('--tg-viewport-height', tg.viewportHeight + 'px');
                }
                const safeTop = (tg.safeAreaInset && typeof tg.safeAreaInset.top === 'number') ? tg.safeAreaInset.top : 0;
                document.documentElement.style.setProperty('--tg-safe-top', safeTop + 'px');
            } catch (e) {}
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
