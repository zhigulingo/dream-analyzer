# Общая библиотека авторизации Telegram

Эта библиотека предоставляет переиспользуемые функции для валидации данных Telegram Web App.

## Файлы

- `telegram-validator.js` - Основной модуль с функциями валидации
- `telegram-validator.test.js` - Unit тесты
- `README.md` - Документация

## Использование

```javascript
const { validateTelegramData, isInitDataValid } = require('./shared/auth/telegram-validator');

// Валидация initData от Telegram Web App
const result = validateTelegramData(initData, botToken);
if (result.valid && result.data) {
    console.log('User ID:', result.data.id);
    console.log('Username:', result.data.username);
} else {
    console.error('Validation failed:', result.error);
}

// Проверка времени жизни данных
if (isInitDataValid(initData, 3600)) { // максимальный возраст 1 час
    console.log('Data is still fresh');
}
```

## API

### `validateTelegramData(initData, botToken, options)`

Валидирует данные initData от Telegram Web App используя алгоритм HMAC-SHA256.

**Параметры:**
- `initData` (string) - Строка initData от Telegram Web App
- `botToken` (string) - Токен бота для проверки подписи
- `options` (Object, опционально) - Дополнительные опции
  - `enableLogging` (boolean, по умолчанию true) - Включить консольные сообщения

**Возвращает:** `ValidationResult`
```javascript
{
    valid: boolean,    // Успешна ли валидация
    data: Object|null, // Данные пользователя (если валидация успешна)
    error: string|null // Сообщение об ошибке (если валидация не удалась)
}
```

### `isInitDataValid(initData, maxAge)`

Проверяет, не истекло ли время жизни initData.

**Параметры:**
- `initData` (string) - Строка initData
- `maxAge` (number, по умолчанию 86400) - Максимальный возраст в секундах

**Возвращает:** `boolean` - true, если данные ещё действительны

## Интеграция

Эта библиотека заменила дублированные функции в следующих файлах:
- `bot/functions/deep-analysis.js`
- `bot/functions/create-invoice.js` 
- `bot/functions/user-profile.js`
- `bot/functions/web-login.js` (частично - там другая логика)

## Тестирование

Запуск тестов:
```bash
node bot/functions/shared/auth/telegram-validator.test.js
```

Тесты покрывают:
- ✅ Валидные данные
- ✅ Отсутствующие параметры
- ✅ Неправильная подпись
- ✅ Невалидный JSON пользователя
- ✅ Проверка времени жизни данных
- ✅ Опции логирования

## Безопасность

Библиотека использует стандартный алгоритм валидации Telegram Web App:
1. Извлечение hash из параметров
2. Создание секретного ключа: `HMAC-SHA256('WebAppData', botToken)`
3. Создание контрольной суммы отсортированных параметров
4. Сравнение с переданным hash

Это обеспечивает криптографическую защиту от подделки данных.