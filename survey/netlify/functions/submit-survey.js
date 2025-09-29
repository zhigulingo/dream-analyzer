const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleCorsPrelight } = require('../../../bot/functions/shared/middleware/cors');
const { validateTelegramData, isInitDataValid } = require('../../../bot/functions/shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object') return false;
  const hasAll = ['q1','q2','q3','q4','q6','q7','q8','q9'].every(k => k in answers);
  if (!hasAll) return false;
  // q1 теперь кнопки: принимаем строку
  const q1ok = typeof answers.q1 === 'string' && answers.q1.length > 0;
  const btn = v => typeof v === 'string' && v.length > 0;
  const text = v => typeof v === 'string' && v.trim().length > 3;
  return q1ok && btn(answers.q2) && btn(answers.q3) && btn(answers.q4)
         && btn(answers.q6) && text(answers.q7) && text(answers.q8) && btn(answers.q9);
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

    // Попытка авторизоваться через Telegram InitData
    let initData = event.headers['x-telegram-init-data'] || event.headers['X-Telegram-Init-Data'];
    // Фолбэк: берём из тела, если не пришло в заголовке
    if ((!initData || initData.length === 0) && typeof body?.initData === 'string') {
      initData = body.initData;
      try { console.log('[submit-survey] using initData from body:', !!initData, 'len:', initData ? String(initData).length : 0); } catch (_) {}
    }
    const botToken = process.env.BOT_TOKEN;
    try {
      console.log('[submit-survey] TMA header present:', !!initData, 'len:', initData ? String(initData).length : 0, 'botToken set:', !!botToken);
    } catch (_) {}

    let upsertPayload = { updated_at: new Date().toISOString() };
    if (isFinalSubmit) {
      // финальная отправка: сохраняем все ответы и прогресс в JSON
      upsertPayload.answers = {
        ...(answers || {}),
        _progress: { last_index: 7, completed: true }
      };
      upsertPayload.submitted_at = new Date().toISOString();
    } else if (answerKey && typeof answerValue !== 'undefined') {
      // частичный ответ: прогресс будет слит в JSON на этапе insert/update ниже
      // никаких qN полей на верхнем уровне не пишем, чтобы не зависеть от схемы
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

    // Найдём существующую запись (всегда по ключу пользователя, чтобы избежать дублей)
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
        insertPayload.answers = { _session: sessionId || ('s_'+Date.now()), [answerKey]: answerValue, _progress: { last_index: typeof index === 'number' ? index : 0, completed: !!completed } };
      } else if (isFinalSubmit) {
        const sess = sessionId || ('s_'+Date.now());
        insertPayload.answers = { ...(insertPayload.answers || {}), _session: sess };
      }
      ({ error } = await supabase.from('beta_survey_responses').insert(insertPayload));
      // Если поймали уникальный конфликт (параллельные запросы) — переключаемся на обновление
      if (error && String(error.code) === '23505') {
        try { console.warn('[submit-survey] unique conflict on insert, switching to update'); } catch (_) {}
        // Получим актуальное предыдущее значение answers для merge
        let prev = {};
        try {
          const { data: rows2 } = await supabase
            .from('beta_survey_responses')
            .select('id, answers')
            .eq(idCol, keyVal)
            .limit(1);
          const row = Array.isArray(rows2) && rows2[0] ? rows2[0] : null;
          prev = (row && row.answers && typeof row.answers === 'object') ? row.answers : {};
        } catch {}
        const prevMeta = (prev && typeof prev._progress === 'object') ? prev._progress : {};
        const updatePayloadOnConflict = { updated_at: new Date().toISOString() };
        if (!isFinalSubmit && answerKey) {
          updatePayloadOnConflict.answers = {
            ...prev,
            [answerKey]: answerValue,
            _session: sessionId || prev._session || ('s_'+Date.now()),
            _progress: { last_index: typeof index === 'number' ? index : (prevMeta.last_index ?? 0), completed: !!completed }
          };
        } else if (isFinalSubmit) {
          const sess = sessionId || prev._session || ('s_'+Date.now());
          updatePayloadOnConflict.answers = { ...(answers || {}), _session: sess, _progress: { last_index: 7, completed: true } };
          updatePayloadOnConflict.submitted_at = new Date().toISOString();
        }
        const updRes = await supabase
          .from('beta_survey_responses')
          .update(updatePayloadOnConflict)
          .eq(idCol, keyVal);
        error = updRes.error || null;
      } else {
        try { console.log('[submit-survey] insert success', { idCol, keyVal, isFinalSubmit, answerKey }); } catch (_) {}
      }
    } else {
      // Обновление существующей записи; при частичном ответе обновим JSON answers
      const updatePayload = { ...upsertPayload };
      if (!isFinalSubmit && answerKey) {
        const prev = (existing.answers && typeof existing.answers === 'object') ? existing.answers : {};
        const prevMeta = (prev && typeof prev._progress === 'object') ? prev._progress : {};
        updatePayload.answers = {
          ...prev,
          [answerKey]: answerValue,
          _session: sessionId || prev._session || ('s_'+Date.now()),
          _progress: { last_index: typeof index === 'number' ? index : (prevMeta.last_index ?? 0), completed: !!completed }
        };
      }
      ({ error } = await supabase
        .from('beta_survey_responses')
        .update(updatePayload)
        .eq(idCol, keyVal));
      try { console.log('[submit-survey] update success', { idCol, keyVal, isFinalSubmit, answerKey }); } catch (_) {}
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



