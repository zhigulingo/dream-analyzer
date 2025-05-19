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

// Safe JSON parse helper
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('[api.js] Error parsing JSON:', e);
    return null;
  }
}

// Debug helper to dump all localStorage items
function debugLocalStorage() {
  console.log('[api.js] 🔍 DEBUG localStorage contents:');
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const value = localStorage.getItem(key);
        console.log(`[api.js] 🔑 ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      } catch (e) {
        console.log(`[api.js] 🔑 ${key}: [Error reading value]`);
      }
    }
  } catch (e) {
    console.error('[api.js] Error accessing localStorage:', e);
  }
}

// Get authentication headers
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json' 
  };
  
  try {
    // Try Telegram WebApp first
    let initData = null;
    try {
      initData = window.Telegram?.WebApp?.initData;
    } catch (err) {
      console.warn('[api.js] Failed to access Telegram WebApp:', err);
    }
    
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
      console.log("[api.js] Using Telegram WebApp authentication");
      return headers;
    }
    
    // If no Telegram WebApp, try stored user data
    const storedUser = localStorage.getItem('telegram_user');
    if (storedUser) {
      const userData = safeJsonParse(storedUser);
      if (userData && userData.id) {
        const headerData = JSON.stringify({
          id: userData.id,
          username: userData.username || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || ""
        });
        
        headers['x-web-auth-user'] = headerData;
        headers['X-Web-Auth-User'] = headerData;
        
        console.log(`[api.js] Using Web Auth, User ID: ${userData.id}`);
        return headers;
      }
    }
    
    // No authentication found
    console.warn("[api.js] ⚠️ NO AUTHENTICATION AVAILABLE. API calls will fail authorization.");
    debugLocalStorage();
  } catch (e) {
    console.error('[api.js] Error getting auth headers:', e);
  }
  
  return headers;
}

// Создаем экземпляр Axios с базовым URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Добавим таймаут на 15 секунд для запросов
  headers: {
    'Content-Type': 'application/json'
  }
});

// Simple request wrapper that adds auth headers
const makeRequest = async (method, url, data = null) => {
  try {
    const headers = getAuthHeaders();
    console.log(`[api.js] Making ${method.toUpperCase()} request to: ${url}`);
    console.log(`[api.js] Headers being sent: ${Object.keys(headers).join(', ')}`);
    
    const config = { 
      method, 
      url, 
      headers
    };
    
    if (data) {
      config.data = data;
    }
    
    // Try the request with proper error handling
    try {
      const response = await apiClient(config);
      
      // Transform null responses to appropriate defaults
      if (url.includes('user-profile') && response.data) {
        if (response.data.tokens === null || response.data.tokens === undefined) {
          response.data.tokens = 0;
        }
        if (response.data.subscription_type === null || response.data.subscription_type === undefined) {
          response.data.subscription_type = 'free';
        }
      }
      
      // Make sure history is always an array
      if (url.includes('analyses-history')) {
        if (!response.data || !Array.isArray(response.data)) {
          response.data = [];
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  } catch (error) {
    if (error.response) {
      // Server responded with an error status
      console.error('[api.js] Server error:', {
        status: error.response.status,
        data: error.response.data,
        url: url
      });
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        console.error('[api.js] UNAUTHORIZED (401) detected');
        sessionStorage.setItem('auth_error', 'true');
        
        // Dynamically import auth service to avoid circular dependencies
        try {
          const authService = await import('./authService');
          const isAuthUrl = url.includes('verify-web-auth') || url.includes('login');
          
          if (!isAuthUrl) {
            console.log('[api.js] Triggering emergency redirect due to 401');
            authService.emergencyRedirect();
          }
        } catch (e) {
          console.error('[api.js] Failed to load auth service for 401 handling', e);
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[api.js] Network error:', {
        message: error.message,
        url: url
      });
    } else {
      // Something happened in setting up the request
      console.error('[api.js] Request setup error:', error.message);
    }
    
    throw error;
  }
};

// API methods
const apiMethods = {
  getUserProfile() {
    return makeRequest('get', '/user-profile')
      .catch(error => {
        // Return a minimal default profile if the request fails
        console.error('[api.js] getUserProfile failed, returning default:', error);
        return {
          data: {
            tokens: 0,
            subscription_type: 'free',
            subscription_end: null,
            channel_reward_claimed: false
          }
        };
      });
  },
  
  getAnalysesHistory() {
    return makeRequest('get', '/analyses-history')
      .catch(error => {
        // Return an empty array if the request fails
        console.error('[api.js] getAnalysesHistory failed, returning empty array:', error);
        return { data: [] };
      });
  },
  
  claimChannelReward() {
    return makeRequest('post', '/claim-channel-token');
  },
  
  getDeepAnalysis() {
    return makeRequest('post', '/deep-analysis');
  },
  
  createInvoiceLink(plan, duration, amount, payload) {
    return makeRequest('post', '/create-invoice', {
      plan,
      duration,
      amount,
      payload
    });
  },
  
  verifyWebAuth(userData) {
    return makeRequest('post', '/verify-web-auth', userData);
  },
  
  logout() {
    console.log("[api.js] Performing API cleanup for logout");
    try {
      delete apiClient.defaults.headers.common['x-web-auth-user'];
      delete apiClient.defaults.headers.common['X-Web-Auth-User']; 
      delete apiClient.defaults.headers.common['X-Telegram-Init-Data'];
    } catch (error) {
      console.error('[api.js] Error while clearing headers during logout:', error);
    }
    return Promise.resolve({ success: true });
  }
};

export { apiClient };
export default apiMethods;
