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
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const initDataHeader = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    const validation = validateTelegramData(initDataHeader, BOT_TOKEN, { enableLogging: false });
    if (!validation.valid || !validation.data?.id) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const body = JSON.parse(event.body || '{}');
    const stage = String(body.stage || '').trim();
    const allowed = new Set(['stage1', 'stage2', 'stage3']);
    if (!allowed.has(stage)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid stage' }) };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: user } = await supabase.from('users').select('id, subscription_type').eq('tg_id', validation.data.id).single();
    if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
    let nextSubscription = user.subscription_type || 'free';
    const currentLower = String(nextSubscription || '').toLowerCase();
    if (stage === 'stage1') nextSubscription = 'onboarding1';
    if (stage === 'stage2') nextSubscription = 'onboarding2';
    // Исправлено: переводим в free для любых вариантов onboarding* (без учёта регистра)
    if (stage === 'stage3' && currentLower.startsWith('onboarding')) {
      nextSubscription = 'free';
    }
    await supabase.from('users').update({ subscription_type: nextSubscription }).eq('id', user.id);
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, stage, subscription_type: nextSubscription }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};


