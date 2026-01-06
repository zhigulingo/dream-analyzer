exports.handler = async (event) => {
  const startAt = null; // Clear start date to force open
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
