import axios from 'axios';

const base = import.meta.env.VITE_FUNCTIONS_BASE_URL || '/api';
function enqueuePending(path, payload) {
  try {
    const key = 'survey_pending_queue';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ path, payload, ts: Date.now() });
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export async function flushPendingQueue() {
  const key = 'survey_pending_queue';
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  if (!Array.isArray(list) || list.length === 0) return;
  const remaining = [];
  for (const item of list) {
    try {
      const initData = getTelegramInitData();
      const headers = { 'Content-Type': 'application/json' };
      if (initData) headers['X-Telegram-Init-Data'] = initData;
      const res = await fetch(base + item.path, { method: 'POST', headers, body: JSON.stringify({ ...item.payload, initData }), credentials: 'omit' });
      if (!res.ok) remaining.push(item);
    } catch { remaining.push(item); }
  }
  try { localStorage.setItem(key, JSON.stringify(remaining)); } catch {}
}

function trySendBeacon(path, payload) {
  try {
    if (!('navigator' in window) || typeof navigator.sendBeacon !== 'function') return false;
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    return navigator.sendBeacon(base + path, blob);
  } catch { return false; }
}

function getTelegramInitData() {
  try {
    // 1) Основной источник
    const direct = window?.Telegram?.WebApp?.initData;
    if (direct && typeof direct === 'string' && direct.length > 0) return direct;
  } catch {}
  try {
    // 2) URL-параметр tgWebAppData
    const sp = new URLSearchParams(location.search);
    const fromQuery = sp.get('tgWebAppData') || sp.get('initData');
    if (fromQuery && typeof fromQuery === 'string' && fromQuery.length > 0) return decodeURIComponent(fromQuery);
  } catch {}
  try {
    // 3) Кэш из localStorage (создаётся в main.js при старте)
    const cached = localStorage.getItem('tma_init_data');
    if (cached && cached.length > 0) return cached;
  } catch {}
  return '';
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
  const payload = { answers, clientId, initData };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'omit'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[submitSurvey] HTTP error', res.status, text);
    // Пытаемся через sendBeacon и кладём в очередь
    const ok = trySendBeacon('/submit-survey', payload);
    if (!ok) enqueuePending('/submit-survey', payload);
  }
  try { return await res.json(); } catch { return { ok: res.ok }; }
}

export async function submitSurveyStep({ answerKey, answerValue, index, completed }, clientId) {
  const url = base + '/submit-survey';
  const headers = { 'Content-Type': 'application/json' };
  const initData = getTelegramInitData();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  const body = { answerKey, answerValue, index, completed, clientId, initData };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true, credentials: 'omit' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[submitSurveyStep] HTTP error', res.status, text);
    const ok = trySendBeacon('/submit-survey', body);
    if (!ok) enqueuePending('/submit-survey', body);
  }
  try { return await res.json(); } catch { return { ok: res.ok }; }
}



