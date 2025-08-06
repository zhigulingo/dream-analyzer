// composables/useOfflineDetection.js
import { ref, onMounted, onUnmounted } from 'vue';
import { useNotificationStore } from '@/stores/notifications';

export function useOfflineDetection() {
  const isOnline = ref(navigator.onLine);
  const wasOffline = ref(false);
  const notificationStore = useNotificationStore();
  
  // Queue для операций, которые нужно выполнить после восстановления соединения
  const pendingOperations = ref([]);
  
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
    notificationStore.warning('Соединение с интернетом потеряно. Некоторые функции могут быть недоступны.');
    console.log('Connection lost - switching to offline mode');
  };
  
  const handleConnectionRestored = () => {
    if (wasOffline.value) {
      notificationStore.success('Соединение восстановлено!');
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
    
    notificationStore.info(`${description} будет выполнена при восстановлении соединения`);
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
        notificationStore.error(`Не удалось выполнить: ${description}`);
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