<template>
  <div class="flex flex-col items-center gap-6 px-4 sm:px-6 md:px-8 pb-[env(safe-area-inset-bottom)]">
    <!-- Показываем или основной ЛК, или страницу получения награды -->
    <template v-if="!showRewardClaimView">
      <!-- Блок 1: Информация о пользователе (компактный) -->
      <div class="w-full max-w-72r">
        <UserInfoCard
          class="min-h-[18rem] py-6 px-8 md:px-16 bg-[#5461FF] text-white rounded-[3.75rem]"
          :user-store="userStore"
          :format-date="formatDate"
          @change-plan="userStore.openSubscriptionModal"
        />
      </div>
      
      <!-- Facts Carousel -->
      <div class="w-full max-w-72r">
        <FactsCarousel class="aspect-[1146/702] rounded-[3.75rem] overflow-hidden" />
      </div>

      <!-- Блок глубокого анализа -->
      <section class="w-full max-w-72r">
        <div class="py-6 px-8 md:px-16 bg-gradient-to-br from-[#BF62ED] to-[#701E99] rounded-[3.75rem] cursor-pointer"
          @click="onDeepAnalysis"
          :class="{ 'cursor-pointer': userStore.canAttemptDeepAnalysis && !userStore.isInitiatingDeepPayment && !userStore.isDoingDeepAnalysis }">
          
          <div v-if="userStore.isInitiatingDeepPayment" class="text-center text-white text-xl">
            Создаем счёт... <span class="spinner white"></span>
          </div>
          <div v-else-if="userStore.isDoingDeepAnalysis" class="text-center text-white text-xl">
            Анализ... <span class="spinner white"></span>
          </div>
          <div v-else class="text-center">
            <div class="cta bg-tg-link text-tg-button-text rounded-xl py-3 text-center font-semibold">
              Провести глубокий анализ (1 ⭐️)
            </div>
          </div>

          <div v-if="userStore.deepAnalysisResult" class="analysis-result mt-4">
              <h3 class="text-white text-lg font-semibold">Результат глубокого анализа:</h3>
              <pre class="text-white text-sm mt-2 whitespace-pre-wrap">{{ userStore.deepAnalysisResult }}</pre>
          </div>
          <div v-if="userStore.deepAnalysisError || userStore.deepPaymentError" class="error-message mt-4">
              ⚠️ {{ userStore.deepAnalysisError || userStore.deepPaymentError }}
          </div>
        </div>
      </section>
      <div v-if="userStore.profile?.subscription_type === 'free' && !userStore.profile?.channel_reward_claimed && !isClaimRewardAction">
        <button
            @click="showRewardClaimView = true"
            class="subscribe-button-main">
            🎁 Получить бесплатный токен за подписку
        </button>
      </div>
      <div v-if="userStore.profile?.channel_reward_claimed" class="reward-claimed-info">
        <p>✅ Награда за подписку на канал получена!</p>
      </div>

      <!-- Блок 2: История анализов -->
      <section class="w-full max-w-72r">
        <h2 class="text-center text-2xl font-medium mb-6">История анализов</h2>
        <div v-if="userStore.isLoadingHistory" class="text-center">Загрузка истории...</div>
        <div v-else-if="userStore.errorHistory" class="error-message">
          Ошибка загрузки истории: {{ userStore.errorHistory }}
        </div>
        <!-- Отображаем список ТОЛЬКО если история НЕ пуста -->
        <div v-else-if="userStore.history && userStore.history.length > 0">
          <AnalysisHistoryList :history="userStore.history" />
        </div>
        <div v-else>
          <p class="text-center">У вас пока нет сохраненных анализов.</p>
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

<!-- UserInfoCard Component -->

<script setup>
import { onMounted, ref, watch, computed, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';
import SubscriptionModal from '@/components/SubscriptionModal.vue';
import FactsCarousel from '@/components/FactsCarousel.vue';
import UserInfoCard from '@/components/UserInfoCard.vue';
import lottie from 'lottie-web';

const userStore = useUserStore();
const tg = window.Telegram?.WebApp;
const showRewardClaimView = ref(false);
const REQUIRED_DREAMS = 5;
const lottieContainer = ref(null);
let lottieAnimation = null;

const onDeepAnalysis = () => {
  if (userStore.canAttemptDeepAnalysis && !userStore.isInitiatingDeepPayment && !userStore.isDoingDeepAnalysis) {
    userStore.initiateDeepAnalysisPayment();
  }
};

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
.cta {
  @apply bg-tg-link text-tg-button-text rounded-xl py-3 text-center font-semibold;
}

/* Transition styles */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 100px;
  opacity: 1;
}

/* --- Ваши стили без изменений --- */
/* ... (все ваши стили) ... */
.personal-account { 
  padding: 0;
  color: var(--tg-theme-text-color); 
  background-color: var(--tg-theme-bg-color); 
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 27px;
  padding-top: 320px;
  padding-bottom: 320px;
  width: 100%;
  max-width: 1242px;
  margin: 0 auto;
  box-sizing: border-box;
}
.card { 
  background-color: var(--tg-theme-secondary-bg-color); 
  border-radius: 60px; 
  padding: 20px; 
  margin: 15px; 
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); 
  transition: all 0.3s ease;
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
.deep-analysis-card .error-message { 
  color: #ff6b6b; 
  background: rgba(255, 107, 107, 0.1); 
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 107, 107, 0.3); 
  padding: 20px; 
  border-radius: 24px; 
  margin-top: 20px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 24px;
}
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

/* History Section - Figma Design */
.history-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
  gap: 30px;
  padding: 0 40px;
  margin: 15px 0;
  min-height: 1245px;
}

.history-header {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 24px;
  padding: 0 40px;
}

.history-title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 64px;
  line-height: 1.1;
  color: var(--tg-theme-text-color);
  margin: 0;
}

.history-list-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 1146px;
}

.dream-history-item {
  width: 100%;
  height: 284px;
  margin-bottom: 15px;
}

.dream-content {
  display: flex;
  align-items: center;
  gap: 64px;
  padding: 84px 64px;
  background: #4A58FF;
  border-radius: 72px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dream-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(74, 88, 255, 0.3);
}

.dream-text-section {
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  gap: 10px;
  width: 680px;
}

.dream-title {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 52px;
  line-height: 1.1;
  color: #FFFFFF;
  text-align: left;
  flex: 1;
  display: flex;
  align-items: center;
  height: 106px;
}

.dream-date-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 12px 36px;
  border: 1px solid #EBEBEB;
  border-radius: 40px;
  min-width: fit-content;
}

.dream-date {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 38px;
  line-height: 1.25;
  color: #FFFFFF;
  text-align: center;
  white-space: nowrap;
}

.history-loading,
.history-empty {
  font-family: 'Inter', sans-serif;
  font-size: 32px;
  color: var(--tg-theme-text-color);
  text-align: center;
  padding: 40px;
}

.history-empty p {
  margin: 0;
  color: var(--tg-theme-hint-color);
}

.history-section .error-message {
  max-width: 800px;
  margin: 20px auto;
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  padding: 20px;
  border-radius: 24px;
}

/* Responsive Design for History Section */
@media (max-width: 768px) {
  .history-section {
    padding: 0 20px;
    min-height: auto;
  }
  
  .history-title {
    font-size: 32px;
  }
  
  .dream-content {
    flex-direction: column;
    padding: 40px 32px;
    gap: 32px;
    height: auto;
  }
  
  .dream-text-section {
    width: 100%;
  }
  
  .dream-title {
    font-size: 28px;
    height: auto;
    text-align: center;
  }
  
  .dream-date {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .history-section {
    padding: 0 10px;
  }
  
  .dream-content {
    padding: 24px 20px;
    border-radius: 36px;
  }
  
  .dream-title {
    font-size: 24px;
  }
  
  .dream-date {
    font-size: 20px;
  }
  
  .personal-account {
    padding: 10px;
  }
}
/* Deep Analysis Card - Figma Design */
.deep-analysis-card-container {
  padding: 10px 52px;
  margin: 15px 0;
}

.deep-analysis-card {
  background: linear-gradient(135deg, #BF62ED 0%, #701E99 85.23%);
  border-radius: 72px;
  padding: 49px 64px;
  min-height: 284px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.deep-analysis-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(191, 98, 237, 0.3);
}

.deep-analysis-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 98px;
}

.deep-analysis-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.deep-analysis-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: 52px;
  line-height: 1.233;
  letter-spacing: -1.418%;
  color: #FFFFFF;
  margin: 0 0 16px 0;
  max-width: 900px;
}

.deep-analysis-description {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 48px;
  line-height: 1.336;
  letter-spacing: -1.537%;
  color: #FFFFFF;
  margin: 0;
  max-width: 900px;
}

.deep-analysis-hint {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 36px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 16px;
}

.deep-analysis-action {
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button {
  width: 120px;
  height: 120px;
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.close-button:hover {
  transform: scale(1.1);
}

.close-icon {
  position: relative;
  width: 62px;
  height: 62px;
  background: #D9D9D9;
  border-radius: 50%;
  margin: 29px auto;
}

.close-icon::before,
.close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22.5px;
  height: 4px;
  background: #000000;
  transform: translate(-50%, -50%) rotate(45deg);
  opacity: 0.5;
}

.close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}
.processing-state {
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: #FFFFFF;
  border-radius: 36px;
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 28px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.processing-state .spinner.white { 
  border-top-color: white; 
  width: 1.2em;
  height: 1.2em;
}

.analysis-result {
    margin-top: 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    padding: 24px;
    text-align: left;
}
.analysis-result h3 {
    margin-top: 0;
    margin-bottom: 16px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 32px;
    color: #FFFFFF;
}
.analysis-result pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    line-height: 1.6;
    color: #FFFFFF;
    margin: 0;
}
</style>
