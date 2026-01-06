exports.handler = async (event) => {
  const startAt = process.env.SURVEY_START_AT ? new Date(process.env.SURVEY_START_AT).toISOString() : null;
  const endAt = process.env.SURVEY_END_AT ? new Date(process.env.SURVEY_END_AT).toISOString() : null;
  const nowIso = new Date().toISOString();

  const isOpen = true; // Forced open for launch as requested

  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ isOpen, now: nowIso, startAt, endAt })
    };
  } catch (e) {
    console.error('[survey-status] exception', { message: e?.message, stack: e?.stack });
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
