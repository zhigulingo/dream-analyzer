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

// Get authentication headers - careful handling to avoid type errors
function getAuthHeaders() {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Try Telegram WebApp first - with careful property access
    const telegramWebApp = window.Telegram || {};
    const initData = telegramWebApp.WebApp?.initData || '';
    
    if (initData) {
      console.log('[api.js] Using Telegram WebApp authentication');
      headers['X-Telegram-Init-Data'] = initData;
      return headers;
    }
    
    // If no Telegram WebApp, try stored user data
    try {
      const storedUser = localStorage.getItem('telegram_user');
      if (storedUser) {
        const userData = safeJsonParse(storedUser);
        if (userData && userData.id) {
          try {
            // Create the header safely
            const headerData = JSON.stringify({
              id: userData.id,
              username: userData.username || "",
              first_name: userData.first_name || "",
              last_name: userData.last_name || ""
            });
            
            headers['x-web-auth-user'] = headerData;
            headers['X-Web-Auth-User'] = headerData;
            
            console.log(`[api.js] Using Web Auth, User ID: ${userData.id}`);
          } catch (e) {
            console.error('[api.js] Error creating auth header:', e);
          }
        }
      }
    } catch (e) {
      console.error('[api.js] Error accessing localStorage:', e);
    }
    
    return headers;
  } catch (e) {
    console.error('[api.js] Error in getAuthHeaders:', e);
    // Return minimal headers to avoid type errors
    return { 'Content-Type': 'application/json' };
  }
}

// Создаем экземпляр Axios с базовым URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Simple request wrapper that adds auth headers
const makeRequest = async (method, url, data = null) => {
  try {
    // Get headers safely
    const headers = getAuthHeaders();
    console.log(`[api.js] Making ${method.toUpperCase()} request to: ${url}`);
    console.log(`[api.js] Headers being sent: ${Object.keys(headers).join(', ')}`);
    
    // Build config carefully
    const config = { 
      method: method, 
      url: url,
      headers: headers
    };
    
    if (data) {
      config.data = data;
    }
    
    // Perform the request with extensive error handling
    try {
      const response = await apiClient(config);
      
      // Safety checks for response data
      if (!response.data && url.includes('user-profile')) {
        console.warn('[api.js] Empty response data for profile, returning defaults');
        response.data = {
          tokens: 0,
          subscription_type: 'free',
          subscription_end: null,
          channel_reward_claimed: false
        };
      }
      
      if (!response.data && url.includes('analyses-history')) {
        console.warn('[api.js] Empty response data for history, returning empty array');
        response.data = [];
      }
      
      // Transform null values to proper defaults
      if (url.includes('user-profile') && response.data) {
        response.data.tokens = response.data.tokens ?? 0;
        response.data.subscription_type = response.data.subscription_type ?? 'free';
      }
      
      // Make sure history is always an array
      if (url.includes('analyses-history')) {
        if (!Array.isArray(response.data)) {
          response.data = Array.isArray(response.data) ? response.data : [];
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('[api.js] Request setup error:', error);
    
    // Different fallback data based on endpoint
    if (url.includes('user-profile')) {
      return {
        data: {
          tokens: 0,
          subscription_type: 'free',
          subscription_end: null,
          channel_reward_claimed: false
        }
      };
    } else if (url.includes('analyses-history')) {
      return { data: [] };
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
    return makeRequest('post', '/claim-channel-token')
      .catch(error => {
        console.error('[api.js] claimChannelReward failed:', error);
        throw error;
      });
  },
  
  getDeepAnalysis() {
    return makeRequest('post', '/deep-analysis')
      .catch(error => {
        console.error('[api.js] getDeepAnalysis failed:', error);
        throw error;
      });
  },
  
  createInvoiceLink(plan, duration, amount, payload) {
    return makeRequest('post', '/create-invoice', {
      plan: plan || '',
      duration: duration || 0,
      amount: amount || 0,
      payload: payload || ''
    }).catch(error => {
      console.error('[api.js] createInvoiceLink failed:', error);
      throw error;
    });
  },
  
  verifyWebAuth(userData) {
    // Ensure userData has required properties
    const safeUserData = {
      id: userData?.id || '',
      first_name: userData?.first_name || '',
      last_name: userData?.last_name || '',
      username: userData?.username || '',
      photo_url: userData?.photo_url || '',
      auth_date: userData?.auth_date || '',
      hash: userData?.hash || ''
    };
    
    return makeRequest('post', '/verify-web-auth', safeUserData)
      .catch(error => {
        console.error('[api.js] verifyWebAuth failed:', error);
        throw error;
      });
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
