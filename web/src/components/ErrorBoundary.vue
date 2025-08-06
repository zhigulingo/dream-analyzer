<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    
    <!-- Error UI -->
    <div v-else class="error-fallback">
      <div class="error-container">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <h3>{{ errorTitle }}</h3>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button 
            v-if="showRetry" 
            @click="handleRetry" 
            :disabled="isRetrying"
            class="retry-button"
          >
            <LoadingSpinner v-if="isRetrying" size="xs" variant="white" class="mr-2" />
            {{ isRetrying ? 'Повторная попытка...' : 'Попробовать снова' }}
          </button>
          
          <button 
            @click="handleReload" 
            class="reload-button"
          >
            Перезагрузить страницу
          </button>
          
          <button 
            v-if="showReportError" 
            @click="handleReportError" 
            class="report-button"
          >
            Сообщить об ошибке
          </button>
        </div>
        
        <!-- Дополнительная информация для разработчиков -->
        <details v-if="isDevelopment" class="error-details">
          <summary>Детали ошибки (для разработчиков)</summary>
          <pre>{{ errorDetails }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onErrorCaptured, onMounted } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

const props = defineProps({
  fallbackComponent: {
    type: String,
    default: null
  },
  onError: {
    type: Function,
    default: null
  },
  onRetry: {
    type: Function,
    default: null
  },
  showRetry: {
    type: Boolean,
    default: true
  },
  showReportError: {
    type: Boolean,
    default: true
  },
  maxRetries: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['error', 'retry', 'recovery']);

const hasError = ref(false);
const error = ref(null);
const errorInfo = ref(null);
const isRetrying = ref(false);
const retryCount = ref(0);

const isDevelopment = computed(() => {
  return import.meta.env.DEV;
});

const errorTitle = computed(() => {
  if (!error.value) return 'Произошла ошибка';
  
  // Категоризация ошибок
  const errorMessage = error.value.message || '';
  
  if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
    return 'Проблемы с сетью';
  }
  if (errorMessage.includes('timeout')) {
    return 'Превышено время ожидания';
  }
  if (errorMessage.includes('Authentication')) {
    return 'Ошибка авторизации';
  }
  if (errorMessage.includes('Permission') || errorMessage.includes('Forbidden')) {
    return 'Нет доступа';
  }
  
  return 'Произошла ошибка';
});

const errorMessage = computed(() => {
  if (!error.value) return 'Что-то пошло не так';
  
  const errorMsg = error.value.message || '';
  
  // User-friendly сообщения
  if (errorMsg.includes('Network Error') || errorMsg.includes('failed to fetch')) {
    return 'Проверьте подключение к интернету и попробуйте снова.';
  }
  if (errorMsg.includes('timeout')) {
    return 'Сервер не отвечает. Попробуйте позже или проверьте соединение.';
  }
  if (errorMsg.includes('Authentication failed')) {
    return 'Сессия истекла. Необходимо войти заново.';
  }
  if (errorMsg.includes('Permission denied') || errorMsg.includes('403')) {
    return 'У вас нет прав для выполнения этого действия.';
  }
  if (errorMsg.includes('404')) {
    return 'Запрашиваемый ресурс не найден.';
  }
  if (errorMsg.includes('500')) {
    return 'Ошибка сервера. Мы работаем над её устранением.';
  }
  
  return 'Произошла непредвиденная ошибка. Мы работаем над её устранением.';
});

const errorDetails = computed(() => {
  if (!error.value) return '';
  
  return JSON.stringify({
    message: error.value.message,
    stack: error.value.stack,
    name: error.value.name,
    cause: error.value.cause,
    info: errorInfo.value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }, null, 2);
});

// Простая notification функция для web части (без Pinia)
const showNotification = (message, type = 'info') => {
  // Создаем простое уведомление
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s ease;
    max-width: 400px;
  `;
  
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      break;
    case 'warning':
      notification.style.backgroundColor = '#f59e0b';
      break;
    default:
      notification.style.backgroundColor = '#3b82f6';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 5000);
};

// Захват ошибок в дочерних компонентах
onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary caught error:', err, info);
  
  setError(err, info);
  
  // Вызываем колбэк если передан
  if (props.onError) {
    props.onError(err, info);
  }
  
  emit('error', { error: err, info });
  
  // Предотвращаем всплытие ошибки дальше
  return false;
});

// Захват глобальных ошибок
onMounted(() => {
  // Обработка unhandled promise rejections
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // Обработка JavaScript ошибок
  window.addEventListener('error', handleGlobalError);
  
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleGlobalError);
  };
});

const setError = (err, info = null) => {
  hasError.value = true;
  error.value = err;
  errorInfo.value = info;
};

const handleUnhandledRejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  setError(new Error(event.reason || 'Unhandled promise rejection'));
};

const handleGlobalError = (event) => {
  console.error('Global error:', event.error);
  setError(event.error || new Error(event.message));
};

const handleRetry = async () => {
  if (retryCount.value >= props.maxRetries) {
    showNotification(`Превышено максимальное количество попыток (${props.maxRetries})`, 'error');
    return;
  }
  
  isRetrying.value = true;
  retryCount.value++;
  
  try {
    if (props.onRetry) {
      await props.onRetry();
    }
    
    // Сброс состояния ошибки
    clearError();
    
    emit('retry', { attempt: retryCount.value });
    showNotification('Операция выполнена успешно', 'success');
    
  } catch (retryError) {
    console.error('Retry failed:', retryError);
    setError(retryError);
    showNotification('Повторная попытка не удалась', 'error');
  } finally {
    isRetrying.value = false;
  }
};

const handleReload = () => {
  window.location.reload();
};

const handleReportError = () => {
  const errorReport = {
    message: error.value?.message || 'Unknown error',
    stack: error.value?.stack || 'No stack trace',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  // В будущем можно отправлять на сервер
  console.log('Error report:', errorReport);
  
  // Копируем в буфер обмена для пользователя
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        showNotification('Информация об ошибке скопирована в буфер обмена', 'info');
      })
      .catch(() => {
        showNotification('Не удалось скопировать информацию об ошибке', 'warning');
      });
  }
};

const clearError = () => {
  hasError.value = false;
  error.value = null;
  errorInfo.value = null;
  retryCount.value = 0;
  emit('recovery');
};

// Expose methods for parent components
defineExpose({
  clearError,
  setError,
  hasError: () => hasError.value
});
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
  min-height: inherit;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.error-container {
  max-width: 500px;
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.error-icon {
  color: #ef4444;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}

.error-container h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.retry-button, .reload-button, .report-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button {
  background-color: #3b82f6;
  color: white;
}

.retry-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.retry-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.reload-button {
  background-color: #6b7280;
  color: white;
}

.reload-button:hover {
  background-color: #4b5563;
}

.report-button {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.report-button:hover {
  background-color: #e5e7eb;
}

.error-details {
  margin-top: 1rem;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.error-details pre {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 1rem;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.mr-2 {
  margin-right: 0.5rem;
}

@media (min-width: 640px) {
  .error-actions {
    flex-direction: row;
    justify-content: center;
  }
}
</style>