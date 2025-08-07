<template>
  <ErrorBoundary 
    @retry="handleGlobalRetry"
    @error="handleGlobalError"
    :show-retry="true"
  >
    <div class="web-app-container">
      <DebugInfo />
      <!-- Offline indicator -->
      <div v-if="!isOnline" class="offline-banner">
        <span>⚠️ Нет подключения к интернету</span>
        <span v-if="pendingOperations.length > 0" class="pending-count">
          ({{ pendingOperations.length }} операций в очереди)
        </span>
      </div>

      <template v-if="isAuthenticated">
          <!-- User is authenticated, show account info -->
          <div class="personal-account">
              <h1>Ваш Личный кабинет (Web)</h1>

              <!-- Logout Button -->
              <button @click="handleLogout" class="logout-button">Logout</button>

              <!-- Блок 1: Информация о пользователе -->
              <section class="user-info card">
                  <h2>Ваш профиль</h2>
                  <div v-if="isLoadingProfile" class="loading-section">
                      <LoadingSpinner size="sm" label="Загрузка профиля..." />
                      <SkeletonLoader type="user-profile" class="mt-4" />
                  </div>
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
                  <div v-else-if="profile.tokens !== null">
                      <p>Остаток токенов: <strong>{{ profile.tokens }}</strong></p>
                      <p>
                          Текущий тариф: <strong class="capitalize">{{ profile.subscription_type }}</strong>
                          <span v-if="profile.subscription_end">
                              (до {{ formatDate(profile.subscription_end) }})
                          </span>
                      </p>
                  </div>
                  <div v-else>
                      <p>Не удалось загрузить данные профиля.</p>
                  </div>
              </section>

            <!-- Dream input section -->
            <section class="dream-input card">
                <h2>Анализировать новый сон</h2>
                <textarea v-model="newDream" :disabled="isSubmittingDream" rows="4" placeholder="Введите ваш сон..."></textarea>
                <button @click="submitDream" :disabled="isSubmittingDream || !newDream.trim()" class="dream-submit-btn">
                  <LoadingSpinner v-if="isSubmittingDream" size="xs" variant="white" class="mr-2" />
                  {{ isSubmittingDream ? 'Анализируем...' : 'Анализировать сон' }}
                </button>
                <div v-if="errorDream" class="error-message">{{ errorDream }}</div>
                
                <!-- Прогресс анализа -->
                <div v-if="isSubmittingDream" class="mt-4">
                  <ProgressBar 
                    :progress="dreamAnalysisProgress" 
                    label="Анализ сна"
                    :steps="dreamAnalysisSteps"
                    :currentStep="currentAnalysisStep"
                    showPercentage
                    animated
                  />
                </div>
            </section>

            <!-- Блок 2: История анализов -->
            <section class="history card">
                <h2>История анализов</h2>
                <div v-if="isLoadingHistory" class="loading-section">
                    <LoadingSpinner size="sm" label="Загрузка истории..." />
                    <SkeletonLoader type="dream-history" :count="3" class="mt-4" />
                </div>
                <div v-else-if="errorHistory" class="error-section">
                    <div class="error-message">
                        Ошибка загрузки истории: {{ errorHistory }}
                    </div>
                    <button 
                      @click="retryFetchHistory" 
                      :disabled="isRetryingHistory"
                      class="retry-button"
                    >
                      <LoadingSpinner v-if="isRetryingHistory" size="xs" variant="white" class="mr-2" />
                      {{ isRetryingHistory ? 'Повторная попытка...' : 'Попробовать снова' }}
                    </button>
                </div>
                <div v-else-if="history && history.length > 0">
                    <ul>
                        <li v-for="item in history" :key="item.id" class="history-item">
                            <div class="dream-toggle-header" @click="toggleDream(item.id)">
                                <span><strong>Дата:</strong> {{ formatDate(item.created_at) }}</span>
                                <span style="float:right;cursor:pointer;">{{ expandedDreams.includes(item.id) ? '▲' : '▼' }}</span>
                            </div>
                            <div v-if="expandedDreams.includes(item.id)" class="dream-details">
                                <p><strong>Запрос:</strong> {{ item.dream_text }}</p>
                                <p><strong>Анализ:</strong> {{ item.analysis }}</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div v-else>
                    <p>У вас пока нет сохраненных анализов.</p>
                </div>
            </section>

        </div>
      </template>
      <template v-else>
          <!-- User is not authenticated, show login form -->
          <Login @login-success="handleLoginSuccess" />
      </template>
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { defineAsyncComponent } from 'vue'
import ErrorBoundary from './components/ErrorBoundary.vue'

// Lazy-loaded компоненты для оптимизации bundle
const Login = defineAsyncComponent({
  loader: () => import('./components/Login.vue'),
  delay: 200
})
const LoadingSpinner = defineAsyncComponent(() => import('./components/LoadingSpinner.vue'))
const SkeletonLoader = defineAsyncComponent(() => import('./components/SkeletonLoader.vue'))
const ProgressBar = defineAsyncComponent(() => import('./components/ProgressBar.vue'))
const DebugInfo = defineAsyncComponent(() => import('./components/DebugInfo.vue'))
import apiService from './utils/api.js';
import { errorService } from './services/errorService.js';
import { useOfflineDetection } from './composables/useOfflineDetection.js';
import { getAuthToken, getUserData, clearAllAuthCookies } from './utils/cookies.js';

// Initialize offline detection
const {
  isOnline,
  pendingOperations,
  executeOnlineOperation,
  addPendingOperation
} = useOfflineDetection();

const profile = ref({ tokens: null, subscription_type: 'free', subscription_end: null });
const history = ref([]);
const isLoadingProfile = ref(false);
const isLoadingHistory = ref(false);
const errorProfile = ref(null);
const errorHistory = ref(null);
const isAuthenticated = ref(false); // Reactive state for authentication status
const expandedDreams = ref([]);

// Retry states
const isRetryingProfile = ref(false);
const isRetryingHistory = ref(false);
const retryCountProfile = ref(0);
const retryCountHistory = ref(0);

// Dream input feature
const newDream = ref("");
const isSubmittingDream = ref(false);
const errorDream = ref(null);

// Progress tracking for dream analysis
const dreamAnalysisProgress = ref(0);
const currentAnalysisStep = ref(0);
const dreamAnalysisSteps = ref([
  { title: 'Подготовка запроса', description: 'Обработка текста сна', duration: '2-3 сек' },
  { title: 'Анализ содержания', description: 'Интерпретация символов и образов', duration: '5-8 сек' },
  { title: 'Генерация результата', description: 'Создание персонального анализа', duration: '3-5 сек' },
  { title: 'Сохранение', description: 'Добавление в историю', duration: '1-2 сек' }
]);

const checkAuthentication = async () => {
    try {
        // Check with backend to see if we have valid httpOnly cookies
        const isAuth = await apiService.checkAuth();
        isAuthenticated.value = isAuth;
        
        console.log('[checkAuthentication] Backend auth result:', isAuth);
    } catch (error) {
        console.error('Auth check failed:', error);
        isAuthenticated.value = false;
        
        // Clear any stale local auth data on error (for cleanup)
        clearAllAuthCookies();
    }
};

const fetchProfile = async () => {
  if (!isAuthenticated.value) {
      console.warn('fetchProfile called without authentication.');
      return;
  }

  isLoadingProfile.value = true;
  errorProfile.value = null;
  
  try {
    const response = await executeOnlineOperation(
      () => apiService.post('/user-profile', {}),
      'Загрузка профиля'
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile.');
    }

    const data = await response.json();
    profile.value = data;
    
    // Reset retry count on success
    retryCountProfile.value = 0;

  } catch (err) {
    console.error('Error fetching profile:', err);
    
    // Use error service for better error handling
    const errorInfo = errorService.handleError(err, { action: 'fetchProfile' });
    errorProfile.value = errorInfo.userMessage;
    
    // If authentication error, force logout
    if (errorInfo.category === 'auth') {
        handleLogout();
    }
  } finally {
    isLoadingProfile.value = false;
  }
};

const retryFetchProfile = async () => {
  if (retryCountProfile.value >= 3) {
    errorService.handleError(new Error('Maximum retry attempts reached'), { action: 'retryFetchProfile' });
    return;
  }
  
  isRetryingProfile.value = true;
  retryCountProfile.value++;
  
  try {
    await fetchProfile();
    if (!errorProfile.value) {
      // Success notification handled by errorService
      console.log('Profile fetch retry successful');
    }
  } catch (error) {
    console.error('Retry fetchProfile failed:', error);
  } finally {
    isRetryingProfile.value = false;
  }
};

const fetchHistory = async () => {
  if (!isAuthenticated.value) {
      console.warn('fetchHistory called without authentication.');
      return;
  }

  isLoadingHistory.value = true;
  errorHistory.value = null;
  
  try {
    const response = await executeOnlineOperation(
      () => apiService.get('/analyses-history'),
      'Загрузка истории'
    );

    if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch history.');
    }

    const data = await response.json();
    history.value = data;
    
    // Reset retry count on success
    retryCountHistory.value = 0;

  } catch (err) {
    console.error('Error fetching history:', err);
    
    // Use error service for better error handling
    const errorInfo = errorService.handleError(err, { action: 'fetchHistory' });
    errorHistory.value = errorInfo.userMessage;
    
    // If authentication error, force logout
    if (errorInfo.category === 'auth') {
        handleLogout();
    }
  } finally {
    isLoadingHistory.value = false;
  }
};

const retryFetchHistory = async () => {
  if (retryCountHistory.value >= 3) {
    errorService.handleError(new Error('Maximum retry attempts reached'), { action: 'retryFetchHistory' });
    return;
  }
  
  isRetryingHistory.value = true;
  retryCountHistory.value++;
  
  try {
    await fetchHistory();
    if (!errorHistory.value) {
      console.log('History fetch retry successful');
    }
  } catch (error) {
    console.error('Retry fetchHistory failed:', error);
  } finally {
    isRetryingHistory.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

const handleLoginSuccess = async () => {
    console.log('Login success event received.');
    await checkAuthentication(); // Check if user is now authenticated
};

const handleLogout = async () => {
    console.log('Logging out.');
    try {
        await apiService.logout();
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clear all authentication data from cookies
    clearAllAuthCookies();
    
    // Update authentication status and clear displayed data
    isAuthenticated.value = false;
    profile.value = { tokens: null, subscription_type: 'free', subscription_end: null };
    history.value = [];
};

const toggleDream = (id) => {
    if (expandedDreams.value.includes(id)) {
        expandedDreams.value = expandedDreams.value.filter(d => d !== id);
    } else {
        expandedDreams.value.push(id);
    }
};

// Progress update helper
const updateProgress = (step, progress) => {
  currentAnalysisStep.value = step;
  dreamAnalysisProgress.value = progress;
  
  // Обновляем статус шагов
  dreamAnalysisSteps.value.forEach((s, index) => {
    if (index < step) {
      s.status = 'completed';
    } else if (index === step) {
      s.status = 'loading';
    } else {
      s.status = 'pending';
    }
  });
};

// Dream submission logic
const submitDream = async () => {
    errorDream.value = null;
    if (!newDream.value.trim()) {
        errorDream.value = 'Введите текст сна для анализа.';
        return;
    }
    
    isSubmittingDream.value = true;
    dreamAnalysisProgress.value = 0;
    currentAnalysisStep.value = 0;
    
    try {
        // Симуляция прогресса для улучшения UX
        updateProgress(0, 10);
        
        const progressTimer1 = setTimeout(() => updateProgress(1, 35), 1000);
        const progressTimer2 = setTimeout(() => updateProgress(2, 70), 3000);
        const progressTimer3 = setTimeout(() => updateProgress(3, 90), 6000);
        
        const response = await apiService.post('/analyze-dream', { 
            dream_text: newDream.value.trim() 
        });
        
        // Очищаем таймеры если запрос завершился быстрее
        clearTimeout(progressTimer1);
        clearTimeout(progressTimer2);
        clearTimeout(progressTimer3);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка анализа сна.');
        }
        
        // Завершаем прогресс
        updateProgress(4, 100);
        
        // On success, clear input and reload history
        newDream.value = '';
        await fetchHistory();
    } catch (err) {
        errorDream.value = err.message;
        
        // Отмечаем текущий шаг как ошибочный
        if (dreamAnalysisSteps.value[currentAnalysisStep.value]) {
            dreamAnalysisSteps.value[currentAnalysisStep.value].status = 'error';
        }
        
        // If authentication error, force logout
        if (err.message.includes('Authentication failed')) {
            handleLogout();
        }
    } finally {
        isSubmittingDream.value = false;
        
        // Сброс прогресса через небольшую задержку
        setTimeout(() => {
            dreamAnalysisProgress.value = 0;
            currentAnalysisStep.value = 0;
            dreamAnalysisSteps.value.forEach(s => s.status = 'pending');
        }, 2000);
    }
};

// Watch for changes in isAuthenticated state to trigger data fetching
watch(isAuthenticated, (newVal) => {
    if (newVal) {
        console.log('isAuthenticated changed to true, fetching data...');
        fetchProfile();
        fetchHistory();
    } else {
        console.log('isAuthenticated changed to false.');
    }
});

// Global error handlers for ErrorBoundary
const handleGlobalError = (errorEvent) => {
  console.error('Global error caught by ErrorBoundary:', errorEvent);
  errorService.handleError(errorEvent.error, { 
    component: 'App',
    context: 'global_error_boundary'
  });
};

const handleGlobalRetry = async () => {
  console.log('Global retry triggered');
  
  // Retry all failed operations
  if (errorProfile.value && !isLoadingProfile.value) {
    await retryFetchProfile();
  }
  
  if (errorHistory.value && !isLoadingHistory.value) {
    await retryFetchHistory();
  }
  
  // Re-check authentication if needed
  if (!isAuthenticated.value) {
    await checkAuthentication();
  }
};

onMounted(async () => {
  console.log('App mounted, checking authentication...');
  await checkAuthentication();
});
</script>

<style scoped>
/* Add or adapt styles from tma/src/views/PersonalAccount.vue and web/src/style.css */
.web-app-container {
    padding: 15px;
    color: #333;
    background-color: #f4f4f4;
    min-height: 100vh;
}

.personal-account {
    max-width: 800px;
    margin: 20px auto;
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card {
  background-color: #fff; /* Card background is white within the grey container */
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

h1, h2 {
 color: #0056b3;
  margin-top: 0;
  margin-bottom: 10px;
}

.logout-button {
    background-color: #dc3545;
    color: white;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    float: right; /* Position to the right */
    margin-top: -40px; /* Adjust position */
}

.logout-button:hover {
    background-color: #c82333;
}

.error-message {
  color: #d9534f;
  font-weight: bold;
}

.history-item {
    border-bottom: 1px solid #eee;
    margin-bottom: 15px;
    padding-bottom: 15px;
}

.history-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.history-item p {
    margin-bottom: 5px;
}

.history-item strong {
    margin-right: 5px;
}

.dream-toggle-header {
    cursor: pointer;
    background: #f5f5f5;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    user-select: none;
}

.dream-details {
    padding: 8px 12px;
    background: #fafafa;
    border-left: 2px solid #b3b3b3;
    margin-bottom: 8px;
    border-radius: 4px;
}

/* Loading styles */
.loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
}

.dream-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.dream-submit-btn:hover:not(:disabled) {
    background-color: #0056b3;
}

.dream-submit-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
}

.mr-2 {
    margin-right: 0.5rem;
}

.mt-4 {
    margin-top: 1rem;
}

.dream-input textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 1em;
  resize: vertical;
}
.dream-input button {
  width: 100%;
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}
.dream-input button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Offline banner styles */
.offline-banner {
  background-color: #fbbf24;
  color: #92400e;
  padding: 0.75rem 1rem;
  text-align: center;
  font-weight: 500;
  border-bottom: 1px solid #f59e0b;
}

.pending-count {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Error section styles */
.error-section {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.error-section .error-message {
  margin-bottom: 0.75rem;
}

/* Retry button styles */
.retry-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.875rem;
}

.retry-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.retry-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

/* Add more styles as needed */
</style>
