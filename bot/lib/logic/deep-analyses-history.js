// bot/functions/deep-analyses-history.js

const { createOptimizedClient, DatabaseQueries } = require('./shared/database/queries');
const jwt = require('jsonwebtoken');
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const JWT_SECRET = process.env.JWT_SECRET;

async function handleDeepAnalysesHistory(event, context, corsHeaders) {
  // Handle CORS preflight via wrapper

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: DB config missing.' }) };
  }

  // Auth: support TMA (InitData) and Web (JWT)
  const initDataHeader = event.headers['x-telegram-init-data'];
  const authHeader = event.headers['authorization'];
  const cookies = event.headers.cookie || '';
  let verifiedTgId = null;
  let userDbId = null;

  try {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      verifiedTgId = decoded.tgId;
      userDbId = decoded.userId;
    } else if (cookies.includes('dream_analyzer_jwt=')) {
      const jwtMatch = cookies.match(/dream_analyzer_jwt=([^;]+)/);
      if (jwtMatch) {
        const token = jwtMatch[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        verifiedTgId = decoded.tgId;
        userDbId = decoded.userId;
      }
    } else if (initDataHeader) {
      const { validateTelegramData } = require('./shared/auth/telegram-validator');
      const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
      if (!validationResult.valid || !validationResult.data?.id) {
        return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden: Invalid Telegram InitData' }) };
      }
      verifiedTgId = validationResult.data.id;
    } else {
      return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  } catch (e) {
    return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const dbQueries = new DatabaseQueries(supabase);

  try {
    if (!userDbId) {
      const profile = await dbQueries.getUserProfile(verifiedTgId);
      if (!profile) {
        return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'User not found' }) };
      }
      userDbId = profile.id;
    }

    const { data, error } = await supabase
      .from('deep_analyses')
      .select('id, analysis, created_at')
      .eq('user_id', userDbId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(data || []) };
  } catch (err) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error while fetching deep analyses.' }) };
  }
}

exports.handler = wrapApiHandler(handleDeepAnalysesHistory, {
  allowedMethods: 'GET',
  allowedOrigins: [ALLOWED_TMA_ORIGIN],
  requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
});


