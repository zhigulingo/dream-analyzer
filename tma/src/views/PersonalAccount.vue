<template>
  <div class="personal-account card">
    <div v-if="isLoading" class="loading-indicator">
      <p>Загрузка данных пользователя...</p>
      <!-- Можно добавить красивый спиннер -->
    </div>
    <div v-else-if="error" class="error-message">
      <p>Ошибка: {{ error }}</p>
      <button @click="fetchInitialData">Попробовать снова</button>
    </div>

    <!-- Основное содержимое -->
    <template v-else-if="user && user.id">
      <!-- Представление награды (если применимо) -->
      <div v-if="showRewardClaimView" class="reward-claim-view card">
        <h1>🎁 Бесплатный токен за подписку</h1>
        <p>Чтобы получить 1 токен для анализа вашего первого сна, пожалуйста, выполните два простых шага:</p>
        <ol class="steps">
            <li><span>1. Подпишитесь на наш канал в Telegram:</span><a href="https://t.me/TheDreamsHub" target="_blank" rel="noopener noreferrer" class="subscribe-button">Перейти и подписаться на @TheDreamsHub</a><span class="hint">(Откроется в Telegram, затем вернитесь сюда)</span></li>
            <li><span>2. Нажмите кнопку ниже, чтобы проверить подписку и получить токен:</span><button @click="claimChannelToken" :disabled="isClaiming" class="claim-button">{{ isClaiming ? 'Проверяем...' : 'Я подписался, выдать токен!' }}</button></li>
        </ol>
         <p v-if="claimError" class="error-message">{{ claimError }}</p>
         <p v-if="claimSuccess" class="success-message">Отлично! Токен добавлен на ваш счет.</p>
         <button @click="closeRewardViewAndRefresh" class="back-button">Вернуться в личный кабинет</button>
      </div>

      <!-- Обычное представление личного кабинета -->
      <template v-else>
        <div class="user-info">
          <h2>Личный кабинет</h2>
           <p>Привет, {{ user.first_name || 'Пользователь' }}! 👋</p>
           <p>Ваш ID: <code>{{ user.id }}</code></p>
           <p>Токены для анализа: <span class="token-count">{{ profile.tokens ?? 0 }}</span></p>
           <p>Подписка активна: {{ profile.has_active_subscription ? 'Да ✅' : 'Нет ❌' }}</p>
           <p v-if="profile.subscription_expires_at">Действует до: {{ formatDate(profile.subscription_expires_at) }}</p>
           <button @click="openSubscriptionModal" class="subscribe-button-main">
                {{ profile.has_active_subscription ? 'Продлить подписку' : 'Купить подписку' }}
           </button>
        </div>

        <div class="analysis-section">
          <h3>Анализ снов</h3>
          <textarea
            v-model="dreamInput"
            placeholder="Опишите свой сон здесь..."
            rows="4"
            :disabled="isAnalyzing || (!profile.has_active_subscription && profile.tokens <= 0)"
          ></textarea>
          <button
            @click="analyzeDream"
            :disabled="!dreamInput.trim() || isAnalyzing || (!profile.has_active_subscription && profile.tokens <= 0)"
            class="analyze-button"
          >
            <span v-if="isAnalyzing">Анализируем... 🧠</span>
            <span v-else>
              {{ profile.has_active_subscription || profile.tokens > 0 ? 'Анализировать сон' : 'Нужны токены или подписка' }}
              <span v-if="!profile.has_active_subscription && profile.tokens > 0"> (Осталось: {{ profile.tokens }})</span>
            </span>
          </button>
           <p v-if="analysisError" class="error-message">{{ analysisError }}</p>

           <!-- Кнопка Глубокого Анализа -->
           <div v-if="canRequestDeepAnalysis && !deepAnalysisResult && !deepAnalysisInProgress" class="deep-analysis-cta">
               <button @click="openDeepAnalysisModal" class="deep-analysis-button">
                   ✨ Заказать Глубокий анализ (5 снов) - 1 ⭐️
               </button>
           </div>
           <div v-if="deepAnalysisInProgress" class="deep-analysis-status in-progress">
               <p>🌀 Глубокий анализ в процессе...</p>
           </div>

           <!-- Аккордеон Глубокого Анализа -->
            <div v-if="deepAnalysisResult" class="deep-analysis-accordion analysis-item deep-analysis-item">
                 <details open>
                     <summary>
                         <strong>✨ Глубокий анализ ({{ formatDate(deepAnalysisResult.created_at) }})</strong>
                         <span class="analysis-status-chip deep-analysis-chip">Завершен</span>
                     </summary>
                     <div class="analysis-content">
                         <p><strong>Обнаруженные закономерности и символы в ваших последних 5 снах:</strong></p>
                         <p>{{ deepAnalysisResult.analysis_text }}</p>
                         <!-- Можно добавить ID исходных снов, если они сохраняются -->
                     </div>
                 </details>
            </div>


          <h3>История анализов</h3>
           <AnalysisHistoryList
              :analyses="regularAnalyses"
              :is-loading="isHistoryLoading"
              :error="historyError"
              @reload="fetchAnalysisHistory"
            />
        </div>
      </template>
    </template>

    <!-- Модальное окно подписки -->
    <SubscriptionModal
      :is-visible="isSubscriptionModalVisible"
      :is-deep-analysis-mode="isDeepAnalysisMode"
      :user-id="user ? user.id : null"
      @close="closeSubscriptionModal"
      @purchase-initiated="handlePurchaseInitiated"
      @purchase-completed="handlePurchaseCompleted"
      @purchase-error="handlePurchaseError"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUserStore } from '../stores/user'; // Путь к вашему Pinia store
import api from '../services/api'; // Путь к вашему API сервису
import AnalysisHistoryList from '../components/AnalysisHistoryList.vue';
import SubscriptionModal from '../components/SubscriptionModal.vue'; // Импорт модального окна

const userStore = useUserStore();
const user = computed(() => userStore.user);
const profile = computed(() => userStore.profile); // Доступ к профилю из стора
const isLoading = ref(true);
const error = ref(null);
const dreamInput = ref('');
const isAnalyzing = ref(false);
const analysisError = ref(null);
const analysisHistory = ref([]);
const isHistoryLoading = ref(false);
const historyError = ref(null);
const showRewardClaimView = ref(false); // Флаг для отображения страницы награды
const isClaiming = ref(false);
const claimError = ref(null);
const claimSuccess = ref(false);

const isSubscriptionModalVisible = ref(false);
const isDeepAnalysisMode = ref(false); // Флаг для режима модального окна
const deepAnalysisResult = ref(null); // Хранит результат глубокого анализа
const deepAnalysisInProgress = ref(false); // Флаг процесса глубокого анализа

// Вычисляемые свойства
const analysesCount = computed(() => analysisHistory.value.filter(a => !a.is_deep_analysis).length);
const canRequestDeepAnalysis = computed(() => analysesCount.value >= 5);

// Фильтруем историю, чтобы отделить обычные анализы от глубокого
const regularAnalyses = computed(() => analysisHistory.value.filter(a => !a.is_deep_analysis));

// Ищем результат глубокого анализа в истории
const findDeepAnalysis = () => {
  return analysisHistory.value.find(a => a.is_deep_analysis) || null;
};

// Отформатировать дату
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

// --- Методы ---

const fetchUserProfile = async () => {
  if (!user.value?.id) return;
  console.log('Fetching profile for user ID:', user.value.id);
  try {
    await userStore.fetchProfile(); // Используем action из store
     console.log('Profile fetched:', profile.value);
     // Проверяем, нужно ли показать окно награды
     if (profile.value && profile.value.tokens === 0 && !profile.value.has_claimed_channel_reward && !profile.value.has_active_subscription) {
        // Условие: нет токенов, награду не получал, подписки нет
        showRewardClaimView.value = true;
     } else {
        showRewardClaimView.value = false; // Скрыть, если условия не выполнены
     }
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    error.value = `Не удалось загрузить профиль: ${err.message || err}`;
  }
};

const fetchAnalysisHistory = async () => {
  if (!user.value?.id) return;
  isHistoryLoading.value = true;
  historyError.value = null;
  try {
    const response = await api.getAnalysesHistory(user.value.id);
    analysisHistory.value = response || []; // Убедимся, что это массив
    deepAnalysisResult.value = findDeepAnalysis(); // Ищем глубокий анализ после загрузки истории
    // Сбрасываем флаг "в процессе", если результат уже есть
    if (deepAnalysisResult.value) {
        deepAnalysisInProgress.value = false;
    }
     console.log('Analysis history fetched:', analysisHistory.value);
     console.log('Deep analysis result:', deepAnalysisResult.value);
  } catch (err) {
    console.error('Failed to fetch analysis history:', err);
    historyError.value = `Не удалось загрузить историю: ${err.message || err}`;
    analysisHistory.value = []; // Очищаем в случае ошибки
  } finally {
    isHistoryLoading.value = false;
  }
};

const fetchInitialData = async () => {
  isLoading.value = true;
  error.value = null;
  showRewardClaimView.value = false; // Сброс вида награды
  claimError.value = null;
  claimSuccess.value = false;
  console.log('Fetching initial data...');
  try {
    // Дожидаемся инициализации Telegram и получения данных пользователя
    await userStore.initializeTelegram(); // Метод store для инициализации
    console.log('Telegram initialized, user:', user.value);

    if (user.value && user.value.id) {
      // Параллельно загружаем профиль и историю
      await Promise.all([
        fetchUserProfile(),
        fetchAnalysisHistory() // Загружаем историю сразу
      ]);
       // Проверка на показ окна награды происходит внутри fetchUserProfile
    } else {
      throw new Error('Не удалось получить ID пользователя от Telegram.');
    }
  } catch (err) {
    console.error('Error during initial data fetch:', err);
    error.value = `Ошибка инициализации: ${err.message || err}`;
  } finally {
    isLoading.value = false;
    console.log('Initial data fetch finished.');
  }
};

const analyzeDream = async () => {
  if (!dreamInput.value.trim() || isAnalyzing.value) return;
  if (!profile.value.has_active_subscription && profile.value.tokens <= 0) {
      analysisError.value = "У вас нет токенов или активной подписки для анализа.";
      return;
  }

  isAnalyzing.value = true;
  analysisError.value = null;

  try {
    console.log('Sending dream for analysis:', dreamInput.value);
    const result = await api.analyzeDream(user.value.id, dreamInput.value);
    console.log('Analysis result:', result);
    // Добавляем новый анализ в начало списка ИЛИ перезагружаем историю
    // analysisHistory.value.unshift(result.analysis); // Простой вариант (может быть неточным без id)
    await fetchAnalysisHistory(); // Перезагрузка для точности
    dreamInput.value = ''; // Очищаем поле ввода
    // Обновляем профиль (количество токенов)
    await fetchUserProfile();
  } catch (err) {
    console.error('Failed to analyze dream:', err);
    analysisError.value = `Ошибка анализа: ${err.response?.data?.error || err.message || err}`;
  } finally {
    isAnalyzing.value = false;
  }
};

// --- Методы для Награды ---
const claimChannelToken = async () => {
    isClaiming.value = true;
    claimError.value = null;
    claimSuccess.value = false;
    try {
        const response = await api.claimChannelToken(user.value.id);
        if (response.success) {
            claimSuccess.value = true;
            await fetchUserProfile(); // Обновить данные профиля (токены)
            // Можно добавить задержку перед скрытием окна
            setTimeout(() => {
                 showRewardClaimView.value = false; // Скрыть окно награды
            }, 3000); // Закрыть через 3 секунды
        } else {
             claimError.value = response.error || 'Не удалось получить токен. Убедитесь, что вы подписаны на канал.';
        }
    } catch (err) {
        console.error("Failed to claim channel token:", err);
        claimError.value = `Ошибка запроса: ${err.response?.data?.error || err.message || 'Попробуйте еще раз'}`;
    } finally {
        isClaiming.value = false;
    }
};

// Закрыть окно награды и обновить данные ЛК
const closeRewardViewAndRefresh = async () => {
    showRewardClaimView.value = false;
    // Можно принудительно обновить данные, если нужно
    // await fetchUserProfile();
};

// --- Методы для Модального Окна ---
const openSubscriptionModal = () => {
  isDeepAnalysisMode.value = false; // Убедимся, что это режим подписки
  isSubscriptionModalVisible.value = true;
};

const openDeepAnalysisModal = () => {
  isDeepAnalysisMode.value = true; // Устанавливаем режим глубокого анализа
  isSubscriptionModalVisible.value = true;
};

const closeSubscriptionModal = () => {
  isSubscriptionModalVisible.value = false;
};

const handlePurchaseInitiated = (type) => {
  console.log(`${type} purchase initiated...`);
  // Можно показать индикатор ожидания подтверждения от Telegram
  if (type === 'deepAnalysis') {
      // Можно сразу установить флаг "в процессе", но лучше дождаться вебхука
      // deepAnalysisInProgress.value = true;
  }
};

const handlePurchaseCompleted = async (type, data) => {
  console.log(`${type} purchase completed! Data:`, data);
  closeSubscriptionModal();
  // Обновляем данные пользователя и историю
  await fetchUserProfile();
  await fetchAnalysisHistory();

  if (type === 'deepAnalysis') {
      // Устанавливаем флаг, что процесс запущен.
      // Он будет снят, когда fetchAnalysisHistory найдет готовый результат.
      // Если вебхук работает мгновенно и анализ готов сразу,
      // deepAnalysisResult обновится в fetchAnalysisHistory и флаг может не понадобиться.
      // Но для надежности (если анализ занимает время) ставим флаг.
      const existingDeepAnalysis = findDeepAnalysis();
      if (!existingDeepAnalysis) {
           deepAnalysisInProgress.value = true;
           // Опционально: можно запустить таймер для повторной проверки через некоторое время
           // setTimeout(fetchAnalysisHistory, 15000); // Проверить через 15 сек
      } else {
           deepAnalysisInProgress.value = false; // Анализ уже есть
      }
  }
};

const handlePurchaseError = (type, errorMsg) => {
  console.error(`${type} purchase failed:`, errorMsg);
  // Показываем ошибку пользователю
  // Можно использовать общую переменную ошибки или специфичную для модалки
  error.value = `Ошибка покупки (${type}): ${errorMsg}`;
  // Сбрасываем флаги состояния, если нужно
   if (type === 'deepAnalysis') {
        deepAnalysisInProgress.value = false;
   }
};


// --- Жизненный цикл ---
onMounted(() => {
  fetchInitialData();

  // Слушатель событий от Telegram (например, invoiceClosed)
  if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.onEvent('invoiceClosed', async (event) => {
          console.log('Invoice closed event received:', event);
          // { slug: string, status: 'paid' | 'cancelled' | 'failed' | 'pending' }
          if (event.status === 'paid') {
              // Инвойс оплачен, нужно понять, была ли это подписка или глубокий анализ
              // Это СЛОЖНО сделать надежно только на фронте без доп. информации из бэка.
              // Бэкенд (вебхук) должен обновить статус пользователя/анализа.
              // Мы просто перезагружаем данные, чтобы увидеть изменения.
              console.log('Invoice paid (slug:', event.slug, '), refreshing data...');
              // Небольшая задержка перед обновлением, чтобы бэкенд успел обработать вебхук
              setTimeout(async () => {
                   await fetchUserProfile();
                   await fetchAnalysisHistory();
                   // Проверяем, появился ли глубокий анализ и сбрасываем флаг
                   const da = findDeepAnalysis();
                   if (da) {
                       deepAnalysisInProgress.value = false;
                       deepAnalysisResult.value = da;
                   } else {
                       // Если анализ еще не готов, возможно, он еще генерируется
                       // Оставляем deepAnalysisInProgress=true или запускаем таймер проверки
                       // Пока что просто предполагаем, что он должен был появиться
                       // Если slug можно как-то связать с типом покупки, можно уточнить логику
                       if (event.slug.includes('deep_analysis')) { // ПРЕДПОЛОЖЕНИЕ о формате slug
                           deepAnalysisInProgress.value = true;
                       }
                   }

              }, 3000); // Задержка 3 секунды (настройте по необходимости)

          } else {
               console.log('Invoice status:', event.status, '(slug:', event.slug, ')');
               // Оплата не прошла или отменена
               // Можно показать сообщение пользователю
                handlePurchaseError(
                    event.slug.includes('deep_analysis') ? 'deepAnalysis' : 'subscription', // ПРЕДПОЛОЖЕНИЕ
                    `Статус платежа: ${event.status}`
                );
          }
      });
  }
});

// Следим за изменением user ID (на всякий случай, если он меняется динамически)
watch(() => user.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('User ID changed, refetching data...');
    fetchInitialData();
  }
});

</script>

<style scoped>
/* --- Общие стили --- */
.personal-account {
  padding: 20px;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  border-radius: 10px; /* Скругление для карточки */
  /* max-width: 600px; */ /* Ограничение ширины для лучшей читаемости */
  margin: 15px auto;   /* Центрирование и отступы */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Небольшая тень */
}

.card {
    background-color: var(--tg-theme-secondary-bg-color, #ffffff); /* Фоновый цвет для карточек */
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.loading-indicator, .error-message {
  text-align: center;
  padding: 30px;
  font-size: 1.1em;
}

.error-message {
  color: var(--tg-theme-destructive-text-color, #dc3545); /* Красный для ошибок */
}

.error-message button {
    margin-top: 10px;
    padding: 8px 15px;
    border: none;
    background-color: var(--tg-theme-button-color);
    color: var(--tg-theme-button-text-color);
    border-radius: 5px;
    cursor: pointer;
}

h2, h3 {
  color: var(--tg-theme-text-color);
  border-bottom: 1px solid var(--tg-theme-hint-color, #ccc);
  padding-bottom: 8px;
  margin-top: 20px;
  margin-bottom: 15px;
}
h2 { font-size: 1.5em; }
h3 { font-size: 1.2em; }

/* --- Информация о пользователе --- */
.user-info {
  margin-bottom: 25px;
}
.user-info p {
  margin: 8px 0;
  line-height: 1.6;
}
.user-info code {
  background-color: rgba(128, 128, 128, 0.15);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.9em;
}
.token-count {
  font-weight: bold;
  background-color: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.95em;
}

/* --- Кнопка Подписки (основная) --- */
.subscribe-button-main {
    display: inline-block; /* Чтобы занимала только нужную ширину */
    margin-top: 15px; /* Отступ сверху */
    padding: 10px 20px;
    font-size: 1em;
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-radius: 6px;
    background-color: var(--tg-theme-button-color);
    color: var(--tg-theme-button-text-color);
    transition: background-color 0.2s ease, transform 0.1s ease;
    text-align: center;
}
.subscribe-button-main:hover {
    filter: brightness(1.1);
}
.subscribe-button-main:active {
     transform: scale(0.98);
}

/* --- Секция Анализа --- */
.analysis-section textarea {
  width: calc(100% - 20px); /* Учитываем padding */
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid var(--tg-theme-hint-color, #ccc);
  border-radius: 5px;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 1em;
  min-height: 80px; /* Минимальная высота */
}
.analysis-section textarea:disabled {
    background-color: rgba(128, 128, 128, 0.1); /* Легкий серый фон для неактивного поля */
    cursor: not-allowed;
}

.analyze-button {
  padding: 12px 25px;
  font-size: 1.1em;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  background-color: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  transition: background-color 0.2s ease, transform 0.1s ease;
