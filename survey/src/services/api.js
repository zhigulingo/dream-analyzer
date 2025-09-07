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
  // Используем fetch с keepalive, чтобы запрос не обрывался при закрытии TWA
  const url = base + '/submit-survey';
  const headers = { 'Content-Type': 'application/json' };
  const initData = getTelegramInitData();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers, clientId }),
    keepalive: true,
    credentials: 'omit'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[submitSurvey] HTTP error', res.status, text);
  }
  try { return await res.json(); } catch { return { ok: res.ok }; }
}

export async function submitSurveyStep({ answerKey, answerValue, index, completed }, clientId) {
  const url = base + '/submit-survey';
  const headers = { 'Content-Type': 'application/json' };
  const initData = getTelegramInitData();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  const body = { answerKey, answerValue, index, completed, clientId };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true, credentials: 'omit' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[submitSurveyStep] HTTP error', res.status, text);
  }
  try { return await res.json(); } catch { return { ok: res.ok }; }
}



