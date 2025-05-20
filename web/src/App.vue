// tma/src/App.vue
<template>
  <!-- Use router-view instead of directly rendering PersonalAccount -->
  <router-view />
</template>

<script>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from './stores/user';

export default {
  name: 'App',
  setup() {
    const router = useRouter();
    const userStore = useUserStore();

    onMounted(() => {
      // Check if there's an auth_token in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('auth_token');
      
      if (token) {
        console.log('[App] Found auth_token in URL, storing and redirecting to WebLogin');
        
        // Store the token
        localStorage.setItem('bot_auth_token', token);
        
        // Clean up URL - remove token parameter
        const url = new URL(window.location);
        url.searchParams.delete('auth_token');
        window.history.replaceState({}, document.title, url.pathname);
        
        // Redirect to login page which will handle the token
        router.push('/login?process_token=true');
      }
    });
  }
}
</script>

<style>
/* Глобальные стили или стили для App.vue */
/* Можно импортировать CSS-файл: @import './assets/base.css'; */

/* Пример использования переменных Telegram для всего приложения */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--tg-theme-text-color, #000);
  background-color: var(--tg-theme-bg-color, #fff);
}
</style>
