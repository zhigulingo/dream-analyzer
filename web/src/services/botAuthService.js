/**
 * Bot authentication service for web application
 * Handles bot-specific authentication data using secure cookies
 */

import { setAuthToken, setUserData, setLastAuthUserId } from '@/utils/cookies';

/**
 * Store authentication data received from bot
 * @param {Object} authData - Authentication data from bot
 * @param {string} authData.token - Authentication token
 * @param {Object} authData.user - User data
 */
export const storeAuthData = (authData) => {
  console.log('[BotAuthService] Storing authentication data');
  
  try {
    // Store the authentication token
    if (authData.token) {
      setAuthToken(authData.token);
    }
    
    // Store user data
    if (authData.user) {
      const userData = {
        id: authData.user.tg_id,
        username: authData.user.username || '',
        first_name: authData.user.first_name || '',
        last_name: authData.user.last_name || '',
        auth_date: Math.floor(Date.now() / 1000).toString()
      };
      
      setUserData(userData);
      setLastAuthUserId(String(authData.user.tg_id));
    }
    
    console.log('[BotAuthService] Authentication data stored successfully');
  } catch (error) {
    console.error('[BotAuthService] Error storing auth data:', error);
    throw error;
  }
};

/**
 * Validate bot authentication response
 * @param {Object} response - Response from bot authentication
 * @returns {boolean} True if response is valid
 */
export const validateBotAuthResponse = (response) => {
  if (!response || !response.success) {
    return false;
  }
  
  if (!response.user || !response.user.tg_id) {
    return false;
  }
  
  return true;
};

/**
 * Process bot authentication code
 * @param {string} code - Authentication code from bot
 * @returns {Promise<Object>} Authentication result
 */
export const processBotAuthCode = async (code) => {
  if (!code) {
    throw new Error('Authentication code is required');
  }
  
  // This function would typically make an API call to verify the code
  // For now, it's a placeholder that should be implemented based on your API
  console.log('[BotAuthService] Processing bot auth code:', code);
  
  // Return a promise that should be resolved by the calling code
  return {
    success: false,
    error: 'Bot auth code processing not implemented'
  };
};

// Default export
const botAuthService = {
  storeAuthData,
  validateBotAuthResponse,
  processBotAuthCode
};

export default botAuthService;