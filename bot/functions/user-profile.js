// bot/functions/user-profile.js

const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const userCacheService = require('./shared/services/user-cache-service');
const jwt = require('jsonwebtoken');
const { validateTelegramData } = require('./shared/auth/telegram-validator');

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN;
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get or create user
async function getOrCreateUser(supabase, userId) {
    if (!supabase) { throw new Error("Supabase client not provided to getOrCreateUser."); }
    console.log(`[getOrCreateUser] Processing user ${userId}...`);
    try {
        console.log(`[getOrCreateUser] Selecting user ${userId}...`);
        let { data: existingUser, error: selectError } = await supabase
            .from('users').select('id, channel_reward_claimed, last_start_message_id').eq('tg_id', userId).single();

        if (selectError && selectError.code !== 'PGRST116') {
             console.error(`[getOrCreateUser] Supabase SELECT error: ${selectError.message}`);
             throw new Error(`DB Select Error: ${selectError.message}`);
        }
        if (existingUser) {
            console.log(`[getOrCreateUser] Found existing user ${userId}.`);
            return { id: existingUser.id, claimed: existingUser.channel_reward_claimed ?? false, lastMessageId: existingUser.last_start_message_id };
        } else {
            console.log(`[getOrCreateUser] User ${userId} not found. Creating...`);
            const { data: newUser, error: insertError } = await supabase
                .from('users').insert({ tg_id: userId, subscription_type: 'free', tokens: 0, channel_reward_claimed: false }).select('id').single();

            if (insertError) {
                 console.error(`[getOrCreateUser] Supabase INSERT error: ${insertError.message}`);
                 if (insertError.code === '23505') { // Race condition
                     console.warn(`[getOrCreateUser] Race condition for ${userId}. Re-fetching...`);
                     let { data: raceUser, error: raceError } = await supabase.from('users').select('id, channel_reward_claimed, last_start_message_id').eq('tg_id', userId).single();
                     if (raceError) { throw new Error(`DB Re-fetch Error: ${raceError.message}`); }
                     if (raceUser) { console.log(`[getOrCreateUser] Found user ${userId} on re-fetch.`); return { id: raceUser.id, claimed: raceUser.channel_reward_claimed ?? false, lastMessageId: raceUser.last_start_message_id }; }
                     else { throw new Error("DB Inconsistent state after unique violation."); }
                 }
                 throw new Error(`DB Insert Error: ${insertError.message}`);
            }
            if (!newUser) { throw new Error("DB Insert Error: No data returned after user creation."); }
            console.log(`[getOrCreateUser] Created new user ${userId} with ID ${newUser.id}.`);
            return { id: newUser.id, claimed: false, lastMessageId: null };
        }
    } catch (error) {
        console.error(`[getOrCreateUser] FAILED for user ${userId}:`, error);
        throw error;
    }
}

exports.handler = async (event) => {
    console.log("[user-profile] Function invoked");
    
    const allowedOrigins = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean);
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle CORS preflight OPTIONS request at the very top
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    const authHeader = event.headers['authorization'];
    let verifiedUserId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Web: JWT auth
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            verifiedUserId = decoded.tgId;
            console.log("[user-profile] Web user authenticated:", verifiedUserId);
        } catch (error) {
            console.error("[user-profile] JWT verification failed:", error.message);
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }) };
        }
    } else {
        // TMA: Telegram InitData
        const initDataHeader = event.headers['x-telegram-init-data'];
        console.log("[user-profile] TMA auth attempt, initData present:", !!initDataHeader);
        console.log("[user-profile] BOT_TOKEN present:", !!BOT_TOKEN);
        
        if (!BOT_TOKEN) {
            console.error("[user-profile] BOT_TOKEN is missing from environment variables!");
            return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: Bot configuration missing.' }) };
        }
        
        const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
        console.log("[user-profile] Validation result:", { valid: validationResult.valid, error: validationResult.error, hasData: !!validationResult.data });
        
        if (!validationResult.valid || !validationResult.data?.id) {
            return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid Telegram InitData (${validationResult.error})` }) };
        }
        verifiedUserId = validationResult.data.id;
        console.log("[user-profile] TMA user authenticated:", verifiedUserId);
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: Database configuration missing.' }) };
    }

    try {
        const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const dbQueries = new DatabaseQueries(supabase);
        
        // Проверяем кеш сначала
        let userData = userCacheService.getFullUserData(verifiedUserId);
        
        if (!userData) {
            console.log(`[user-profile] Cache miss for user ${verifiedUserId}, querying database...`);
            
            // Получить полный профиль пользователя одним оптимизированным запросом
            // Если пользователь не существует, он будет создан автоматически
            userData = await dbQueries.getUserProfile(verifiedUserId);
            
            // Если пользователь не найден, создаем его и пытаемся снова
            if (!userData) {
                console.log(`[user-profile] User ${verifiedUserId} not found, creating...`);
                await getOrCreateUser(supabase, verifiedUserId);
                userData = await dbQueries.getUserProfile(verifiedUserId);
            }
            
            // Кешируем результат если получены данные
            if (userData) {
                userCacheService.cacheFullUserData(verifiedUserId, userData);
                console.log(`[user-profile] Cached user data for ${verifiedUserId}`);
            }
        } else {
            console.log(`[user-profile] Cache hit for user ${verifiedUserId}`);
        }

        let responseBody;
        if (!userData) {
            responseBody = { 
                tokens: 0, 
                subscription_type: 'free', 
                subscription_end: null, 
                channel_reward_claimed: false,
                deep_analysis_credits: 0,
                total_analyses: 0
            };
        } else {
            responseBody = {
                tokens: userData.tokens || 0,
                subscription_type: userData.subscription_type || 'free',
                subscription_end: userData.subscription_end,
                channel_reward_claimed: userData.channel_reward_claimed || false,
                deep_analysis_credits: userData.deep_analysis_credits || 0,
                total_analyses: userData.total_analyses || 0
            };
        }

        console.log(`[user-profile] Returning profile for user ${verifiedUserId}:`, responseBody);

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(responseBody)
        };

    } catch (error) {
        console.error("[user-profile] Error:", error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error while fetching profile.' })
        };
    }
};