// web/src/stores/user.js
import { defineStore } from 'pinia';
import apiService from '@/utils/api.js';

// Константа для требуемого количества снов
const REQUIRED_DREAMS = 5;

// Экспортируем константу для использования в компонентах
export { REQUIRED_DREAMS };

export const useUserStore = defineStore('user', {
  state: () => ({
    // Профиль пользователя
    profile: { 
      tokens: null, 
      subscription_type: 'free', 
      subscription_end: null,
      channel_reward_claimed: false,
      deep_analysis_credits: 0
    },
    
    // История анализов
    history: [],
    
    // Состояния загрузки
    isLoadingProfile: false,
    isLoadingHistory: false,
    
    // Ошибки
    errorProfile: null,
    errorHistory: null,
    
    // Web-специфичное состояние
    webUser: null, // Данные пользователя из JWT/localStorage
    isAuthenticated: false,
    
    // Retry состояния
    retryState: {
      fetchProfile: { count: 0, isRetrying: false },
      fetchHistory: { count: 0, isRetrying: false }
    },
    
    // Глубокий анализ
    isDoingDeepAnalysis: false,
    isInitiatingDeepPayment: false,
    deepAnalysisResult: null,
    deepAnalysisError: null,
    deepPaymentError: null
  }),

  getters: {
    isPremium: (state) => state.profile.subscription_type === 'premium',
    hasHistory: (state) => state.history && state.history.length > 0,
    canRetry: (state) => (action, maxRetries = 3) => {
      return state.retryState[action]?.count < maxRetries;
    },
    
    // Проверка возможности выполнения глубокого анализа
    canAttemptDeepAnalysis: (state) =>
        !state.isLoadingProfile && // Профиль загружен
        !state.isInitiatingDeepPayment && // Не идет оплата
        !state.isDoingDeepAnalysis &&    // Не идет анализ
        !state.isLoadingHistory &&
        state.history && state.history.length >= REQUIRED_DREAMS // Есть нужное количество снов
  },

  actions: {
    // Инициализация пользователя из localStorage
    initUser() {
      try {
        const userData = localStorage.getItem('telegram_user');
        if (userData) {
          this.webUser = JSON.parse(userData);
          this.isAuthenticated = true;
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
      }
    },

    // Сохранение пользователя в localStorage
    setWebUser(userData) {
      this.webUser = userData;
      this.isAuthenticated = true;
      try {
        localStorage.setItem('telegram_user', JSON.stringify(userData));
      } catch (error) {
        console.error('Error saving user to localStorage:', error);
      }
    },

    // Загрузка профиля через web API
    async fetchProfile() {
      this.isLoadingProfile = true;
      this.errorProfile = null;
      
      try {
        console.log('[UserStore:fetchProfile] Starting profile fetch...');
        
        const response = await apiService.post('/user-profile');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[UserStore:fetchProfile] Backend error:', errorText);
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        this.profile = { ...this.profile, ...data };
        console.log('[UserStore] Profile loaded:', this.profile);
        
        // Сбросить retry состояние при успехе
        this.retryState.fetchProfile = { count: 0, isRetrying: false };
        
      } catch (error) {
        console.error('[UserStore:fetchProfile] Error:', error);
        this.errorProfile = error.message || 'Failed to load profile';
        throw error;
      } finally {
        this.isLoadingProfile = false;
      }
    },

    // Retry версия fetchProfile
    async retryFetchProfile() {
      if (!this.canRetry('fetchProfile')) {
        console.warn('Max retries reached for fetchProfile');
        return;
      }
      
      this.retryState.fetchProfile.count++;
      this.retryState.fetchProfile.isRetrying = true;
      
      try {
        await this.fetchProfile();
      } catch (error) {
        console.error('Retry fetchProfile failed:', error);
      } finally {
        this.retryState.fetchProfile.isRetrying = false;
      }
    },

    // Загрузка истории через web API
    async fetchHistory() {
      this.isLoadingHistory = true;
      this.errorHistory = null;
      
      try {
        console.log('[UserStore:fetchHistory] Starting history fetch...');
        
        const response = await apiService.get('/analyses-history');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[UserStore:fetchHistory] Backend error:', errorText);
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        this.history = data;
        console.log('[UserStore] History loaded:', this.history.length, 'items');
        
        // Сбросить retry состояние при успехе
        this.retryState.fetchHistory = { count: 0, isRetrying: false };
        
      } catch (error) {
        console.error('[UserStore:fetchHistory] Error:', error);
        this.errorHistory = error.message || 'Failed to load history';
        throw error;
      } finally {
        this.isLoadingHistory = false;
      }
    },

    // Retry версия fetchHistory
    async retryFetchHistory() {
      if (!this.canRetry('fetchHistory')) {
        console.warn('Max retries reached for fetchHistory');
        return;
      }
      
      this.retryState.fetchHistory.count++;
      this.retryState.fetchHistory.isRetrying = true;
      
      try {
        await this.fetchHistory();
      } catch (error) {
        console.error('Retry fetchHistory failed:', error);
      } finally {
        this.retryState.fetchHistory.isRetrying = false;
      }
    },

    // Очистка ошибок
    clearErrors() {
      this.errorProfile = null;
      this.errorHistory = null;
    },

    // Логаут
    async logout() {
      try {
        console.log('[UserStore] Logging out...');
        await apiService.logout();
      } catch (error) {
        console.error('[UserStore] Logout error:', error);
      } finally {
        // Очистить состояние независимо от результата
        this.profile = { 
          tokens: null, 
          subscription_type: 'free', 
          subscription_end: null,
          channel_reward_claimed: false,
          deep_analysis_credits: 0
        };
        this.history = [];
        this.webUser = null;
        this.isAuthenticated = false;
        
        // Очистить состояние глубокого анализа
        this.isDoingDeepAnalysis = false;
        this.isInitiatingDeepPayment = false;
        this.deepAnalysisResult = null;
        this.deepAnalysisError = null;
        this.deepPaymentError = null;
        
        this.clearErrors();
        
        // Очистить localStorage
        try {
          localStorage.removeItem('telegram_user');
        } catch (error) {
          console.error('Error clearing localStorage:', error);
        }
        
        console.log('[UserStore] Logout completed');
      }
    },

    // Проверка аутентификации
    async checkAuthentication() {
      try {
        const isAuth = await apiService.checkAuth();
        this.isAuthenticated = isAuth;
        return isAuth;
      } catch (error) {
        console.error('[UserStore] Auth check failed:', error);
        this.isAuthenticated = false;
        return false;
      }
    },

    // Выполнение глубокого анализа (после оплаты или при наличии кредитов)
    async performDeepAnalysis() {
      console.log('[UserStore:performDeepAnalysis] Action started');
      this.isDoingDeepAnalysis = true;
      this.deepAnalysisResult = null;
      this.deepAnalysisError = null;

      try {
        console.log('[UserStore:performDeepAnalysis] Calling API /deep-analysis...');
        const response = await apiService.getDeepAnalysis();
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[UserStore:performDeepAnalysis] Backend error:', errorText);
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[UserStore:performDeepAnalysis] Response received:', data);

        if (data.success) {
          this.deepAnalysisResult = data.analysis;
          // Обновляем профиль, т.к. кредиты глубокого анализа изменились
          await this.fetchProfile();
        } else {
          this.deepAnalysisError = data.error || 'Не удалось выполнить глубокий анализ.';
        }
      } catch (err) {
        console.error('[UserStore:performDeepAnalysis] API Error:', err);
        let errorMsg = 'Ошибка сети/сервера при выполнении анализа.';
        if (err.message) { 
          errorMsg = err.message; 
        }
        this.deepAnalysisError = errorMsg;
      } finally {
        this.isDoingDeepAnalysis = false;
        console.log('[UserStore:performDeepAnalysis] Action finished');
      }
    },

    // Инициация покупки глубокого анализа (заглушка для веб-версии)
    async initiateDeepAnalysisPayment() {
      console.log('[UserStore:initiateDeepAnalysisPayment] Action started');
      this.isInitiatingDeepPayment = true;
      this.deepPaymentError = null;
      this.deepAnalysisResult = null;
      this.deepAnalysisError = null;

      try {
        // Для веб-версии пока показываем сообщение о покупке кредитов в боте
        this.deepPaymentError = 'Для покупки кредитов глубокого анализа используйте Telegram-бота';
      } catch (error) {
        console.error('[UserStore:initiateDeepAnalysisPayment] Error:', error);
        this.deepPaymentError = error.message || 'Ошибка при инициации платежа';
      } finally {
        this.isInitiatingDeepPayment = false;
        console.log('[UserStore:initiateDeepAnalysisPayment] Action finished');
      }
    }
  }
});