# Инструкции по деплою Dream Analyzer

## Исправления аутентификации

Были исправлены критические проблемы с аутентификацией:

### Проблемы которые были исправлены:

1. **Несовместимость токенной системы**: 
   - `web-login.js` устанавливал HttpOnly cookies, но API эндпоинты ожидали JWT в заголовках
   - Исправлено: API эндпоинты теперь читают JWT из cookies

2. **Разные cookie системы**:
   - Backend устанавливал: `dream_analyzer_jwt`, `dream_analyzer_refresh`
   - Frontend искал: `bot_auth_token`, `telegram_user`
   - Исправлено: Frontend теперь полагается на HttpOnly cookies

### Обновленные файлы:

**Backend:**
- `bot/functions/user-profile.js` - добавлена поддержка JWT из cookies
- `bot/functions/analyses-history.js` - добавлена поддержка JWT из cookies  
- `bot/functions/analyze-dream.js` - добавлена поддержка JWT из cookies
- `bot/functions/analyze-dream.js` - исправлен импорт geminiService

**Frontend:**
- `web/src/App.vue` - упрощена логика аутентификации для работы с HttpOnly cookies
- `web/src/App.vue` - исправлен HTTP метод для analyses-history (GET вместо POST)

## Переменные окружения

### Для Bot проекта (Netlify Functions):

```bash
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# AI Service Configuration
GEMINI_API_KEY=your_gemini_api_key

# Authentication Secrets
JWT_SECRET=your_jwt_secret_key
REFRESH_SECRET=your_refresh_token_secret

# Frontend URLs
TMA_URL=https://your-tma-site.netlify.app
ALLOWED_TMA_ORIGIN=https://your-tma-site.netlify.app
ALLOWED_WEB_ORIGIN=https://your-web-site.netlify.app
WEB_URL=https://your-web-site.netlify.app
```

### Для TMA проекта:

```bash
VITE_API_BASE_URL=https://your-bot-site.netlify.app/.netlify/functions
```

### Для Web проекта:

```bash
VITE_API_BASE_URL=https://your-bot-site.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://your-bot-site.netlify.app/.netlify/functions/web-login
VITE_REFRESH_TOKEN_API_URL=https://your-bot-site.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://your-bot-site.netlify.app/.netlify/functions/logout
```

## Порядок деплоя:

1. **Деплой Bot проекта** (с функциями):
   ```bash
   cd bot
   npm run deploy
   ```

2. **Деплой TMA проекта**:
   ```bash
   cd tma
   npm run build
   # Загрузить в Netlify
   ```

3. **Деплой Web проекта**:
   ```bash
   cd web
   npm run build
   # Загрузить в Netlify
   ```

## Тестирование:

1. **Web интерфейс**:
   - Перейти на https://your-web-site.netlify.app
   - Попытаться залогиниться с Telegram ID и паролем
   - Проверить загрузку профиля и истории снов

2. **TMA интерфейс**:
   - Открыть Mini App в Telegram
   - Проверить загрузку данных

## Логи для отладки:

Проверьте функции в Netlify dashboard:
- `/web-login` - для проблем с логином
- `/user-profile` - для проблем с загрузкой профиля
- `/analyses-history` - для проблем с историей снов

Основные ошибки должны быть исправлены этими изменениями.