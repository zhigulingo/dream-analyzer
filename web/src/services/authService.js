/**
 * Authentication service for web application
 * Handles secure token management using cookies
 */

import { clearAllAuthCookies, getAuthToken, getUserData } from '@/utils/cookies';

/**
 * Check if force logout is active
 * @returns {boolean} True if force logout is detected
 */
export const isForceLogoutActive = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('force_logout') && urlParams.get('force_logout') === 'true';
};

/**
 * Clear all authentication data from cookies and storage
 */
export const clearAllAuthData = () => {
  console.log('[AuthService] Clearing all authentication data');
  
  try {
    // Clear cookies
    clearAllAuthCookies();
    
    // Clear any remaining localStorage data (for cleanup)
    localStorage.removeItem('bot_auth_token');
    localStorage.removeItem('telegram_user');
    localStorage.removeItem('last_auth_user_id');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('[AuthService] All auth data cleared successfully');
  } catch (error) {
    console.error('[AuthService] Error clearing auth data:', error);
  }
};

/**
 * Emergency redirect to clear all data and go to login
 */
export const emergencyRedirect = () => {
  console.log('[AuthService] Emergency redirect initiated');
  
  try {
    // Clear all auth data first
    clearAllAuthData();
    
    // Add force logout parameter and redirect
    const url = new URL(window.location.origin);
    url.searchParams.set('force_logout', 'true');
    
    // Force hard redirect
    window.location.href = url.toString();
  } catch (error) {
    console.error('[AuthService] Error during emergency redirect:', error);
    // Fallback - just clear data and reload
    clearAllAuthData();
    window.location.reload();
  }
};

/**
 * Check if user has valid authentication
 * @returns {boolean} True if user appears to be authenticated
 */
export const hasValidAuth = () => {
  const token = getAuthToken();
  const userData = getUserData();
  
  return !!(token || userData);
};

/**
 * Get current user data from secure storage
 * @returns {Object|null} User data or null if not found
 */
export const getCurrentUser = () => {
  return getUserData();
};

/**
 * Check if current session should be terminated
 * @returns {boolean} True if session should end
 */
export const shouldTerminateSession = () => {
  // Check for explicit logout parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('logout') || urlParams.has('force_logout')) {
    return true;
  }
  
  // Check for auth error parameters
  if (urlParams.has('error') && urlParams.get('error') === 'auth_expired') {
    return true;
  }
  
  return false;
};

/**
 * Perform cleanup on app initialization
 */
export const initializeAuth = () => {
  console.log('[AuthService] Initializing authentication');
  
  // Check if we should terminate session
  if (shouldTerminateSession()) {
    console.log('[AuthService] Session termination requested');
    clearAllAuthData();
    return false;
  }
  
  // Check if force logout is active
  if (isForceLogoutActive()) {
    console.log('[AuthService] Force logout detected');
    clearAllAuthData();
    return false;
  }
  
  return hasValidAuth();
};

// Default export with all functions
const authService = {
  isForceLogoutActive,
  clearAllAuthData,
  emergencyRedirect,
  hasValidAuth,
  getCurrentUser,
  shouldTerminateSession,
  initializeAuth
};

export default authService;