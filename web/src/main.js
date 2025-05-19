// tma/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { installFetchInterceptor } from './services/fetchInterceptor' 

import App from './App.vue' // Ваш корневой компонент Vue
import { useUserStore } from './stores/user'

// Install global fetch interceptor for handling auth errors
installFetchInterceptor();

// Импортируйте ваши глобальные стили, если есть
// import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize the user store
const userStore = useUserStore(pinia)
userStore.init()

app.mount('#app') // Монтируем приложение в <div id="app"> из index.html

// Инициализация Telegram WebApp API (не обязательно здесь, но удобно)
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    console.log("Telegram WebApp is ready.");
    // window.Telegram.WebApp.expand(); // Можно раскрыть окно приложения при старте
} else {
    console.warn("Telegram WebApp script not loaded or executed.");
}
