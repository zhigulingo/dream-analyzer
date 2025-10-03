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
      await sendTelegramMessage(u.tg_id, 'Бета-доступ открыт! Вы можете пользоваться приложением — личный кабинет уже доступен.');
      await supabase.from('users').update({ beta_notified_access: true }).eq('id', u.id);
    }

    return { statusCode: 200, body: JSON.stringify({ notified: list.length }) };
  } catch (e) {
    return { statusCode: 500, body: 'Internal error' };
  }
};
