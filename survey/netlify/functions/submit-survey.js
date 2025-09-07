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
    const { answers, clientId, answerKey, answerValue, index, completed } = body;

    const isFinalSubmit = !!answers && typeof answers === 'object';
    if (isFinalSubmit && !validateAnswers(answers)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid answers' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // Попытка авторизоваться через Telegram InitData
    const initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    const botToken = process.env.BOT_TOKEN;
    try {
      console.log('[submit-survey] TMA header present:', !!initData, 'len:', initData ? String(initData).length : 0, 'botToken set:', !!botToken);
    } catch (_) {}

    let upsertPayload = { updated_at: new Date().toISOString() };
    if (isFinalSubmit) {
      upsertPayload.answers = answers;
      upsertPayload.completed = true;
      upsertPayload.last_answered_index = 9; // 0-based index of q10
      // Дублируем по колонкам, если они существуют
      try {
        Object.entries(answers || {}).forEach(([k,v]) => { if (k.startsWith('q')) upsertPayload[k] = String(v); });
      } catch (_) {}
    } else if (answerKey && typeof answerValue !== 'undefined') {
      upsertPayload.completed = !!completed;
      if (typeof index === 'number') upsertPayload.last_answered_index = index;
      upsertPayload[answerKey] = String(answerValue);
      // answers JSON будет обновлён через select+merge ниже
    }
    let onConflictColumn;

    if (initData && botToken && isInitDataValid(initData)) {
      const res = validateTelegramData(initData, botToken, { enableLogging: true });
      try { console.log('[submit-survey] validateTelegramData:', { valid: res?.valid, hasData: !!res?.data, userId: res?.data?.id }); } catch (_) {}
      if (res.valid && res.data && typeof res.data.id !== 'undefined') {
        upsertPayload.tg_id = res.data.id;
        onConflictColumn = 'tg_id';
      }
    } else {
      try { console.warn('[submit-survey] TMA validation skipped. Reasons:', { hasInitData: !!initData, hasBotToken: !!botToken, initDataValid: initData ? isInitDataValid(initData) : false }); } catch (_) {}
    }

    // Fallback: локальный client_id
    if (!onConflictColumn) {
      if (clientId) {
        upsertPayload.client_id = clientId;
        onConflictColumn = 'client_id';
      }
    }

    // Найдём существующую запись
    const idCol = onConflictColumn;
    const keyVal = idCol === 'tg_id' ? upsertPayload.tg_id : upsertPayload.client_id;
    let existing = null;
    if (idCol && keyVal) {
      const { data: rows } = await supabase
        .from('beta_survey_responses')
        .select('id, answers')
        .eq(idCol, keyVal)
        .limit(1);
      existing = Array.isArray(rows) && rows[0] ? rows[0] : null;
    }

    let error = null;
    if (!existing) {
      // Вставка новой
      const insertPayload = { ...upsertPayload };
      if (idCol === 'tg_id') insertPayload.tg_id = keyVal;
      if (idCol === 'client_id') insertPayload.client_id = keyVal;
      // Если это частичный ответ, и есть answerKey — сформируем answers JSON
      if (!isFinalSubmit && answerKey) {
        insertPayload.answers = { [answerKey]: answerValue };
      }
      ({ error } = await supabase.from('beta_survey_responses').insert(insertPayload));
    } else {
      // Обновление существующей записи; при частичном ответе обновим JSON answers
      const updatePayload = { ...upsertPayload };
      if (!isFinalSubmit && answerKey) {
        const prev = (existing.answers && typeof existing.answers === 'object') ? existing.answers : {};
        updatePayload.answers = { ...prev, [answerKey]: answerValue };
      }
      ({ error } = await supabase
        .from('beta_survey_responses')
        .update(updatePayload)
        .eq(idCol, keyVal));
    }

    if (error) {
      console.error('[submit-survey] upsert error', { onConflictColumn, upsertPayloadSummary: { hasTg: !!upsertPayload.tg_id, hasClient: !!upsertPayload.client_id }, error });
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Database error', code: error.code, details: error.message }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('[submit-survey] exception', { message: e?.message, stack: e?.stack, body: event.body });
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal error', details: e?.message }) };
  }
};



