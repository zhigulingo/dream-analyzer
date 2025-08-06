# Система мониторинга Dream Analyzer

## Обзор

Система мониторинга предоставляет комплексный набор инструментов для отслеживания здоровья, производительности и бизнес-метрик приложения Dream Analyzer.

## Компоненты системы

### 1. Health Check (`/api/health`)
**Файл:** `bot/functions/health-check.js`

Проверяет здоровье всех компонентов системы:
- Переменные окружения
- База данных (Supabase)
- Telegram Bot API
- Gemini AI API

**Эндпоинт:** `GET /api/health`

**Ответ:**
```json
{
  "status": "healthy|warning|unhealthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "correlationId": "abc123",
  "components": {
    "environment": { "status": "healthy", "message": "..." },
    "database": { "status": "healthy", "metrics": {...} },
    "bot": { "status": "healthy", "metrics": {...} },
    "gemini": { "status": "healthy", "metrics": {...} }
  },
  "metrics": {
    "checkDuration": 150,
    "uptime": 3600,
    "memoryUsage": {...}
  }
}
```

### 2. Performance Metrics (`/api/metrics`)
**Файл:** `bot/functions/performance-metrics.js`

Собирает и отображает метрики производительности:
- API запросы и время ответа
- Операции с базой данных
- События бота
- Операции с Gemini AI
- Системные метрики

**Эндпоинты:**
- `GET /api/metrics?timeRange=1h|24h|7d` - получить метрики
- `POST /api/metrics` - записать метрику
- `DELETE /api/metrics/reset` - сбросить метрики

**Пример записи метрики:**
```javascript
// Через API
fetch('/api/metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'api_request',
    method: 'POST',
    path: '/analyze',
    statusCode: 200,
    responseTime: 150
  })
});

// Через middleware
const { recordApiRequest } = require('./performance-metrics');
recordApiRequest('POST', '/analyze', 200, 150);
```

### 3. Error Monitoring (`/api/errors`)
**Файл:** `bot/functions/error-monitoring.js`

Отслеживает ошибки и отправляет алерты:
- API ошибки
- Ошибки базы данных
- Ошибки бота
- Ошибки Gemini AI
- Автоматические алерты в Telegram

**Эндпоинты:**
- `GET /api/errors?timeRange=1h|24h|7d` - получить данные об ошибках
- `POST /api/errors` - записать ошибку
- `DELETE /api/errors/reset` - сбросить статистику

**Настройка алертов:**
```bash
# Переменные окружения
ALERT_CHAT_ID="-1001234567890"  # ID чата для алертов
BOT_TOKEN="your_bot_token"       # Токен бота для отправки сообщений
```

### 4. Business Metrics (`/api/business`)
**Файл:** `bot/functions/business-metrics.js`

Бизнес-метрики и аналитика:
- Пользователи (новые, активные, сегменты)
- Анализы сновидений (количество, типы)
- Подписки (если реализованы)
- Engagement метрики
- Доходы (если реализованы)

**Эндпоинт:** `GET /api/business?timeRange=1h|24h|7d|30d`

### 5. Monitoring Dashboard (`/api/dashboard`)
**Файл:** `bot/functions/monitoring-dashboard.js`

Сводная панель мониторинга:
- Общий health score системы
- Алерты и рекомендации
- Графики и визуализация
- HTML-панель для просмотра в браузере

**Эндпоинты:**
- `GET /api/dashboard?timeRange=24h&format=json` - JSON данные
- `GET /api/dashboard?format=html` - HTML панель

### 6. Metrics Middleware
**Файл:** `bot/functions/shared/middleware/metrics-middleware.js`

Middleware для автоматического сбора метрик:

```javascript
const { withMetricsTracking, withDatabaseMetrics } = require('./shared/middleware/metrics-middleware');

// Обертка для API handlers
exports.handler = withMetricsTracking(async (event, context, corsHeaders) => {
  // Ваш код
});

// Обертка для database операций
const result = await withDatabaseMetrics('select', 'users')(async () => {
  return await supabase.from('users').select('*');
});
```

## Использование

### Быстрый старт

1. **Просмотр дашборда:**
   ```
   https://your-app.netlify.app/api/dashboard?format=html
   ```

2. **Проверка здоровья системы:**
   ```bash
   curl https://your-app.netlify.app/api/health
   ```

3. **Получение метрик производительности:**
   ```bash
   curl https://your-app.netlify.app/api/metrics?timeRange=24h
   ```

### Интеграция в существующий код

1. **Добавление метрик в API функции:**
   ```javascript
   const { withMetricsTracking } = require('./shared/middleware/metrics-middleware');
   
   async function myHandler(event, context, corsHeaders) {
     // Ваш код
   }
   
   exports.handler = withMetricsTracking(myHandler);
   ```

2. **Отслеживание database операций:**
   ```javascript
   const { withDatabaseMetrics } = require('./shared/middleware/metrics-middleware');
   
   const users = await withDatabaseMetrics('select', 'users')(async () => {
     return await supabase.from('users').select('*').limit(10);
   });
   ```

3. **Запись ошибок:**
   ```javascript
   const { recordBotError } = require('./error-monitoring');
   
   try {
     // Код бота
   } catch (error) {
     recordBotError('message_handler', error, userId, chatId);
     throw error;
   }
   ```

### Настройка алертов

1. **Создайте чат/канал для алертов в Telegram**
2. **Добавьте переменные окружения:**
   ```bash
   ALERT_CHAT_ID="-1001234567890"  # ID чата
   ```
3. **Настройте пороги в error-monitoring.js:**
   ```javascript
   thresholds: {
     error_rate: 0.1,        // 10% error rate
     errors_per_minute: 10,  // 10 errors per minute
     consecutive_errors: 5   // 5 consecutive errors
   }
   ```

## Доступные эндпоинты

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/health` | GET | Проверка здоровья системы |
| `/api/metrics` | GET/POST/DELETE | Метрики производительности |
| `/api/errors` | GET/POST/DELETE | Мониторинг ошибок |
| `/api/business` | GET | Бизнес-метрики |
| `/api/dashboard` | GET | Сводная панель |

## Мониторинг в продакшене

### Рекомендуемые проверки

1. **Ежеминутная проверка здоровья:**
   ```bash
   */1 * * * * curl -f https://your-app.netlify.app/api/health || echo "Health check failed"
   ```

2. **Ежедневный отчет метрик:**
   ```bash
   0 9 * * * curl "https://your-app.netlify.app/api/dashboard?timeRange=24h" > daily_report.json
   ```

### Алерты

Система автоматически отправляет алерты в Telegram при:
- Высоком уровне ошибок (>10 в минуту)
- Последовательных ошибках (5 подряд)
- Ошибках подключения к базе данных
- Критических системных ошибках

### Performance thresholds

- **Database query time:** >1000ms = warning
- **Bot API response time:** >2000ms = warning  
- **Gemini API response time:** >3000ms = warning
- **Memory usage:** >75% = warning, >90% = critical

## Troubleshooting

### Частые проблемы

1. **Метрики не записываются:**
   - Проверьте, что middleware правильно подключен
   - Убедитесь, что нет циркулярных зависимостей

2. **Алерты не отправляются:**
   - Проверьте ALERT_CHAT_ID и BOT_TOKEN
   - Убедитесь, что бот добавлен в чат с правами на отправку сообщений

3. **Dashboard показывает ошибки:**
   - Проверьте подключение к базе данных
   - Убедитесь, что все необходимые таблицы существуют

### Логи

Все компоненты используют structured logging. Логи доступны в:
- Console (development)
- Files: `logs/combined.log`, `logs/error.log`
- External service (если настроен)

## Расширение системы

### Добавление новых метрик

1. **Создайте новую функцию записи в performance-metrics.js:**
   ```javascript
   function recordCustomMetric(type, value, context = {}) {
     // Логика записи
   }
   ```

2. **Добавьте в middleware:**
   ```javascript
   function withCustomMetrics(operation) {
     return async (customFunction) => {
       // Обертка для отслеживания
     };
   }
   ```

### Интеграция с внешними сервисами

Система поддерживает отправку метрик во внешние сервисы через:
- HTTP endpoints
- External logging services
- Analytics platforms

## Безопасность

- Все эндпоинты защищены CORS
- Метрики содержат минимум личной информации
- Логи структурированы для безопасного анализа
- Correlation IDs для трассировки без раскрытия данных

## Производительность

- Сбор метрик выполняется асинхронно
- Минимальный overhead на основные операции
- Автоматическая ротация логов
- Эффективное хранение метрик в памяти

---

**Примечание:** Это базовая реализация системы мониторинга. В продакшене рекомендуется использовать специализированные сервисы мониторинга (DataDog, New Relic, Grafana) для более продвинутой аналитики и долгосрочного хранения метрик.