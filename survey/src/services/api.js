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

const api = axios.create({ baseURL: base, withCredentials: true });
const initData = getTelegramInitData();
if (initData) {
  api.defaults.headers.common['X-Telegram-Init-Data'] = initData;
}

export async function getSurveyStatus() {
  const { data } = await api.get('/survey-status');
  return data;
}

export async function submitSurvey(answers, clientId) {
  const { data } = await api.post('/submit-survey', { answers, clientId });
  return data;
}



