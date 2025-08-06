/**
 * Utility functions for secure cookie management
 * Replaces localStorage usage for tokens to improve security
 */

/**
 * Set a cookie with security flags
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 */
export const setCookie = (name, value, options = {}) => {
  const defaults = {
    path: '/',
    secure: window.location.protocol === 'https:',
    sameSite: 'Strict',
    maxAge: 86400 // 24 hours by default
  };
  
  const config = { ...defaults, ...options };
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  
  if (config.path) cookieString += `; Path=${config.path}`;
  if (config.domain) cookieString += `; Domain=${config.domain}`;
  if (config.maxAge) cookieString += `; Max-Age=${config.maxAge}`;
  if (config.expires) cookieString += `; Expires=${config.expires.toUTCString()}`;
  if (config.secure) cookieString += `; Secure`;
  if (config.sameSite) cookieString += `; SameSite=${config.sameSite}`;
  
  document.cookie = cookieString;
};

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export const getCookie = (name) => {
  const encodedName = encodeURIComponent(name);
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === encodedName) {
      return decodeURIComponent(cookieValue);
    }
  }
  
  return null;
};

/**
 * Delete a cookie by setting it to expire immediately
 * @param {string} name - Cookie name
 * @param {Object} options - Cookie options (path, domain)
 */
export const deleteCookie = (name, options = {}) => {
  setCookie(name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
};

/**
 * Check if a cookie exists
 * @param {string} name - Cookie name
 * @returns {boolean} True if cookie exists
 */
export const hasCookie = (name) => {
  return getCookie(name) !== null;
};

/**
 * Store authentication token in cookie (replaces localStorage)
 * @param {string} token - Authentication token
 */
export const setAuthToken = (token) => {
  setCookie('bot_auth_token', token, {
    maxAge: 86400, // 24 hours
    secure: true,
    sameSite: 'Strict'
  });
};

/**
 * Get authentication token from cookie
 * @returns {string|null} Token or null if not found
 */
export const getAuthToken = () => {
  return getCookie('bot_auth_token');
};

/**
 * Remove authentication token
 */
export const removeAuthToken = () => {
  deleteCookie('bot_auth_token');
};

/**
 * Store user data in cookie (replaces localStorage)
 * @param {Object} userData - User data object
 */
export const setUserData = (userData) => {
  setCookie('telegram_user', JSON.stringify(userData), {
    maxAge: 86400, // 24 hours
    secure: true,
    sameSite: 'Strict'
  });
};

/**
 * Get user data from cookie
 * @returns {Object|null} User data object or null if not found
 */
export const getUserData = () => {
  const userData = getCookie('telegram_user');
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (e) {
      console.error('Error parsing user data from cookie:', e);
      return null;
    }
  }
  return null;
};

/**
 * Remove user data
 */
export const removeUserData = () => {
  deleteCookie('telegram_user');
};

/**
 * Clear all authentication-related cookies
 */
export const clearAllAuthCookies = () => {
  removeAuthToken();
  removeUserData();
  deleteCookie('last_auth_user_id');
};

/**
 * Store last authenticated user ID for debugging purposes
 * @param {string} userId - User ID
 */
export const setLastAuthUserId = (userId) => {
  setCookie('last_auth_user_id', userId, {
    maxAge: 86400,
    secure: true,
    sameSite: 'Strict'
  });
};

/**
 * Get last authenticated user ID
 * @returns {string|null} User ID or null if not found
 */
export const getLastAuthUserId = () => {
  return getCookie('last_auth_user_id');
};