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
    // Always log the URL being called for debugging
    console.log(`[api.js] Making request to: ${config.method.toUpperCase()} ${config.url}`);
    
    // APPROACH 1: Telegram WebApp initData
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      config.headers['X-Telegram-Init-Data'] = initData;
      console.log("[api.js] USING APPROACH 1: Telegram WebApp");
      return config;
    }
    
    // APPROACH 2: Web Auth from localStorage
    try {
      const storedUser = localStorage.getItem('telegram_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData && userData.id) {
          // Force to use custom header format
          const headerData = JSON.stringify({
            id: userData.id,
            username: userData.username || "",
            first_name: userData.first_name || "",
            last_name: userData.last_name || ""
          });
          
          // Ensure special headers are set in lowercase (what Netlify actually expects)
          config.headers['x-web-auth-user'] = headerData;
          
          // Log that we're sending authentication 
          console.log(`[api.js] USING APPROACH 2: Web Auth, User ID: ${userData.id}`);
          console.log(`[api.js] Headers being sent: ${Object.keys(config.headers).join(', ')}`);
          
          return config;
        }
      }
    } catch (err) {
      console.error("[api.js] Failed to parse stored user data:", err);
    }
    
    // NO AUTH AVAILABLE
    console.warn("[api.js] ⚠️ NO AUTHENTICATION AVAILABLE. API calls will fail authorization.");
    console.warn("[api.js] ⚠️ To debug, localStorage contains:", Object.keys(localStorage));
    console.warn("[api.js] ⚠️ Headers being sent without auth:", Object.keys(config.headers).join(', '));
    
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
  async (error) => {
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
      
      // Special handling for 401 (Unauthorized) errors
      if (error.response.status === 401) {
        console.error('[api.js] UNAUTHORIZED (401) detected - marking as auth_error');
        
        // Mark auth error in session storage to trigger router handling
        sessionStorage.setItem('auth_error', 'true');
        
        // Load auth service dynamically to avoid circular dependencies
        try {
          const authService = await import('./authService');
          
          // Only redirect on non-auth URLs (avoid infinite loop)
          const isAuthUrl = error.config.url.includes('verify-web-auth') || 
                           error.config.url.includes('login');
                           
          // If this is not an auth endpoint, trigger emergency redirect
          if (!isAuthUrl) {
            console.log('[api.js] Triggering emergency redirect due to 401');
            authService.emergencyRedirect();
          }
        } catch (e) {
          console.error('[api.js] Failed to load auth service for 401 handling', e);
        }
      }
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
  },
  
  // Logout helper - not an actual API call but helps with cleanup
  logout() {
    console.log("[api.js] Performing API cleanup for logout");
    // Clear any cached auth tokens or session data in the API client
    delete apiClient.defaults.headers.common['x-web-auth-user'];
    delete apiClient.defaults.headers.common['X-Web-Auth-User'];
    delete apiClient.defaults.headers.common['X-Telegram-Init-Data'];
    return Promise.resolve({ success: true });
  }
};

// Экспортируем именованный клиент Axios (если нужен доступ к нему напрямую)
// и дефолтный объект с готовыми методами API
export { apiClient };
export default apiMethods;
