const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleCorsPrelight } = require('../../../bot/functions/shared/middleware/cors');
const { validateTelegramData, isInitDataValid } = require('../../../bot/functions/shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object') return false;
  const hasAll = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'].every(k => k in answers);
  if (!hasAll) return false;
  const q1ok = typeof answers.q1 === 'number' && answers.q1 >= 1 && answers.q1 <= 10;
  const btn = v => typeof v === 'string' && v.length > 0;
  const text = v => typeof v === 'string' && v.trim().length > 3;
  return q1ok && btn(answers.q2) && btn(answers.q3) && btn(answers.q4) && btn(answers.q5)
         && btn(answers.q6) && text(answers.q7) && text(answers.q8) && btn(answers.q9) && btn(answers.q10);
}

exports.handler = async (event) => {
  const ALLOWED_SURVEY_ORIGIN = process.env.ALLOWED_SURVEY_ORIGIN || '';
  const corsHeaders = getCorsHeaders(event, [ALLOWED_SURVEY_ORIGIN]);
  const pre = handleCorsPrelight(event, [ALLOWED_SURVEY_ORIGIN]);
  if (pre) return pre;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { answers, clientId } = body;

    if (!validateAnswers(answers)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid answers' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // Попытка авторизоваться через Telegram InitData
    const initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    const botToken = process.env.BOT_TOKEN;

    let upsertPayload = { answers, updated_at: new Date().toISOString() };
    let onConflictColumn;

    if (initData && botToken && isInitDataValid(initData)) {
      const res = validateTelegramData(initData, botToken, { enableLogging: true });
      if (res.valid && res.data && typeof res.data.id !== 'undefined') {
        upsertPayload.tg_id = res.data.id;
        onConflictColumn = 'tg_id';
      }
    }

    // Fallback: локальный client_id
    if (!onConflictColumn) {
      if (clientId) {
        upsertPayload.client_id = clientId;
        onConflictColumn = 'client_id';
      }
    }

    const { error } = await supabase
      .from('beta_survey_responses')
      .upsert(upsertPayload, { onConflict: onConflictColumn });

    if (error) {
      console.error('[submit-survey] upsert error', error);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Database error' }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('[submit-survey] exception', e);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal error' }) };
  }
};



