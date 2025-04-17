<template>
  <div class="personal-account">
    <!-- Показываем или основной ЛК, или страницу получения награды -->
    <template v-if="!showRewardClaimView">
      <h1 style="text-align: center;">Личный кабинет</h1>

      <div v-if="userStore.isLoadingProfile" class="user-info-top">Загрузка профиля...</div>
      <div v-else-if="userStore.errorProfile" class="user-info-top error-message">
        Ошибка загрузки профиля: {{ userStore.errorProfile }}
      </div>
      <div v-else-if="userStore.profile" class="user-info-top">
        <template v-if="userStore.profile.id && userStore.profile.username && userStore.profile.created_at">
          ID: {{ userStore.profile.id }}, Username: {{ userStore.profile.username }},<br>
          Дата регистрации: {{ formatDate(userStore.profile.created_at) }}
        </template>
        <template v-else>
          Данные профиля отсутствуют или неполные.
        </template>
      </div>


      <!-- Блок 1: Информация о пользователе -->
      <section class="user-info card">
        <h2>Основная информация</h2>
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
import { onMounted, ref, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';
import SubscriptionModal from '@/components/SubscriptionModal.vue';

const userStore = useUserStore();
const tg = window.Telegram?.WebApp;
const showRewardClaimView = ref(false);

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
    console.log("[PersonalAccount] Start loading profile and history");
    const profileLoadStart = Date.now();
    await userStore.fetchProfile();
    const profileLoadTime = Date.now() - profileLoadStart;
    console.log(`[PersonalAccount] Profile loaded in ${profileLoadTime}ms`);

    // Проверка данных профиля
    if (!userStore.profile) {
        console.error("[PersonalAccount] Profile data is missing after fetchProfile().");
    }

    // Историю грузим только если мы в основном ЛК
    if (!showRewardClaimView.value) {
         console.log("[PersonalAccount onMounted] Fetching history...");
        await userStore.fetchHistory();
        console.log("[PersonalAccount onMounted] History fetched.");
    }

    // Загрузка истории из DeviceStorage
    if (tg) {
        console.log("[PersonalAccount] Start loading history from DeviceStorage");
        const historyLoadStart = Date.now();
        tg.DeviceStorage.getItem('analyses_history', (error, value) => {
            const historyLoadTime = Date.now() - historyLoadStart;
            if (error) {
                console.error('[PersonalAccount] Error loading history from DeviceStorage:', error);
            } else if (value) {
                try {
                    userStore.history = JSON.parse(value);
                    console.log('[PersonalAccount] History loaded from DeviceStorage:', userStore.history);
                } catch (parseError) {
                    console.error('[PersonalAccount] Error parsing history from DeviceStorage:', parseError);
                }
                console.log(`[PersonalAccount] History loaded from DeviceStorage in ${historyLoadTime}ms`);
            } else {
                console.log('[PersonalAccount] No history found in DeviceStorage.');
                console.log(`[PersonalAccount] History loaded from DeviceStorage in ${historyLoadTime}ms`); // Log time even if no history
            }
        });
    }
});

// Сохранение истории в DeviceStorage при изменении

watch(() => userStore.history, (newHistory) => {
    if (tg) {
        const saveStart = Date.now();
        tg.DeviceStorage.setItem('analyses_history', JSON.stringify(newHistory), (error, success) => {
            const saveTime = Date.now() - saveStart;
            if (error) {
                console.error('[PersonalAccount] Error saving history to DeviceStorage:', error);
            } else if (success) {
                console.log(`[PersonalAccount] History saved to DeviceStorage in ${saveTime}ms`);
            }
        });
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

<style scoped>.personal-account {
  padding: 10px;
  font-family: var(--tg-theme-font-type); /* Используем шрифт Telegram */
}

.history {
    width: 100%; /* Растягиваем на всю ширину */
    min-height: 300px; /* Минимальная высота, чтобы занимать пространство даже при пустой истории */
    display: flex;
    flex-direction: column;
}

.history > div {
    flex-grow: 1;
}
.user-info-top{text-align:center;margin-bottom:20px}
h1 {
  margin-bottom: 15px;
  font-size: 20px;
  color: var(--tg-theme-text-color); /* Используем цвет текста Telegram */
}
.user-info-top {
  text-align: center;
  margin-bottom: 20px;
}
/* Цветовая схема */
:root{--background-color:#121212;/* Темный фон */--text-color:#e0e0e0;/* Светлый текст */--accent-color:#64b5f6;/* Синий акцент */--secondary-background:rgba(255,255,255,.1);/* Полупрозрачный фон для карточек */}.personal-account{padding:20px;font-family:sans-serif;/* Современный шрифт */background:linear-gradient(135deg,var(--background-color),#1f1f1f);color:var(--text-color);min-height:100vh;/* Занимать всю высоту */}h1{text-align:center;/* Центрирование заголовка */margin-bottom:30px;font-size:28px;color:var(--accent-color);text-shadow:0 0 10px rgba(100,181,246,.5);/* Свечение заголовка */}.user-info-block{text-align:center;margin-bottom:20px}.user-info-block p{margin:5px 0;font-size:16px;color:#bdbdbd}.card{background-color:var(--secondary-background);border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid var(--accent-color);transition:transform .2s ease,box-shadow .2s ease;animation:card-appear .3s ease-out forwards;opacity:0;/* Initially hidden for animation */}.card:hover{transform:translateY(-5px);box-shadow:0 0 15px rgba(100,181,246,.3)}.user-info h2,.history h2{margin-top:0;margin-bottom:15px;font-size:20px;color:var(--text-color);border-bottom:1px solid var(--accent-color);padding-bottom:5px}.user-info p{margin:5px 0;color:#ccc}.user-info strong{color:var(--accent-color);font-weight:500}.capitalize{text-transform:capitalize}.change-plan-button,.subscribe-button-main{display:inline-block;padding:12px 20px;border:2px solid var(--accent-color);border-radius:4px;font-size:16px;cursor:pointer;text-align:center;text-decoration:none;transition:all .2s ease;background-color:transparent;color:var(--accent-color);box-shadow:0 0 5px rgba(100,181,246,.3)}.change-plan-button:hover,.subscribe-button-main:hover{background-color:var(--accent-color);color:var(--background-color);box-shadow:0 0 10px rgba(100,181,246,.7);transform:translateY(-2px)}/* Стили для спиннера загрузки */.spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,.3);border-radius:50%;border-top-color:#fff;animation:spin 1s ease-in-out infinite;margin-left:5px}@keyframes spin{to{transform:rotate(360deg)}}/* Стили для сообщений об ошибках */.error-message{color:#f44336;/* Красный цвет для ошибок */margin-top:10px;font-weight:700;/* Выделение ошибок */text-shadow:0 0 5px rgba(244,67,54,.5)}/* Стили для сообщений об успехе */.success-message{color:#4caf50;/* Зеленый цвет для успеха */margin-top:10px;display:flex;align-items:center;gap:10px;font-weight:700;text-shadow:0 0 5px rgba(76,175,80,.5)}/* Анимации */@keyframes fadeIn{from{opacity:0}to{opacity:1}}.fade-in{animation:fadeIn .5s ease}@keyframes card-appear{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  background-color: transparent; /* Прозрачный фон */
  padding: 10px;
  margin-bottom: 10px;

.user-info h2,
.history h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  color: var(--tg-theme-text-color); /* Используем цвет текста Telegram */
}

.user-info p {
  margin: 5px 0;
  color: var(--tg-theme-hint-color); /* Используем цвет подсказки Telegram для обычного текста */
}

.user-info strong {
  color: var(--tg-theme-text-color); /* Выделяем важный текст основным цветом */
  font-weight: 500;
}

.capitalize {
  text-transform: capitalize;
}

.change-plan-button,
.subscribe-button-main,
.subscribe-button,
.claim-button,
.back-button,
.secondary {
  display: inline-block;
  padding: 10px 15px;
  border: 1px solid var(--tg-theme-button-color); /* Тонкая граница */
  border-radius: 4px; /* Меньше скругление */
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  transition: background-color 0.2s ease;
  background-color: transparent; /* Прозрачный фон */
  color: var(--tg-theme-button-color); /* Цвет текста */
}

/* Стили для кнопки "Сменить тариф" */
.change-plan-button {
}

.change-plan-button:hover {
  background-color: rgba(0, 0, 0, 0.1); /* Легкое затемнение при наведении */
}

/* Стили для основной кнопки подписки */
.subscribe-button-main {
  font-weight: 500;
}

.subscribe-button-main:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Стили для ссылки-кнопки подписки на канал */
.subscribe-button {
  color: var(--tg-theme-link-color); /* Цвет текста - цвет ссылок */
  border-color: var(--tg-theme-link-color); /* Граница - цвет ссылок */
}

.subscribe-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
  text-decoration: none;
}

/* Стили для кнопки проверки подписки и получения награды */
.claim-button {
  font-weight: 500;
  margin-top: 10px;
}

.claim-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.claim-button:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

/* Общие стили для кнопок "назад" */
.back-button {
}

.back-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Модификатор для вторичной кнопки "назад" */
.back-button.secondary {
}

.back-button.secondary:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Стили для спиннера загрузки */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;  
  animation: spin 1s linear infinite;
  border: 2px solid var(--tg-theme-button-color);
  border-radius: 50%;  
  border-left-color: transparent;  
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}
/* Стили для сообщений об ошибках */
.error-message {
  color: #ff6347; /*  Коралловый цвет для ошибок */
  margin-top: 10px;
}

/* Стили для сообщений об успехе */
.success-message {
  color: #32cd32; /*  Зеленый цвет для успеха */
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px; /*  Отступ между текстом и кнопкой */
}

/* Стили для информационных сообщений */
.info-message {
  color: var(--tg-theme-hint-color);
  margin-top: 10px;
}

.info-message a {
  color: var(--tg-theme-link-color);
}

/* Стили для страницы получения награды */
.reward-claim-view {
  text-align: center;
}

.reward-claim-view h1 {
  font-size: 24px;
  margin-bottom: 20px;
}

.reward-claim-view p {
  margin-bottom: 20px;
  color: var(--tg-theme-text-color);
}

.reward-claim-view .steps {
  list-style: none;
  padding: 0;
  max-width: 500px;
  margin: 0 auto;
}

.reward-claim-view .steps li {
  padding: 10px;
  margin-bottom: 5px;
}

.reward-claim-view .steps li span {
  display: block;
  margin-bottom: 5px;
  font-weight: normal; /* Убираем выделение */
  color: var(--tg-theme-text-color);
}

.reward-claim-view .hint {
  display: block;
  font-size: 14px;
  color: var(--tg-theme-hint-color);
  margin-top: 5px;
}

/* Стили для сообщения о получении награды в профиле */
.reward-claimed-info {
    margin-top: 10px;
    color: #32cd32; /* Зеленый цвет */
}
</style>
