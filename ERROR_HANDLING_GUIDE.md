# Руководство по улучшенной обработке ошибок

## Обзор

Система улучшенной обработки ошибок включает:
- **ErrorBoundary** - компонент для перехвата и обработки ошибок
- **ErrorService** - сервис для категоризации и обработки ошибок  
- **OfflineDetection** - композабл для работы в offline режиме
- **Retry механизмы** - автоматические повторы для failed операций

## Компоненты

### ErrorBoundary

Компонент для перехвата ошибок в дочерних компонентах с fallback UI.

```vue
<ErrorBoundary 
  @retry="handleRetry"
  @error="handleError"
  :show-retry="true"
  :max-retries="3"
>
  <YourComponent />
</ErrorBoundary>
```

**Props:**
- `show-retry` - показывать кнопку повтора (по умолчанию: true)
- `max-retries` - максимальное количество попыток (по умолчанию: 3)
- `on-retry` - функция для выполнения при повторе
- `on-error` - функция для обработки ошибок

**Events:**
- `@retry` - событие при нажатии кнопки повтора
- `@error` - событие при возникновении ошибки
- `@recovery` - событие при успешном восстановлении

### ErrorService

Сервис для категоризации и обработки ошибок с user-friendly сообщениями.

```javascript
import { errorService } from '@/services/errorService';

// Обработка ошибки
const errorInfo = errorService.handleError(error, { action: 'fetchData' });

// Создание retry wrapper
const retryOperation = errorService.createRetryWrapper(
  myAsyncFunction,
  { maxRetries: 3, baseDelay: 1000 }
);
```

**Категории ошибок:**
- `network` - сетевые ошибки
- `auth` - ошибки авторизации  
- `permission` - ошибки доступа
- `validation` - ошибки валидации
- `server` - серверные ошибки
- `timeout` - ошибки таймаута
- `unknown` - неизвестные ошибки

### OfflineDetection

Композабл для работы с offline состоянием и отложенными операциями.

```javascript
import { useOfflineDetection } from '@/composables/useOfflineDetection';

const {
  isOnline,
  pendingOperations,
  executeOnlineOperation,
  addPendingOperation
} = useOfflineDetection();

// Выполнение операции с offline awareness
await executeOnlineOperation(
  () => api.fetchData(),
  'Загрузка данных'
);
```

## Использование в Store

Обновленный user store включает:

```javascript
// Retry методы
await userStore.retryFetchProfile();
await userStore.retryFetchHistory();

// Проверка возможности повтора
if (userStore.canRetry('fetchProfile')) {
  // можно повторить
}

// Инициализация сервисов
userStore.initServices();
```

## Использование в компонентах

### Retry кнопки в UI

```vue
<div v-else-if="errorProfile" class="error-section">
  <div class="error-message">
    Ошибка загрузки профиля: {{ errorProfile }}
  </div>
  <button 
    @click="retryFetchProfile" 
    :disabled="isRetryingProfile"
    class="retry-button"
  >
    <LoadingSpinner v-if="isRetryingProfile" size="xs" variant="white" class="mr-2" />
    {{ isRetryingProfile ? 'Повторная попытка...' : 'Попробовать снова' }}
  </button>
</div>
```

### Offline индикатор

```vue
<div v-if="!isOnline" class="offline-banner">
  <span>⚠️ Нет подключения к интернету</span>
  <span v-if="pendingOperations.length > 0" class="pending-count">
    ({{ pendingOperations.length }} операций в очереди)
  </span>
</div>
```

## Настройка

### Конфигурация ErrorService

```javascript
// Создание retry wrapper с настройками
const retryOperation = errorService.createRetryWrapper(operation, {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error, attempt) => {
    // кастомная логика проверки возможности повтора
    return error.status !== 401 && attempt < 3;
  }
});
```

### Кастомные обработчики ошибок

```javascript
// Глобальный обработчик для ErrorBoundary
const handleGlobalError = (errorEvent) => {
  errorService.handleError(errorEvent.error, { 
    component: 'MyComponent',
    context: 'global_error_boundary'
  });
};

const handleGlobalRetry = async () => {
  // логика повтора всех failed операций
  await retryAllFailedOperations();
};
```

## Интеграция

### В новых компонентах

1. Оберните компонент в `ErrorBoundary`
2. Используйте `useOfflineDetection` для network awareness
3. Добавьте retry кнопки для failed операций
4. Используйте `errorService` для обработки ошибок

### В существующих компонентах

1. Замените простые `try/catch` на `errorService.handleError`
2. Добавьте retry состояния и методы
3. Интегрируйте offline detection
4. Добавьте ErrorBoundary на уровне страницы/секции

## Стили

Система включает готовые CSS классы:

```css
.offline-banner { /* стили для offline индикатора */ }
.error-section { /* стили для секций с ошибками */ }
.retry-button { /* стили для кнопок повтора */ }
.pending-count { /* стили для счетчика отложенных операций */ }
```

## Лучшие практики

1. **Всегда используйте ErrorBoundary** на уровне страниц/крупных секций
2. **Категоризируйте ошибки** для лучшего UX
3. **Добавляйте retry только там, где это имеет смысл** (не для ошибок валидации)
4. **Показывайте offline состояние** пользователю
5. **Логируйте ошибки** для мониторинга
6. **Используйте user-friendly сообщения** вместо технических

## Примеры использования

### Простая интеграция
```vue
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Полная интеграция с retry
```vue
<ErrorBoundary @retry="handleRetry" @error="handleError">
  <div v-if="!isOnline" class="offline-banner">
    Нет соединения
  </div>
  <MyComponent />
</ErrorBoundary>
```

### В async операциях
```javascript
try {
  await executeOnlineOperation(
    () => api.fetchData(),
    'Загрузка данных'
  );
} catch (error) {
  errorService.handleError(error, { action: 'fetchData' });
}
```