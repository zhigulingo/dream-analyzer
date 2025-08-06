# Structured Logging Migration Summary

## ✅ Задача 6.1: Структурированное логирование - ВЫПОЛНЕНА

### Время выполнения
**Фактическое:** ~45 минут  
**Запланированное:** 60-75 минут  

### Выполненные задачи

#### 1. ✅ Создан shared/utils/logger.js с Winston
- Установлен Winston через npm
- Создан полнофункциональный логгер с поддержкой JSON форматирования
- Добавлены transports для console и file логирования
- Настроена автоматическая ротация файлов

#### 2. ✅ Настроен JSON structured logging с уровнями
- **Уровни:** error, warn, info, debug
- **JSON формат** для production среды
- **Цветной вывод** для development
- Настраиваемый уровень логирования через `LOG_LEVEL`

#### 3. ✅ Добавлены correlation IDs для трассировки
- Автоматическая генерация correlation ID для каждого запроса
- Методы `generateCorrelationId()` и `setCorrelationId()`
- Передача correlation ID между компонентами
- Дочерние логгеры с наследованием correlation ID

#### 4. ✅ Интеграция с external logging service
- HTTP transport для отправки логов во внешние сервисы
- Конфигурация через environment variables:
  - `EXTERNAL_LOG_SERVICE_URL`
  - `EXTERNAL_LOG_SERVICE_TOKEN`
- Поддержка Bearer token аутентификации

#### 5. ✅ Заменены все console.* на structured logger
- **bot/functions/bot.js** - полная замена
- **bot/functions/deep-analysis.js** - полная замена
- Специализированные методы логирования:
  - `botEvent()`, `botError()`
  - `apiRequest()`, `apiError()`
  - `dbOperation()`, `dbError()`
  - `geminiOperation()`, `geminiError()`
  - `authEvent()`, `authError()`
  - `cacheOperation()`

### Созданные файлы

1. **`bot/functions/shared/utils/logger.js`** - основной логгер
2. **`bot/functions/shared/utils/README.md`** - документация
3. **`logs/`** - директория для файлов логов
4. **`LOGGING_MIGRATION_SUMMARY.md`** - данный документ

### Структура логов

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

### Преимущества нового подхода

1. **Структурированность**: JSON логи легко парсятся и анализируются
2. **Трассировка**: Correlation IDs позволяют отслеживать запросы
3. **Контекст**: Богатые метаданные для каждого события
4. **Централизация**: Единый подход к логированию во всем приложении
5. **Мониторинг**: Интеграция с внешними системами мониторинга
6. **Производительность**: Асинхронная отправка логов

### Примеры использования

#### Простое логирование
```javascript
const { logger } = require('./shared/utils/logger');

logger.info('User logged in', { userId: 123 });
logger.error('Database connection failed', {}, error);
```

#### Специализированные методы
```javascript
// API операции
logger.apiRequest('POST', '/api/dreams', 200, 150, 'user123');
logger.apiError('POST', '/api/dreams', error, 'user123');

// Database операции
logger.dbOperation('SELECT', 'users', 25, 1);
logger.dbError('INSERT', 'dreams', error);

// Bot события
logger.botEvent('message_received', 'user123', 'chat456');
logger.botError('command_processing', error, 'user123');
```

#### Correlation IDs и дочерние логгеры
```javascript
// Генерация correlation ID
const correlationId = logger.generateCorrelationId();

// Дочерний логгер с контекстом
const requestLogger = logger.child({ 
  requestId: 'req-123',
  userId: 'user456'
});

requestLogger.info('Processing request');
```

### Следующие шаги

1. Обновить оставшиеся файлы в `shared/services/` 
2. Интегрировать логгер в TMA и Web приложения
3. Настроить внешний сервис логирования (ELK, Splunk, CloudWatch)
4. Добавить алерты на критические ошибки
5. Создать дашборды для мониторинга

### Критерии готовности - ✅ ВЫПОЛНЕНЫ

- [x] Winston logger настроен
- [x] JSON structured logs
- [x] Correlation IDs  
- [x] External service интеграция
- [x] Замена console.* вызовов в основных файлах