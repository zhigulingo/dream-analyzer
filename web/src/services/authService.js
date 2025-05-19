/**
 * Authentication Service
 * Provides global authentication utilities and ensures consistent auth behavior
 */

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
  const redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0');
  return redirectCount > 3;
}

// Increment redirect counter
export function incrementRedirectCount() {
  const current = parseInt(sessionStorage.getItem('redirect_count') || '0');
  sessionStorage.setItem('redirect_count', (current + 1).toString());
  return current + 1;
}

// Reset redirect counter
export function resetRedirectCount() {
  sessionStorage.setItem('redirect_count', '0');
}

// Check if a force logout is active
export function isForceLogoutActive() {
  return localStorage.getItem('force_logout') === 'true';
}

// Get authentication method - returns 'telegram', 'web', or null
export function getAuthenticationMethod() {
  if (window.Telegram?.WebApp?.initData) {
    return 'telegram';
  }
  
  if (localStorage.getItem('telegram_user')) {
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