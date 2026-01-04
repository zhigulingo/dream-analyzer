const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

function validateTelegramData(initData, botToken) {
    if (!initData || !botToken) return { valid: false, error: "Missing data" };
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false, error: "No hash" };
    params.delete('hash');
    const dataCheckArr = [];
    params.sort();
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    const dataCheckString = dataCheckArr.join('\n');
    try {
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        if (checkHash === hash) {
            const userDataString = params.get('user');
            if (!userDataString) return { valid: true, data: null };
            const userData = JSON.parse(decodeURIComponent(userDataString));
            return { valid: true, data: userData };
        }
        return { valid: false, error: "Hash mismatch" };
    } catch (e) { return { valid: false, error: e.message }; }
}

exports.handler = async (event) => {
    const requestOrigin = event.headers.origin || event.headers.Origin;
    console.log(`[analyses-history] 🔍 REQ from ${requestOrigin}`);

    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': 'true',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
    if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !JWT_SECRET) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Config missing' }) };
    }

    let verifiedTgId = null;
    let userDbId = null;
    const initDataHeader = event.headers['x-telegram-init-data'];
    const authHeader = event.headers['authorization'];

    if (initDataHeader) {
        const v = validateTelegramData(initDataHeader, BOT_TOKEN);
        if (!v.valid || !v.data) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
        verifiedTgId = v.data.id;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId;
        } catch (e) { return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) }; }
    } else {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'No auth' }) };
    }

    try {
        const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const dbQueries = new DatabaseQueries(supabase);
        const isDeepOnly = (event.queryStringParameters && event.queryStringParameters.type === 'deep');

        if (!userDbId) {
            const profile = await dbQueries.getUserProfile(verifiedTgId);
            if (!profile) return { statusCode: 200, headers: corsHeaders, body: JSON.stringify([]) };
            userDbId = profile.id;
        }

        let history;
        if (isDeepOnly) {
            const { data, error } = await supabase
                .from('analyses')
                .select('id, dream_text, analysis, created_at, is_deep_analysis, deep_source, user_feedback, feedback_at')
                .eq('user_id', userDbId)
                .eq('is_deep_analysis', true)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            history = data || [];
        } else {
            history = await dbQueries.getAnalysesHistory(userDbId, 50, 0);
        }

        console.log(`[analyses-history] ✅ Sending ${history.length} items for User ${userDbId}`);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(history) };
    } catch (e) {
        console.error(`[analyses-history] ❌ Error: ${e.message}`);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
    }
};
