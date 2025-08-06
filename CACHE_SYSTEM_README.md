# Система кеширования Dream Analyzer

## Обзор

Реализована полноценная система кеширования для оптимизации производительности приложения Dream Analyzer. Система включает Redis-совместимый memory cache, интеллектуальную инвалидацию, предзагрузку данных и мониторинг.

## Архитектура

### Основные компоненты

1. **CacheService** - Redis-совместимый memory cache
2. **UserCacheService** - Кеширование пользовательских данных
3. **GeminiService** (обновлен) - Кеширование ответов AI
4. **CacheInvalidationService** - Управление инвалидацией
5. **CacheWarmingService** - Предзагрузка популярных данных
6. **CacheManager** - Координация всех сервисов
7. **CacheMonitoring** - HTTP API для мониторинга

## Функциональность

### ✅ Выполненные требования

- [x] **Redis-совместимый memory cache** - Полный API совместимый с Redis
- [x] **Кеширование Gemini responses** - Оптимизированное кеширование AI ответов с тегами
- [x] **Кеширование user profiles** - Многоуровневое кеширование профилей пользователей
- [x] **Cache invalidation strategies** - Умная инвалидация по событиям, паттернам и тегам
- [x] **Cache warming для популярных запросов** - Предзагрузка и предсказательное кеширование
- [x] **Cache monitoring** - Полный мониторинг с метриками и health checks

### Новые возможности

- **TTL управление** - Гибкое управление временем жизни кеша
- **LRU eviction** - Автоматическое удаление старых записей
- **Tagging system** - Группировка кеша по тегам для инвалидации
- **Pattern matching** - Поиск и инвалидация по паттернам
- **Activity tracking** - Отслеживание активности пользователей
- **Predictive warming** - Предсказательная предзагрузка данных
- **Comprehensive monitoring** - Детальная статистика и health checks

## API Endpoints

### Мониторинг кеша

```
GET /api/cache/stats?type=all          # Общая статистика
GET /api/cache/health                  # Health check
GET /api/cache/keys?pattern=user:*     # Список ключей
POST /api/cache/invalidate             # Инвалидация
POST /api/cache/warm                   # Предзагрузка
```

### Примеры использования

#### Получение статистики
```javascript
// Общая статистика всех сервисов
GET /api/cache/stats?type=all

// Статистика только пользовательского кеша
GET /api/cache/stats?type=user

// Статистика Gemini кеша
GET /api/cache/stats?type=gemini
```

#### Инвалидация кеша
```javascript
// Инвалидация всех данных пользователя
POST /api/cache/invalidate
{
  "type": "user",
  "userId": "123456789",
  "target": "user_updated",
  "reason": "Profile update"
}

// Инвалидация по паттерну
POST /api/cache/invalidate
{
  "type": "pattern",
  "pattern": "user:profile:*",
  "reason": "Mass profile update"
}

// Инвалидация по тегу
POST /api/cache/invalidate
{
  "type": "tag",
  "target": "gemini",
  "reason": "Model update"
}
```

#### Предзагрузка кеша
```javascript
// Полный цикл warming
POST /api/cache/warm
{
  "type": "full",
  "strategies": ["popular_users", "common_prompts"]
}

// Предсказательное кеширование для пользователя
POST /api/cache/warm
{
  "type": "predictive",
  "userId": "123456789"
}
```

## Интеграция в код

### Кеширование пользовательских данных

```javascript
const cacheManager = require('./shared/services/cache-manager');

// Кеширование профиля пользователя
await cacheManager.cacheUserData(userId, {
  profile: userData,
  trackActivity: true,
  activityType: 'profile_access'
});

// Получение данных с трекингом
const userData = await cacheManager.getUserData(userId, {
  includeFull: true,
  trackAccess: true
});
```

### Обработка событий

```javascript
// При изменении пользователя
await cacheManager.handleUserEvent(userId, 'user_updated', {
  predictiveWarming: true
});

// При системных изменениях
await cacheManager.handleSystemEvent('model_updated', {
  triggerWarming: true,
  warmingStrategies: ['common_prompts']
});
```

### Работа с Gemini кешем

```javascript
const geminiService = require('./shared/services/gemini-service');

// Анализ автоматически кешируется с тегами
const analysis = await geminiService.analyzeDream(dreamText, 'basic');

// Инвалидация анализов определенного типа
geminiService.invalidateCache('basic');

// Предзагрузка популярных анализов
await geminiService.warmCache();
```

## Настройки

### Переменные окружения

```bash
# Включить фоновую предзагрузку
CACHE_BACKGROUND_WARMING=true

# Настройки кеша (если нужны кастомные)
CACHE_DEFAULT_TTL=3600000        # 1 час
CACHE_MAX_SIZE=10000             # Максимум записей
CACHE_CLEANUP_INTERVAL=300000    # 5 минут
```

### Конфигурация в коде

```javascript
// При создании cache service
const cacheService = new CacheService({
  defaultTTL: 3600000,      // 1 час
  maxSize: 10000,           // Максимум записей  
  enableWarming: true,      // Включить warming
  cleanupInterval: 300000   // Интервал очистки
});
```

## Мониторинг и метрики

### Dashboard
```
GET /api/cache/stats
```

Возвращает полную картину состояния кеша:
- Hit rate всех сервисов
- Использование памяти
- Количество ключей
- Статистика warming и invalidation
- Список популярных ключей

### Health Check
```
GET /api/cache/health
```

Возвращает статус здоровья:
- `healthy` - все в порядке
- `degraded` - есть проблемы
- `unhealthy` - критические ошибки

### Проблемы и решения

| Проблема | Индикатор | Решение |
|----------|-----------|---------|
| Низкий hit rate | < 50% | Запустить warming cycle |
| Высокое потребление памяти | > 90% | Уменьшить TTL или запустить cleanup |
| Много evictions | Растет счетчик | Увеличить maxSize кеша |
| Долгие операции warming | > 30 секунд | Оптимизировать стратегии |

## Производительность

### Ожидаемые улучшения

- **Gemini API вызовы**: -60% повторных запросов
- **User profile queries**: -70% обращений к БД  
- **Response time**: -40% среднее время ответа
- **Memory efficiency**: Умное управление памятью с LRU
- **Предсказательность**: Автоматическая предзагрузка популярных данных

### Статистика использования

После внедрения системы будут доступны метрики:
- Cache hit rate по типам данных
- Время выполнения warming cycles
- Частота инвалидации
- Топ популярных ключей
- Паттерны использования пользователей

## Развитие системы

### Возможные улучшения

1. **Persistent cache** - Сохранение кеша между перезапусками
2. **Distributed caching** - Распределенный кеш для масштабирования
3. **Advanced analytics** - ML-предсказания для warming
4. **Cache compression** - Сжатие больших объектов
5. **Multi-tier caching** - Многоуровневое кеширование

### Интеграции

- **Redis cluster** - Для production масштабирования
- **Prometheus** - Экспорт метрик
- **Grafana** - Визуализация дашбордов
- **APM tools** - Интеграция с мониторингом приложения

---

Система кеширования готова к production использованию и обеспечивает значительное повышение производительности приложения Dream Analyzer.