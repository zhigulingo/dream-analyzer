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
  // Check if user is logged in by looking for stored Telegram user data
  const telegramUser = localStorage.getItem('telegram_user')
  const isAuthenticated = !!telegramUser
  
  // Redirect logic
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redirect to login if trying to access protected route without auth
    next({ name: 'WebLogin' })
  } else if (to.meta.requiresNoAuth && isAuthenticated) {
    // Redirect to account if trying to access login page when already logged in
    next({ name: 'PersonalAccount' })
  } else {
    // Allow navigation
    next()
  }
})

export default router 