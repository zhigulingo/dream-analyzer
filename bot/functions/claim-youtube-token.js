// bot/functions/claim-youtube-token.js
// Trust-based YouTube subscription reward: нельзя верифицировать через API,
// поэтому используем честную механику — пользователь сам сообщает о подписке.
const { createClient } = require("@supabase/supabase-js");
const { validateTelegramData, isInitDataValid } = require('./shared/auth/telegram-validator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

const generateCorsHeaders = () => {
    const originToAllow = ALLOWED_TMA_ORIGIN || '*';
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
};

exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !ALLOWED_TMA_ORIGIN) {
        console.error("[claim-youtube-token] Server configuration missing.");
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
    }

    const initDataHeader = event.headers['x-telegram-init-data'];
    if (!initDataHeader) {
        return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing Telegram InitData' }) };
    }
    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) {
        return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid InitData (${validationResult.error})` }) };
    }
    if (!isInitDataValid(initDataHeader, 3600)) {
        return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: InitData expired. Please reopen the app.' }) };
    }
    const verifiedUserId = validationResult.data.id;
    console.log(`[claim-youtube-token] Access validated for user: ${verifiedUserId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    try {
        // 1. Проверяем, получал ли пользователь награду ранее
        const { data: userRecord, error: findError } = await supabase
            .from('users')
            .select('id, tokens, youtube_reward_claimed')
            .eq('tg_id', verifiedUserId)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            console.error(`[claim-youtube-token] Error finding user ${verifiedUserId}:`, findError);
            throw new Error('Database error checking user.');
        }
        if (!userRecord) {
            return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'User profile not found.' }) };
        }
        if (userRecord.youtube_reward_claimed) {
            console.log(`[claim-youtube-token] YouTube reward already claimed by user ${verifiedUserId}.`);
            return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, alreadyClaimed: true, message: 'Награда за YouTube уже была получена ранее.' }) };
        }

        // 2. Trust-based: начисляем токен без проверки подписки (нет YouTube API)
        console.log(`[claim-youtube-token] Granting YouTube token for user ${verifiedUserId}. Current tokens: ${userRecord.tokens}`);
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                tokens: (userRecord.tokens || 0) + 1,
                youtube_reward_claimed: true
            })
            .eq('id', userRecord.id)
            .eq('youtube_reward_claimed', false) // Защита от гонки
            .select('tokens')
            .single();

        if (updateError) {
            console.error(`[claim-youtube-token] Error updating user ${verifiedUserId}:`, updateError);
            throw new Error('Database error updating user data.');
        }
        if (!updatedUser) {
            return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, alreadyClaimed: true, message: 'Награда уже была получена (возможно, другим запросом).' }) };
        }

        const newTotalTokens = updatedUser.tokens;
        console.log(`[claim-youtube-token] YouTube token granted for user ${verifiedUserId}. New balance: ${newTotalTokens}`);

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, message: 'Спасибо за подписку! +1 токен начислен.', newTokens: newTotalTokens })
        };

    } catch (error) {
        console.error(`[claim-youtube-token] Error for user ${verifiedUserId}:`, error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Внутренняя ошибка сервера.' })
        };
    }
};
