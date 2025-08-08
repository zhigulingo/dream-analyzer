// tma/src/services/api.js (Исправлено: добавлена запятая)
import axios from 'axios';

// Используем переменную окружения Vite. Убедитесь, что она ЗАДАНА в Netlify UI для сайта TMA
// и содержит ПОЛНЫЙ путь к функциям (включая /.netlify/functions)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Логируем URL для проверки при запуске TMA
if (!API_BASE_URL) {
    console.error("CRITICAL: VITE_API_BASE_URL is not set in environment variables!");
    console.error("Please set VITE_API_BASE_URL in your Netlify environment variables.");
    console.error("Example: https://your-site.netlify.app/.netlify/functions");
    
    // Показываем ошибку пользователю
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Ошибка конфигурации: API URL не настроен");
    }
} else {
    console.log('[api.js] Using API Base URL:', API_BASE_URL);
}

// Создаем экземпляр Axios с базовым URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000 // Добавим таймаут на 15 секунд для запросов
});

// Перехватчик запросов для автоматического добавления заголовка X-Telegram-Init-Data
apiClient.interceptors.request.use(
  (config) => {
    const initData = window.Telegram?.WebApp?.initData;
    
    // Детальное логирование для диагностики
    console.log("[api.js] Request interceptor - URL:", config.url);
    console.log("[api.js] Telegram WebApp available:", !!window.Telegram?.WebApp);
    console.log("[api.js] InitData available:", !!initData);
    
    if (initData) {
      config.headers['X-Telegram-Init-Data'] = initData;
      console.log("[api.js] ✅ Added InitData header (length:", initData.length, ")");
      
      // Парсим initData для дополнительной диагностики
      try {
        const params = new URLSearchParams(initData);
        const hasHash = !!params.get('hash');
        const hasUser = !!params.get('user');
        console.log("[api.js] InitData validation - Hash:", hasHash, "User:", hasUser);
        
        if (hasUser) {
          const userStr = params.get('user');
          const userData = JSON.parse(decodeURIComponent(userStr));
          console.log("[api.js] User ID from initData:", userData.id);
        }
      } catch (e) {
        console.error("[api.js] Error parsing initData for diagnostics:", e);
      }
    } else {
      console.warn("[api.js] ❌ InitData not available - API calls will likely fail");
      
      // Детальная диагностика почему initData недоступна
      console.log("[api.js] Diagnostic info:");
      console.log("  - window.Telegram exists:", !!window.Telegram);
      console.log("  - window.Telegram.WebApp exists:", !!window.Telegram?.WebApp);
      console.log("  - navigator.userAgent:", navigator.userAgent);
      console.log("  - window.TelegramWebviewProxy exists:", !!window.TelegramWebviewProxy);
      
      // Проверяем если мы в среде разработки
      if (import.meta.env.MODE === 'development') {
        console.log("[api.js] 🧪 Development mode - consider adding test initData");
      }
    }
    
    return config;
  },
  (error) => {
    console.error("[api.js] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Перехватчик ответов для централизованного логирования ошибок
apiClient.interceptors.response.use(
  (response) => {
    // Успешный ответ просто пропускаем
    return response;
  },
  (error) => {
    // Логируем детали ошибки ответа (сетевая ошибка или ошибка от сервера)
    if (error.response) {
      // Ошибка от сервера (статус не 2xx)
      console.error('[api.js] Axios response error (from server):', {
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data, // Тело ответа с ошибкой от бэкенда
      });
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен (сетевая проблема, таймаут)
      console.error('[api.js] Axios network error (no response):', {
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
          code: error.code, // e.g., 'ECONNABORTED' for timeout
      });
    } else {
      // Ошибка на этапе настройки запроса
      console.error('[api.js] Axios request setup error:', error.message);
    }
    // Пробрасываем ошибку дальше для обработки в сторе или компоненте
    return Promise.reject(error);
  }
);

// Объект с методами API для вызова из сторов/компонентов
const apiMethods = {
  getUserProfile() {
    console.log("[api.js] Calling POST /user-profile");
    return apiClient.post('/user-profile');
  }, // <--- Запятая

  // Метод для получения награды за подписку
  claimChannelReward() {
    console.log("[api.js] Calling POST /claim-channel-token");
    // Используем POST, так как это действие изменяет состояние (начисляет токен)
    return apiClient.post('/claim-channel-token'); // Тело запроса не нужно, вся информация в initData
  }, // <<<--- ВОТ ИСПРАВЛЕНИЕ: ДОБАВЛЕНА ЗАПЯТАЯ

  // Метод для получения истории анализов
  getAnalysesHistory() {
    console.log("[api.js] Calling GET /analyses-history");
    return apiClient.get('/analyses-history');
  }, // <--- Запятая

  // <<<--- НОВЫЙ МЕТОД ДЛЯ ГЛУБОКОГО АНАЛИЗА ---
  getDeepAnalysis() {
    console.log("[api.js] Calling POST /deep-analysis");
    // Используем POST, так как это действие потребляет токен
    // Тело запроса не нужно, ID пользователя берется из InitData на бэкенде
    return apiClient.post('/deep-analysis');
  },

  // История глубоких анализов (фильтрация из общей истории)
  getDeepAnalysesHistory() {
    console.log("[api.js] Calling GET /analyses-history?type=deep");
    return apiClient.get('/analyses-history', { params: { type: 'deep' } });
  },

  // Метод для создания ссылки на инвойс
  createInvoiceLink(plan, duration, amount, payload) {
     console.log("[api.js] Calling POST /create-invoice");
     // Передаем данные в теле POST-запроса
    return apiClient.post('/create-invoice', {
        plan,
        duration,
        amount,
        payload
    });
  } // <--- Запятая у последнего элемента не нужна
};

// Экспортируем именованный клиент Axios (если нужен доступ к нему напрямую)
// и дефолтный объект с готовыми методами API
export { apiClient };
export default apiMethods;
