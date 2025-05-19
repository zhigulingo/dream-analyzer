/**
 * Global fetch interceptor
 * Intercepts all fetch calls to handle common authentication issues
 */

// Store the original fetch function
const originalFetch = window.fetch;

// Handle response errors
const handleResponseError = async (response, url) => {
  // Handle 401 Unauthorized errors
  if (response.status === 401) {
    console.error(`[fetchInterceptor] 401 Unauthorized error for ${url}`);
    
    try {
      // Import auth service dynamically
      const authService = await import('./authService');
      
      // Mark auth error in session storage
      sessionStorage.setItem('auth_error', 'true');
      
      // Don't redirect for auth endpoints
      if (!url.includes('/verify-web-auth') && !url.includes('/login')) {
        console.log('[fetchInterceptor] 401 on non-auth endpoint, triggering redirect');
        authService.emergencyRedirect();
      }
    } catch (e) {
      console.error('[fetchInterceptor] Failed to handle 401:', e);
    }
  }
  
  return response;
};

// Install the interceptor
export function installFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  window.fetch = async (...args) => {
    const [resource, config] = args;
    
    // Call the original fetch
    try {
      const response = await originalFetch(resource, config);
      
      // Handle errors in the response
      return handleResponseError(response, typeof resource === 'string' ? resource : resource.url);
    } catch (error) {
      console.error('[fetchInterceptor] Network error:', error);
      throw error;
    }
  };
  
  console.log('[fetchInterceptor] Global fetch interceptor installed');
}

// Restore the original fetch
export function uninstallFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  window.fetch = originalFetch;
  console.log('[fetchInterceptor] Global fetch interceptor removed');
}

export default {
  install: installFetchInterceptor,
  uninstall: uninstallFetchInterceptor
}; 