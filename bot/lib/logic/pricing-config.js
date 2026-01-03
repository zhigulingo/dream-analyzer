// bot/functions/pricing-config.js
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');

const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

function parseSubscriptionPrices(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr || '{}');
    if (!obj || typeof obj !== 'object') return {};
    // Normalize keys to lower-case plans and string durations
    const out = {};
    for (const [plan, durations] of Object.entries(obj)) {
      const planKey = String(plan).toLowerCase();
      out[planKey] = {};
      if (durations && typeof durations === 'object') {
        for (const [dur, amount] of Object.entries(durations)) {
          const a = Number.parseInt(amount, 10);
          if (Number.isInteger(a) && a > 0) out[planKey][String(dur)] = a;
        }
      }
    }
    return out;
  } catch (_) {
    return {};
  }
}

async function handler(event, context, corsHeaders) {
  const deepPrice = Number.parseInt(process.env.DEEP_ANALYSIS_PRICE_XTR || '0', 10);
  const subsRaw = process.env.SUBSCRIPTION_PRICES_JSON || '{}';
  const subs = parseSubscriptionPrices(subsRaw);

  if (!Number.isInteger(deepPrice) || deepPrice <= 0) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Deep analysis price is not configured',
        pricing: { deep: { xtr: null }, subscription: subs }
      })
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      pricing: {
        deep: { xtr: deepPrice },
        subscription: subs
      }
    })
  };
}

exports.handler = wrapApiHandler(handler, {
  allowedMethods: ['GET'],
  allowedOrigins: [ALLOWED_TMA_ORIGIN],
  requiredEnvVars: []
});


