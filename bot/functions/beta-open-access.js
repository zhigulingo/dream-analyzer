// bot/functions/beta-open-access.js
// Manual override: open access immediately or set custom access_at for a user

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_SECRET = process.env.BETA_WEBHOOK_SECRET;

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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
      return { statusCode: 500, body: 'Server not configured' };
    }
    if (ADMIN_SECRET) {
      const sent = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];
      if (sent !== ADMIN_SECRET) {
        return { statusCode: 403, body: 'Forbidden' };
      }
    }
    const body = JSON.parse(event.body || '{}');
    const tgId = body.tg_id;
    const when = body.at || 'now'; // ISO string or 'now'
    const notify = Boolean(body.notify !== false); // default true
    if (!tgId) return { statusCode: 400, body: 'Missing tg_id' };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: user, error: selErr } = await supabase
      .from('users')
      .select('id, tg_id')
      .eq('tg_id', tgId)
      .single();
    if (selErr || !user) {
      return { statusCode: 404, body: 'User not found' };
    }

    const accessAt = when === 'now' ? new Date() : new Date(when);
    if (isNaN(accessAt.getTime())) {
      return { statusCode: 400, body: 'Invalid at value' };
    }

    const { error: updErr } = await supabase
      .from('users')
      .update({ beta_whitelisted: true, beta_access_at: accessAt.toISOString() })
      .eq('id', user.id);
    if (updErr) {
      return { statusCode: 500, body: 'DB update error' };
    }

    if (notify) {
      await sendTelegramMessage(user.tg_id, 'Бета-доступ открыт! Вы можете пользоваться приложением — личный кабинет уже доступен.');
      await supabase.from('users').update({ beta_notified_access: true }).eq('id', user.id);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, access_at: accessAt.toISOString() }) };
  } catch (e) {
    return { statusCode: 500, body: 'Internal error' };
  }
};
