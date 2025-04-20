<template>
  <div class="personal-account">
    <!-- Показываем или основной ЛК, или страницу получения награды -->
    <template v-if="!showRewardClaimView">
      <h1>Личный кабинет</h1>

      <!-- Блок 1: Информация о пользователе -->
      <section class="user-info card">
        <h2>Ваш профиль</h2>
        <div v-if="userStore.isLoadingProfile">Загрузка профиля...</div>
        <div v-else-if="userStore.errorProfile" class="error-message">
          Ошибка загрузки профиля: {{ userStore.errorProfile }}
        </div>
        <div v-else-if="userStore.profile.tokens !== null">
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
        <div v-else>
          <p>Не удалось загрузить данные профиля.</p>
        </div>
         <div v-if="!userStore.isLoadingProfile && userStore.profile?.channel_reward_claimed" class="reward-claimed-info">
             <p>✅ Награда за подписку на канал получена!</p>
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

      <!-- Блок глубокого анализа (ИЗМЕНЕНО) -->
      <section class="deep-analysis card">
          <h2>Глубокий анализ</h2>
          <p>Получите комплексный анализ ваших последних {{ REQUIRED_DREAMS }} снов. Стоимость: 1 ⭐️ (Telegram Star).</p>

          <button
              @click="userStore.initiateDeepAnalysisPayment"
              :disabled="!userStore.canAttemptDeepAnalysis || userStore.isInitiatingDeepPayment || userStore.isDoingDeepAnalysis"
              class="deep-analysis-button"
          >
              <!-- Показываем разные состояния кнопки -->
              <span v-if="userStore.isInitiatingDeepPayment">Создаем счет... <span class="spinner white"></span></span>
              <span v-else-if="userStore.isDoingDeepAnalysis">Анализируем... <span class="spinner white"></span></span>
              <span v-else>Провести глубокий анализ (1 ⭐️)</span>
          </button>

          <!-- Подсказка -->
          <p v-if="!userStore.canAttemptDeepAnalysis && !userStore.isInitiatingDeepPayment && !userStore.isDoingDeepAnalysis" class="info-message hint">
              <span v-if="userStore.isLoadingProfile || userStore.isLoadingHistory">Дождитесь загрузки данных...</span>
              <!-- Токены больше не проверяем -->
              <span v-else-if="(userStore.history?.length ?? 0) < REQUIRED_DREAMS">Нужно еще {{ REQUIRED_DREAMS - (userStore.history?.length ?? 0) }} сна/снов для анализа.</span>
          </p>

          <!-- Результат анализа -->
          <div v-if="userStore.deepAnalysisResult" class="analysis-result card">
              <h3>Результат глубокого анализа:</h3>
              <pre>{{ userStore.deepAnalysisResult }}</pre>
          </div>

          <!-- Ошибка анализа ИЛИ Ошибка инициации платежа -->
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
           <!-- ... (содержимое страницы награды без изменений) ... -->
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
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';
import SubscriptionModal from '@/components/SubscriptionModal.vue';

const userStore = useUserStore();
const tg = window.Telegram?.WebApp;
const showRewardClaimView = ref(false);
// Константа для шаблона
const REQUIRED_DREAMS = 5;

const goBackToAccount = () => {
    showRewardClaimView.value = false;
    userStore.claimRewardError = null;
    userStore.claimRewardSuccessMessage = null;
    userStore.userCheckedSubscription = false;
    // Обновляем профиль И историю при возврате в ЛК
    userStore.fetchProfile();
    userStore.fetchHistory(); // <<<--- ДОБАВЛЕНА ЗАГРУЗКА ИСТОРИИ ПРИ ВОЗВРАТЕ
};

const handleClaimRewardClick = async () => { await userStore.claimChannelReward(); };

onMounted(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isClaimRewardAction = urlParams.get('action') === 'claim_reward';
    showRewardClaimView.value = isClaimRewardAction; // Устанавливаем вид сразу

    console.log(`[PersonalAccount onMounted] Initial view: ${isClaimRewardAction ? 'Reward Claim' : 'Main Account'}`);

    if (tg) {
        tg.ready();
        console.log("[PersonalAccount] Telegram WebApp is ready.");
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            // <<<--- ДОБАВЛЕН ЛОГ ВНУТРИ КНОПКИ НАЗАД ---
            console.log(`[PersonalAccount BackButton] Clicked. Modal open: ${userStore.showSubscriptionModal}, Reward view: ${showRewardClaimView.value}`);
            if (userStore.showSubscriptionModal) {
                userStore.closeSubscriptionModal();
            } else if (showRewardClaimView.value === true) { // <<<--- Явная проверка на true
                goBackToAccount(); // Если на странице награды, возвращаемся в ЛК
            } else {
                console.log("[PersonalAccount BackButton] Closing TMA.");
                tg.close(); // Иначе (в основном ЛК) закрываем приложение
            }
        });
        if (tg.MainButton.isVisible) { tg.MainButton.hide(); }
    } else { console.warn("[PersonalAccount] Telegram WebApp API not available."); }

    // Загружаем профиль всегда
    console.log("[PersonalAccount onMounted] Fetching profile...");
    await userStore.fetchProfile();
    console.log("[PersonalAccount onMounted] Profile fetched.");

    // Историю грузим только если мы в основном ЛК
    if (!showRewardClaimView.value) {
         console.log("[PersonalAccount onMounted] Fetching history...");
        await userStore.fetchHistory();
        console.log("[PersonalAccount onMounted] History fetched.");
    }
});

// Форматирование даты (без изменений)
const formatDate = (dateString) => { if (!dateString) return ''; try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; } };

// Слежение за получением награды для авто-возврата (без изменений)
watch(() => userStore.profile.channel_reward_claimed, (newValue, oldValue) => {
  if (newValue === true && oldValue === false && showRewardClaimView.value) {
    console.log("[PersonalAccount] Reward claimed successfully, auto-returning to account view soon.");
    setTimeout(() => { if (showRewardClaimView.value) { goBackToAccount(); } }, 3500);
  }
});
</script>

<style scoped>
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
/* --- Стили без изменений --- */
/* ... (все ваши стили) ... */
</style>
