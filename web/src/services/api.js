// tma/src/services/api.js (Исправлено: добавлена запятая)
import axios from 'axios';

// Используем переменную окружения Vite. Убедитесь, что она ЗАДАНА в Netlify UI для сайта TMA
// и содержит ПОЛНЫЙ путь к функциям (включая /.netlify/functions)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/.netlify/functions`;

// Логируем URL для проверки при запуске TMA
if (!import.meta.env.VITE_API_BASE_URL) {
    console.warn("VITE_API_BASE_URL not set in environment variables, falling back to current origin:", API_BASE_URL);
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
    // Try to get Telegram WebApp initData first
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      config.headers['X-Telegram-Init-Data'] = initData;
      console.log("[api.js] Sending Telegram InitData header");
    } else {
      // If no Telegram WebApp data, check for web authentication
      const storedUser = localStorage.getItem('telegram_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          // Ensure we're sending the complete user object
          config.headers['X-Web-Auth-User'] = JSON.stringify({
            id: userData.id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name
          });
          console.log("[api.js] Sending Web Auth User header for user:", userData.id);
        } catch (err) {
          console.error("[api.js] Failed to parse stored user data:", err);
        }
      } else {
        console.warn("[api.js] No authentication data available. API calls might fail authorization.");
      }
    }
    return config;
  },
  (error) => {
    console.error("[api.js] Axios request interceptor error:", error);
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
    console.log("[api.js] Calling GET /user-profile");
    return apiClient.get('/user-profile');
  },

  // Метод для получения награды за подписку
  claimChannelReward() {
    console.log("[api.js] Calling POST /claim-channel-token");
    // Используем POST, так как это действие изменяет состояние (начисляет токен)
    return apiClient.post('/claim-channel-token'); // Тело запроса не нужно, вся информация в initData
  },

  // Метод для получения истории анализов
  getAnalysesHistory() {
    console.log("[api.js] Calling GET /analyses-history");
    return apiClient.get('/analyses-history');
  },

  // <<<--- НОВЫЙ МЕТОД ДЛЯ ГЛУБОКОГО АНАЛИЗА ---
  getDeepAnalysis() {
    console.log("[api.js] Calling POST /deep-analysis");
    // Используем POST, так как это действие потребляет токен
    // Тело запроса не нужно, ID пользователя берется из InitData на бэкенде
    return apiClient.post('/deep-analysis');
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
  },

  // Web authentication verification
  verifyWebAuth(userData) {
    console.log("[api.js] Calling POST /verify-web-auth");
    return apiClient.post('/verify-web-auth', userData);
  }
};

// Экспортируем именованный клиент Axios (если нужен доступ к нему напрямую)
// и дефолтный объект с готовыми методами API
export { apiClient };
export default apiMethods;
