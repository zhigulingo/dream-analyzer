// bot/functions/set-demographics.js
const { createClient } = require('@supabase/supabase-js');
const { validateTelegramData } = require('./shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_TMA_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
    }
    const initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    const v = validateTelegramData(initData, BOT_TOKEN, { enableLogging: false });
    if (!v.valid || !v.data?.id) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const body = JSON.parse(event.body || '{}');
    const age_range = String(body.age_range || '').trim();
    const gender = String(body.gender || '').trim();
    const ageAllow = new Set(['0-20','20-30','30-40','40-50','50+']);
    const genderAllow = new Set(['male','female']);
    if (!ageAllow.has(age_range) || !genderAllow.has(gender)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid demographics' }) };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabase
      .from('users')
      .update({ age_range, gender })
      .eq('tg_id', v.data.id);
    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB error' }) };
    }
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
