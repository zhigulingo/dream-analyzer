const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;

function validateTelegramData(initData, botToken) {
    if (!initData || !botToken) return { valid: false };
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };
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
            return { valid: true, data: JSON.parse(decodeURIComponent(userDataString)) };
        }
    } catch (e) { }
    return { valid: false };
}

exports.handler = async (event) => {
    // В Vercel CORS обрабатывается в api/index.js, здесь только логика
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const initData = event.headers['x-telegram-init-data'];
    if (!initData) return { statusCode: 401, body: JSON.stringify({ error: 'No auth' }) };

    const v = validateTelegramData(initData, BOT_TOKEN);
    if (!v.valid || !v.data) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const tgId = v.data.id;

    try {
        const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const dbQueries = new DatabaseQueries(supabase);

        console.log(`[analyses-history] 🔎 Fetching history for TG:${tgId}`);

        const profile = await dbQueries.getUserProfile(tgId);
        if (!profile) return { statusCode: 200, body: JSON.stringify([]) };

        const isDeepOnly = (event.queryStringParameters && event.queryStringParameters.type === 'deep');
        let history = [];

        if (isDeepOnly) {
            const { data } = await supabase
                .from('analyses')
                .select('id, dream_text, analysis, created_at, is_deep_analysis, deep_source, user_feedback, feedback_at')
                .eq('user_id', profile.id)
                .eq('is_deep_analysis', true)
                .order('created_at', { ascending: false });
            history = data || [];
        } else {
            history = await dbQueries.getAnalysesHistory(profile.id, 50, 0);
        }

        console.log(`[analyses-history] ✅ Found ${history.length} items`);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(history)
        };
    } catch (e) {
        console.error(`[analyses-history] ❌ Fatal: ${e.message}`);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
