// bot/functions/send-survey-announcement.js
// Sends beta survey announcement to a channel with inline "Принять участие" WebApp button

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const TMA_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN;
  const SECRET = process.env.BETA_ANNOUNCE_SECRET;

  if (!BOT_TOKEN || !TMA_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }
  if (SECRET) {
    const got = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
    if (got !== SECRET) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const chatId = body.chat_id || process.env.BETA_CHANNEL_ID;
    if (!chatId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'chat_id is required' }) };

    const text = body.text || (
      'Дорогие друзья, наконец мы готовы пригласить вас принять участие в бета тесте! Благодарим за ваш интерес и желание пользоваться приложением. В ближайшее время некоторые из вас смогут стать первыми, кто увидить и воспользуется обновленным приложением и расширенным функционалом. Откликнуться и принять участие можно кликнув по кнопке ниже'
    );

    // Allow overriding app URL via body.web_app_url/app_url; use URL button for t.me links, else web_app
    const overrideUrl = body.web_app_url || body.app_url || null;
    const finalUrl = overrideUrl || TMA_URL;
    const isTme = typeof finalUrl === 'string' && finalUrl.startsWith('https://t.me/');
    const reply_markup = isTme
      ? { inline_keyboard: [[{ text: 'Принять участие', url: finalUrl }]] }
      : { inline_keyboard: [[{ text: 'Принять участие', web_app: { url: finalUrl } }]] };

    const payload = { chat_id: chatId, text, reply_markup };
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.ok === false) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Telegram API error', details: data }) };
    }
    // Persist announcement message reference for per-user follow-up (button text update after submission)
    try {
      const numericChatId = Number(chatId);
      if (Number.isFinite(numericChatId)) {
        const { createClient } = require('@supabase/supabase-js');
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
          const msgId = data?.result?.message_id || null;
          const nowIso = new Date().toISOString();
          const { data: rows } = await supabase
            .from('beta_survey_responses')
            .select('id, answers')
            .eq('tg_id', numericChatId)
            .limit(1);
          const existing = Array.isArray(rows) && rows[0] ? rows[0] : null;
          const prevAns = existing && existing.answers && typeof existing.answers === 'object' ? existing.answers : {};
          const merged = { ...prevAns, _announce: { chat_id: numericChatId, message_id: msgId, updated_at: nowIso } };
          if (existing) {
            await supabase.from('beta_survey_responses').update({ answers: merged, updated_at: nowIso }).eq('tg_id', numericChatId);
          } else {
            await supabase.from('beta_survey_responses').insert({ tg_id: numericChatId, answers: merged, updated_at: nowIso });
          }
        }
      }
    } catch (_) {}

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, result: data.result || null }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', details: e?.message }) };
  }
};
