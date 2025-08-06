// composables/useOfflineDetection.js
import { ref, onMounted, onUnmounted } from 'vue';

export function useOfflineDetection() {
  const isOnline = ref(navigator.onLine);
  const wasOffline = ref(false);
  
  // Queue для операций, которые нужно выполнить после восстановления соединения
  const pendingOperations = ref([]);
  
  // Простая notification функция для web части
  const showNotification = (message, type = 'info') => {
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
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };
  
  const updateOnlineStatus = () => {
    const currentStatus = navigator.onLine;
    const previousStatus = isOnline.value;
    
    isOnline.value = currentStatus;
    
    if (!previousStatus && currentStatus) {
      // Соединение восстановлено
      handleConnectionRestored();
    } else if (previousStatus && !currentStatus) {
      // Соединение потеряно
      handleConnectionLost();
    }
  };
  
  const handleConnectionLost = () => {
    wasOffline.value = true;
    showNotification('Соединение с интернетом потеряно. Некоторые функции могут быть недоступны.', 'warning');
    console.log('Connection lost - switching to offline mode');
  };
  
  const handleConnectionRestored = () => {
    if (wasOffline.value) {
      showNotification('Соединение восстановлено!', 'success');
      console.log('Connection restored - executing pending operations');
      
      // Выполняем отложенные операции
      executePendingOperations();
      wasOffline.value = false;
    }
  };
  
  const addPendingOperation = (operation, description = 'Операция') => {
    pendingOperations.value.push({
      id: Date.now() + Math.random(),
      operation,
      description,
      timestamp: new Date().toISOString()
    });
    
    showNotification(`${description} будет выполнена при восстановлении соединения`, 'info');
  };
  
  const executePendingOperations = async () => {
    if (pendingOperations.value.length === 0) return;
    
    const operations = [...pendingOperations.value];
    pendingOperations.value = [];
    
    for (const { operation, description } of operations) {
      try {
        await operation();
        console.log(`Pending operation executed: ${description}`);
      } catch (error) {
        console.error(`Failed to execute pending operation: ${description}`, error);
        showNotification(`Не удалось выполнить: ${description}`, 'error');
      }
    }
  };
  
  const clearPendingOperations = () => {
    pendingOperations.value = [];
  };
  
  // Проверка качества соединения
  const checkConnectionQuality = async () => {
    if (!isOnline.value) return { quality: 'offline', ping: null };
    
    try {
      const start = performance.now();
      
      // Простой тест соединения к нашему API
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const ping = performance.now() - start;
      
      if (!response.ok) {
        return { quality: 'poor', ping };
      }
      
      if (ping < 200) {
        return { quality: 'excellent', ping };
      } else if (ping < 500) {
        return { quality: 'good', ping };
      } else if (ping < 1000) {
        return { quality: 'fair', ping };
      } else {
        return { quality: 'poor', ping };
      }
    } catch (error) {
      console.error('Connection quality test failed:', error);
      return { quality: 'poor', ping: null };
    }
  };
  
  // Wrapper для сетевых запросов с обработкой offline
  const executeOnlineOperation = async (operation, description = 'Операция', fallback = null) => {
    if (!isOnline.value) {
      if (fallback) {
        try {
          return await fallback();
        } catch (error) {
          console.error('Fallback operation failed:', error);
        }
      }
      
      addPendingOperation(operation, description);
      throw new Error('Нет подключения к интернету. Операция будет выполнена при восстановлении соединения.');
    }
    
    try {
      return await operation();
    } catch (error) {
      // Проверяем, не является ли ошибка сетевой
      if (isNetworkError(error)) {
        addPendingOperation(operation, description);
        throw new Error('Проблемы с сетью. Операция будет выполнена при восстановлении соединения.');
      }
      throw error;
    }
  };
  
  const isNetworkError = (error) => {
    const networkErrorMessages = [
      'Network Error',
      'failed to fetch',
      'TypeError: Failed to fetch',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'timeout'
    ];
    
    const errorMessage = error.message || error.toString();
    return networkErrorMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  };
  
  // Lifecycle
  onMounted(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Проверяем соединение при загрузке
    updateOnlineStatus();
  });
  
  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  });
  
  return {
    isOnline,
    wasOffline,
    pendingOperations,
    addPendingOperation,
    executePendingOperations,
    clearPendingOperations,
    checkConnectionQuality,
    executeOnlineOperation,
    isNetworkError
  };
}