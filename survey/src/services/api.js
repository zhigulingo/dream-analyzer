import axios from 'axios';

const base = import.meta.env.VITE_FUNCTIONS_BASE_URL || '/api';

function getTelegramInitData() {
  try {
    // Доступно, если приложение открыто как Telegram WebApp
    return window?.Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
}

// С учётом CORS заголовков функций достаточно не отправлять cookies
const api = axios.create({ baseURL: base, withCredentials: false });
// Динамически пробуем добавить InitData перед каждым запросом, чтобы не терять его при релоде
api.interceptors.request.use((config) => {
  const initData = getTelegramInitData();
  if (initData) {
    config.headers = config.headers || {};
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
});

export async function getSurveyStatus() {
  const { data } = await api.get('/survey-status');
  return data;
}

export async function submitSurvey(answers, clientId) {
  const { data } = await api.post('/submit-survey', { answers, clientId });
  return data;
}



