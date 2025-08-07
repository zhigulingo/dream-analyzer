# Dream Analyzer - Диагностика проблем

## 🔍 Выявленные проблемы

### 1. TMA (Telegram Mini App) - Проблемы с загрузкой данных

#### Симптомы:
- "Произошла непредвиденная ошибка"
- "Ошибка загрузки: ошибка сервера"
- Не отображается история снов
- Некорректно отображается пользовательская информация

#### Первичная диагностика:

**Источники ошибок:**
1. `ErrorBoundary.vue` (строка 147): `"Произошла непредвиденная ошибка. Мы работаем над её устранением."`
2. `errorService.js` (строка 71): `"Ошибка сервера. Мы работаем над её устранением."`
3. `errorService.js` (строка 92): `"Произошла непредвиденная ошибка."`

**Возможные причины:**

1. **Переменная окружения `VITE_API_BASE_URL` не настроена в Netlify для TMA сайта**
   ```javascript
   // tma/src/services/api.js:6
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
   if (!API_BASE_URL) {
       console.error("CRITICAL: VITE_API_BASE_URL is not set in environment variables!");
   }
   ```

2. **Проблемы с Telegram WebApp InitData**
   ```javascript
   // Если initData нет или невалиден, API calls будут возвращать 403 ошибки
   config.headers['X-Telegram-Init-Data'] = initData;
   ```

3. **CORS проблемы между TMA сайтом и bot сайтом**

4. **Проблемы авторизации на backend**

### 2. Web - Проблемы с авторизацией

#### Симптомы:
- "Load failed" при вводе логина и пароля
- Не может войти в личный кабинет

#### Первичная диагностика:

**Источники ошибки:**
1. `Login.vue` использует `VITE_WEB_LOGIN_API_URL` (строка 42)
2. `api.js` использует `VITE_API_BASE_URL`, `VITE_REFRESH_TOKEN_API_URL`, `VITE_LOGOUT_API_URL`

**Возможные причины:**

1. **Не настроены переменные окружения для web сайта:**
   - `VITE_API_BASE_URL` - основной API URL (должен указывать на bot site)
   - `VITE_WEB_LOGIN_API_URL` - URL для логина  
   - `VITE_REFRESH_TOKEN_API_URL` - URL для обновления токенов
   - `VITE_LOGOUT_API_URL` - URL для выхода

2. **CORS проблемы между web сайтом и bot сайтом**

3. **Проблемы с JWT токенами в cookie**

4. **Проблемы в функции `web-login.js` на backend**

## 🏥 План диагностики

### Шаг 1: Проверить переменные окружения в Netlify

**Для TMA сайта:**
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
```

**Для Web сайта:**
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login
VITE_REFRESH_TOKEN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout
```

### Шаг 2: Проверить CORS настройки

**В функциях bot/functions/ проверить headers:**
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Credentials`

### Шаг 3: Проверить логи Netlify Functions

**Проверить логи для:**
- `user-profile.js`
- `analyses-history.js` 
- `web-login.js`

### Шаг 4: Проверить Telegram WebApp integration

**Проверить в браузере TMA:**
- `window.Telegram?.WebApp?.initData` доступен
- InitData проходит валидацию на backend

## 🔧 Быстрые исправления

### Fix 1: Настройка переменных окружения

```bash
# В Netlify UI для каждого сайта добавить:

# TMA Site
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions

# Web Site  
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login
VITE_REFRESH_TOKEN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout
```

### Fix 2: Добавить debug компоненты

**В TMA добавлен DebugInfo компонент для проверки конфигурации**
**В Web добавлен DebugInfo компонент для проверки конфигурации**

### Fix 3: Проверить CORS в функциях

**Убедиться что в bot/functions/ все функции имеют правильные CORS headers:**
```javascript
const allowedOrigins = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean);
const requestOrigin = event.headers.origin || event.headers.Origin;
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
};
```

## 🔍 Дополнительная диагностика

### Проверить состояние сетевых запросов

**В браузере Console/Network:**
1. Проверить что API calls идут на правильный URL
2. Проверить статус ответов (200, 403, 500, etc.)
3. Проверить заголовки запросов и ответов
4. Проверить содержимое ошибок в Response

### Проверить Telegram WebApp

**В TMA проверить через Console:**
```javascript
console.log('Telegram WebApp available:', !!window.Telegram?.WebApp);
console.log('InitData available:', !!window.Telegram?.WebApp?.initData);
console.log('InitData content:', window.Telegram?.WebApp?.initData);
```

### Проверить аутентификацию Web

**В Web проверить через Console:**
```javascript
console.log('Cookies:', document.cookie);
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

---

*Диагностика создана: $(date)*
*Статус: В процессе исследования*