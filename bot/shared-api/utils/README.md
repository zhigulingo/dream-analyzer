# Structured Logging System

## Обзор

Система структурированного логирования на основе Winston с поддержкой correlation IDs, JSON форматирования и интеграции с внешними сервисами логирования.

## Основные возможности

- **Structured Logging**: JSON формат для всех логов
- **Correlation IDs**: Автоматическая генерация ID для трассировки запросов
- **Уровни логирования**: error, warn, info, debug
- **Контекстное логирование**: Передача дополнительной информации
- **Специализированные методы**: Для API, DB, Bot, Gemini, Auth операций
- **External Service Integration**: Отправка логов во внешние сервисы
- **File Rotation**: Автоматическая ротация файлов логов

## Быстрый старт

```javascript
const { logger, createLogger } = require('./shared/utils/logger');

// Простое логирование
logger.info('Application started');
logger.error('Something went wrong', { userId: 123 }, new Error('Test error'));

// Логирование с correlation ID
logger.generateCorrelationId();
logger.info('Processing request', { requestId: 'req-123' });

// Создание дочернего логгера с контекстом
const userLogger = logger.child({ userId: 123, module: 'user-service' });
userLogger.info('User action performed');
```

## Переменные окружения

```bash
# Уровень логирования (error, warn, info, debug)
LOG_LEVEL=info

# Интеграция с внешним сервисом логирования
EXTERNAL_LOG_SERVICE_URL=https://logs.example.com/api/logs
EXTERNAL_LOG_SERVICE_TOKEN=your-token-here
```

## Специализированные методы

### API Operations
```javascript
// Успешный API запрос
logger.apiRequest('POST', '/api/dreams', 200, 150, 'user123');

// Ошибка API
logger.apiError('POST', '/api/dreams', error, 'user123');
```

### Database Operations
```javascript
// Операция с БД
logger.dbOperation('SELECT', 'users', 25, 1);

// Ошибка БД
logger.dbError('INSERT', 'dreams', error);
```

### Bot Events
```javascript
// Событие бота
logger.botEvent('message_received', 'user123', 'chat456');

// Ошибка бота
logger.botError('command_processing', error, 'user123', 'chat456');
```

### Gemini AI Operations
```javascript
// Операция с Gemini
logger.geminiOperation('analyze_dream', 'gemini-pro', 1200, 150);

// Ошибка Gemini
logger.geminiError('analyze_dream', error);
```

### Authentication
```javascript
// Событие аутентификации
logger.authEvent('login_attempt', 'user123', 'success');

// Ошибка аутентификации
logger.authError('token_validation', error, 'user123');
```

### Cache Operations
```javascript
// Операция с кешем
logger.cacheOperation('GET', 'dream:123', true, 5);
```

## Структура логов

Все логи имеют следующую структуру в JSON формате:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "API Request",
  "correlationId": "abc123def456",
  "service": "dream-analyzer",
  "environment": "production",
  "context": {
    "api": {
      "method": "POST",
      "path": "/api/dreams",
      "statusCode": 200,
      "duration": 150,
      "userId": "user123"
    }
  }
}
```

## Correlation IDs

Correlation ID автоматически генерируется для каждого лога, если не установлен явно:

```javascript
// Установка correlation ID для всей сессии
const correlationId = logger.generateCorrelationId();

// Или установка существующего ID
logger.setCorrelationId('existing-id');

// Создание дочернего логгера с тем же correlation ID
const childLogger = logger.child({ module: 'payment' });
```

## Дочерние логгеры

Создание логгеров с предустановленным контекстом:

```javascript
// Логгер для конкретного пользователя
const userLogger = createLogger({ userId: 'user123' });

// Логгер для модуля
const botLogger = createLogger({ module: 'telegram-bot' });

// Комбинирование
const contextLogger = userLogger.child({ operation: 'dream-analysis' });
```

## Интеграция с внешними сервисами

Для отправки логов во внешние сервисы (например, ELK Stack, Splunk, CloudWatch):

1. Установите переменные окружения:
   ```bash
   EXTERNAL_LOG_SERVICE_URL=https://your-log-service.com/api/logs
   EXTERNAL_LOG_SERVICE_TOKEN=your-bearer-token
   ```

2. Логи автоматически отправляются через HTTP transport

## Миграция с console.*

### Было:
```javascript
console.log('[Bot] User connected:', userId);
console.error('[API] Request failed:', error);
console.warn('[Cache] Cache miss for key:', key);
```

### Стало:
```javascript
const { logger } = require('./shared/utils/logger');

logger.botEvent('user_connected', userId);
logger.apiError('request_processing', error);
logger.cacheOperation('GET', key, false);
```

## Производительность

- JSON логи оптимизированы для парсинга
- Файловая ротация предотвращает переполнение диска
- Асинхронная отправка во внешние сервисы
- Настраиваемые уровни логирования для production

## Файлы логов

- `logs/error.log` - только ошибки
- `logs/combined.log` - все логи
- Автоматическая ротация при достижении 5MB
- Хранение последних 5 файлов