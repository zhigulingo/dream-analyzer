// bot/functions/analyses-history.js (Modified for Web Authentication and syntax fix)

const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const { validateTelegramData, isInitDataValid } = require('./shared/auth/telegram-validator');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN; // Still needed for TMA InitData validation
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN;
const JWT_SECRET = process.env.JWT_SECRET;

// --- CORS Headers (Unified for TMA and Web) ---
const generateCorsHeaders = (isWeb) => {
    const originToAllow = isWeb ? (ALLOWED_WEB_ORIGIN || '*') : (ALLOWED_TMA_ORIGIN || '*');
     console.log(`[analyses-history] CORS Headers: Allowing Origin: ${originToAllow} (IsWeb: ${isWeb})`);
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization', // Allow Authorization
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
};

exports.handler = async (event) => {
    const isWebRequest = event.headers['authorization'] !== undefined; // Check for Authorization header
    const allowedOrigins = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean);
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
    };

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
        console.log("[analyses-history] Responding to OPTIONS request from origin:", requestOrigin);
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // --- Check Method ---
    if (event.httpMethod !== 'GET') {
         console.log(`[analyses-history] Method Not Allowed: ${event.httpMethod}`);
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

   // --- Check Server Configuration ---
     if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !JWT_SECRET || (!ALLOWED_TMA_ORIGIN && !ALLOWED_WEB_ORIGIN)) { // Added JWT_SECRET and origin check
        console.error("[analyses-history] Server configuration missing (Supabase URL/Key, Bot Token, JWT Secret, or Allowed Origin)");
        return { statusCode: 500, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
     }

    // --- Authentication Logic (Handle both TMA and Web) ---
    let verifiedTgId = null;
    let userDbId = null; // We need the internal Supabase ID to query analyses

    const initDataHeader = event.headers['x-telegram-init-data'];
    const authHeader = event.headers['authorization'];
    const cookies = event.headers.cookie || '';

    if (initDataHeader) {
        // --- Authenticate using Telegram InitData (for TMA) ---
        console.log("[analyses-history] Attempting authentication with InitData.");
        const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);

        if (!validationResult.valid || !validationResult.data || typeof validationResult.data.id === 'undefined') {
            console.error(`[analyses-history] InitData validation failed: ${validationResult.error || 'User data missing'}`);
            return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid Telegram InitData (${validationResult.error})` }) };
        }
        // Check initData expiry (max 1 hour = 3600 seconds)
        try {
            const params = new URLSearchParams(initDataHeader);
            const authDate = params.get('auth_date');
            if (!authDate || (Math.floor(Date.now() / 1000) - parseInt(authDate, 10)) > 3600) {
                console.error('[analyses-history] InitData expired');
                return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: InitData expired. Please reopen the app.' }) };
            }
        } catch (_) {}
        verifiedTgId = validationResult.data.id;
        console.log(`[analyses-history] InitData validated for tg_id: ${verifiedTgId}`);

    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        // --- Authenticate using JWT from Authorization header (for Web) ---
        console.log("[analyses-history] Attempting authentication with JWT from Authorization header.");
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId;
            console.log(`[analyses-history] JWT validated for tg_id: ${verifiedTgId}, Supabase ID: ${userDbId}`);

        } catch (error) {
            console.error(`[analyses-history] JWT validation failed: ${error.message}`);
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }) };
        }
    } else if (cookies.includes('dream_analyzer_jwt=')) {
        // --- Authenticate using JWT from httpOnly cookie (for Web) ---
        console.log("[analyses-history] Attempting authentication with JWT from cookie.");
        
        try {
            const jwtMatch = cookies.match(/dream_analyzer_jwt=([^;]+)/);
            if (jwtMatch) {
                const token = jwtMatch[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                verifiedTgId = decoded.tgId;
                userDbId = decoded.userId;
                console.log(`[analyses-history] JWT cookie validated for tg_id: ${verifiedTgId}, Supabase ID: ${userDbId}`);
            } else {
                throw new Error('JWT cookie found but could not extract token');
            }
        } catch (error) {
            console.error(`[analyses-history] JWT cookie validation failed: ${error.message}`);
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }) };
        }
    } else {
        // --- No authentication header found ---
        console.warn("[analyses-history] Unauthorized: Missing authentication headers.");
        return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing authentication.' }) };
    }

    // --- Main Logic (Optimized Database Operations) ---
    try {
        const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const dbQueries = new DatabaseQueries(supabase);

        let history;
        
        const isDeepOnly = (event.queryStringParameters && event.queryStringParameters.type === 'deep');

        if (userDbId) {
            // If we already have the Supabase ID (from JWT), use it directly
            console.log(`[analyses-history] Using existing Supabase ID ${userDbId} to fetch history...`);
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
        } else {
            // If we only have Telegram ID, we need to get user profile first
            // This will be optimized to get user data in one query instead of two separate calls
            console.log(`[analyses-history] Getting user profile and history for tg_id ${verifiedTgId}...`);
            
            const userProfile = await dbQueries.getUserProfile(verifiedTgId);
            if (!userProfile) {
                console.warn(`[analyses-history] No user profile for tg_id ${verifiedTgId}; returning empty history`);
                return {
                    statusCode: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify([])
                };
            }
            
            userDbId = userProfile.id;
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
        }

        console.log(`[analyses-history] History fetched for user_id ${userDbId}. Count: ${history?.length ?? 0}`);
        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(history || [])
        };

    } catch (error) {
        console.error(`[analyses-history] Catch block error for user (DB ID: ${userDbId}, TG ID: ${verifiedTgId}):`, error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error while fetching history.' })
        };
    }
};
