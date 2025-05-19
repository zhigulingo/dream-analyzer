import { createRouter, createWebHistory } from 'vue-router'
import PersonalAccount from '@/views/PersonalAccount.vue'
import WebLogin from '@/views/WebLogin.vue'

const routes = [
  {
    path: '/',
    name: 'WebLogin',
    component: WebLogin,
    meta: { requiresNoAuth: true }
  },
  {
    path: '/account',
    name: 'PersonalAccount',
    component: PersonalAccount,
    meta: { requiresAuth: true }
  },
  {
    path: '/logout',
    name: 'Logout',
    component: {
      template: '<div class="logout-page">Logging out...</div>',
      setup() {
        // Import what we need
        const { onMounted } = require('vue');
        const { useUserStore } = require('@/stores/user');
        
        onMounted(async () => {
          // Get user store
          const userStore = useUserStore();
          
          // Log the logout attempt
          console.log('Logout page: performing emergency logout');
          
          // Clear storage immediately
          localStorage.clear();
          sessionStorage.clear();
          
          // Try to run store logout
          try {
            await userStore.logout();
          } catch (e) {
            console.error('Error in logout:', e);
          }
          
          // Redirect to login with special param
          setTimeout(() => {
            window.location.href = '/?logout=true&t=' + Date.now();
          }, 500);
        });
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Import auth service
import * as authService from '@/services/authService';

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  // CRITICAL: Check for redirect loop prevention
  if (authService.isInRedirectLoop()) {
    console.error('[Router] REDIRECT LOOP DETECTED - EMERGENCY BREAK');
    authService.emergencyRedirect();
    return;
  }
  
  // Increment redirect count (will be reset after successful navigation)
  const currentCount = authService.incrementRedirectCount();
  console.log(`[Router] Navigation redirect count: ${currentCount}`);
  
  // Check for emergency logout flag
  const forceLogout = authService.isForceLogoutActive() || to.query.force_logout === 'true';
    
  if (forceLogout) {
    console.log('[Router] EMERGENCY LOGOUT detected - blocking auto-login');
    // If heading to login page, allow it and clear the flag
    if (to.name === 'WebLogin') {
      localStorage.removeItem('force_logout');
      console.log('[Router] Proceeding to login page and clearing logout flag');
      authService.resetRedirectCount();
      return next();
    }
  }

  // Check authentication method
  const authMethod = authService.getAuthenticationMethod();
  const isAuthenticated = authMethod !== null;
  
  // Special handling for logout detection - if coming from a logout action
  const isLoggingOut = from.name === 'PersonalAccount' && to.name === 'WebLogin';
  
  // Log authentication state for debugging
  console.log('[Router] Auth check:', { 
    path: to.path,
    authMethod,
    isAuthenticated,
    isLoggingOut,
    forceLogout,
    redirectCount: currentCount
  });
  
  // Handle API 401 errors that might have happened
  const hasAuthError = sessionStorage.getItem('auth_error') === 'true';
  if (hasAuthError && isAuthenticated && !isLoggingOut) {
    console.error('[Router] Auth error detected, forcing logout');
    sessionStorage.removeItem('auth_error');
    authService.clearAllAuthData();
    authService.resetRedirectCount();
    return next({ name: 'WebLogin', query: { error: 'auth_expired' }});
  }
  
  // If user is logging out, always allow navigation to login page
  if (isLoggingOut) {
    console.log('[Router] Detected logout action, allowing navigation to login');
    authService.resetRedirectCount();
    return next();
  }
  
  // Redirect logic
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redirect to login if trying to access protected route without auth
    console.log('[Router] Unauthorized access attempt, redirecting to login');
    authService.resetRedirectCount();
    next({ name: 'WebLogin' });
  } else if (to.meta.requiresNoAuth && isAuthenticated) {
    // Redirect to account if trying to access login page when already logged in
    console.log('[Router] Already authenticated, redirecting to account');
    authService.resetRedirectCount();
    next({ name: 'PersonalAccount' });
  } else {
    // Allow navigation
    authService.resetRedirectCount();
    next();
  }
})

export default router 