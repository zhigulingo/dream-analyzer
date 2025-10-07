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
    let resolvedTgId = null;
    let existingAnswers = null; // preserve meta like _announce
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
        resolvedTgId = res.data.id;
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
      existingAnswers = existing && existing.answers && typeof existing.answers === 'object' ? existing.answers : null;
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
        // Preserve meta like _announce from previous answers
        if (prev && prev._announce && (!updatePayloadOnConflict.answers._announce)) {
          updatePayloadOnConflict.answers._announce = prev._announce;
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
      } else if (isFinalSubmit) {
        // preserve meta from existing answers (e.g., _announce)
        const prev = existingAnswers || {};
        const sess = sessionId || prev._session || ('s_'+Date.now());
        updatePayload.answers = { ...(answers || {}), _session: sess, _progress: { last_index: 7, completed: true } };
        if (prev && prev._announce && !updatePayload.answers._announce) {
          updatePayload.answers._announce = prev._announce;
        }
        updatePayload.submitted_at = new Date().toISOString();
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

    // Обновим тип подписки пользователя на 'beta' (новая семантика: подал заявку, ждёт одобрения)
    if (isFinalSubmit && resolvedTgId) {
      try {
        const { data: urow } = await supabase
          .from('users')
          .select('id, beta_whitelisted, subscription_type')
          .eq('tg_id', resolvedTgId)
          .single();
        if (urow && !urow.beta_whitelisted) {
          await supabase
            .from('users')
            .update({ subscription_type: 'beta' })
            .eq('id', urow.id);
        }
      } catch (_) {}
    }

    // Уведомим пользователя в Telegram при финальной отправке анкеты
    if (isFinalSubmit && resolvedTgId && botToken) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const text = 'Спасибо, что решили уделить время тестированию приложения. В ближайшее время мы вернемся с ответом.';
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: resolvedTgId, text })
        });
      } catch (notifyErr) {
        try { console.warn('[submit-survey] failed to notify user about submission:', notifyErr?.message || notifyErr); } catch (_) {}
      }
    }

    // Попробуем обновить текст кнопки в исходном анонсе (если отправляли в ЛС ранее)
    if (isFinalSubmit && botToken) {
      try {
        // Fetch announce meta
        let announce = null;
        if (idCol && keyVal) {
          const { data: rows2 } = await supabase
            .from('beta_survey_responses')
            .select('answers')
            .eq(idCol, keyVal)
            .limit(1);
          const row2 = Array.isArray(rows2) && rows2[0] ? rows2[0] : null;
          const ans2 = row2 && row2.answers && typeof row2.answers === 'object' ? row2.answers : null;
          announce = ans2 && ans2._announce ? ans2._announce : null;
        }
        const msgId = announce?.message_id;
        const chatForMsg = announce?.chat_id || resolvedTgId;
        if (msgId && chatForMsg) {
          const editUrl = `https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`;
          const buttonText = 'Заявка принята';
          // Keep URL to the app (fallback to t.me link if not configured)
          const appUrl = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://t.me/dreamtestaibot/betasurvey';
          const reply_markup = { inline_keyboard: [[{ text: buttonText, url: appUrl }]] };
          await fetch(editUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatForMsg, message_id: msgId, reply_markup })
          });
        }
      } catch (e2) {
        try { console.warn('[submit-survey] failed to edit announce button:', e2?.message || e2); } catch (_) {}
      }
    }

    // Также обновим кнопку в последнем /start сообщении пользователя (если id сохранён)
    if (isFinalSubmit && botToken && resolvedTgId) {
      try {
        const { data: userRow, error: uErr } = await supabase
          .from('users')
          .select('last_start_message_id')
          .eq('tg_id', resolvedTgId)
          .single();
        if (!uErr && userRow && userRow.last_start_message_id) {
          const msgId = userRow.last_start_message_id;
          const editUrl = `https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`;
          const buttonText = 'Заявка принята';
          const appUrl = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://t.me/dreamtestaibot/betasurvey';
          const reply_markup = { inline_keyboard: [[{ text: buttonText, url: appUrl }]] };
          await fetch(editUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: resolvedTgId, message_id: msgId, reply_markup })
          });
        }
      } catch (e3) {
        try { console.warn('[submit-survey] failed to edit /start button:', e3?.message || e3); } catch (_) {}
      }
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('[submit-survey] exception', { message: e?.message, stack: e?.stack, body: event.body });
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal error', details: e?.message }) };
  }
};



