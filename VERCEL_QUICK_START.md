# Vercel Migration - Quick Start

## 🚀 Быстрый старт

### 1. Подготовка структуры (5 минут)

```bash
# Переместить функции
mkdir -p bot/api
mv bot/functions/* bot/api/

# В survey (если нужно)
mkdir -p survey/api
mv survey/netlify/functions/* survey/api/
```

### 2. Создать vercel.json для каждого проекта

#### bot/vercel.json
```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/health", "destination": "/api/health-check" },
    { "source": "/bot", "destination": "/api/bot" }
  ],
  "crons": [
    {
      "path": "/api/beta-access-notifier",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### web/vercel.json
```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-bot-project.vercel.app/api/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3. Конвертировать функции (основные изменения)

**Шаблон:**
```javascript
// БЫЛО (Netlify)
exports.handler = async (event, context) => {
  const body = JSON.parse(event.body || '{}');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true })
  };
};

// СТАЛО (Vercel)
module.exports = async (req, res) => {
  const body = req.body; // уже объект!
  res.status(200).json({ success: true });
};
```

### 4. Обновить CORS middleware

```javascript
// bot/api/shared/middleware/cors.js
function corsMiddleware(req, res, allowedOrigins = []) {
  const origin = req.headers.origin;
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
```

### 5. Создать проекты в Vercel

1. Зайти на [vercel.com](https://vercel.com)
2. Создать 4 проекта:
   - `dream-analyzer-bot` (Root: `bot`)
   - `dream-analyzer-web` (Root: `web`)
   - `dream-analyzer-tma` (Root: `tma`)
   - `dream-analyzer-survey` (Root: `survey`)
3. Подключить GitHub репозиторий
4. Настроить Root Directory для каждого

### 6. Перенести Environment Variables

Скопировать все переменные из Netlify в Vercel:
- Bot: все переменные (SUPABASE_URL, BOT_TOKEN, etc.)
- Web: VITE_API_BASE_URL → `https://dream-analyzer-bot.vercel.app/api`
- TMA: VITE_API_BASE_URL → `https://dream-analyzer-bot.vercel.app/api`

### 7. Обновить Webhook URL

После деплоя Bot проекта:
```bash
# Получить URL из Vercel Dashboard
WEBHOOK_URL=https://dream-analyzer-bot.vercel.app/api/bot

# Обновить через Telegram API или вашу функцию set-webhook
```

## 📋 Чеклист

- [ ] Структура `bot/api/` создана
- [ ] Все функции конвертированы в формат Vercel
- [ ] CORS middleware обновлен
- [ ] `vercel.json` создан для всех проектов
- [ ] Проекты созданы в Vercel Dashboard
- [ ] Root Directory настроен
- [ ] Environment Variables перенесены
- [ ] Webhook URL обновлен
- [ ] Cron Jobs настроены
- [ ] Протестированы все endpoints

## 🔧 Основные отличия

| Что | Netlify | Vercel |
|-----|---------|--------|
| Функции | `bot/functions/` | `bot/api/` |
| Экспорт | `exports.handler` | `module.exports` |
| Body | `JSON.parse(event.body)` | `req.body` (уже объект) |
| Query | `event.queryStringParameters` | `req.query` |
| Response | `return { statusCode, body }` | `res.status().json()` |
| Cookies | `multiValueHeaders` | `res.setHeader('Set-Cookie', [...])` |

## ⚠️ Важно

1. **Не просто подключить репозиторий** - нужно настроить Root Directory
2. **Функции нужно конвертировать** - формат другой
3. **CORS middleware нужно обновить** - другой API
4. **Webhook URL нужно обновить** - после деплоя
5. **Environment Variables** - перенести все вручную

## 📚 Документация

- Полное руководство: `VERCEL_MIGRATION_GUIDE.md`
- Примеры конвертации: `VERCEL_MIGRATION_EXAMPLES.md`
- [Vercel Docs](https://vercel.com/docs)

## 🆘 Проблемы?

1. **Функции не работают?** Проверьте формат экспорта (`module.exports`)
2. **CORS ошибки?** Проверьте middleware и заголовки
3. **404 на endpoints?** Проверьте `vercel.json` rewrites
4. **Environment variables?** Проверьте в Vercel Dashboard → Settings
