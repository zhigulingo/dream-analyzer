// bot/functions/set-webhook.js
// One-off helper to (re)configure Telegram webhook to point to this Netlify site

const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

function corsHeaders(origin) {
  const allowed = ALLOWED_TMA_ORIGIN || origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  const headers = corsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'BOT_TOKEN is not configured' }) };
    }

    // Prefer explicit WEBHOOK_URL (if set), else Netlify provided site URL
    const baseUrl = process.env.WEBHOOK_URL || process.env.URL;
    if (!baseUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to resolve site URL. Set WEBHOOK_URL env or rely on Netlify URL.' }) };
    }

    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/bot`;
    const apiBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

    // If ?action=info, return current webhook info
    const action = (event.queryStringParameters && event.queryStringParameters.action) || 'set';
    if (action === 'info') {
      const resp = await fetch(`${apiBase}/getWebhookInfo`);
      const data = await resp.json();
      return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl, telegram: data }) };
    }

    // Set webhook
    const payload = {
      url: webhookUrl,
      allowed_updates: [
        'message', 'edited_message', 'callback_query',
        'pre_checkout_query', 'shipping_query', 'poll_answer',
        'my_chat_member'
      ],
      drop_pending_updates: false
    };
    const resp = await fetch(`${apiBase}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!data.ok) {
      return { statusCode: 500, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Telegram setWebhook failed', details: data, webhookUrl }) };
    }
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, webhookUrl, telegram: data }) };
  } catch (e) {
    return { statusCode: 500, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};


