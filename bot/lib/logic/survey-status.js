exports.handler = async (event) => {
  // Hardcoded for debug to bypass any environment variable issues
  const startAt = null;
  const endAt = null;
  const nowIso = new Date().toISOString();
  const isOpen = true;

  console.log('[survey-status] Returning: isOpen=true');

  return {
    statusCode: 200,
    body: JSON.stringify({
      isOpen: true,
      now: nowIso,
      startAt: null,
      endAt: null,
      v: 4 // Version marker to ensure we see the latest code
    })
  };
};
