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

// Safely check if Telegram object exists
function safeCheckTelegram() {
  try {
    // Check if window.Telegram exists
    return typeof window !== 'undefined' && 
           window.Telegram !== undefined && 
           typeof window.Telegram === 'object';
  } catch (e) {
    console.error('[api.js] Error checking Telegram object:', e);
    return false;
  }
}

// Safely get InitData from Telegram if available
function safeGetTelegramInitData() {
  try {
    if (!safeCheckTelegram()) {
      return '';
    }
    
    // Now safely access WebApp
    const webApp = window.Telegram.WebApp;
    if (!webApp) {
      return '';
    }
    
    return webApp.initData || '';
  } catch (e) {
    console.error('[api.js] Error getting Telegram initData:', e);
    return '';
  }
}

// Safely get auth token if available (new bot auth method)
function getBotAuthToken() {
  try {
    const token = localStorage.getItem('bot_auth_token');
    if (token) {
      console.log('[api.js] Using Bot Auth Token');
      return token;
    }
    return null;
  } catch (e) {
    console.error('[api.js] Error accessing localStorage for bot token:', e);
    return null;
  }
}

// Get authentication headers - careful handling to avoid type errors
function getAuthHeaders() {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Try Bot Auth Token first (new preferred method)
    const botToken = getBotAuthToken();
    if (botToken) {
      console.log('[api.js] Using Bot Token authentication');
      headers['X-Bot-Auth-Token'] = botToken;
      
      // Debug the headers being sent
      console.log('[api.js] Bot auth headers:', JSON.stringify(headers));
      return headers;
    }
    
    // Try Telegram WebApp second - with careful property access
    const initData = safeGetTelegramInitData();
    
    if (initData) {
      console.log('[api.js] Using Telegram WebApp authentication');
      headers['X-Telegram-Init-Data'] = initData;
      
      // Debug the headers being sent
      console.log('[api.js] Telegram auth headers:', headers);
      return headers;
    }
    
    // If no Telegram WebApp, try stored user data
    try {
      const storedUser = localStorage.getItem('telegram_user');
      if (storedUser) {
        const userData = safeJsonParse(storedUser);
        if (userData && userData.id) {
          try {
            // Convert numeric ID to string if needed (important for JSON comparison on server)
            const userId = String(userData.id);
            
            // Create the header safely - IMPORTANT: Use exact format expected by server
            // Making sure all fields are explicitly present and use strings
            const headerData = JSON.stringify({
              id: userId,
              username: userData.username || "",
              first_name: userData.first_name || "",
              last_name: userData.last_name || ""
            });
            
            // Use the exact header name that the server expects
            headers['X-Web-Auth-User'] = headerData;
            
            console.log(`[api.js] Using Web Auth, User ID: ${userId}`);
            console.log('[api.js] Web auth headers:', JSON.stringify(headers));
            console.log('[api.js] Web auth user data:', headerData);
            
            // Store ID in localStorage for emergency backup
            localStorage.setItem('last_auth_user_id', userId);
            
            return headers;
          } catch (e) {
            console.error('[api.js] Error creating auth header:', e);
          }
        } else {
          console.error('[api.js] Invalid stored user data - missing ID:', userData);
        }
      } else {
        console.log('[api.js] No stored telegram_user found in localStorage');
      }
    } catch (e) {
      console.error('[api.js] Error accessing localStorage:', e);
    }
    
    // Try emergency fallback - if we have a user ID but header creation failed
    const lastUserId = localStorage.getItem('last_auth_user_id');
    if (lastUserId) {
      try {
        console.log('[api.js] Using emergency backup auth with user ID:', lastUserId);
        const fallbackData = JSON.stringify({
          id: String(lastUserId),
          username: "",
          first_name: "",
          last_name: ""
        });
        headers['X-Web-Auth-User'] = fallbackData;
        console.log('[api.js] Emergency fallback headers:', JSON.stringify(headers));
        return headers;
      } catch (e) {
        console.error('[api.js] Error creating emergency auth header:', e);
      }
    } else {
      console.log('[api.js] No emergency backup user ID found');
    }
    
    console.warn('[api.js] No authentication method available');
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
    console.log(`[api.js] Headers being sent:`, headers);
    
    // Safely build config to avoid type errors
    const config = { 
      method: method || 'get', 
      url: url || '',
      headers: headers || {},
      withCredentials: true,  // Include credentials in request
    };
    
    if (data) {
      config.data = data;
    }
    
    // Perform the request with extensive error handling
    try {
      console.log(`[api.js] Making ${method} request to ${url}`);
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
      console.error('[api.js] Error during request:', error.message);
      console.log(`[api.js] Request failed for URL: ${url}, Method: ${method}`);
      
      // Handle specific error cases
      if (error.response) {
        console.log(`[api.js] Server responded with status: ${error.response.status}`);
        
        // Handle 401 errors differently - might need to re-auth
        if (error.response.status === 401) {
          console.warn('[api.js] Received 401 Unauthorized - Authentication issue');
          
          // Debug the headers we sent that caused the 401
          if (config && config.headers) {
            console.log('[api.js] Request headers that caused 401:', JSON.stringify(config.headers));
            
            // Check if we have auth headers
            const hasWebAuth = !!config.headers['X-Web-Auth-User'];
            const hasTelegramAuth = !!config.headers['X-Telegram-Init-Data'];
            
            console.log(`[api.js] Authentication headers present: Web=${hasWebAuth}, Telegram=${hasTelegramAuth}`);
            
            if (hasWebAuth) {
              try {
                // Parse and log the user ID we sent
                const webAuthData = JSON.parse(config.headers['X-Web-Auth-User']);
                console.log(`[api.js] Web Auth user ID sent: ${webAuthData.id}`);
              } catch (e) {
                console.error('[api.js] Could not parse Web Auth header:', e);
              }
            }
          }
          
          // Only redirect for non-auth endpoints
          if (!url.includes('verify-web-auth')) {
            console.warn('[api.js] Non-auth endpoint received 401, might need to re-login');
            // Set a flag but don't redirect immediately from non-UI code
            sessionStorage.setItem('auth_error', 'true');
          }
        }
      }
      
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
  
  /**
   * Get an authentication token from the server using bot credentials
   * @param {Object} authData - Authentication data from the bot
   * @returns {Promise<Object>} - Response with token and user info
   */
  getBotAuthToken(authData) {
    return makeRequest('post', '/auth/token', authData)
      .catch(error => {
        console.error('[api.js] getBotAuthToken failed:', error);
        throw error;
      });
  },
  
  /**
   * Check the status of an authentication session
   * @param {string} sessionId - The session ID to check
   * @returns {Promise<Object>} - Session status information
   */
  checkSessionStatus(sessionId) {
    return makeRequest('get', `/web-auth?session_id=${sessionId}`)
      .catch(error => {
        console.error('[api.js] checkSessionStatus failed:', error);
        throw error;
      });
  },
  
  logout() {
    console.log("[api.js] Performing API cleanup for logout");
    try {
      delete apiClient.defaults.headers.common['x-web-auth-user'];
      delete apiClient.defaults.headers.common['X-Web-Auth-User']; 
      delete apiClient.defaults.headers.common['X-Telegram-Init-Data'];
      delete apiClient.defaults.headers.common['X-Bot-Auth-Token']; // Add clearing bot auth header
    } catch (error) {
      console.error('[api.js] Error while clearing headers during logout:', error);
    }
    return Promise.resolve({ success: true });
  }
};

export { apiClient, safeCheckTelegram, safeGetTelegramInitData };
export default apiMethods;

