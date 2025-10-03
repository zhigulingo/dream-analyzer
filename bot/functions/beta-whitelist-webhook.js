// bot/functions/beta-whitelist-webhook.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.BETA_WEBHOOK_SECRET;

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
    if (WEBHOOK_SECRET) {
      const sent = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];
      if (sent !== WEBHOOK_SECRET) {
        return { statusCode: 403, body: 'Forbidden' };
      }
    }

    const body = JSON.parse(event.body || '{}');
    const tgId = body.tg_id;
    const delayHours = Number(body.delay_hours || 24);
    if (!tgId) return { statusCode: 400, body: 'Missing tg_id' };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const now = new Date();
    const accessAt = new Date(now.getTime() + Math.max(1, delayHours) * 3600 * 1000);

    // Update user gate fields; do not override if already set
    const { data: user, error: selErr } = await supabase
      .from('users')
      .select('id, beta_whitelisted, beta_approved_at, beta_access_at, beta_notified_approved')
      .eq('tg_id', tgId)
      .single();
    if (selErr) {
      return { statusCode: 500, body: 'DB select error' };
    }
    if (!user) {
      return { statusCode: 404, body: 'User not found' };
    }

    const patch = { beta_whitelisted: true };
    if (!user.beta_approved_at) patch.beta_approved_at = now.toISOString();
    if (!user.beta_access_at) patch.beta_access_at = accessAt.toISOString();

    const { error: updErr } = await supabase
      .from('users')
      .update(patch)
      .eq('id', user.id);
    if (updErr) {
      return { statusCode: 500, body: 'DB update error' };
    }

    if (!user.beta_notified_approved) {
      await sendTelegramMessage(tgId, 'Вы одобрены для бета-теста! Доступ к приложению откроется через 24 часа. Мы уведомим вас, когда всё будет готово.');
      await supabase.from('users').update({ beta_notified_approved: true }).eq('id', user.id);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, access_at: patch.beta_access_at || user.beta_access_at }) };
  } catch (e) {
    return { statusCode: 500, body: 'Internal error' };
  }
};
