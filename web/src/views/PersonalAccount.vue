<template>
  <div class="personal-account">
    <!-- Показываем или основной ЛК, или страницу получения награды -->
    <template v-if="!showRewardClaimView">
      
     <FactsCarousel />
      <!-- Блок 1: Информация о пользователе -->
      <section class="user-info card">
        <h2>Ваш профиль</h2>
        
        <!-- User identity display section -->
        <div class="user-identity">
          <div class="user-avatar" v-if="userStore.webUser?.photo_url">
            <img :src="userStore.webUser.photo_url" alt="User avatar" />
          </div>
          <div class="user-identity-text">
            <p class="user-name">
              {{ userStore.webUser?.first_name || 'Unknown' }} 
              {{ userStore.webUser?.last_name || '' }}
              <span v-if="userStore.webUser?.username">(@{{ userStore.webUser.username }})</span>
            </p>
            <p class="user-id">ID: {{ userStore.webUser?.id || 'Not available' }}</p>
            <p class="auth-method">Auth Method: {{ getAuthMethod() }}</p>
            <button @click="toggleDebugInfo" class="debug-toggle">{{ showDebugInfo ? 'Hide' : 'Show' }} Debug Info</button>
          </div>
        </div>
        
        <div v-if="userStore.isLoadingProfile">Загрузка профиля...</div>
        <div v-else-if="userStore.errorProfile" class="error-message">
          Ошибка загрузки профиля: {{ userStore.errorProfile }}
        </div>
        <div v-else>
          <p>Остаток токенов: <strong>{{ userStore.profile.tokens }}</strong></p>
          <p>
            Текущий тариф: <strong class="capitalize">{{ userStore.profile.subscription_type }}</strong>
            <span v-if="userStore.profile.subscription_end">
              (до {{ formatDate(userStore.profile.subscription_end) }})
            </span>
          </p>
          <button
              v-if="userStore.profile.subscription_type !== 'free' || userStore.profile.channel_reward_claimed"
              @click="userStore.openSubscriptionModal"
              class="change-plan-button">
            Сменить тариф <!-- Ваш текст -->
          </button>
           <button
                v-else-if="userStore.profile.subscription_type === 'free' && !userStore.profile.channel_reward_claimed"
                @click="showRewardClaimView = true"
                class="subscribe-button-main">
                🎁 Получить бесплатный токен за подписку
           </button>
        </div>
         <div v-if="!userStore.isLoadingProfile && userStore.profile?.channel_reward_claimed" class="reward-claimed-info">
             <p>✅ Награда за подписку на канал получена!</p>
         </div>
         
        <!-- Always show logout buttons outside of any v-if conditions -->
        <div class="logout-buttons always-visible">
          <button @click="handleLogout" class="logout-button">
            Выйти из аккаунта
          </button>
          <button @click="handleEmergencyLogout" class="logout-button emergency">
            Экстренный выход
          </button>
        </div>
        
        <!-- Debugging info section - only visible in development -->
        <div class="debug-info">
          <h3>Debug Information</h3>
          <button @click="toggleDebugInfo" class="toggle-debug">{{ showDebugInfo ? 'Hide' : 'Show' }} Debug Info</button>
          <div v-if="showDebugInfo">
            <p><strong>Telegram WebApp Available:</strong> {{ isTelegramAvailable }}</p>
            <p><strong>Telegram InitData Available:</strong> {{ !!getTelegramInitData }}</p>
            <p><strong>API Base URL:</strong> {{ getApiBaseUrl }}</p>
            <p><strong>Auth Method:</strong> {{ getAuthMethod() }}</p>
            <p><strong>User ID from Auth:</strong> {{ userStore.webUser?.id || 'Not available' }}</p>
            
            <div class="manual-auth">
              <p><strong>Manual Auth Testing:</strong></p>
              <div class="manual-auth-form">
                <input 
                  type="text" 
                  v-model="manualUserId" 
                  placeholder="Enter Telegram User ID" 
                  class="debug-input"
                />
                <button @click="testManualAuth" class="debug-button">Test Auth with ID</button>
              </div>
            </div>
            
            <hr>
            <p><strong>Local Storage Telegram User:</strong></p>
            <pre>{{ getLocalStorageUserString }}</pre>
            
            <div>
              <p><strong>Debug Actions:</strong></p>
              <button @click="reloadUserData" class="debug-button">Reload User Data</button>
              <button @click="clearAndReload" class="debug-button danger">Clear Data & Reload</button>
              <button @click="checkCORS" class="debug-button">Test CORS</button>
              <button @click="forceTelegramAuth" class="debug-button">Force Telegram Auth</button>
            </div>
            
            <div v-if="debugResponse" class="debug-response">
              <p><strong>Debug Response:</strong></p>
              <pre>{{ debugResponse }}</pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Блок 2: История анализов -->
      <section class="history card">
        <h2>История анализов</h2>
        <div v-if="userStore.isLoadingHistory">Загрузка истории...</div>
        <div v-else-if="userStore.errorHistory" class="error-message">
          Ошибка загрузки истории: {{ userStore.errorHistory }}
        </div>
        <!-- Отображаем список ТОЛЬКО если история НЕ пуста -->
        <div v-else-if="userStore.history && userStore.history.length > 0">
          <AnalysisHistoryList :history="userStore.history" />
        </div>
        <div v-else>
          <p>У вас пока нет сохраненных анализов.</p>
        </div>
      </section>

      <!-- Блок глубокого анализа -->
      <section class="deep-analysis card">
          <h2>Глубокий анализ</h2>
          <p>Получите комплексный анализ ваших последних {{ REQUIRED_DREAMS }} снов. Стоимость: 1 ⭐️ (Telegram Star).</p>

          <button
              @click="userStore.initiateDeepAnalysisPayment"
              :disabled="!userStore.canAttemptDeepAnalysis || userStore.isInitiatingDeepPayment || userStore.isDoingDeepAnalysis"
              class="deep-analysis-button"
          >
              <span v-if="userStore.isInitiatingDeepPayment">Создаем счет... <span class="spinner white"></span></span>
              <span v-else-if="userStore.isDoingDeepAnalysis">Анализируем... <span class="spinner white"></span></span>
              <span v-else>Провести глубокий анализ (1 ⭐️)</span>
          </button>

          <p v-if="!userStore.canAttemptDeepAnalysis && !userStore.isInitiatingDeepPayment && !userStore.isDoingDeepAnalysis" class="info-message hint">
              <span v-if="userStore.isLoadingProfile || userStore.isLoadingHistory">Дождитесь загрузки данных...</span>
              <span v-else-if="(userStore.history?.length ?? 0) < REQUIRED_DREAMS">Нужно еще {{ REQUIRED_DREAMS - (userStore.history?.length ?? 0) }} сна/снов для анализа.</span>
          </p>

          <div v-if="userStore.deepAnalysisResult" class="analysis-result card">
              <h3>Результат глубокого анализа:</h3>
              <pre>{{ userStore.deepAnalysisResult }}</pre>
          </div>
          <div v-if="userStore.deepAnalysisError || userStore.deepPaymentError" class="error-message">
              ⚠️ {{ userStore.deepAnalysisError || userStore.deepPaymentError }}
          </div>
      </section>

      <!-- Модальное окно смены тарифа -->
      <SubscriptionModal
        v-if="userStore.showSubscriptionModal"
        @close="userStore.closeSubscriptionModal"
      />
    </template>

    <!-- "Отдельная страница" для получения награды -->
    <template v-else>
       <div class="reward-claim-view card">
           <h1>🎁 Бесплатный токен за подписку</h1>
           <p>Чтобы получить 1 токен для анализа вашего первого сна, пожалуйста, выполните два простых шага:</p>
            <ol class="steps">
                <li><span>1. Подпишитесь на наш канал в Telegram:</span><a href="https://t.me/TheDreamsHub" target="_blank" rel="noopener noreferrer" class="subscribe-button">Перейти и подписаться на @TheDreamsHub</a><span class="hint">(Откроется в Telegram, затем вернитесь сюда)</span></li>
                <li><span>2. Нажмите кнопку ниже, чтобы мы проверили подписку:</span><button @click="handleClaimRewardClick" :disabled="userStore.isClaimingReward" class="claim-button"><span v-if="userStore.isClaimingReward">Проверяем подписку... <span class="spinner"></span></span><span v-else>Я подписался, проверить и получить токен</span></button></li>
            </ol>
            <p v-if="userStore.claimRewardSuccessMessage" class="success-message">✅ {{ userStore.claimRewardSuccessMessage }} Токен добавлен к вашему балансу.<button @click="goBackToAccount" class="back-button">Вернуться в ЛК</button></p>
            <p v-if="userStore.claimRewardError && !userStore.claimRewardSuccessMessage" class="error-message">⚠️ {{ userStore.claimRewardError }}</p>
            <p v-if="userStore.userCheckedSubscription && userStore.claimRewardError?.includes('Подписка на канал не найдена')" class="info-message">Пожалуйста, убедитесь, что вы подписаны на канал <a href="https://t.me/TheDreamsHub" target="_blank">@TheDreamsHub</a>, и попробуйте проверить снова.</p>
            <button v-if="!userStore.claimRewardSuccessMessage && !userStore.claimRewardError" @click="goBackToAccount" class="back-button secondary">Назад в Личный кабинет</button>
       </div>
    </template>

  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter, useRoute } from 'vue-router';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';
import SubscriptionModal from '@/components/SubscriptionModal.vue';
import FactsCarousel from '@/components/FactsCarousel.vue';
import { safeCheckTelegram, safeGetTelegramInitData } from '@/services/api';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();
const tg = typeof window !== 'undefined' && safeCheckTelegram() ? window.Telegram?.WebApp : null;
const showRewardClaimView = ref(false);
const REQUIRED_DREAMS = 5;

// Debug features
const showDebugInfo = ref(true);
const debugResponse = ref(null);
const manualUserId = ref('');

// Safe computed properties
const isTelegramAvailable = computed(() => safeCheckTelegram());
const getTelegramInitData = computed(() => safeGetTelegramInitData());

const getLocalStorageUserString = computed(() => {
  try {
    const userData = localStorage.getItem('telegram_user');
    if (userData) {
      const parsed = JSON.parse(userData);
      return JSON.stringify(parsed, null, 2);
    }
    return 'No user data in localStorage';
  } catch (e) {
    return `Error parsing: ${e.message}`;
  }
});

const getApiBaseUrl = computed(() => {
  return import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/.netlify/functions`;
});

// Debug functions
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};

const reloadUserData = async () => {
  debugResponse.value = "Reloading user data...";
  try {
    await userStore.fetchProfile();
    await userStore.fetchHistory();
    debugResponse.value = {
      success: true,
      profile: userStore.profile,
      historyCount: userStore.history.length
    };
  } catch (e) {
    debugResponse.value = {
      success: false,
      error: e.message
    };
  }
};

const clearAndReload = () => {
  if (confirm('This will clear all auth data and reload the page. Continue?')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
};

const checkCORS = async () => {
  debugResponse.value = "Testing CORS...";
  try {
    // First test: OPTIONS preflight request
    const preflightResponse = await fetch(`${getApiBaseUrl.value}/user-profile`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, X-Web-Auth-User'
      }
    });
    
    const preflightHeaders = {};
    for (const [key, value] of preflightResponse.headers.entries()) {
      preflightHeaders[key] = value;
    }
    
    // Second test: Regular GET request without auth headers
    const simpleResponse = await fetch(`${getApiBaseUrl.value}/user-profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const simpleHeaders = {};
    for (const [key, value] of simpleResponse.headers.entries()) {
      simpleHeaders[key] = value;
    }
    
    // Third test: GET request with auth headers
    const userId = userStore.webUser?.id || localStorage.getItem('last_auth_user_id') || 'test';
    
    const authRequest = await fetch(`${getApiBaseUrl.value}/user-profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Web-Auth-User': JSON.stringify({
          id: String(userId),
          username: userStore.webUser?.username || "test",
          first_name: userStore.webUser?.first_name || "Test",
          last_name: userStore.webUser?.last_name || "User"
        })
      }
    });
    
    const authHeaders = {};
    for (const [key, value] of authRequest.headers.entries()) {
      authHeaders[key] = value;
    }
    
    // Compile all test results
    debugResponse.value = {
      success: true,
      originUrl: window.location.origin,
      apiBaseUrl: getApiBaseUrl.value,
      
      preflight: {
        status: preflightResponse.status,
        statusText: preflightResponse.statusText,
        headers: preflightHeaders,
        corsHeaders: {
          'access-control-allow-origin': preflightHeaders['access-control-allow-origin'] || 'Not found',
          'access-control-allow-methods': preflightHeaders['access-control-allow-methods'] || 'Not found',
          'access-control-allow-headers': preflightHeaders['access-control-allow-headers'] || 'Not found'
        }
      },
      
      simpleRequest: {
        status: simpleResponse.status,
        statusText: simpleResponse.statusText,
        headers: simpleHeaders,
        corsHeaders: {
          'access-control-allow-origin': simpleHeaders['access-control-allow-origin'] || 'Not found'
        }
      },
      
      authRequest: {
        status: authRequest.status,
        statusText: authRequest.statusText,
        userId: userId,
        headers: authHeaders,
        corsHeaders: {
          'access-control-allow-origin': authHeaders['access-control-allow-origin'] || 'Not found'
        }
      }
    };
    
    // Try to parse the auth response body
    try {
      const authResponseBody = await authRequest.text();
      try {
        debugResponse.value.authRequest.body = JSON.parse(authResponseBody);
      } catch {
        debugResponse.value.authRequest.rawBody = authResponseBody;
      }
    } catch (bodyError) {
      debugResponse.value.authRequest.bodyError = bodyError.message;
    }
    
    // Check for common CORS issues
    let corsIssues = [];
    
    if (!preflightHeaders['access-control-allow-origin']) {
      corsIssues.push('Missing Access-Control-Allow-Origin in preflight response');
    }
    
    if (preflightHeaders['access-control-allow-origin'] !== '*' && 
        preflightHeaders['access-control-allow-origin'] !== window.location.origin) {
      corsIssues.push(`Preflight Access-Control-Allow-Origin (${preflightHeaders['access-control-allow-origin']}) doesn't match origin (${window.location.origin})`);
    }
    
    if (!preflightHeaders['access-control-allow-headers'] || 
        !preflightHeaders['access-control-allow-headers'].toLowerCase().includes('x-web-auth-user')) {
      corsIssues.push('X-Web-Auth-User not included in Access-Control-Allow-Headers');
    }
    
    debugResponse.value.corsIssues = corsIssues;
    debugResponse.value.hasCorsIssues = corsIssues.length > 0;
    
  } catch (e) {
    debugResponse.value = {
      success: false,
      error: e.message,
      stack: e.stack
    };
  }
};

const forceTelegramAuth = () => {
  if (confirm('This will redirect you to login with Telegram. Continue?')) {
    window.location.href = '/emergency.html';
  }
};

// Function to determine the current authentication method
const getAuthMethod = () => {
  if (safeGetTelegramInitData()) {
    return 'Telegram WebApp';
  } else if (userStore.webUser) {
    return 'Web Login';
  } else {
    return 'None';
  }
};

// Функция форматирования даты/времени
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    // Показываем дату в формате ДД.ММ.ГГГГ
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

const goBackToAccount = () => {
    showRewardClaimView.value = false;
    userStore.claimRewardError = null;
    userStore.claimRewardSuccessMessage = null;
    userStore.userCheckedSubscription = false;
    userStore.fetchProfile();
    userStore.fetchHistory();
};

const handleClaimRewardClick = async () => { await userStore.claimChannelReward(); };

// Logout function
// Import auth service
import { clearAllAuthData, emergencyRedirect } from '@/services/authService';

const handleLogout = async () => {
  console.log('Initiating standard logout process...');
  
  try {
    // First, call the store logout (now async)
    await userStore.logout();
    console.log('Logout successful');
  } catch (e) {
    console.error('Error during logout:', e);
  }
  
  // FORCE REDIRECT - multiple mechanisms to ensure it works
  console.log('Forcing hard redirect to login page...');
  
  // Direct window location change with special parameter
  window.location.href = '/?logout=true';
};

// Emergency logout bypasses the Vue router entirely
const handleEmergencyLogout = () => {
  console.log('Initiating EMERGENCY logout process...');
  if (confirm('Вы действительно хотите выполнить экстренный выход? Это очистит все данные приложения.')) {
    try {
      // Redirect directly to emergency page
      emergencyRedirect();
    } catch (e) {
      console.error('Error during emergency logout:', e);
      // Fallback if imported function fails
      clearAllAuthData();
      window.location.href = '/emergency.html';
    }
  }
};

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ОПРЕДЕЛЕНИЯ МОБИЛЬНОГО УСТРОЙСТВА ---
const isMobileDevice = () => {
  if (!navigator?.userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

// Handle direct authentication
onMounted(async () => {
  // Check for direct_auth parameter in the URL
  if (route.query.direct_auth) {
    console.log('[PersonalAccount] Found direct_auth parameter, processing authentication');
    
    try {
      // Store the token
      const token = route.query.direct_auth;
      localStorage.setItem('bot_auth_token', token);
      
      // Clean up URL - remove direct_auth parameter
      const url = new URL(window.location);
      url.searchParams.delete('direct_auth');
      window.history.replaceState({}, document.title, url.pathname);
      
      // Create a basic user object from the token payload
      try {
        const decoded = JSON.parse(atob(token.split('.')[0]));
        const userData = decoded.payload?.user_data || {};
        
        // Set user information in the store
        userStore.setWebUser({
          id: decoded.payload?.user_id,
          first_name: userData.first_name || 'User',
          last_name: userData.last_name || '',
          username: userData.username || '',
          photo_url: userData.photo_url || ''
        });
        
        // Fetch profile data
        await userStore.fetchProfile();
        await userStore.fetchHistory();
        
        console.log('[PersonalAccount] Direct authentication successful');
      } catch (decodeError) {
        console.error('[PersonalAccount] Error decoding token:', decodeError);
      }
    } catch (error) {
      console.error('[PersonalAccount] Error processing direct authentication:', error);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isClaimRewardAction = urlParams.get('action') === 'claim_reward';
  showRewardClaimView.value = isClaimRewardAction;

  console.log(`[PersonalAccount onMounted] Initial view: ${isClaimRewardAction ? 'Reward Claim' : 'Main Account'}`);

  if (tg) {
    tg.ready();
    console.log("[PersonalAccount] Telegram WebApp is ready.");

    // --- НАЧАЛО ИНТЕГРАЦИИ ЛОГИКИ РАЗМЕРА И ПОВЕДЕНИЯ ---
    const isMobile = isMobileDevice(); // Определяем тип устройства

    // 1. Управление размером окна
    if (isMobile) {
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
        console.log("[PersonalAccount] tg.requestFullscreen() called for mobile.");
      } else {
        console.warn("[PersonalAccount] tg.requestFullscreen is not a function for mobile.");
      }
    } else {
      // На десктопе НЕ вызываем requestFullscreen, чтобы остался компактный вид
      console.log("[PersonalAccount] Desktop device detected, not calling requestFullscreen.");
    }

    // Всегда расширяем приложение до максимальной высоты после готовности
    // Это повлияет на высоту и на десктопе (в рамках его панели), и на мобильном.
    if (typeof tg.expand === 'function') {
      tg.expand();
      console.log("[PersonalAccount] tg.expand() called.");
    } else {
      console.warn("[PersonalAccount] tg.expand is not a function.");
    }

    // 2. Отключаем вертикальный свайп для закрытия
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
      console.log("[PersonalAccount] Vertical swipes disabled.");
    } else {
      console.warn("[PersonalAccount] tg.disableVerticalSwipes is not a function.");
    }

    // 3. Включаем подтверждение закрытия
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
      console.log("[PersonalAccount] Closing confirmation enabled.");
    } else {
      console.warn("[PersonalAccount] tg.enableClosingConfirmation is not a function.");
    }
    // --- КОНЕЦ ИНТЕГРАЦИИ ЛОГИКИ РАЗМЕРА И ПОВЕДЕНИЯ ---


    // Настройка кнопки "Назад"
    if (typeof tg.BackButton?.show === 'function' && typeof tg.BackButton?.onClick === 'function') {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        console.log(`[PersonalAccount BackButton] Clicked. Modal: ${userStore.showSubscriptionModal}, Reward View: ${showRewardClaimView.value}, Closing Conf Enabled: ${tg.isClosingConfirmationEnabled}`);
        if (userStore.showSubscriptionModal) {
          userStore.closeSubscriptionModal();
        } else if (showRewardClaimView.value === true) {
          goBackToAccount();
        } else {
          console.log("[PersonalAccount BackButton] Attempting to close TMA.");
          if (typeof tg.close === 'function') {
            tg.close(); // Telegram должен показать подтверждение, если оно включено
          } else {
            console.warn("[PersonalAccount] tg.close is not a function.");
          }
        }
      });
    } else {
      console.warn("[PersonalAccount] tg.BackButton.show or onClick is not available.");
    }

    if (typeof tg.MainButton?.hide === 'function' && tg.MainButton.isVisible) {
      tg.MainButton.hide();
    }
  } else {
    console.warn("[PersonalAccount] Telegram WebApp API not available.");
  }

  console.log("[PersonalAccount onMounted] Fetching profile...");
  await userStore.fetchProfile();
  console.log("[PersonalAccount onMounted] Profile fetched.");
  if (!showRewardClaimView.value) {
    console.log("[PersonalAccount onMounted] Fetching history...");
    await userStore.fetchHistory();
    console.log("[PersonalAccount onMounted] History fetched.");
  }
});

watch(() => userStore.profile.channel_reward_claimed, (newValue, oldValue) => {
  if (newValue === true && oldValue === false && showRewardClaimView.value) {
    console.log("[PersonalAccount] Reward claimed successfully, auto-returning to account view soon.");
    setTimeout(() => { if (showRewardClaimView.value) { goBackToAccount(); } }, 3500);
  }
});

// Manual auth testing
const testManualAuth = async () => {
  const userId = manualUserId.value.trim();
  if (!userId) {
    debugResponse.value = { error: "Please enter a user ID" };
    return;
  }
  
  debugResponse.value = { message: `Testing authentication with ID: ${userId}` };
  
  try {
    // Create a basic user object
    const testUser = {
      id: userId,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      auth_date: Math.floor(Date.now() / 1000).toString()
    };
    
    // Store in localStorage
    localStorage.setItem('telegram_user', JSON.stringify(testUser));
    localStorage.setItem('last_auth_user_id', userId);
    
    // Update the store
    userStore.setWebUser(testUser);
    
    // Prepare for detailed request testing
    debugResponse.value = { message: `Authenticated with ID: ${userId}, testing API requests...` };
    
    // Test 1: Direct fetch to API without libraries to test raw request
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Web-Auth-User': JSON.stringify({
          id: String(userId),
          username: "testuser",
          first_name: "Test",
          last_name: "User"
        })
      };
      
      // Log the exact headers we're sending
      console.log(`[Manual Auth Test] Headers being sent:`, headers);
      
      const response = await fetch(`${getApiBaseUrl.value}/user-profile`, {
        method: 'GET',
        headers: headers
      });
      
      const responseData = await response.json();
      
      // Update debug response with information about the direct fetch
      debugResponse.value = {
        ...debugResponse.value,
        directFetch: {
          status: response.status,
          headers: Object.fromEntries([...response.headers.entries()]),
          data: responseData
        }
      };
    } catch (directError) {
      debugResponse.value = {
        ...debugResponse.value,
        directFetch: {
          error: directError.message
        }
      };
    }
    
    // Test 2: Now use the store methods which use the API service
    try {
      await userStore.fetchProfile();
      
      // Update debug response with information from the store fetch
      debugResponse.value = {
        ...debugResponse.value,
        storeFetch: {
          success: !userStore.errorProfile,
          profile: userStore.profile,
          error: userStore.errorProfile
        }
      };
      
      // Also fetch history
      await userStore.fetchHistory();
      debugResponse.value = {
        ...debugResponse.value,
        historyFetch: {
          success: !userStore.errorHistory,
          count: userStore.history.length,
          error: userStore.errorHistory
        }
      };
    } catch (storeError) {
      debugResponse.value = {
        ...debugResponse.value,
        storeFetch: {
          error: storeError.message
        }
      };
    }
    
    // Final summary
    debugResponse.value = {
      ...debugResponse.value,
      summary: {
        userId: userId,
        success: !userStore.errorProfile && !userStore.errorHistory,
        profile: userStore.profile,
        historyCount: userStore.history.length
      }
    };
  } catch (error) {
    debugResponse.value = {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
};
</script>

<style scoped>
/* Add styles for the logout button */
.logout-button {
  display: block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.logout-button:hover {
  background-color: #d32f2f;
}

/* Styles for logout buttons container */
.logout-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

/* Style for always visible logout section */
.logout-buttons.always-visible {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--tg-theme-hint-color, rgba(0,0,0,0.1));
}

/* Emergency logout button */
.logout-button.emergency {
  background-color: #dc3545;
  color: white;
}

.logout-button.emergency:hover {
  background-color: #bd2130;
}

/* --- Ваши стили без изменений --- */
/* ... (все ваши стили) ... */
.personal-account { 
  padding: 15px; 
  color: var(--tg-theme-text-color); 
  background-color: var(--tg-theme-bg-color); 
  min-height: 100vh; 
}
.card { 
  background-color: var(--tg-theme-secondary-bg-color); 
  border-radius: 8px; 
  padding: 15px; 
  margin-bottom: 15px; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
}
h1, h2 { 
  color: var(--tg-theme-text-color); 
  margin-top: 0; 
  margin-bottom: 10px; 
}
h1 { 
  font-size: 1.5em; 
}
h2 { 
  font-size: 1.2em; 
}
p { 
  margin-bottom: 10px; 
  line-height: 1.5; 
}
strong { 
  font-weight: 600; 
}
.capitalize { 
  text-transform: capitalize; 
}
button, a.subscribe-button { 
  display: inline-block; 
  padding: 10px 15px; 
  border-radius: 6px; 
  text-decoration: none; 
  font-weight: bold; 
  cursor: pointer; 
  border: none; 
  text-align: center; 
  margin-top: 5px; 
  width: auto; 
  transition: background-color 0.2s ease, opacity 0.2s ease; 
  font-size: 1em; 
}
button:disabled {
  background-color: #cccccc !important; 
  color: #666666 !important; 
  cursor: not-allowed; 
  opacity: 0.7; 
}
button:hover:not(:disabled), a.subscribe-button:hover { 
  opacity: 0.9; 
}
.error-message { color: var(--tg-theme-destructive-text-color); background-color: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.2); padding: 10px; border-radius: 4px; margin-top: 10px; }
.success-message { color: #28a745; font-weight: bold; margin-top: 15px; }
.info-message { color: var(--tg-theme-hint-color); font-size: 0.9em; margin-top: 10px; }
.hint { color: var(--tg-theme-hint-color); font-size: 0.85em; display: block; margin-top: 3px; }
.user-info { /* ... */ }
.change-plan-button { background-color: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); margin-top: 10px; }
.subscribe-button-main { background-color: var(--tg-theme-link-color); color: white; margin-top: 15px; display: block; width: 100%; }
.reward-claimed-info p { color: #198754; font-weight: 500; margin-top: 15px; padding: 8px; background-color: rgba(25, 135, 84, 0.1); border-radius: 4px; text-align: center; }
.history { /* ... */ }
.reward-claim-view { text-align: center; }
.reward-claim-view h1 { font-size: 1.4em; margin-bottom: 15px; }
.reward-claim-view p { text-align: left; margin-bottom: 20px; }
.steps { list-style: none; padding-left: 0; margin-top: 20px; text-align: left; }
.steps li { margin-bottom: 25px; }
.steps li span:first-child { display: block; margin-bottom: 8px; font-weight: 500; }
.subscribe-button { background-color: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); width: 100%; margin-bottom: 5px; }
.claim-button { background-color: #28a745; color: white; width: 100%; }
.back-button { margin-top: 20px; background-color: var(--tg-theme-secondary-bg-color); color: var(--tg-theme-link-color); border: 1px solid var(--tg-theme-hint-color); }
.back-button.secondary { background-color: transparent; }
.spinner { display: inline-block; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; width: 1em; height: 1em; animation: spin 1s ease-in-out infinite; margin-left: 8px; vertical-align: -0.15em; }
@keyframes spin { to { transform: rotate(360deg); } }
.deep-analysis { /* Стили для карточки глубокого анализа */ }
.deep-analysis-button {
    background-color: var(--tg-theme-link-color); /* Цвет ссылки для акцента */
    color: white; /* Или другой контрастный цвет */
    display: block;
    width: 100%;
    margin-top: 15px;
    margin-bottom: 10px;
}
.deep-analysis-button .spinner.white { border-top-color: white; }

.analysis-result {
    margin-top: 20px;
    background-color: var(--tg-theme-bg-color); /* Фон чуть темнее/светлее */
    border: 1px solid var(--tg-theme-hint-color);
    padding: 15px;
    text-align: left;
}
.analysis-result h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1em;
}
.analysis-result pre {
    white-space: pre-wrap; /* Перенос строк */
    word-wrap: break-word; /* Перенос слов */
    font-family: inherit; /* Наследуем шрифт */
    font-size: 0.95em;
    line-height: 1.6;
    color: var(--tg-theme-text-color);
}

/* Add styles for the user identity display */
.user-identity {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--tg-theme-hint-color, rgba(0,0,0,0.1));
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px;
  background-color: var(--tg-theme-button-color, #3a6eae);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-identity-text {
  flex: 1;
}

.user-name {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 1.1em;
}

.user-id, .auth-method {
  font-size: 0.85em;
  color: var(--tg-theme-hint-color, #666);
  margin: 2px 0;
}

/* Styles for the debug information section */
.debug-info {
  margin-top: 20px;
  padding: 15px;
  border: 1px dashed var(--tg-theme-hint-color, #666);
  border-radius: 4px;
  background-color: rgba(0,0,0,0.03);
  text-align: left;
}

.debug-info h3 {
  margin-top: 0;
  color: var(--tg-theme-hint-color, #666);
}

.debug-info pre {
  background-color: rgba(0,0,0,0.05);
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  font-size: 12px;
  margin: 10px 0;
}

.toggle-debug {
  background-color: var(--tg-theme-button-color, #3a6eae);
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-button {
  background-color: var(--tg-theme-button-color, #3a6eae);
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  margin-top: 10px;
  cursor: pointer;
  font-size: 12px;
}

.debug-button.danger {
  background-color: #dc3545;
}

.debug-toggle {
  background-color: transparent;
  color: var(--tg-theme-link-color, #3a6eae);
  padding: 2px 5px;
  border: 1px solid var(--tg-theme-link-color, #3a6eae);
  border-radius: 4px;
  font-size: 0.7em;
  cursor: pointer;
  margin-top: 5px;
}

/* Debug response display */
.debug-response {
  margin-top: 15px;
  border-top: 1px dashed var(--tg-theme-hint-color, #666);
  padding-top: 15px;
}

.debug-response pre {
  background-color: rgba(0,0,0,0.05);
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
  font-size: 12px;
  margin: 10px 0;
  white-space: pre-wrap;
}

/* Manual auth testing styles */
.manual-auth {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0,0,0,0.03);
  border-radius: 4px;
}

.manual-auth-form {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.debug-input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid var(--tg-theme-hint-color, #ccc);
  border-radius: 4px;
  font-size: 14px;
}
</style>
