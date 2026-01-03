# Итеративная миграция на Vercel - Практический подход

## 🎯 Стратегия: "Make it work, then make it right"

Вместо полной конвертации сразу, делаем минимальные изменения для запуска, затем постепенно улучшаем.

## Шаг 1: Создать ветку для миграции

```bash
# Создать новую ветку
git checkout -b vercel-migration

# Или скопировать проект (если хотите отдельный репозиторий)
# git clone <your-repo> dream-analyzer-vercel
# cd dream-analyzer-vercel
```

## Шаг 2: Минимальная структура для запуска

### 2.1 Создать `bot/api/` и скопировать функции

```bash
# Создать структуру
mkdir -p bot/api
mkdir -p bot/api/shared

# Скопировать функции (пока без изменений)
cp -r bot/functions/* bot/api/
```

### 2.2 Создать минимальный `bot/vercel.json`

```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x"
    }
  }
}
```

### 2.3 Создать адаптер для Netlify → Vercel

Создайте `bot/api/_netlify-adapter.js` - обертка, которая конвертирует Vercel формат в Netlify формат:

```javascript
/**
 * Адаптер для запуска Netlify функций на Vercel
 * Позволяет использовать существующие функции без изменений
 */

function createNetlifyEvent(req) {
  // Конвертируем Vercel req в Netlify event формат
  const body = req.body || {};
  
  return {
    httpMethod: req.method,
    path: req.url.split('?')[0],
    queryStringParameters: req.query || {},
    headers: req.headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    isBase64Encoded: false
  };
}

function createNetlifyContext() {
  // Минимальный контекст для Netlify функций
  return {
    clientContext: {},
    identity: null
  };
}

function convertNetlifyResponse(netlifyResponse, res) {
  // Конвертируем Netlify response в Vercel response
  const statusCode = netlifyResponse.statusCode || 200;
  const headers = netlifyResponse.headers || {};
  const body = netlifyResponse.body || '';
  
  // Устанавливаем заголовки
  Object.keys(headers).forEach(key => {
    res.setHeader(key, headers[key]);
  });
  
  // Обрабатываем multiValueHeaders (для Set-Cookie)
  if (netlifyResponse.multiValueHeaders) {
    Object.keys(netlifyResponse.multiValueHeaders).forEach(key => {
      const values = netlifyResponse.multiValueHeaders[key];
      if (Array.isArray(values)) {
        res.setHeader(key, values);
      }
    });
  }
  
  // Отправляем ответ
  res.status(statusCode);
  
  // Парсим body если это JSON
  try {
    const jsonBody = JSON.parse(body);
    res.json(jsonBody);
  } catch (e) {
    res.send(body);
  }
}

/**
 * Обертка для Netlify функции
 * @param {Function} netlifyHandler - Netlify функция (exports.handler)
 */
function wrapNetlifyFunction(netlifyHandler) {
  return async (req, res) => {
    try {
      const event = createNetlifyEvent(req);
      const context = createNetlifyContext();
      
      // Вызываем Netlify функцию
      const response = await netlifyHandler(event, context);
      
      // Конвертируем ответ
      convertNetlifyResponse(response, res);
    } catch (error) {
      console.error('Function error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  };
}

module.exports = { wrapNetlifyFunction };
```

### 2.4 Создать обертку для каждой функции

Создайте `bot/api/_wrapper-template.js`:

```javascript
// Шаблон для быстрого создания оберток
const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('./health-check'); // импортируем оригинальную функцию

module.exports = wrapNetlifyFunction(originalHandler.handler);
```

## Шаг 3: Быстрое создание оберток (скрипт)

Создайте `scripts/create-vercel-wrappers.js`:

```javascript
const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(__dirname, '../bot/functions');
const API_DIR = path.join(__dirname, '../bot/api');

// Функции, которые нужно обернуть
const functions = [
  'health-check',
  'user-profile',
  'analyses-history',
  'analyze-dream',
  'web-login',
  'refresh-token',
  'bot',
  // ... добавьте остальные
];

function createWrapper(functionName) {
  const wrapperContent = `// Auto-generated wrapper for ${functionName}
const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('./${functionName}');

module.exports = wrapNetlifyFunction(originalHandler.handler);
`;

  const wrapperPath = path.join(API_DIR, `${functionName}.js`);
  fs.writeFileSync(wrapperPath, wrapperContent);
  console.log(`✓ Created wrapper: ${functionName}.js`);
}

// Создать адаптер если его нет
const adapterPath = path.join(API_DIR, '_netlify-adapter.js');
if (!fs.existsSync(adapterPath)) {
  // Скопируйте содержимое адаптера из шага 2.3
  console.log('⚠️  Create _netlify-adapter.js first!');
  process.exit(1);
}

// Создать обертки
functions.forEach(createWrapper);
console.log(`\n✅ Created ${functions.length} wrappers`);
```

## Шаг 4: Минимальная конфигурация Vercel

### 4.1 Bot проект (`bot/vercel.json`)

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
    { "source": "/api/user-profile", "destination": "/api/user-profile" },
    { "source": "/api/analyses-history", "destination": "/api/analyses-history" },
    { "source": "/api/analyze-dream", "destination": "/api/analyze-dream" },
    { "source": "/api/web-login", "destination": "/api/web-login" },
    { "source": "/api/refresh-token", "destination": "/api/refresh-token" },
    { "source": "/bot", "destination": "/api/bot" }
  ]
}
```

### 4.2 Web проект (`web/vercel.json`)

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

### 4.3 TMA проект (`tma/vercel.json`)

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Шаг 5: Первый деплой

1. **Создать проекты в Vercel:**
   - Зайти на vercel.com
   - Создать проект из GitHub
   - Указать Root Directory: `bot`, `web`, `tma`

2. **Добавить Environment Variables:**
   - Скопировать все из Netlify
   - Пока можно оставить те же значения

3. **Деплой:**
   - Vercel автоматически задеплоит при push
   - Или через `vercel --prod`

4. **Проверить:**
   ```bash
   curl https://your-bot.vercel.app/api/health
   ```

## Шаг 6: Постепенная миграция функций

### Приоритет миграции:

1. **Сначала простые функции** (health-check, user-profile)
2. **Затем сложные** (bot, analyze-dream)
3. **В последнюю очередь** - функции с особыми требованиями

### Процесс миграции одной функции:

1. **Создать Vercel версию рядом:**
   ```bash
   # Создать bot/api/health-check-vercel.js
   ```

2. **Конвертировать постепенно:**
   ```javascript
   // health-check-vercel.js
   const { corsMiddleware } = require('./shared/middleware/cors-vercel');
   
   module.exports = async (req, res) => {
     corsMiddleware(req, res);
     
     // Скопировать логику из оригинальной функции
     // Заменить event → req, context → res
     
     res.status(200).json({ ... });
   };
   ```

3. **Обновить rewrites:**
   ```json
   { "source": "/api/health", "destination": "/api/health-check-vercel" }
   ```

4. **Протестировать**

5. **Удалить обертку и оригинал, переименовать:**
   ```bash
   mv health-check-vercel.js health-check.js
   ```

## Шаг 7: Чеклист постепенной миграции

- [ ] Адаптер создан и работает
- [ ] Все функции обернуты и деплоятся
- [ ] Базовые endpoints работают (health-check)
- [ ] Простые функции мигрированы (user-profile)
- [ ] Сложные функции мигрированы (bot, analyze-dream)
- [ ] CORS middleware обновлен
- [ ] Все обертки удалены
- [ ] Код очищен от Netlify-специфичного

## Преимущества этого подхода:

✅ **Быстрый старт** - можно деплоить уже сегодня  
✅ **Минимальный риск** - оригинальные функции не трогаем  
✅ **Постепенная миграция** - по одной функции  
✅ **Легко откатиться** - можно вернуться к Netlify  
✅ **Тестирование на проде** - каждая функция тестируется отдельно  

## Недостатки:

⚠️ **Временный overhead** - адаптер добавляет задержку  
⚠️ **Дублирование кода** - временно две версии функций  
⚠️ **Нужна очистка** - потом удалить обертки  

## Рекомендации:

1. **Начните с health-check** - самая простая функция
2. **Мигрируйте по одной функции в день** - не спешите
3. **Тестируйте каждую функцию** перед миграцией следующей
4. **Держите Netlify работающим** параллельно на время миграции
5. **После миграции всех функций** - удалите обертки и адаптер

## Альтернатива: Гибридный подход

Можно оставить критичные функции на Netlify, а новые/простые мигрировать на Vercel:

- **Netlify:** bot.js, analyze-dream.js (сложные)
- **Vercel:** health-check, user-profile, web-login (простые)

Затем постепенно мигрировать остальные.

---

**Следующий шаг:** Создать адаптер и обернуть первую функцию (health-check) для теста.
