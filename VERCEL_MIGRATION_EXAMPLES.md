# Примеры конвертации функций для Vercel

## Пример 1: Простая функция (health-check.js)

### Netlify версия (текущая)

```javascript
// bot/functions/health-check.js
async function handleHealthCheck(event, context, corsHeaders) {
    const healthData = await performHealthCheck();
    
    const statusCode = healthData.status === 'healthy' ? 200 
                    : healthData.status === 'warning' ? 200 
                    : 503;

    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify(healthData)
    };
}

exports.handler = wrapApiHandler(handleHealthCheck, {
    allowedMethods: ['GET', 'POST'],
    allowedOrigins: [
        process.env.ALLOWED_TMA_ORIGIN,
        process.env.ALLOWED_WEB_ORIGIN,
    ]
});
```

### Vercel версия

```javascript
// bot/api/health-check.js
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");
const { corsMiddleware } = require("./shared/middleware/cors");

const logger = createLogger({ module: 'health-check' });

// ... все функции performHealthCheck, checkDatabaseHealth и т.д. остаются без изменений ...

/**
 * Main handler для Vercel
 */
async function handleHealthCheck(req, res) {
    // Применить CORS
    const corsApplied = corsMiddleware(req, res);
    if (corsApplied) return; // Preflight обработан
    
    const healthData = await performHealthCheck();
    
    const statusCode = healthData.status === 'healthy' ? 200 
                    : healthData.status === 'warning' ? 200 
                    : 503;

    res.status(statusCode).json(healthData);
}

module.exports = handleHealthCheck;
```

## Пример 2: CORS Middleware

### Netlify версия (текущая)

```javascript
// bot/functions/shared/middleware/cors.js
function getCorsHeaders(event, allowedOrigins = []) {
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const filteredOrigins = allowedOrigins.filter(Boolean);
    
    return {
        'Access-Control-Allow-Origin': filteredOrigins.includes(requestOrigin) 
            ? requestOrigin 
            : filteredOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
}

function handleCorsPrelight(event, allowedOrigins = []) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: getCorsHeaders(event, allowedOrigins),
            body: ''
        };
    }
    return null;
}

module.exports = {
    getCorsHeaders,
    handleCorsPrelight
};
```

### Vercel версия

```javascript
// bot/api/shared/middleware/cors.js
/**
 * CORS middleware для Vercel Functions
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {boolean} true if preflight was handled, false otherwise
 */
function corsMiddleware(req, res, allowedOrigins = []) {
    const requestOrigin = req.headers.origin || req.headers.referer;
    const filteredOrigins = allowedOrigins.filter(Boolean);
    
    // Определяем разрешенный origin
    const allowedOrigin = filteredOrigins.includes(requestOrigin) 
        ? requestOrigin 
        : filteredOrigins[0] || '*';
    
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    
    // Обработка preflight запроса
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true; // Preflight обработан
    }
    
    return false; // Продолжить обработку запроса
}

/**
 * Получить CORS заголовки (для совместимости, если нужно)
 */
function getCorsHeaders(req, allowedOrigins = []) {
    const requestOrigin = req.headers.origin || req.headers.referer;
    const filteredOrigins = allowedOrigins.filter(Boolean);
    
    return {
        'Access-Control-Allow-Origin': filteredOrigins.includes(requestOrigin) 
            ? requestOrigin 
            : filteredOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
}

module.exports = {
    corsMiddleware,
    getCorsHeaders
};
```

## Пример 3: API Wrapper

### Netlify версия (текущая)

```javascript
// bot/functions/shared/middleware/api-wrapper.js
const { getCorsHeaders, handleCorsPrelight } = require('./cors');
const { errorHandler } = require('./error-handler');

function wrapApiHandler(handler, options = {}) {
    const {
        allowedMethods = ['GET', 'POST'],
        allowedOrigins = [],
        skipConfigValidation = false
    } = options;

    return async (event, context) => {
        try {
            // CORS preflight
            const preflightResponse = handleCorsPrelight(event, allowedOrigins);
            if (preflightResponse) {
                return preflightResponse;
            }

            // Method validation
            if (!allowedMethods.includes(event.httpMethod)) {
                const corsHeaders = getCorsHeaders(event, allowedOrigins);
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
            }

            // Get CORS headers
            const corsHeaders = getCorsHeaders(event, allowedOrigins);

            // Call handler
            return await handler(event, context, corsHeaders);

        } catch (error) {
            return errorHandler(error, event, allowedOrigins);
        }
    };
}

module.exports = { wrapApiHandler };
```

### Vercel версия

```javascript
// bot/api/shared/middleware/api-wrapper.js
const { corsMiddleware } = require('./cors');
const { errorHandler } = require('./error-handler');

function wrapApiHandler(handler, options = {}) {
    const {
        allowedMethods = ['GET', 'POST'],
        allowedOrigins = [],
        skipConfigValidation = false
    } = options;

    return async (req, res) => {
        try {
            // CORS preflight
            const preflightHandled = corsMiddleware(req, res, allowedOrigins);
            if (preflightHandled) {
                return; // Preflight обработан
            }

            // Method validation
            if (!allowedMethods.includes(req.method)) {
                return res.status(405).json({ error: 'Method not allowed' });
            }

            // Call handler
            await handler(req, res);

        } catch (error) {
            errorHandler(error, req, res, allowedOrigins);
        }
    };
}

module.exports = { wrapApiHandler };
```

## Пример 4: Функция с body parsing

### Netlify версия

```javascript
// bot/functions/user-profile.js
exports.handler = wrapApiHandler(async (event, context, corsHeaders) => {
    const body = JSON.parse(event.body || '{}');
    const { tg_id } = body;
    
    // ... логика ...
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ user: userData })
    };
}, {
    allowedMethods: ['POST'],
    allowedOrigins: [process.env.ALLOWED_TMA_ORIGIN, process.env.ALLOWED_WEB_ORIGIN]
});
```

### Vercel версия

```javascript
// bot/api/user-profile.js
const { wrapApiHandler } = require('./shared/middleware/api-wrapper');

async function handleUserProfile(req, res) {
    // Vercel автоматически парсит JSON body в req.body
    const { tg_id } = req.body || {};
    
    // ... логика ...
    
    res.status(200).json({ user: userData });
}

module.exports = wrapApiHandler(handleUserProfile, {
    allowedMethods: ['POST'],
    allowedOrigins: [
        process.env.ALLOWED_TMA_ORIGIN, 
        process.env.ALLOWED_WEB_ORIGIN
    ]
});
```

## Пример 5: Функция с query parameters

### Netlify версия

```javascript
// bot/functions/analyses-history.js
exports.handler = wrapApiHandler(async (event, context, corsHeaders) => {
    const queryParams = event.queryStringParameters || {};
    const { limit, offset, type } = queryParams;
    
    // ... логика ...
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ analyses })
    };
}, {
    allowedMethods: ['GET'],
    allowedOrigins: [process.env.ALLOWED_TMA_ORIGIN, process.env.ALLOWED_WEB_ORIGIN]
});
```

### Vercel версия

```javascript
// bot/api/analyses-history.js
const { wrapApiHandler } = require('./shared/middleware/api-wrapper');

async function handleAnalysesHistory(req, res) {
    // Vercel автоматически парсит query в req.query
    const { limit, offset, type } = req.query || {};
    
    // ... логика ...
    
    res.status(200).json({ analyses });
}

module.exports = wrapApiHandler(handleAnalysesHistory, {
    allowedMethods: ['GET'],
    allowedOrigins: [
        process.env.ALLOWED_TMA_ORIGIN, 
        process.env.ALLOWED_WEB_ORIGIN
    ]
});
```

## Пример 6: Функция с Set-Cookie (multiValueHeaders)

### Netlify версия

```javascript
// bot/functions/web-login.js
exports.handler = wrapApiHandler(async (event, context, corsHeaders) => {
    // ... логика авторизации ...
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        multiValueHeaders: {
            'Set-Cookie': [
                `accessToken=${accessToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600`,
                `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
            ]
        },
        body: JSON.stringify({ success: true, accessToken, refreshToken })
    };
});
```

### Vercel версия

```javascript
// bot/api/web-login.js
const { wrapApiHandler } = require('./shared/middleware/api-wrapper');

async function handleWebLogin(req, res) {
    // ... логика авторизации ...
    
    // Устанавливаем cookies через res.setHeader
    res.setHeader('Set-Cookie', [
        `accessToken=${accessToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600`,
        `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
    ]);
    
    res.status(200).json({ success: true, accessToken, refreshToken });
}

module.exports = wrapApiHandler(handleWebLogin, {
    allowedMethods: ['POST'],
    allowedOrigins: [process.env.ALLOWED_WEB_ORIGIN]
});
```

## Пример 7: Bot webhook (Grammy.js)

### Netlify версия

```javascript
// bot/functions/bot.js
const { Bot, webhookCallback } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

// ... handlers ...

exports.handler = webhookCallback(bot, 'aws-lambda');
```

### Vercel версия

```javascript
// bot/api/bot.js
const { Bot, webhookCallback } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

// ... handlers ...

// Grammy поддерживает Vercel через стандартный формат
module.exports = async (req, res) => {
    // Grammy webhookCallback для Vercel
    const handler = webhookCallback(bot, 'std/http');
    return handler(req, res);
};
```

**Примечание:** Grammy может требовать адаптации. Проверьте документацию Grammy для Vercel или используйте ручную обработку:

```javascript
// Альтернатива: ручная обработка
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const update = req.body;
        await bot.handleUpdate(update);
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Bot webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```

## Ключевые изменения - шпаргалка

| Netlify | Vercel |
|---------|--------|
| `exports.handler = ...` | `module.exports = ...` |
| `event.body` | `req.body` (автоматически парсится) |
| `event.headers` | `req.headers` |
| `event.httpMethod` | `req.method` |
| `event.queryStringParameters` | `req.query` |
| `event.path` | `req.url` |
| `return { statusCode, headers, body }` | `res.status().json()` |
| `multiValueHeaders.Set-Cookie` | `res.setHeader('Set-Cookie', [...])` |
| `JSON.parse(event.body)` | `req.body` (уже объект) |
| `context` | Не используется (или `req`/`res`) |

## Автоматизация конвертации

Для массовой конвертации можно использовать простой скрипт:

```javascript
// scripts/convert-function.js
const fs = require('fs');
const path = require('path');

function convertFunction(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Базовые замены (требует ручной проверки!)
    content = content
        .replace(/exports\.handler\s*=/g, 'module.exports =')
        .replace(/async \(event, context\)/g, 'async (req, res)')
        .replace(/event\.body/g, 'req.body')
        .replace(/event\.headers/g, 'req.headers')
        .replace(/event\.httpMethod/g, 'req.method')
        .replace(/event\.queryStringParameters/g, 'req.query')
        .replace(/event\.path/g, 'req.url');
    
    // Замена return на res.status().json() - требует более сложной логики
    // Лучше делать вручную для каждой функции
    
    return content;
}

// Использование
const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace('.js', '.vercel.js');

const converted = convertFunction(inputFile);
fs.writeFileSync(outputFile, converted);
console.log(`Converted: ${inputFile} → ${outputFile}`);
```

**Важно:** Автоматическая конвертация не идеальна. Всегда проверяйте результат вручную!
