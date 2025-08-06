// services/errorService.js
import { useNotificationStore } from '@/stores/notifications';

export class ErrorService {
  constructor() {
    this.notificationStore = null;
    this.errorHistory = [];
    this.maxHistorySize = 50;
  }

  // Инициализация с notification store
  init() {
    if (!this.notificationStore) {
      this.notificationStore = useNotificationStore();
    }
  }

  // Категоризация ошибок
  categorizeError(error) {
    const message = error.message || error.toString();
    const stack = error.stack || '';

    // Сетевые ошибки
    if (this.isNetworkError(error)) {
      return {
        category: 'network',
        severity: 'medium',
        userMessage: 'Проблемы с сетью. Проверьте подключение к интернету.',
        canRetry: true,
        suggestedAction: 'retry'
      };
    }

    // Ошибки авторизации
    if (this.isAuthError(error)) {
      return {
        category: 'auth',
        severity: 'high',
        userMessage: 'Сессия истекла. Необходимо войти заново.',
        canRetry: false,
        suggestedAction: 'reauth'
      };
    }

    // Ошибки разрешений
    if (this.isPermissionError(error)) {
      return {
        category: 'permission',
        severity: 'medium',
        userMessage: 'У вас нет прав для выполнения этого действия.',
        canRetry: false,
        suggestedAction: 'contact_support'
      };
    }

    // Ошибки валидации
    if (this.isValidationError(error)) {
      return {
        category: 'validation',
        severity: 'low',
        userMessage: this.extractValidationMessage(error),
        canRetry: false,
        suggestedAction: 'fix_input'
      };
    }

    // Серверные ошибки
    if (this.isServerError(error)) {
      return {
        category: 'server',
        severity: 'high',
        userMessage: 'Ошибка сервера. Мы работаем над её устранением.',
        canRetry: true,
        suggestedAction: 'retry'
      };
    }

    // Ошибки таймаута
    if (this.isTimeoutError(error)) {
      return {
        category: 'timeout',
        severity: 'medium',
        userMessage: 'Превышено время ожидания. Попробуйте позже.',
        canRetry: true,
        suggestedAction: 'retry'
      };
    }

    // Неизвестные ошибки
    return {
      category: 'unknown',
      severity: 'medium',
      userMessage: 'Произошла непредвиденная ошибка.',
      canRetry: true,
      suggestedAction: 'retry'
    };
  }

  // Обработка ошибки с логированием и уведомлениями
  handleError(error, context = {}) {
    this.init();
    
    const errorInfo = this.categorizeError(error);
    const errorRecord = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      category: errorInfo.category,
      severity: errorInfo.severity,
      handled: true
    };

    // Добавляем в историю
    this.addToHistory(errorRecord);

    // Логируем ошибку
    console.error('[ErrorService]', errorInfo.category, error, context);

    // Показываем уведомление пользователю
    this.showUserNotification(errorInfo, context);

    return errorInfo;
  }

  // Показать уведомление пользователю
  showUserNotification(errorInfo, context) {
    const { severity, userMessage, suggestedAction } = errorInfo;
    
    let actionText = '';
    switch (suggestedAction) {
      case 'retry':
        actionText = ' Попробуйте ещё раз.';
        break;
      case 'reauth':
        actionText = ' Войдите в систему заново.';
        break;
      case 'contact_support':
        actionText = ' Обратитесь в поддержку.';
        break;
      case 'fix_input':
        actionText = ' Проверьте введённые данные.';
        break;
    }

    const fullMessage = userMessage + actionText;

    switch (severity) {
      case 'low':
        this.notificationStore?.info(fullMessage);
        break;
      case 'medium':
        this.notificationStore?.warning(fullMessage);
        break;
      case 'high':
        this.notificationStore?.error(fullMessage);
        break;
    }
  }

  // Создание retry-функции с экспоненциальной задержкой
  createRetryWrapper(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      retryCondition = this.defaultRetryCondition.bind(this)
    } = options;

    return async (...args) => {
      let lastError;
      let delay = baseDelay;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;
          
          const errorInfo = this.categorizeError(error);
          
          // Проверяем, можно ли повторить операцию
          if (attempt === maxRetries || !retryCondition(error, attempt)) {
            this.handleError(error, { 
              operation: operation.name || 'unknown',
              attempt: attempt + 1,
              maxRetries: maxRetries + 1
            });
            throw error;
          }

          // Логируем попытку
          console.warn(`[ErrorService] Retry attempt ${attempt + 1}/${maxRetries + 1} for ${operation.name || 'operation'}`, error);
          
          // Ждём перед следующей попыткой
          await this.delay(Math.min(delay, maxDelay));
          delay *= backoffFactor;
        }
      }

      throw lastError;
    };
  }

  // Условие для повтора по умолчанию
  defaultRetryCondition(error, attempt) {
    const errorInfo = this.categorizeError(error);
    return errorInfo.canRetry && attempt < 3;
  }

  // Утилиты для определения типов ошибок
  isNetworkError(error) {
    const message = error.message || '';
    return message.includes('Network Error') || 
           message.includes('failed to fetch') ||
           message.includes('ERR_NETWORK') ||
           error.name === 'NetworkError';
  }

  isAuthError(error) {
    const message = error.message || '';
    return message.includes('Authentication') ||
           message.includes('Unauthorized') ||
           message.includes('401') ||
           error.status === 401;
  }

  isPermissionError(error) {
    const message = error.message || '';
    return message.includes('Permission') ||
           message.includes('Forbidden') ||
           message.includes('403') ||
           error.status === 403;
  }

  isValidationError(error) {
    const message = error.message || '';
    return message.includes('Validation') ||
           message.includes('Invalid') ||
           message.includes('400') ||
           error.status === 400;
  }

  isServerError(error) {
    const message = error.message || '';
    return message.includes('500') ||
           message.includes('Internal Server Error') ||
           (error.status >= 500 && error.status < 600);
  }

  isTimeoutError(error) {
    const message = error.message || '';
    return message.includes('timeout') ||
           message.includes('Timeout') ||
           error.name === 'TimeoutError';
  }

  extractValidationMessage(error) {
    // Пытаемся извлечь более понятное сообщение об ошибке валидации
    if (error.response?.data?.errors) {
      const errors = Object.values(error.response.data.errors).flat();
      return errors.join('; ');
    }
    return error.message || 'Проверьте введённые данные';
  }

  // Добавление в историю ошибок
  addToHistory(errorRecord) {
    this.errorHistory.unshift(errorRecord);
    
    // Ограничиваем размер истории
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  // Получение истории ошибок
  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(0, limit);
  }

  // Очистка истории ошибок
  clearErrorHistory() {
    this.errorHistory = [];
  }

  // Генерация отчёта об ошибке
  generateErrorReport(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    
    return {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      category: errorInfo.category,
      severity: errorInfo.severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      history: this.getErrorHistory(5)
    };
  }

  // Утилита для задержки
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Экспортируем singleton
export const errorService = new ErrorService();