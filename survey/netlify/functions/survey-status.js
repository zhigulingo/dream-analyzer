const { getCorsHeaders, handleCorsPrelight } = require('../../../bot/functions/shared/middleware/cors');

exports.handler = async (event) => {
  const ALLOWED_SURVEY_ORIGIN = process.env.ALLOWED_SURVEY_ORIGIN || '';
  const corsHeaders = getCorsHeaders(event, [ALLOWED_SURVEY_ORIGIN]);
  const pre = handleCorsPrelight(event, [ALLOWED_SURVEY_ORIGIN]);
  if (pre) return pre;

  const startAt = process.env.SURVEY_START_AT ? new Date(process.env.SURVEY_START_AT).toISOString() : null;
  const endAt = process.env.SURVEY_END_AT ? new Date(process.env.SURVEY_END_AT).toISOString() : null;
  const nowIso = new Date().toISOString();

  const isOpen = (() => {
    const now = new Date(nowIso).getTime();
    const s = startAt ? new Date(startAt).getTime() : null;
    const e = endAt ? new Date(endAt).getTime() : null;
    if (s && now < s) return false;
    if (e && now > e) return false;
    return true;
  })();

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ isOpen, now: nowIso, startAt, endAt })
  };
};


