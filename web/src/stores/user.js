// tma/src/stores/user.js (Исправлено: цены = 1)

import { defineStore } from 'pinia';
// Импортируем и дефолтный экспорт (методы), и именованный (клиент)
import api, { apiClient } from '@/services/api';

export const useUserStore = defineStore('user', {
  state: () => ({
    // --- Web Authentication State ---
    webUser: null,
    isWebAuthenticated: false,
    
    // --- Состояние для получения награды ---
    isClaimingReward: false,
    claimRewardError: null,
    claimRewardSuccessMessage: null,
    rewardAlreadyClaimed: false,
    userCheckedSubscription: false,
    // --- Состояние для глубокого анализа (оплата + выполнение) ---
    isInitiatingDeepPayment: false, // Флаг инициации платежа
    deepPaymentError: null,         // Ошибка инициации платежа
    isDoingDeepAnalysis: false,     // Флаг выполнения анализа (ПОСЛЕ оплаты)
    deepAnalysisResult: null,
    deepAnalysisError: null,
    // --- Основное состояние ---
    profile: { tokens: null, subscription_type: 'free', subscription_end: null, channel_reward_claimed: false },
    history: [],
    isLoadingProfile: false,
    isLoadingHistory: false,
    errorProfile: null,
    errorHistory: null,
    showSubscriptionModal: false,
    selectedPlan: 'premium',
    selectedDuration: 3,
  }),

  getters: {
    // Calculate subscription price based on selected plan and duration
    selectedInvoiceAmount() {
      let basePrice = this.selectedPlan === 'premium' ? 1.0 : 0.5; // UPDATED: premium 1 XTR, standard 0.5 XTR
      return Math.round(basePrice * this.selectedDuration * 100) / 100; // Round to 2 decimal places
    },
    
    // Determine if deep analysis can be attempted (minimum 5 dreams)
    canAttemptDeepAnalysis() {
      const hasEnoughDreams = (this.history?.length || 0) >= 5; // Нужно минимум 5 снов
      // Не проверяем наличие ранее полученного результата - можно запускать повторно
      return hasEnoughDreams && !this.isLoadingProfile && !this.isLoadingHistory && !this.isInitiatingDeepPayment && !this.isDoingDeepAnalysis;
    },
    
    // Check if user is authenticated either via Telegram WebApp or web login
    isAuthenticated() {
      return this.isWebAuthenticated || !!window.Telegram?.WebApp?.initData;
    },

    // --- Геттеры для UI награды ---
    canAttemptClaim: (state) => !state.profile?.channel_reward_claimed && !state.isClaimingReward,
    showClaimRewardSection: (state) => !state.isLoadingProfile && state.profile && !state.profile.channel_reward_claimed,
    // Теперь проверяем только наличие 5 снов и не идет ли процесс оплаты/анализа
    canAttemptDeepAnalysis: (state) =>
        !state.isLoadingProfile && // Профиль загружен
        !state.isInitiatingDeepPayment && // Не идет оплата
        !state.isDoingDeepAnalysis &&    // Не идет анализ
        !state.isLoadingHistory &&
        state.history && state.history.length >= 5, // Есть 5 или больше записей
    // --- Основные геттеры ---
    isPremium: (state) => state.profile.subscription_type === 'premium',
    // <<<--- НАЧАЛО ИСПРАВЛЕНИЯ ЦЕН ---
    getPlanDetails: (state) => (plan, duration) => {
      // ВАШИ ЦЕНЫ ДЛЯ ТЕСТОВ = 1 ЗВЕЗДА
      const prices = { premium: { 1: 300, 3: 765, 12: 2160 }, basic: { 1: 50, 3: 125, 12: 360 } };
      const features = {
            premium: ["30 токенов", "Ранний доступ к фичам", "Глубокий анализ"],
            basic: ["15 токенов в месяц", "Стандартный анализ", "Поддержка"],
            free: ["1 пробный токен"]
        };
      const durationTextMap = { 1: '1 месяц', 3: '3 месяца', 12: '1 год' };
      return {
            price: prices[plan]?.[duration] ?? null, // Используем ваши цены = 1
            features: features[plan] ?? [],
            durationText: durationTextMap[duration] ?? `${duration} месяцев`
        };
    },
  },

  actions: {
    // Initialize the store
    init() {
      // Check for web authentication
      const storedUser = localStorage.getItem('telegram_user');
      if (storedUser) {
        try {
          this.webUser = JSON.parse(storedUser);
          this.isWebAuthenticated = true;
        } catch (err) {
          console.error('Failed to parse stored user data', err);
          localStorage.removeItem('telegram_user');
        }
      }
      
      // Fetch user data
      this.fetchProfile();
      this.fetchHistory();
    },
    
    // Handle web login via Telegram
    setWebUser(userData) {
      this.webUser = userData;
      this.isWebAuthenticated = true;
      localStorage.setItem('telegram_user', JSON.stringify(userData));
    },
    
    // Handle logout
    async logout() {
      console.log('[UserStore] Forcefully clearing all user data and authentication');
      
      // Call API cleanup first
      try {
        await api.logout();
        console.log('[UserStore] API cleanup completed');
      } catch (e) {
        console.error('[UserStore] API cleanup failed:', e);
      }
      
      // Clear all user-related state
      this.webUser = null;
      this.isWebAuthenticated = false;
      this.profile = { 
        tokens: null, 
        subscription_type: 'free', 
        subscription_end: null, 
        channel_reward_claimed: false 
      };
      this.history = [];
      
      // Clear various storage mechanisms
      localStorage.removeItem('telegram_user');
      sessionStorage.removeItem('telegram_user');
      
      // Try to clear all localStorage used in the app
      try {
        // Clear any cached tokens or session data
        localStorage.clear();
        sessionStorage.clear();
        
        // Try to remove cookies that might be related
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        console.log('[UserStore] All storage mechanisms cleared');
      } catch (e) {
        console.error('[UserStore] Error while clearing storage:', e);
      }
    },

    async fetchProfile() {
      this.isLoadingProfile = true; this.errorProfile = null;
      this.claimRewardError = null; this.claimRewardSuccessMessage = null; this.userCheckedSubscription = false;
      try {
        console.log(`[UserStore:fetchProfile] Requesting from Base URL: ${apiClient.defaults.baseURL}`);
        const response = await api.getUserProfile();
        this.profile = { ...this.profile, ...response.data };
        this.rewardAlreadyClaimed = this.profile?.channel_reward_claimed ?? false;
        console.log("[UserStore] Profile loaded:", this.profile);
      } catch (err) {
        console.error("[UserStore:fetchProfile] Error:", err);
        this.errorProfile = err.response?.data?.error || err.message || 'Network Error';
      } finally { this.isLoadingProfile = false; }
    },

    async fetchHistory() {
      this.isLoadingHistory = true; this.errorHistory = null;
      try {
        console.log(`[UserStore:fetchHistory] Requesting from Base URL: ${apiClient.defaults.baseURL}`);
        const response = await api.getAnalysesHistory();
        this.history = response.data;
        console.log("[UserStore] History loaded, count:", this.history.length);
      } catch (err) {
        console.error("[UserStore:fetchHistory] Error:", err);
        this.errorHistory = err.response?.data?.error || err.message || 'Network Error';
      } finally { this.isLoadingHistory = false; }
    },

    openSubscriptionModal() { this.showSubscriptionModal = true; this.selectedPlan = 'premium'; this.selectedDuration = 3; console.log("[UserStore] Opening modal"); },
    closeSubscriptionModal() { this.showSubscriptionModal = false; console.log("[UserStore] Closing modal"); },
    selectPlan(plan) { this.selectedPlan = plan; this.selectedDuration = 3; console.log(`[UserStore] Plan selected: ${plan}`); },
    selectDuration(duration) { this.selectedDuration = duration; console.log(`[UserStore] Duration selected: ${duration}`); },

    async initiatePayment() {
        console.log("[UserStore:initiatePayment] Action started.");
        const tg = window.Telegram?.WebApp;
        let amount = null, tgUserId = null, plan = null, duration = null, payload = null, initDataHeader = null;
        try {
            amount = this.selectedInvoiceAmount;
            tgUserId = tg?.initDataUnsafe?.user?.id;
            plan = this.selectedPlan;
            duration = this.selectedDuration;
            initDataHeader = tg?.initData;
            console.log("[UserStore:initiatePayment] Values:", { amount, tgUserId, plan, duration, initDataAvailable: !!initDataHeader });
            if (amount === null || amount < 1 || !tgUserId || !plan || !duration) { throw new Error("Отсутствуют или некорректны данные для инициирования платежа (сумма >= 1 XTR)."); }
            if (!initDataHeader) { throw new Error("Telegram InitData не найден. Перезапустите приложение."); }
            payload = `sub_${plan}_${duration}mo_${tgUserId}`;
            console.log(`[UserStore:initiatePayment] Payload created: ${payload}`);
            if (tg?.MainButton) { tg.MainButton.showProgress(false); tg.MainButton.disable(); }
            console.log("[UserStore:initiatePayment] Preparing fetch request...");
            const baseUrl = import.meta.env.VITE_API_BASE_URL;
            if (!baseUrl) { throw new Error("Конфигурация API не загружена (VITE_API_BASE_URL)."); }
            const targetUrl = `${baseUrl}/create-invoice`;
            const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initDataHeader }, body: JSON.stringify({ plan, duration, amount, payload }) };
            console.log("[UserStore:initiatePayment] Sending fetch request...");
            const response = await fetch(targetUrl, requestOptions);
            console.log("[UserStore:initiatePayment] Fetch response:", response.status, response.ok);
            if (!response.ok) { let errorText = `HTTP error ${response.status}`; try { const errorData = await response.json(); errorText = errorData.error || JSON.stringify(errorData); } catch (e) { try { errorText = await response.text(); } catch (e2) {} } console.error("[UserStore:initiatePayment] Backend error:", errorText); throw new Error(`Ошибка сервера: ${errorText}`); }
            const responseData = await response.json(); const invoiceUrl = responseData?.invoiceUrl;
            if (!invoiceUrl) { console.error("[UserStore:initiatePayment] Backend missing invoiceUrl:", responseData); throw new Error("Не удалось получить ссылку для оплаты."); }
            console.log("[UserStore:initiatePayment] Received invoice URL:", invoiceUrl);
            if (tg?.openInvoice) {
                console.log("[UserStore:initiatePayment] Calling tg.openInvoice...");
                tg.openInvoice(invoiceUrl, (status) => {
                    console.log("[UserStore:initiatePayment] Invoice callback status:", status);
                    if (tg?.MainButton) { tg.MainButton.hideProgress(); tg.MainButton.enable(); }
                    if (status === 'paid') { alert("Оплата прошла успешно! Профиль будет обновлен."); this.closeSubscriptionModal(); setTimeout(() => this.fetchProfile(), 4000); }
                    else if (status === 'failed') { alert(`Платеж не удался: ${status}`); }
                    else if (status === 'cancelled') { alert("Платеж отменен."); }
                    else { alert(`Статус платежа: ${status}.`); } });
            } else { throw new Error("Метод Telegram openInvoice недоступен."); }
        } catch (error) {
            console.error("[UserStore:initiatePayment] Error caught:", error);
            let alertMessage = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) { alertMessage = 'Сетевая ошибка. Проверьте интернет.'; }
            alert(alertMessage);
            if (tg?.MainButton) { tg.MainButton.hideProgress(); tg.MainButton.enable(); }
        }
    },

    async claimChannelReward() {
        console.log("[UserStore:claimChannelReward] Action started.");
        this.isClaimingReward = true; this.claimRewardError = null; this.claimRewardSuccessMessage = null; this.userCheckedSubscription = true;
        const tg = window.Telegram?.WebApp; const initDataHeader = tg?.initData;
        if (!initDataHeader) { this.claimRewardError = "Telegram InitData не найден."; this.isClaimingReward = false; console.error("[UserStore:claimChannelReward] Missing InitData."); return; }
        try {
            console.log(`[UserStore:claimChannelReward] Requesting from Base URL: ${apiClient.defaults.baseURL}`);
            const response = await api.claimChannelReward(); // Axios добавит заголовок
            console.log("[UserStore:claimChannelReward] Response received:", response.data);
            const data = response.data;
            if (data.success) {
                this.claimRewardSuccessMessage = data.message || "Токен успешно начислен!";
                this.rewardAlreadyClaimed = true; this.profile.channel_reward_claimed = true;
                if (typeof data.newTokens === 'number') { this.profile.tokens = data.newTokens; }
                else { console.warn("[UserStore:claimChannelReward] newTokens not returned, fetching profile."); await this.fetchProfile(); }
            } else {
                if (data.alreadyClaimed) { this.claimRewardError = data.message || "Награда уже была получена."; this.rewardAlreadyClaimed = true; this.profile.channel_reward_claimed = true; }
                else if (data.subscribed === false) { this.claimRewardError = data.message || "Необходимо подписаться на канал."; }
                else { this.claimRewardError = data.error || data.message || "Не удалось получить награду."; console.warn("[UserStore:claimChannelReward] Unspecified backend error:", data); }
            }
        } catch (err) {
            console.error("[UserStore:claimChannelReward] API Error:", err);
             let errorMsg = 'Ошибка сети/сервера.'; if (err.response?.data?.error) { errorMsg = err.response.data.error; } else if (err.message) { errorMsg = err.message; }
             this.claimRewardError = errorMsg;
        } finally { this.isClaimingReward = false; console.log("[UserStore:claimChannelReward] Action finished."); }
    },
    
  // <<<--- НОВЫЙ ЭКШЕН ДЛЯ ГЛУБОКОГО АНАЛИЗА ---
    async performDeepAnalysis() {
        console.log("[UserStore:performDeepAnalysis] Action started (post-payment).");
        this.isDoingDeepAnalysis = true;
        this.deepAnalysisResult = null;
        this.deepAnalysisError = null;

      // Проверка initData (на всякий случай)
     const tg = window.Telegram?.WebApp; const initDataHeader = tg?.initData;
        if (!initDataHeader) { this.deepAnalysisError = "Telegram InitData не найден."; this.isDoingDeepAnalysis = false; return; }

        try {
            console.log("[UserStore:performDeepAnalysis] Calling API /deep-analysis...");
            // Вызываем эндпоинт анализа (токен больше не списывается там)
            const response = await api.getDeepAnalysis();
            console.log("[UserStore:performDeepAnalysis] Response received:", response.data);

            if (response.data.success) {
                this.deepAnalysisResult = response.data.analysis;
                // Профиль обновлять не нужно, т.к. токены не менялись
            } else {
                // Ошибка от бэкенда (мало снов и т.д.)
                this.deepAnalysisError = response.data.error || "Не удалось выполнить глубокий анализ.";
            }
        } catch (err) {
            console.error("[UserStore:performDeepAnalysis] API Error:", err);
            let errorMsg = 'Ошибка сети/сервера при выполнении анализа.';
            if (err.response?.data?.error) { errorMsg = err.response.data.error; }
            else if (err.message) { errorMsg = err.message; }
            this.deepAnalysisError = errorMsg;
        } finally {
            this.isDoingDeepAnalysis = false;
            console.log("[UserStore:performDeepAnalysis] Action finished.");
        }
    },
    // >>>--- КОНЕЦ ЭКШЕНА ЗАПУСКА АНАЛИЗА ---

    // <<<--- НОВЫЙ ЭКШЕН ДЛЯ ИНИЦИАЦИИ ОПЛАТЫ STARS ЗА АНАЛИЗ ---
    async initiateDeepAnalysisPayment() {
        console.log("[UserStore:initiateDeepPayment] Action started.");
        this.isInitiatingDeepPayment = true;
        this.deepPaymentError = null;
        this.deepAnalysisResult = null; // Сбросим старый результат
        this.deepAnalysisError = null;  // Сбросим старую ошибку анализа

        const tg = window.Telegram?.WebApp;
        let tgUserId = null, initDataHeader = null;
        const amount = 1; // Цена - 1 звезда
        const plan = 'deep_analysis'; // Идентификатор продукта

        try {
            tgUserId = tg?.initDataUnsafe?.user?.id;
            initDataHeader = tg?.initData;
            if (!tgUserId || !initDataHeader) { throw new Error("Не удалось получить данные Telegram."); }

            // Формируем payload: deepanalysis_tgUserId
            const payload = `deepanalysis_${tgUserId}`;
            console.log("[UserStore:initiateDeepPayment] Payload:", payload, "Amount:", amount);

            // Блокируем кнопку на время запроса инвойса
            // (Индикатор загрузки будет управляться isInitiatingDeepPayment)

            console.log("[UserStore:initiateDeepPayment] Preparing invoice request...");
            const baseUrl = import.meta.env.VITE_API_BASE_URL;
            if (!baseUrl) { throw new Error("VITE_API_BASE_URL не настроен."); }
            const targetUrl = `${baseUrl}/create-invoice`;

            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initDataHeader },
                body: JSON.stringify({ plan: plan, amount: amount, payload: payload, duration: 0 }) // duration не важен
            };

            console.log("[UserStore:initiateDeepPayment] Sending invoice request...");
            const response = await fetch(targetUrl, requestOptions);
            console.log("[UserStore:initiateDeepPayment] Invoice response:", response.status, response.ok);

            if (!response.ok) {
                let errorText = `HTTP ${response.status}`;
                try { const d = await response.json(); errorText = d.error || JSON.stringify(d); } catch (e) {}
                throw new Error(`Ошибка создания счета: ${errorText}`);
            }

            const responseData = await response.json();
            const invoiceUrl = responseData?.invoiceUrl;
            if (!invoiceUrl) { throw new Error("Не удалось получить ссылку на счет от сервера."); }
            console.log("[UserStore:initiateDeepPayment] Received invoice URL:", invoiceUrl);

            // Открываем инвойс
            if (tg?.openInvoice) {
                console.log("[UserStore:initiateDeepPayment] Calling tg.openInvoice...");
                tg.openInvoice(invoiceUrl, (status) => {
                    console.log("[UserStore:initiateDeepPayment] Invoice status callback:", status);
                    if (status === 'paid') {
                        alert("Оплата прошла успешно! Начинаем глубокий анализ...");
                        // <<<--- ВЫЗЫВАЕМ АНАЛИЗ ПОСЛЕ ОПЛАТЫ ---
                        this.performDeepAnalysis();
                        // >>>------------------------------------
                    } else if (status === 'failed') {
                        this.deepPaymentError = "Платеж не удался.";
                        alert("Платеж не удался.");
                    } else if (status === 'cancelled') {
                        this.deepPaymentError = "Платеж отменен.";
                        // alert("Платеж отменен."); // Можно не показывать alert при отмене
                    } else {
                        this.deepPaymentError = `Неизвестный статус платежа: ${status}.`;
                        alert(`Статус платежа: ${status}.`);
                    }
                    // Сбрасываем флаг инициации в любом случае после закрытия окна
                    this.isInitiatingDeepPayment = false;
                });
            } else { throw new Error("Метод Telegram openInvoice недоступен."); }

        } catch (error) {
            console.error("[UserStore:initiateDeepPayment] Error caught:", error);
            this.deepPaymentError = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
            alert(this.deepPaymentError);
            this.isInitiatingDeepPayment = false; // Сбрасываем флаг при ошибке
        }
        // Не сбрасываем флаг isInitiatingDeepPayment здесь, если openInvoice был вызван,
        // он сбросится в колбэке openInvoice.
    },
    // >>>--- КОНЕЦ НОВОГО ЭКШЕНА ОПЛАТЫ ---

  },
});