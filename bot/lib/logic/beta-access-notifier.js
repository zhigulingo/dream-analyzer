// bot/functions/beta-access-notifier.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_SECRET = process.env.BETA_WEBHOOK_SECRET; // reuse secret for manual trigger

async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
    }
    // Allow GET for scheduled runs; POST with secret for manual trigger
    const isScheduled = event.httpMethod === 'GET';
    const isManual = event.httpMethod === 'POST';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
      return { statusCode: 500, body: 'Server not configured' };
    }
    if (isManual && ADMIN_SECRET) {
      const sent = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];
      if (sent !== ADMIN_SECRET) {
        return { statusCode: 403, body: 'Forbidden' };
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const nowIso = new Date().toISOString();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, tg_id, beta_access_at, beta_notified_access, beta_whitelisted')
      .eq('beta_whitelisted', true)
      .lte('beta_access_at', nowIso)
      .or('beta_notified_access.is.null,beta_notified_access.eq.false');

    if (error) {
      return { statusCode: 500, body: 'DB select error' };
    }

    const list = Array.isArray(users) ? users : [];
    for (const u of list) {
      // Удалим предыдущее статусное DM (approved/soon), если хранится в beta_survey_responses.answers._status
      try {
        const { data: rows } = await supabase
          .from('beta_survey_responses')
          .select('answers')
          .eq('tg_id', u.tg_id)
          .limit(1);
        const ans = Array.isArray(rows) && rows[0] && rows[0].answers && typeof rows[0].answers === 'object' ? rows[0].answers : {};
        const status = ans._status || {};
        const prevSoon = status.soon?.message_id;
        const prevApproved = status.approved?.message_id;
        if (prevSoon) {
          try { await sendTelegramMessage(u.tg_id, ''); } catch (_) {}
          try {
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: u.tg_id, message_id: prevSoon }) });
          } catch (_) {}
        } else if (prevApproved) {
          try {
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: u.tg_id, message_id: prevApproved }) });
          } catch (_) {}
        }
        // Отправим "доступ открыт" с кнопкой открытия приложения
        const TMA_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://dream-analyzer.netlify.app';
        const openMarkup = { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: TMA_URL } }]] };
        const urlSend = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const resp = await fetch(urlSend, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: u.tg_id, text: 'Бета-доступ открыт! Вы можете пользоваться приложением — личный кабинет уже доступен.', reply_markup: openMarkup }) });
        const dataResp = await resp.json().catch(() => ({}));
        const msgId = dataResp?.result?.message_id || null;
        const newStatus = { ...status };
        delete newStatus.soon; delete newStatus.approved;
        newStatus.open = { message_id: msgId, chat_id: u.tg_id, updated_at: new Date().toISOString() };
        await supabase
          .from('beta_survey_responses')
          .update({ answers: { ...ans, _status: newStatus } })
          .eq('tg_id', u.tg_id);
      } catch (_) {
        // Fallback: просто отправим сообщение без трекинга
        const TMA_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://dream-analyzer.netlify.app';
        const openMarkup = { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: TMA_URL } }]] };
        await sendTelegramMessage(u.tg_id, 'Бета-доступ открыт! Вы можете пользоваться приложением — личный кабинет уже доступен.', openMarkup);
      }
      await supabase.from('users').update({ beta_notified_access: true }).eq('id', u.id);
    }

    return { statusCode: 200, body: JSON.stringify({ notified: list.length }) };
  } catch (e) {
    return { statusCode: 500, body: 'Internal error' };
  }
};
