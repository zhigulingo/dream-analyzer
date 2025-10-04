// bot/functions/edit-start-button.js
// Edits the last /start message button for a user to point to survey TMA

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SECRET = process.env.BETA_ANNOUNCE_SECRET; // optional

  if (!BOT_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured (BOT_TOKEN)' }) };
  }
  if (SECRET) {
    const got = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
    if (got !== SECRET) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const tgId = Number(body.tg_id || body.chat_id);
    const appUrl = body.web_app_url || body.url || 'https://t.me/dreamtestaibot/betasurvey';
    const buttonText = String(body.text || body.button_text || 'Принять участие');
    if (!Number.isFinite(tgId)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'tg_id is required' }) };

    // Fetch last_start_message_id from users
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured (Supabase)' }) };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from('users')
      .select('last_start_message_id')
      .eq('tg_id', tgId)
      .single();
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB error', details: error.message }) };
    const messageId = data?.last_start_message_id;
    if (!messageId) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No start message to edit' }) };

    // Prepare reply markup: use URL button to t.me survey link
    const reply_markup = { inline_keyboard: [[{ text: buttonText, url: appUrl }]] };
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgId, message_id: messageId, reply_markup })
    });
    const dataResp = await resp.json().catch(() => ({}));
    if (!resp.ok || dataResp.ok === false) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Telegram API error', details: dataResp }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', details: e?.message }) };
  }
};
