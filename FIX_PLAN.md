# Dream Analyzer - План исправления проблем

## 🎯 Главные проблемы

### Проблема 1: Не настроены переменные окружения в Netlify
**Критичность:** 🔴 **КРИТИЧЕСКАЯ**

### Проблема 2: Возможные CORS проблемы  
**Критичность:** 🟡 **СРЕДНЯЯ**

### Проблема 3: Отсутствует user store для web
**Критичность:** 🟠 **ВЫСОКАЯ**

## 🔧 План исправления

### Этап 1: Настройка переменных окружения (КРИТИЧЕСКАЯ ЗАДАЧА)

**Действие 1.1:** Настроить переменные для TMA сайта в Netlify UI
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
```

**Действие 1.2:** Настроить переменные для Web сайта в Netlify UI
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login
VITE_REFRESH_TOKEN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout
```

**Действие 1.3:** Пересобрать и переразвернуть оба сайта

### Этап 2: Создание web user store

**Проблема:** В web/src/stores/ отсутствует user.js файл

**Действие 2.1:** Создать web/src/stores/user.js на основе TMA version
- Адаптировать для web авторизации (JWT вместо InitData)
- Использовать web ApiService вместо TMA api service
- Убрать TMA-специфичную логику

**Действие 2.2:** Обновить PersonalAccount.vue для использования store

### Этап 3: Проверка и исправление CORS

**Действие 3.1:** Убедиться что в переменных окружения bot сайта настроены:
```bash
ALLOWED_TMA_ORIGIN=https://tma-site-url.netlify.app
ALLOWED_WEB_ORIGIN=https://web-site-url.netlify.app
```

**Действие 3.2:** Проверить что все функции используют правильные CORS headers

### Этап 4: Тестирование и валидация

**Действие 4.1:** Проверить TMA через Debug компонент
**Действие 4.2:** Проверить Web через Debug компонент  
**Действие 4.3:** Проверить логи Netlify Functions

## 🚀 Немедленные действия (Quick Wins)

### 1. Использовать Netlify CLI для проверки статуса

```bash
# Проверить статус деплоев
netlify status

# Проверить переменные окружения
netlify env:list

# Добавить переменные (для каждого сайта)
netlify env:set VITE_API_BASE_URL "https://sparkling-cupcake-940504.netlify.app/.netlify/functions"
```

### 2. Создать user.js store для web

**Файл:** `web/src/stores/user.js`

**Основа:** Скопировать из `tma/src/stores/user.js` и адаптировать:
- Убрать TMA-специфичные методы (Telegram WebApp API calls)
- Заменить `api` на `apiService` из `web/src/utils/api.js`  
- Убрать offline detection (можно оставить для будущего)
- Убрать notification store (можно оставить заглушку)

### 3. Добавить debug информацию в компоненты

**Уже есть:**
- `tma/src/components/DebugInfo.vue`
- `web/src/components/DebugInfo.vue`

**Использовать их для диагностики**

## 📋 Подробный план создания web user store

### Базовая структура:

```javascript
// web/src/stores/user.js
import { defineStore } from 'pinia';
import apiService from '@/utils/api.js';

export const useUserStore = defineStore('user', {
  state: () => ({
    // Профиль пользователя
    profile: { 
      tokens: null, 
      subscription_type: 'free', 
      subscription_end: null,
      channel_reward_claimed: false
    },
    
    // История анализов
    history: [],
    
    // Состояния загрузки
    isLoadingProfile: false,
    isLoadingHistory: false,
    
    // Ошибки
    errorProfile: null,
    errorHistory: null,
    
    // Web-специфичное состояние
    webUser: null, // Данные пользователя из JWT
    isAuthenticated: false
  }),

  getters: {
    isPremium: (state) => state.profile.subscription_type === 'premium',
    hasHistory: (state) => state.history && state.history.length > 0
  },

  actions: {
    // Загрузка профиля через web API
    async fetchProfile() {
      this.isLoadingProfile = true;
      this.errorProfile = null;
      
      try {
        const response = await apiService.post('/user-profile');
        const data = await response.json();
        this.profile = { ...this.profile, ...data };
      } catch (error) {
        this.errorProfile = error.message;
        throw error;
      } finally {
        this.isLoadingProfile = false;
      }
    },

    // Загрузка истории через web API
    async fetchHistory() {
      this.isLoadingHistory = true;
      this.errorHistory = null;
      
      try {
        const response = await apiService.get('/analyses-history');
        const data = await response.json();
        this.history = data;
      } catch (error) {
        this.errorHistory = error.message;
        throw error;
      } finally {
        this.isLoadingHistory = false;
      }
    },

    // Логаут
    async logout() {
      try {
        await apiService.logout();
      } finally {
        this.profile = { tokens: null, subscription_type: 'free', subscription_end: null };
        this.history = [];
        this.webUser = null;
        this.isAuthenticated = false;
      }
    }
  }
});
```

## 🔍 Валидация исправлений

### Критерии успеха:

#### TMA:
- [ ] API calls возвращают данные (не 500/403)
- [ ] История снов отображается  
- [ ] Профиль пользователя загружается
- [ ] Debug показывает правильный API URL

#### Web:
- [ ] Логин проходит успешно
- [ ] Личный кабинет открывается
- [ ] История снов отображается
- [ ] Debug показывает правильные API URLs

### Команды для тестирования:

```bash
# Проверить переменные окружения каждого сайта
curl https://tma-site-url.netlify.app/.well-known/debug
curl https://web-site-url.netlify.app/.well-known/debug

# Проверить API connectivity
curl -X POST https://sparkling-cupcake-940504.netlify.app/.netlify/functions/user-profile \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Init-Data: test"

curl -X POST https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login \
  -H "Content-Type: application/json" \
  -d '{"tg_id": 12345, "password": "test"}'
```

## 🎛 Пошаговое выполнение

### Шаг 1: Настройка переменных окружения (15 мин)
1. Открыть Netlify Dashboard
2. Найти TMA сайт → Site settings → Environment variables
3. Добавить `VITE_API_BASE_URL`
4. Найти Web сайт → Site settings → Environment variables  
5. Добавить все 4 переменные
6. Trigger rebuild для обоих сайтов

### Шаг 2: Создание web user store (30 мин)
1. Создать файл `web/src/stores/user.js`
2. Скопировать базовую структуру из TMA
3. Адаптировать для web API calls
4. Протестировать локально

### Шаг 3: Обновление PersonalAccount.vue (15 мин)
1. Импортировать web user store
2. Заменить прямые API calls на store methods
3. Проверить error handling

### Шаг 4: Деплой и тестирование (10 мин)
1. Закоммитить изменения
2. Дождаться автодеплоя  
3. Протестировать оба приложения
4. Проверить логи при необходимости

---

**Общее время выполнения:** ~70 минут  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ (пользователи не могут пользоваться приложением)

*План создан: $(date)*