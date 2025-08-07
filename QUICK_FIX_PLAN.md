# 🚀 ПЛАН БЫСТРОГО ИСПРАВЛЕНИЯ Dream Analyzer

## 📋 Краткий статус проблем

### ❌ НЕ РАБОТАЕТ:
1. **Web версия** → Неправильные переменные окружения в Vite
2. **Глубокий анализ TMA** → Отсутствует API URL в конфиге
3. **RPC функции Supabase** → Не применены из setup.sql

### ✅ РАБОТАЕТ ЧАСТИЧНО:
1. TMA основной функционал
2. Bot базовые команды
3. Подключение к БД

---

## 🎯 ПРИОРИТЕТНЫЙ ПЛАН (выполнять по порядку)

### ШАГ 1: Исправить конфигурации Vite

#### 📄 Файл: `web/vite.config.js`
```javascript
export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
    ),
    'import.meta.env.VITE_WEB_LOGIN_API_URL': JSON.stringify(
      process.env.VITE_WEB_LOGIN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login'
    ),
    'import.meta.env.VITE_REFRESH_TOKEN_API_URL': JSON.stringify(
      process.env.VITE_REFRESH_TOKEN_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token'
    ),
    'import.meta.env.VITE_LOGOUT_API_URL': JSON.stringify(
      process.env.VITE_LOGOUT_API_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout'
    )
  },
  // остальная конфигурация...
})
```

#### 📄 Файл: `tma/vite.config.js`
```javascript
export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'https://sparkling-cupcake-940504.netlify.app/.netlify/functions'
    )
  },
  // остальная конфигурация...
})
```

### ШАГ 2: Настроить переменные окружения в Netlify

#### 🔧 Bot site (sparkling-cupcake-940504):
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
BOT_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
ALLOWED_TMA_ORIGIN=https://tourmaline-eclair-9d40ea.netlify.app
ALLOWED_WEB_ORIGIN=https://bot.dreamstalk.ru
```

#### 🔧 TMA site (tourmaline-eclair-9d40ea):
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
```

#### 🔧 Web site (bot.dreamstalk.ru):
```bash
VITE_API_BASE_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/web-login
VITE_REFRESH_TOKEN_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://sparkling-cupcake-940504.netlify.app/.netlify/functions/logout
```

### ШАГ 3: Применить RPC функции в Supabase

1. **Открыть:** Supabase Dashboard → SQL Editor
2. **Скопировать:** Весь код из `bot/functions/shared/database/setup.sql`
3. **Выполнить:** SQL скрипт для создания RPC функций

### ШАГ 4: Исправить код базы данных

#### 📄 Файл: `bot/functions/deep-analysis.js` (строка ~136)
```javascript
// ЗАМЕНИТЬ:
const decrementResult = await dbQueries.decrementDeepAnalysisCredits(verifiedUserId);

// НА:
const { data: decrementResult, error } = await supabase
  .rpc('decrement_deep_analysis_credits_safe', { user_tg_id: verifiedUserId });

if (error || !decrementResult?.[0]?.success) {
  throw createApiError('Ошибка при списании кредита глубокого анализа.', 500);
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Последовательность:
1. ✅ Коммит + пуш в GitHub
2. ✅ Дождаться автоматического деплоя (3 сайта)
3. ✅ Тест TMA: глубокий анализ
4. ✅ Тест Web: авторизация
5. ✅ Тест Bot: команды

### Критерии успеха:
- TMA показывает профиль пользователя
- Глубокий анализ работает после покупки
- Web версия позволяет войти и показывает данные
- Bot отвечает на /start и анализирует сны

---

## 🔍 ОТЛАДКА

### Где смотреть логи:
1. **Netlify:** Sites → Functions → View logs
2. **Supabase:** Dashboard → API → Logs
3. **Browser:** F12 → Network/Console

### Типичные ошибки:
- `CORS error` → проверить ALLOWED_*_ORIGIN
- `401/403` → проверить токены и секреты
- `undefined env var` → проверить Netlify env settings
- `RPC function not found` → выполнить setup.sql в Supabase

---

## 📁 Ключевые файлы для изменения:

1. `web/vite.config.js` - добавить define секцию
2. `tma/vite.config.js` - добавить define секцию  
3. `bot/functions/deep-analysis.js` - использовать RPC функцию
4. Переменные окружения в 3 Netlify сайтах
5. SQL скрипт в Supabase Dashboard

---

*Используй этот план для быстрого исправления в новых чатах! 🚀*