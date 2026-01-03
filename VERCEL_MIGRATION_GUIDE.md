# Руководство по миграции с Netlify на Vercel

## 📋 Обзор текущей архитектуры

У вас сейчас **монорепозиторий** с 4 отдельными проектами на Netlify:

1. **Bot site** (`sparkling-cupcake-940504.netlify.app`) - все serverless функции
2. **Web site** (`bot.dreamstalk.ru`) - статический фронтенд Vue.js
3. **TMA site** (`tourmaline-eclair-9d40ea.netlify.app`) - Telegram Mini App
4. **Survey** - отдельный проект с функциями

## 🎯 Архитектура на Vercel

### Вариант 1: Монорепозиторий с отдельными проектами (рекомендуется)

Vercel поддерживает монорепозитории через **Vercel Projects** с настройкой `Root Directory` для каждого проекта.

**Структура:**
```
dream-analyzer/
├── bot/                    # Backend проект
│   ├── api/                # Vercel Functions (было bot/functions/)
│   ├── vercel.json
│   └── package.json
├── web/                    # Web фронтенд
│   ├── src/
│   ├── vercel.json
│   └── package.json
├── tma/                    # TMA фронтенд
│   ├── src/
│   ├── vercel.json
│   └── package.json
└── survey/                 # Survey проект
    ├── api/                # Vercel Functions
    ├── vercel.json
    └── package.json
```

**Vercel Projects:**
- `dream-analyzer-bot` (Root: `bot/`)
- `dream-analyzer-web` (Root: `web/`)
- `dream-analyzer-tma` (Root: `tma/`)
- `dream-analyzer-survey` (Root: `survey/`)

### Вариант 2: Один проект с разными роутами (не рекомендуется)

Можно использовать один проект с разными доменами, но это усложнит управление и деплой.

## 🔄 Ключевые различия Netlify vs Vercel

### 1. Структура функций

**Netlify:**
```
bot/functions/
├── analyze-dream.js
├── bot.js
└── shared/
```

**Vercel:**
```
bot/api/
├── analyze-dream.js        # или analyze-dream/index.js
├── bot.js                  # или bot/index.js
└── shared/                 # общие модули
```

### 2. Формат функций

**Netlify Functions:**
```javascript
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello' })
  };
};
```

**Vercel Functions:**
```javascript
export default async function handler(req, res) {
  res.status(200).json({ message: 'Hello' });
}
```

Или для Node.js runtime:
```javascript
module.exports = async (req, res) => {
  res.status(200).json({ message: 'Hello' });
};
```

### 3. Redirects и Rewrites

**Netlify (`netlify.toml`):**
```toml
[[redirects]]
  from = "/api/health"
  to = "/.netlify/functions/health-check"
  status = 200
```

**Vercel (`vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/api/health", "destination": "/api/health-check" }
  ]
}
```

### 4. Scheduled Functions (Cron Jobs)

**Netlify:**
```toml
[[scheduled.functions]]
  name = "beta-access-notifier"
  cron = "*/15 * * * *"
```

**Vercel:**
Создать файл `vercel.json` с:
```json
{
  "crons": [
    {
      "path": "/api/beta-access-notifier",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Или через Vercel Dashboard → Settings → Cron Jobs

## 📝 Пошаговый план миграции

### Этап 1: Подготовка структуры проекта

#### 1.1 Перемещение функций Bot

```bash
# Создать новую структуру
mkdir -p bot/api
mv bot/functions/* bot/api/
```

**Важно:** Vercel автоматически распознает файлы в `api/` как serverless функции.

#### 1.2 Обновление структуры для Survey

```bash
# В survey/
mkdir -p api
mv netlify/functions/* api/
```

### Этап 2: Конвертация функций

#### 2.1 Шаблон конвертации Netlify → Vercel

**Было (Netlify):**
```javascript
const { handler: corsHandler } = require('../shared/middleware/cors');

exports.handler = corsHandler(async (event, context) => {
  const body = JSON.parse(event.body || '{}');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ success: true })
  };
});
```

**Стало (Vercel):**
```javascript
const { corsMiddleware } = require('../shared/middleware/cors');

module.exports = async (req, res) => {
  // Применить CORS middleware
  await corsMiddleware(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const body = req.body; // Vercel автоматически парсит JSON
  
  res.status(200).json({ success: true });
};
```

#### 2.2 Ключевые изменения:

1. **Event → Request/Response:**
   - `event.body` → `req.body`
   - `event.headers` → `req.headers`
   - `event.httpMethod` → `req.method`
   - `event.path` → `req.url`
   - `event.queryStringParameters` → `req.query`

2. **Response формат:**
   - `return { statusCode, headers, body }` → `res.status().json()`
   - `multiValueHeaders` → `res.setHeader()` (для множественных значений)

3. **CORS:**
   - Vercel автоматически обрабатывает CORS для некоторых случаев
   - Но ваш кастомный CORS middleware нужно адаптировать

### Этап 3: Создание vercel.json для каждого проекта

#### 3.1 Bot проект (`bot/vercel.json`)

```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/cache/:path*", "destination": "/api/cache-monitoring" },
    { "source": "/api/health", "destination": "/api/health-check" },
    { "source": "/api/metrics", "destination": "/api/performance-metrics" },
    { "source": "/api/errors", "destination": "/api/error-monitoring" },
    { "source": "/api/business", "destination": "/api/business-metrics" },
    { "source": "/api/dashboard", "destination": "/api/monitoring-dashboard" },
    { "source": "/bot", "destination": "/api/bot" },
    { "source": "/api/analyze-dream-background", "destination": "/api/analyze-dream-background" },
    { "source": "/api/ingest-knowledge", "destination": "/api/ingest-knowledge" },
    { "source": "/api/ingest-knowledge-background", "destination": "/api/ingest-knowledge-background" },
    { "source": "/api/set-demographics", "destination": "/api/set-demographics" },
    { "source": "/api/tg-sticker", "destination": "/api/tg-sticker" }
  ],
  "crons": [
    {
      "path": "/api/beta-access-notifier",
      "schedule": "*/15 * * * *"
    }
  ],
  "env": {
    "NODE_VERSION": "20"
  }
}
```

#### 3.2 Web проект (`web/vercel.json`)

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-bot-project.vercel.app/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 3.3 TMA проект (`tma/vercel.json`)

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 3.4 Survey проект (`survey/vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### Этап 4: Миграция CORS middleware

Vercel использует другой формат для заголовков. Обновите `bot/api/shared/middleware/cors.js`:

```javascript
// Пример адаптации для Vercel
function corsMiddleware(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  
  // Проверка разрешенных origins
  const allowedOrigins = [
    process.env.ALLOWED_TMA_ORIGIN,
    process.env.ALLOWED_WEB_ORIGIN
  ].filter(Boolean);
  
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

module.exports = { corsMiddleware };
```

### Этап 5: Обновление API wrapper

Обновите `bot/api/shared/middleware/api-wrapper.js` для работы с Vercel форматом:

```javascript
const { corsMiddleware } = require('./cors');
const { errorHandler } = require('./error-handler');

function apiWrapper(handler) {
  return async (req, res) => {
    try {
      // CORS
      const isPreflight = corsMiddleware(req, res);
      if (isPreflight) return;
      
      // Вызов основного handler
      await handler(req, res);
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
}

module.exports = { apiWrapper };
```

### Этап 6: Настройка проектов в Vercel

#### 6.1 Создание проектов

1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Создайте 4 проекта:
   - `dream-analyzer-bot`
   - `dream-analyzer-web`
   - `dream-analyzer-tma`
   - `dream-analyzer-survey`

#### 6.2 Настройка Root Directory

Для каждого проекта:
- **Settings → General → Root Directory**
- Bot: `bot`
- Web: `web`
- TMA: `tma`
- Survey: `survey`

#### 6.3 Подключение GitHub репозитория

- Выберите ваш репозиторий
- Настройте Root Directory для каждого проекта
- Vercel автоматически определит framework (Vue.js для фронтендов)

#### 6.4 Environment Variables

Перенесите все переменные окружения из Netlify:

**Bot проект:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOT_TOKEN`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `ALLOWED_TMA_ORIGIN`
- `ALLOWED_WEB_ORIGIN`
- `WEBHOOK_URL` (обновить на Vercel URL)

**Web проект:**
- `VITE_API_BASE_URL` → `https://dream-analyzer-bot.vercel.app/api`
- `VITE_WEB_LOGIN_API_URL`
- `VITE_REFRESH_TOKEN_API_URL`
- `VITE_LOGOUT_API_URL`

**TMA проект:**
- `VITE_API_BASE_URL` → `https://dream-analyzer-bot.vercel.app/api`

### Этап 7: Обновление Webhook URL

После деплоя Bot проекта на Vercel:

1. Получите URL: `https://dream-analyzer-bot.vercel.app/api/bot`
2. Обновите `WEBHOOK_URL` в environment variables
3. Вызовите `/api/set-webhook` или используйте Telegram Bot API напрямую

### Этап 8: Тестирование

#### 8.1 Проверка функций

```bash
# Локальное тестирование с Vercel CLI
npm i -g vercel
vercel dev
```

#### 8.2 Проверка endpoints

1. Health check: `GET https://your-bot.vercel.app/api/health`
2. Bot webhook: `POST https://your-bot.vercel.app/api/bot`
3. Web login: `POST https://your-bot.vercel.app/api/web-login`

#### 8.3 Проверка фронтендов

1. Web: открыть `https://your-web.vercel.app`
2. TMA: открыть через Telegram
3. Проверить API вызовы из фронтендов

## ⚠️ Важные моменты и ограничения

### 1. Таймауты функций

- **Netlify:** до 26 секунд (free), до 10 секунд (starter)
- **Vercel:** до 10 секунд (free), до 60 секунд (pro)

Если у вас есть долгие операции, рассмотрите:
- Background functions (Vercel Pro)
- Вынос в отдельный сервис (например, Supabase Edge Functions)

### 2. Размер функций

- **Netlify:** до 50MB (uncompressed)
- **Vercel:** до 50MB (uncompressed)

Ваши функции должны поместиться.

### 3. Cold Start

Vercel имеет хорошую оптимизацию cold start, но для критичных функций рассмотрите:
- Vercel Pro (лучшая изоляция)
- Keep-alive через cron jobs

### 4. Проксирование API (Web проект)

В Netlify вы использовали прокси `/api/*` на bot site для first-party cookies.

**В Vercel:**
- Можно использовать `rewrites` для проксирования
- Но cookies все равно будут third-party, если домены разные
- **Решение:** Используйте Bearer tokens (как вы уже делаете) вместо cookies

### 5. Scheduled Functions

Vercel Cron Jobs доступны на:
- **Pro план:** бесплатно
- **Free план:** через Vercel Cron Jobs (beta)

Альтернатива: использовать внешний сервис (например, GitHub Actions, cron-job.org)

## 🔧 Автоматизация миграции

### Скрипт для конвертации функций

Создайте `scripts/convert-to-vercel.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Простая конвертация базового формата
function convertFunction(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Базовая замена (требует ручной проверки!)
  let newContent = content
    .replace(/exports\.handler\s*=/g, 'module.exports =')
    .replace(/async \(event, context\)/g, 'async (req, res)')
    .replace(/event\.body/g, 'req.body')
    .replace(/event\.headers/g, 'req.headers')
    .replace(/event\.httpMethod/g, 'req.method')
    .replace(/event\.path/g, 'req.url')
    .replace(/event\.queryStringParameters/g, 'req.query');
  
  // Замена return на res.status().json()
  // Это требует более сложной логики, лучше делать вручную
  
  return newContent;
}
```

**Важно:** Автоматическая конвертация не идеальна, нужна ручная проверка!

## 📊 Чеклист миграции

- [ ] Создать структуру `bot/api/` и переместить функции
- [ ] Конвертировать все функции в формат Vercel
- [ ] Обновить CORS middleware
- [ ] Обновить API wrapper
- [ ] Создать `vercel.json` для каждого проекта
- [ ] Создать проекты в Vercel Dashboard
- [ ] Настроить Root Directory для каждого проекта
- [ ] Перенести Environment Variables
- [ ] Обновить `WEBHOOK_URL` на Vercel URL
- [ ] Настроить Cron Jobs
- [ ] Обновить `VITE_API_BASE_URL` в Web и TMA проектах
- [ ] Протестировать все endpoints
- [ ] Протестировать фронтенды
- [ ] Обновить документацию
- [ ] Настроить кастомные домены (если нужно)

## 🚀 После миграции

1. **Мониторинг:** Используйте Vercel Analytics и Logs
2. **Домены:** Настройте кастомные домены в Vercel
3. **CI/CD:** Vercel автоматически деплоит при push в GitHub
4. **Rollback:** Vercel сохраняет предыдущие деплои для быстрого отката

## 💡 Рекомендации

1. **Постепенная миграция:** Сначала мигрируйте Bot проект, затем фронтенды
2. **Тестирование:** Используйте Preview Deployments для тестирования
3. **Мониторинг:** Настройте алерты в Vercel
4. **Документация:** Обновите `ARCHITECTURE.md` после миграции

## 📚 Полезные ссылки

- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Configuration Reference](https://vercel.com/docs/project-configuration)
- [Migrating from Netlify to Vercel](https://vercel.com/docs/migrations/netlify)

---

**Примечание:** Этот документ - руководство. Некоторые детали могут потребовать адаптации под ваш конкретный код.
