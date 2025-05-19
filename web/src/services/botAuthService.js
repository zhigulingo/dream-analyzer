/**
 * Bot Auth Service
 * Provides functions for authenticating with the server via the bot
 */

import api from './api';

const TOKEN_STORAGE_KEY = 'bot_auth_token';
const USER_STORAGE_KEY = 'telegram_user';
const TOKEN_EXPIRY_KEY = 'bot_token_expiry';

/**
 * Store authentication data received from the bot
 * @param {Object} authData - Authentication data from bot 
 */
export const storeAuthData = (authData) => {
  if (!authData || !authData.token) {
    console.error('[botAuthService] Invalid auth data:', authData);
    return false;
  }
  
  try {
    // Store the authentication token
    localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
    
    // Store the user data
    if (authData.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
        id: authData.user.tg_id,
        username: authData.user.username || '',
        first_name: authData.user.first_name || '',
        last_name: authData.user.last_name || ''
      }));
    }
    
    // Store token expiry time
    if (authData.expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, authData.expiresAt.toString());
    }
    
    console.log('[botAuthService] Auth data stored successfully');
    return true;
  } catch (error) {
    console.error('[botAuthService] Error storing auth data:', error);
    return false;
  }
};

/**
 * Check if user is authenticated with valid token
 * @returns {boolean} - True if authenticated
 */
export const isAuthenticated = () => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiryTime = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY), 10);
    
    if (!token) {
      return false;
    }
    
    // Check if token is expired
    if (expiryTime) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= expiryTime) {
        console.log('[botAuthService] Token expired');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[botAuthService] Error checking auth status:', error);
    return false;
  }
};

/**
 * Get the authentication token for API requests
 * @returns {string|null} - The token or null if not authenticated
 */
export const getAuthToken = () => {
  try {
    if (!isAuthenticated()) {
      return null;
    }
    
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('[botAuthService] Error getting auth token:', error);
    return null;
  }
};

/**
 * Logout the user by clearing all auth data
 */
export const logout = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    console.log('[botAuthService] Logged out');
  } catch (error) {
    console.error('[botAuthService] Error during logout:', error);
  }
};

export default {
  storeAuthData,
  isAuthenticated,
  getAuthToken,
  logout
}; 