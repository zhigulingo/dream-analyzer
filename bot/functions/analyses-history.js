// bot/functions/analyses-history.js (Modified for Web Authentication and syntax fix)

const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // Assuming jsonwebtoken is available

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN; // Still needed for TMA InitData validation
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN; // New: Allowed origin for web
const JWT_SECRET = process.env.JWT_SECRET; // New: JWT Secret for web token validation

// --- Your Telegram InitData Validation Function (can be made a shared helper) ---
function validateTelegramData(initData, botToken) {
    if (!initData || !botToken) {
        console.warn("[validateTelegramData] Missing initData or botToken");
        return { valid: false, data: null, error: "Missing initData or botToken" };
    }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        console.warn("[validateTelegramData] Hash is missing in initData");
        return { valid: false, data: null, error: "Hash is missing" };
    }
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
            if (!userDataString) { return { valid: true, data: null, error: "User data missing" }; }
            try {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                if (!userData || typeof userData.id === 'undefined') { return { valid: true, data: null, error: "User ID missing in parsed data" }; }
                return { valid: true, data: userData, error: null };
            } catch (parseError) { return { valid: true, data: null, error: "Failed to parse user data" }; }
        } else { return { valid: false, data: null, error: "Hash mismatch" }; }
    } catch (error) { return { valid: false, data: null, error: "Validation crypto error" }; }
}

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
    };

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
        console.log("[analyses-history] Responding to OPTIONS request");
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

    if (initDataHeader) {
        // --- Authenticate using Telegram InitData (for TMA) ---
        console.log("[analyses-history] Attempting authentication with InitData.");
        const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);

        if (!validationResult.valid || !validationResult.data || typeof validationResult.data.id === 'undefined') {
            console.error(`[analyses-history] InitData validation failed: ${validationResult.error || 'User data missing'}`);
            return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid Telegram InitData (${validationResult.error})` }) };
        }
        verifiedTgId = validationResult.data.id;
        console.log(`[analyses-history] InitData validated for tg_id: ${verifiedTgId}`);

    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        // --- Authenticate using JWT (for Web) ---
        console.log("[analyses-history] Attempting authentication with JWT.");
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Use the tgId from the token payload
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId; // Get the internal Supabase ID from the token
            console.log(`[analyses-history] JWT validated for tg_id: ${verifiedTgId}, Supabase ID: ${userDbId}`);

        } catch (error) {
            console.error(`[analyses-history] JWT validation failed: ${error.message}`);
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
        
        if (userDbId) {
            // If we already have the Supabase ID (from JWT), use it directly
            console.log(`[analyses-history] Using existing Supabase ID ${userDbId} to fetch history...`);
            history = await dbQueries.getAnalysesHistory(userDbId, 50, 0);
        } else {
            // If we only have Telegram ID, we need to get user profile first
            // This will be optimized to get user data in one query instead of two separate calls
            console.log(`[analyses-history] Getting user profile and history for tg_id ${verifiedTgId}...`);
            
            const userProfile = await dbQueries.getUserProfile(verifiedTgId);
            if (!userProfile) {
                console.error(`[analyses-history] User profile not found for tg_id ${verifiedTgId}`);
                return { 
                    statusCode: 404, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ error: 'User not found.' }) 
                };
            }
            
            userDbId = userProfile.id;
            history = await dbQueries.getAnalysesHistory(userDbId, 50, 0);
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
