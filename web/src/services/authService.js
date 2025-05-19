/**
 * Authentication Service
 * Provides global authentication utilities and ensures consistent auth behavior
 */

// Helper function to safely check for Telegram WebApp
function hasTelegramAuth() {
  try {
    return !!window.Telegram?.WebApp?.initData;
  } catch (e) {
    console.error('[AuthService] Error checking Telegram WebApp:', e);
    return false;
  }
}

// Helper function to safely check for web auth
function hasWebAuth() {
  try {
    const userData = localStorage.getItem('telegram_user');
    if (!userData) return false;
    
    // Attempt to parse the user data to verify it's valid JSON
    const parsedData = JSON.parse(userData);
    return !!parsedData && !!parsedData.id;
  } catch (e) {
    console.error('[AuthService] Error checking web auth:', e);
    return false;
  }
}

// Create a function to completely clear all app data
export function clearAllAuthData() {
  console.log('[AuthService] Performing complete auth data cleanup');
  
  try {
    // 1. Clear localStorage
    localStorage.clear();
    
    // 2. Clear sessionStorage
    sessionStorage.clear();
    
    // 3. Clear all cookies - thorough approach
    document.cookie.split(";").forEach(function(c) {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      document.cookie = name + "=;expires=" + new Date(0).toUTCString() + ";path=/";
    });
    
    // 4. Set emergency flags
    localStorage.setItem('force_logout', 'true');
    sessionStorage.setItem('redirect_count', '0');
    
    return true;
  } catch (error) {
    console.error('[AuthService] Error during data cleanup:', error);
    return false;
  }
}

// Check if the user is experiencing a redirect loop
export function isInRedirectLoop() {
  try {
    const redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
    return redirectCount > 3;
  } catch (e) {
    console.error('[AuthService] Error checking redirect loop:', e);
    return false;
  }
}

// Increment redirect counter
export function incrementRedirectCount() {
  try {
    const current = parseInt(sessionStorage.getItem('redirect_count') || '0');
    const newCount = current + 1;
    sessionStorage.setItem('redirect_count', newCount.toString());
    return newCount;
  } catch (e) {
    console.error('[AuthService] Error incrementing redirect count:', e);
    return 0;
  }
}

// Reset redirect counter
export function resetRedirectCount() {
  try {
    sessionStorage.setItem('redirect_count', '0');
  } catch (e) {
    console.error('[AuthService] Error resetting redirect count:', e);
  }
}

// Check if a force logout is active
export function isForceLogoutActive() {
  try {
    return localStorage.getItem('force_logout') === 'true';
  } catch (e) {
    console.error('[AuthService] Error checking force logout state:', e);
    return false;
  }
}

// Get authentication method - returns 'telegram', 'web', or null
export function getAuthenticationMethod() {
  // Try telegram WebApp first
  if (hasTelegramAuth()) {
    return 'telegram';
  }
  
  // Then try web auth
  if (hasWebAuth()) {
    return 'web';
  }
  
  return null;
}

// Emergency redirect to standalone login page
export function emergencyRedirect() {
  console.log('[AuthService] Performing emergency redirect');
  clearAllAuthData();
  window.location.href = '/emergency.html';
}

export default {
  clearAllAuthData,
  isInRedirectLoop,
  incrementRedirectCount,
  resetRedirectCount,
  isForceLogoutActive,
  getAuthenticationMethod,
  emergencyRedirect
}; 