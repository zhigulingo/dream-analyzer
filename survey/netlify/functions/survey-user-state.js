const { createClient } = require('@supabase/supabase-js');
const { validateTelegramData } = require('../../../bot/functions/shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: 'Method Not Allowed' };
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'] || '';
    const sp = event.queryStringParameters || {};
    const clientId = sp.client_id || '';

    let tgId = null;
    if (initData) {
      try {
        const v = validateTelegramData(initData, process.env.BOT_TOKEN, { enableLogging: false });
        if (v.valid && v.data && typeof v.data.id !== 'undefined') tgId = v.data.id;
      } catch {}
    }

    let row = null;
    if (tgId) {
      const { data } = await supabase
        .from('beta_survey_responses')
        .select('approved, submitted_at, answers')
        .eq('tg_id', tgId)
        .limit(1);
      row = Array.isArray(data) && data[0] ? data[0] : null;
    } else if (clientId) {
      const { data } = await supabase
        .from('beta_survey_responses')
        .select('approved, submitted_at, answers')
        .eq('client_id', clientId)
        .limit(1);
      row = Array.isArray(data) && data[0] ? data[0] : null;
    }

    const submitted = !!(row && (row.submitted_at || (row.answers && row.answers._progress && row.answers._progress.completed)));
    const approved = !!(row && row.approved === true);
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ submitted, approved }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
