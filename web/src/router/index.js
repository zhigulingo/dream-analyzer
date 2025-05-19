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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  // DIRECT CHECK: Look for stored Telegram user data directly from localStorage
  const telegramUser = localStorage.getItem('telegram_user');
  const isTelegramWebApp = !!window.Telegram?.WebApp;
  
  // Force a FRESH check of authentication state on each route change
  const isAuthenticated = isTelegramWebApp || !!telegramUser;
  
  // Special handling for logout detection - if coming from a logout action
  const isLoggingOut = from.name === 'PersonalAccount' && to.name === 'WebLogin';
  
  // Log authentication state for debugging
  console.log('[Router] Auth check:', { 
    path: to.path,
    isTelegramWebApp, 
    hasStoredUser: !!telegramUser, 
    isAuthenticated,
    isLoggingOut
  });
  
  // If user is logging out, always allow navigation to login page
  if (isLoggingOut) {
    console.log('[Router] Detected logout action, allowing navigation to login');
    return next();
  }
  
  // Redirect logic
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redirect to login if trying to access protected route without auth
    console.log('[Router] Unauthorized access attempt, redirecting to login');
    next({ name: 'WebLogin' });
  } else if (to.meta.requiresNoAuth && isAuthenticated) {
    // Redirect to account if trying to access login page when already logged in
    console.log('[Router] Already authenticated, redirecting to account');
    next({ name: 'PersonalAccount' });
  } else {
    // Allow navigation
    next();
  }
})

export default router 