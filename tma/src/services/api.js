// tma/src/services/api.js
import axios from 'axios';

// Определяем базовый URL для функций Netlify
// В режиме разработки используем локальный адрес Netlify Dev,
// в продакшене - реальный URL сайта.
const baseURL = import.meta.env.DEV
  ? '/.netlify/functions' // Для локальной разработки (проксируется Vite)
  : '/.netlify/functions'; // Для продакшена

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Перехватчик для добавления ID пользователя из Telegram в заголовки
apiClient.interceptors.request.use(config => {
  const tgData = window.Telegram?.WebApp?.initDataUnsafe;
//   console.log("TG Init Data Unsafe:", tgData); // Логирование для отладки
  if (tgData?.user?.id) {
    config.headers['X-Telegram-User-Id'] = tgData.user.id;
     // console.log("Attaching X-Telegram-User-Id:", tgData.user.id); // Логирование для отладки
  }
  // Важно: передаем все initData для валидации на бэкенде
  if (window.Telegram?.WebApp?.initData) {
       config.headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
       // console.log("Attaching X-Telegram-Init-Data"); // Логирование для отладки
  }

  return config;
}, error => {
  console.error("Error in request interceptor:", error); // Логирование ошибок интерцептора
  return Promise.reject(error);
});

// --- Методы API ---

// Получить профиль пользователя
const getUserProfile = async (userId) => {
    console.log(`[api.js] getUserProfile called for userId: ${userId}`); // Отладка
    if (!userId) {
        console.error('[api.js] getUserProfile: userId is missing');
        throw new Error('User ID is required');
    }
    try {
        // Передаем userId в URL, т.к. GET запросы не имеют тела
        const response = await apiClient.get(`/user-profile?userId=${userId}`);
        console.log('[api.js] getUserProfile response:', response.data); // Отладка
        return response.data;
    } catch (error) {
        console.error('[api.js] Error fetching user profile:', error.response?.data || error.message);
        throw error;
    }
};

// Получить историю анализов пользователя
const getAnalysesHistory = async (userId) => {
    console.log(`[api.js] getAnalysesHistory called for userId: ${userId}`); // Отладка
     if (!userId) {
        console.error('[api.js] getAnalysesHistory: userId is missing');
        throw new Error('User ID is required');
    }
    try {
        // Передаем userId в URL
        const response = await apiClient.get(`/analyses-history?userId=${userId}`);
        console.log('[api.js] getAnalysesHistory response:', response.data); // Отладка
        // Убедимся, что возвращаем массив, даже если ответ пустой
        return response.data?.analyses || [];
    } catch (error) {
        console.error('[api.js] Error fetching analyses history:', error.response?.data || error.message);
        throw error;
    }
};

// Запросить анализ сна
const analyzeDream = async (userId, dreamText) => {
    console.log(`[api.js] analyzeDream called for userId: ${userId}`); // Отладка
    if (!userId || !dreamText) {
        console.error('[api.js] analyzeDream: userId or dreamText is missing');
        throw new Error('User ID and dream text are required');
    }
    try {
        const response = await apiClient.post('/bot', { // Отправляем на основной endpoint /bot
            action: 'analyze', // Добавляем 'action' для маршрутизации на бэкенде
            userId: userId,     // Передаем userId в теле запроса
            dreamText: dreamText
        });
        console.log('[api.js] analyzeDream response:', response.data); // Отладка
        return response.data; // Ожидаем { success: true, analysis: {...} } или { success: false, error: '...' }
    } catch (error) {
        console.error('[api.js] Error analyzing dream:', error.response?.data || error.message);
        throw error; // Пробрасываем ошибку дальше
    }
};

// Запросить токен за подписку на канал
const claimChannelToken = async (userId) => {
    console.log(`[api.js] claimChannelToken called for userId: ${userId}`); // Отладка
     if (!userId) {
        console.error('[api.js] claimChannelToken: userId is missing');
        throw new Error('User ID is required');
    }
    try {
        const response = await apiClient.post('/claim-channel-token', { userId }); // Передаем userId в теле
        console.log('[api.js] claimChannelToken response:', response.data); // Отладка
        return response.data; // Ожидаем { success: true } или { success: false, error: '...' }
    } catch (error) {
        console.error('[api.js] Error claiming channel token:', error.response?.data || error.message);
        throw error;
    }
};

// Создать инвойс для покупки подписки
const createSubscriptionInvoice = async (userId) => {
    console.log(`[api.js] createSubscriptionInvoice called for userId: ${userId}`);
     if (!userId) {
        console.error('[api.js] createSubscriptionInvoice: userId is missing');
        throw new Error('User ID is required');
    }
    try {
        // Передаем userId в теле запроса
        const response = await apiClient.post('/create-invoice', { userId: userId, type: 'subscription' });
        console.log('[api.js] createSubscriptionInvoice response:', response.data);
        // Ожидаем ответ вида { invoice_slug: '...' }
        if (!response.data?.invoice_slug) {
            throw new Error('Invoice slug not received from server.');
        }
        return response.data;
    } catch (error) {
        console.error('[api.js] Error creating subscription invoice:', error.response?.data || error.message);
        throw error;
    }
};

// *** НОВЫЙ МЕТОД ***
// Создать инвойс для покупки Глубокого Анализа
const createDeepAnalysisInvoice = async (userId) => {
    console.log(`[api.js] createDeepAnalysisInvoice called for userId: ${userId}`);
     if (!userId) {
        console.error('[api.js] createDeepAnalysisInvoice: userId is missing');
        throw new Error('User ID is required');
    }
    try {
        // Передаем userId и тип 'deepAnalysis' в теле запроса
        // Бэкенд должен ожидать этот 'type' в функции /create-invoice
        const response = await apiClient.post('/create-invoice', { userId: userId, type: 'deepAnalysis' });
        console.log('[api.js] createDeepAnalysisInvoice response:', response.data);
        // Ожидаем ответ вида { invoice_slug: '...' }
        if (!response.data?.invoice_slug) {
            throw new Error('Invoice slug not received from server for deep analysis.');
        }
        return response.data;
    } catch (error) {
        console.error('[api.js] Error creating deep analysis invoice:', error.response?.data || error.message);
        throw error;
    }
};


export default {
  getUserProfile,
  getAnalysesHistory,
  analyzeDream,
  claimChannelToken,
  createSubscriptionInvoice,
  createDeepAnalysisInvoice // Экспортируем новую функцию
};