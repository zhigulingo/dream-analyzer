<template>
  <div class="personal-account">
    <!-- Показываем или основной ЛК, или страницу получения награды -->
    <template v-if="!showRewardClaimView">
      
     <FactsCarousel />
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
            Сменить тариф
          </button>
          <button
              v-else-if="userStore.profile.subscription_type === 'free' && !userStore.profile.channel_reward_claimed && !isClaimRewardAction"
              @click="showRewardClaimView = true"
              class="subscribe-button-main">
              🎁 Получить бесплатный токен за подписку
          </button>
          <div v-if="userStore.profile.channel_reward_claimed" class="reward-claimed-info">
            <p>✅ Награда за подписку на канал получена!</p>
          </div>
        </div>
        <div v-else>
          <p>Не удалось загрузить данные профиля.</p>
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
       <div class="reward-claim-view" @click.self="goBackToAccount">
           <div class="reward-claim-content">
               <div class="reward-claim-card">
                   <div class="emoji-container" ref="lottieContainer"></div>
                   <div class="text-container">
                       <p class="reward-title">Получи первый токен для анализа сна за подписку на канал</p>
                       <p class="channel-name">@TheDreamsHub</p>
                   </div>
               </div>
           </div>
       </div>
    </template>

  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';
import SubscriptionModal from '@/components/SubscriptionModal.vue';
import FactsCarousel from '@/components/FactsCarousel.vue';
import lottie from 'lottie-web';

const userStore = useUserStore();
const tg = window.Telegram?.WebApp;
const showRewardClaimView = ref(false);
const REQUIRED_DREAMS = 5;
const lottieContainer = ref(null);
let lottieAnimation = null;

const isClaimRewardAction = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('action') === 'claim_reward';
});

const loadLottieAnimation = async (container) => {
    if (!container) return;
    
    try {
        console.log("[PersonalAccount] Loading Lottie animation...");
        const response = await fetch('/Telegram%20Star.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const animationData = await response.json();
        
        if (lottieAnimation) {
            lottieAnimation.destroy();
        }
        
        lottieAnimation = lottie.loadAnimation({
            container: container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: animationData
        });

        console.log("[PersonalAccount] Lottie animation loaded successfully");
    } catch (error) {
        console.error('[PersonalAccount] Error loading Lottie animation:', error);
    }
};

const goBackToAccount = () => {
    if (userStore.profile.channel_reward_claimed) {
        showRewardClaimView.value = false;
        if (tg?.MainButton?.hide) {
            tg.MainButton.hide();
            tg.MainButton.offClick();
        }
    } else if (!userStore.claimRewardError) {
        // Only go back if there's no error and token hasn't been claimed
        showRewardClaimView.value = false;
        if (tg?.MainButton?.hide) {
            tg.MainButton.hide();
            tg.MainButton.offClick();
        }
    }
    userStore.fetchProfile();
    userStore.fetchHistory();
};

const handleClaimRewardClick = async () => { await userStore.claimChannelReward(); };

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ОПРЕДЕЛЕНИЯ МОБИЛЬНОГО УСТРОЙСТВА ---
const isMobileDevice = () => {
  if (!navigator?.userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

onMounted(async () => {
    showRewardClaimView.value = isClaimRewardAction.value && !userStore.profile.channel_reward_claimed;

    console.log(`[PersonalAccount onMounted] Initial view: ${showRewardClaimView.value ? 'Reward Claim' : 'Main Account'}`);

    if (tg) {
        tg.ready();
        console.log("[PersonalAccount] Telegram WebApp is ready.");

        // Initialize Lottie animation if in reward claim view
        if (showRewardClaimView.value && lottieContainer.value) {
            await loadLottieAnimation(lottieContainer.value);
        }

        // --- НАЧАЛО ИНТЕГРАЦИИ ЛОГИКИ РАЗМЕРА И ПОВЕДЕНИЯ ---
        const isMobile = isMobileDevice(); // Определяем тип устройства

        // Setup MainButton for reward claim view
        if (showRewardClaimView.value) {
            if (typeof tg.MainButton?.show === 'function') {
                tg.MainButton.text = "Перейти и подписаться";
                tg.MainButton.show();
                tg.MainButton.onClick(() => {
                    if (tg.MainButton.text === "Перейти и подписаться") {
                        window.open('https://t.me/TheDreamsHub', '_blank');
                        tg.MainButton.text = "Получить токен";
                    } else {
                        handleClaimRewardClick().then(() => {
                            // Token claim is handled by the watch above
                            console.log("[PersonalAccount] Token claim initiated");
                        });
                    }
                });
            }
        }

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

// Watch for changes in showRewardClaimView
watch([showRewardClaimView, lottieContainer], async ([newShowReward, newContainer]) => {
    if (newShowReward && newContainer && !lottieAnimation) {
        await loadLottieAnimation(newContainer);
    } else if (!newShowReward && lottieAnimation) {
        lottieAnimation.destroy();
        lottieAnimation = null;
    }
});

// Cleanup animation on component unmount
onUnmounted(() => {
    if (lottieAnimation) {
        lottieAnimation.destroy();
        lottieAnimation = null;
    }
});

const formatDate = (dateString) => { if (!dateString) return ''; try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; } };

// Watch for successful token claim
watch(() => userStore.profile.channel_reward_claimed, (newValue, oldValue) => {
    if (newValue === true && oldValue === false && showRewardClaimView.value) {
        console.log("[PersonalAccount] Reward claimed successfully, returning to account view");
        goBackToAccount();
    }
});

// Watch for reward view to handle MainButton
watch(showRewardClaimView, (newValue) => {
    if (!tg || typeof tg.MainButton?.show !== 'function') return;

    if (newValue) {
        // Set up MainButton for reward claim view
        if (!userStore.profile.channel_reward_claimed) {
            tg.MainButton.text = "Перейти и подписаться";
            tg.MainButton.show();
            tg.MainButton.onClick(() => {
                if (tg.MainButton.text === "Перейти и подписаться") {
                    window.open('https://t.me/TheDreamsHub', '_blank');
                    tg.MainButton.text = "Получить токен";
                } else {
                    handleClaimRewardClick().then(() => {
                        // Token claim is handled by the watch above
                        console.log("[PersonalAccount] Token claim initiated");
                    });
                }
            });
        }
    } else {
        tg.MainButton.hide();
        tg.MainButton.offClick();
    }
});

</script>

<style scoped>
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
.reward-claim-view {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.1); /* 10% opacity */
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 1000;
}

.reward-claim-content {
    width: 100%;
    max-width: 400px;
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
}

.reward-claim-card {
    width: 100%;
    max-width: 284.18px;
    background: #5F66B7;
    border-radius: 15.31px;
    padding: min(117.34px, 20vh) 30.87px min(41.58px, 10vh);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: min(18.88px, 3vh);
}

.emoji-container {
    width: min(130.61px, 25vh);
    height: min(130.61px, 25vh);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: min(18.88px, 3vh);
    background: transparent;
    overflow: hidden; /* Ensure animation stays within container */
}

.telegram-sticker {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.text-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12.24px;
    width: 100%;
    max-width: 222.19px;
}

.reward-title, .channel-name {
    font-family: 'Inter', sans-serif;
    font-size: clamp(14px, 18.88px, 5vw);
    line-height: 1.2;
    color: #FFFFFF;
    text-align: center;
    margin: 0;
}

@media screen and (max-width: 320px) {
    .reward-claim-card {
        padding: 15px;
        gap: 12px;
    }
    
    .text-container {
        gap: 8px;
    }
}

@media screen and (min-width: 768px) {
    .reward-claim-card {
        padding: 117.34px 30.87px 41.58px;
    }
}

@font-face {
    font-family: 'Inter';
    src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');
}
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
</style>
