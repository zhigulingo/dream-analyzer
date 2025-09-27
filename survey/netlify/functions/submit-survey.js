const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleCorsPrelight } = require('../../../bot/functions/shared/middleware/cors');
const { validateTelegramData, isInitDataValid } = require('../../../bot/functions/shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object') return false;
  const hasAll = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'].every(k => k in answers);
  if (!hasAll) return false;
  // q1 теперь кнопки: принимаем строку
  const q1ok = typeof answers.q1 === 'string' && answers.q1.length > 0;
  const btn = v => typeof v === 'string' && v.length > 0;
  const text = v => typeof v === 'string' && v.trim().length > 3;
  return q1ok && btn(answers.q2) && btn(answers.q3) && btn(answers.q4) && btn(answers.q5)
         && btn(answers.q6) && text(answers.q7) && text(answers.q8) && btn(answers.q9) && btn(answers.q10);
}

exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const ALLOWED_SURVEY_ORIGIN = process.env.ALLOWED_SURVEY_ORIGIN || '';
  const allowed = [ALLOWED_SURVEY_ORIGIN, requestOrigin].filter(Boolean);
  const corsHeaders = getCorsHeaders(event, allowed);
  const pre = handleCorsPrelight(event, allowed);
  if (pre) return pre;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { answers, clientId, answerKey, answerValue, index, completed, sessionId } = body;

    const isFinalSubmit = !!answers && typeof answers === 'object';
    if (isFinalSubmit && !validateAnswers(answers)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid answers' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // Определяем идентификатор пользователя
    let upsertPayload = { updated_at: new Date().toISOString() };
    let userIdentifier = null;

    // Попытка авторизоваться через Telegram InitData
    let initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    // Фолбэк: берём из тела, если не пришло в заголовке
    if ((!initData || initData.length === 0) && typeof body?.initData === 'string') {
      initData = body.initData;
    }
    const botToken = process.env.BOT_TOKEN;

    if (initData && botToken && isInitDataValid(initData)) {
      const res = validateTelegramData(initData, botToken, { enableLogging: true });
      if (res.valid && res.data && typeof res.data.id !== 'undefined') {
        upsertPayload.tg_id = res.data.id;
        userIdentifier = { type: 'tg_id', value: res.data.id };
      }
    } else {
      // Fallback: локальный client_id
      if (clientId) {
        upsertPayload.client_id = clientId;
        userIdentifier = { type: 'client_id', value: clientId };
      }
    }

    // Всегда создаём новую запись для каждого ответа
    const insertPayload = { ...upsertPayload };

    if (isFinalSubmit) {
      // Финальная отправка: сохраняем все ответы
      insertPayload.answers = {
        ...(answers || {}),
        _progress: { last_index: 9, completed: true },
        _session: sessionId || ('s_'+Date.now())
      };
      insertPayload.submitted_at = new Date().toISOString();
    } else if (answerKey && typeof answerValue !== 'undefined') {
      // Частичный ответ: создаём новую запись с прогрессом
      insertPayload.answers = {
        _session: sessionId || ('s_'+Date.now()),
        [answerKey]: answerValue,
        _progress: { last_index: typeof index === 'number' ? index : 0, completed: !!completed }
      };
    }

    const { error } = await supabase.from('beta_survey_responses').insert(insertPayload);

    try {
      console.log('[submit-survey] insert success', {
        userIdentifier: userIdentifier ? `${userIdentifier.type}:${userIdentifier.value}` : 'none',
        isFinalSubmit,
        answerKey
      });
    } catch (_) {}

    if (error) {
      console.error('[submit-survey] insert error', {
        userIdentifier: userIdentifier ? `${userIdentifier.type}:${userIdentifier.value}` : 'none',
        error
      });
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Database error', code: error.code, details: error.message }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('[submit-survey] exception', { message: e?.message, stack: e?.stack, body: event.body });
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal error', details: e?.message }) };
  }
};



