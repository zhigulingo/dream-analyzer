# Integration Tests Setup Guide

## ✅ Задача 4.2 Выполнена

Интеграционные тесты для Netlify Functions API успешно созданы и настроены.

## Что было создано

### 📁 Структура тестов

```
tests/integration/
├── README.md                           # Документация по тестам
├── test-environment.js                 # Настройка test environment
├── test-database.js                    # Управление тестовой БД
├── analyze-dream.integration.test.js   # Тесты /analyze-dream endpoint
├── deep-analysis.integration.test.js   # Тесты /deep-analysis endpoint
├── user-profile.integration.test.js    # Тесты /user-profile endpoint
├── web-login.integration.test.js       # Тесты /web-login endpoint
├── error-scenarios.integration.test.js # Тесты error scenarios
├── auth-flow.integration.test.js       # Тесты authentication flow
└── performance.integration.test.js     # Performance benchmarks
```

### 🧪 Покрытие тестов

**API Endpoints:**
- ✅ `/analyze-dream` - полное покрытие
- ✅ `/deep-analysis` - полное покрытие  
- ✅ `/user-profile` - полное покрытие
- ✅ `/web-login` - полное покрытие

**Сценарии тестирования:**
- ✅ Успешные запросы с валидными данными
- ✅ Аутентификация JWT и Telegram
- ✅ Валидация входных данных
- ✅ HTTP методы и CORS
- ✅ Error scenarios и edge cases
- ✅ Concurrent access и race conditions
- ✅ Performance benchmarks
- ✅ Database integration
- ✅ Security тесты

### 📊 Performance Baselines

| Endpoint | Max Response Time | Concurrent Load |
|----------|-------------------|-----------------|
| `/analyze-dream` | 15 секунд | 10 запросов |
| `/deep-analysis` | 30 секунд | 5 запросов |
| `/user-profile` | 3 секунды | 5 запросов |
| `/web-login` | 5 секунд | 5 запросов |

## 🚀 Запуск тестов

### Быстрый старт

```bash
# Все интеграционные тесты
npm run test:integration

# Только unit тесты
npm run test:unit

# Все тесты с coverage
npm run test:all

# Конкретный файл тестов
npm test tests/integration/analyze-dream.integration.test.js
```

### Настройка окружения

1. **Переменные окружения** (добавить в `.env` или экспортировать):
```bash
# Основные
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
BOT_TOKEN=your-bot-token

# Для тестов (опционально)
TEST_SUPABASE_URL=your-test-supabase-url
TEST_SUPABASE_SERVICE_KEY=your-test-service-key
TEST_JWT_SECRET=test-jwt-secret
TEST_GEMINI_API_KEY=test-gemini-key
TEST_BOT_TOKEN=test-bot-token
```

2. **База данных**: Тесты используют ту же БД что и production, но создают изолированные test данные с автоматической очисткой.

## 📋 Что тестируется

### Функциональные тесты
- ✅ Анализ снов с валидными токенами
- ✅ Глубокий анализ с достаточным количеством снов
- ✅ Получение профиля пользователя
- ✅ Веб-логин с паролем

### Безопасность
- ✅ JWT token validation
- ✅ Telegram data authentication
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS policy enforcement
- ✅ Rate limiting

### Производительность
- ✅ Response time benchmarks
- ✅ Concurrent request handling
- ✅ Memory usage monitoring
- ✅ Database performance
- ✅ Large dataset handling

### Error Handling
- ✅ Invalid authentication
- ✅ Malformed requests
- ✅ Network errors
- ✅ Database errors
- ✅ Timeout scenarios

## 🔧 Конфигурация

### Jest Configuration
Обновлена `jest.config.js`:
- Добавлено покрытие для API endpoints
- Timeout 30 секунд для стандартных тестов
- Расширенные timeout для performance тестов

### Package.json Scripts
Добавлены новые команды:
```json
{
  "test:integration": "jest tests/integration --testTimeout=60000",
  "test:unit": "jest tests/cors-middleware.test.js tests/gemini-service.test.js tests/telegram-validator.test.js",
  "test:all": "jest --coverage --testTimeout=60000"
}
```

## 📈 Метрики покрытия

Цели покрытия кода:
- **Lines**: 80%
- **Functions**: 80% 
- **Branches**: 80%
- **Statements**: 80%

## 🐛 Отладка

### Логи производительности
```
[PERF] analyze-dream: 1234.56ms
[PERF] 10 concurrent analyze-dream: total=5678.90ms, avg=567.89ms
[BASELINE] analyzeDream: avg=1234ms, min=987ms, max=1567ms
```

### Database Health Check
Каждый тест проверяет доступность БД и очищает тестовые данные.

### Environment Variables
Тесты проверяют наличие необходимых переменных окружения.

## ✅ Критерии готовности выполнены

- [x] **Тесты для всех endpoints** - 4 основных API endpoints покрыты
- [x] **Error scenarios покрыты** - comprehensive error handling tests
- [x] **Test DB setup** - автоматическое управление тестовыми данными
- [x] **Performance benchmarks** - детальные performance тесты

## 🚀 Следующие шаги

1. **Настроить CI/CD**: Интегрировать тесты в pipeline
2. **Мониторинг**: Настроить алерты на regression в performance
3. **Документация**: Обновить README проекта с информацией о тестах
4. **Дополнительные endpoints**: Добавить тесты для новых API endpoints

## 📞 Поддержка

При проблемах с запуском тестов:

1. Проверьте переменные окружения
2. Убедитесь что БД доступна
3. Проверьте логи Jest для деталей ошибок
4. Запустите тесты по одному для изоляции проблем

Интеграционные тесты готовы к использованию! 🎉