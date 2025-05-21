// bot/functions/user-profile.js (Modified for Web Authentication)

const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // Assuming jsonwebtoken is available

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN; // Still needed for TMA InitData validation
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN; // New: Allowed origin for web
const JWT_SECRET = process.env.JWT_SECRET; // New: JWT Secret for web token validation

// --- Your Telegram InitData Validation Function (unchanged) ---
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
    params.delete('hash'); // Remove hash for verification
    const dataCheckArr = [];
    params.sort(); // Important to sort parameters
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    const dataCheckString = dataCheckArr.join('
');

    try {
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (checkHash === hash) {
            // Validation successful, attempt to extract user data
            const userDataString = params.get('user');
            if (!userDataString) {
                console.warn("[validateTelegramData] User data is missing in initData");
                return { valid: true, data: null, error: "User data missing" }; // Valid, but no user data
            }
            try {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                 // Check for user ID
                 if (!userData || typeof userData.id === 'undefined') {
                    console.warn("[validateTelegramData] Parsed user data is missing ID");
                    return { valid: true, data: null, error: "User ID missing in parsed data" };
                 }
                return { valid: true, data: userData, error: null };
            } catch (parseError) {
                console.error("[validateTelegramData] Error parsing user data JSON:", parseError);
                return { valid: true, data: null, error: "Failed to parse user data" }; // Valid, but user data failed to parse
            }
        } else {
            console.warn("[validateTelegramData] Hash mismatch during validation.");
            return { valid: false, data: null, error: "Hash mismatch" };
        }
    } catch (error) {
        console.error("[validateTelegramData] Crypto error during validation:", error);
        return { valid: false, data: null, error: "Validation crypto error" };
    }
}

// --- CORS Headers (Unified for TMA and Web) ---
const generateCorsHeaders = (isWeb) => {
    const originToAllow = isWeb ? (ALLOWED_WEB_ORIGIN || '*') : (ALLOWED_TMA_ORIGIN || '*');
     console.log(`[user-profile] CORS Headers: Allowing Origin: ${originToAllow} (IsWeb: ${isWeb})`);
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Authorization', // Allow Authorization
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
};

exports.handler = async (event) => {
    const isWebRequest = event.headers['authorization'] !== undefined; // Check for Authorization header
    const corsHeaders = generateCorsHeaders(isWebRequest);

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
        console.log("[user-profile] Responding to OPTIONS request");
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // --- Check Method ---
    if (event.httpMethod !== 'GET') {
        console.log(`[user-profile] Method Not Allowed: ${event.httpMethod}`);
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- Check Server Configuration ---
     if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !JWT_SECRET || (!ALLOWED_TMA_ORIGIN && !ALLOWED_WEB_ORIGIN)) { // Added JWT_SECRET and origin check
        console.error("[user-profile] Server configuration missing (Supabase URL/Key, Bot Token, JWT Secret, or Allowed Origin)");
        return { statusCode: 500, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
     }

    // --- Authentication Logic (Handle both TMA and Web) ---
    let verifiedTgId = null;
    let userDbId = null; // We might need the internal Supabase ID

    const initDataHeader = event.headers['x-telegram-init-data'];
    const authHeader = event.headers['authorization'];

    if (initDataHeader) {
        // --- Authenticate using Telegram InitData (for TMA) ---
        console.log("[user-profile] Attempting authentication with InitData.");
        const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);

        if (!validationResult.valid || !validationResult.data || typeof validationResult.data.id === 'undefined') {
            console.error(`[user-profile] InitData validation failed: ${validationResult.error || 'User data missing'}`);
            return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid Telegram InitData (${validationResult.error})` }) };
        }
        verifiedTgId = validationResult.data.id;
        console.log(`[user-profile] InitData validated for tg_id: ${verifiedTgId}`);

    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        // --- Authenticate using JWT (for Web) ---
        console.log("[user-profile] Attempting authentication with JWT.");
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Use the tgId from the token payload
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId; // Also get the internal Supabase ID from the token
            console.log(`[user-profile] JWT validated for tg_id: ${verifiedTgId}, Supabase ID: ${userDbId}`);

        } catch (error) {
            console.error(`[user-profile] JWT validation failed: ${error.message}`);
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }) };
        }
    } else {
        // --- No authentication header found ---
        console.warn("[user-profile] Unauthorized: Missing authentication headers.");
        return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing authentication.' }) };
    }

    // --- Ensure we have a verified Telegram ID ---
    if (!verifiedTgId) {
         console.error("[user-profile] Internal authentication error: No verified Telegram ID after checks.");
         return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal authentication error.' }) };
    }

    // --- If we don't have the Supabase ID from JWT, fetch it ---
    if (!userDbId) {
         console.log(`[user-profile] Supabase ID not available from token. Fetching for tg_id ${verifiedTgId}...`);
         try {
              const { data: userData, error: fetchIdError } = await createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
                .from('users').select('id').eq('tg_id', verifiedTgId).single();

              if (fetchIdError || !userData) {
                   console.error(`[user-profile] Failed to fetch Supabase ID for tg_id ${verifiedTgId}:`, fetchIdError);
                   throw new Error("Could not retrieve internal user ID.");
              }
              userDbId = userData.id;
              console.log(`[user-profile] Fetched Supabase ID: ${userDbId}`);

         } catch (error) {
              console.error(`[user-profile] Error fetching Supabase ID for tg_id ${verifiedTgId}:`, error.message);
              return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error while fetching user ID.' }) };
         }
    }
     // Now userDbId should be available whether using InitData or JWT

    // --- Main Logic (Fetch Profile Data) ---
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        // Use userDbId for querying (more robust)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('tokens, subscription_type, subscription_end')
            .eq('id', userDbId) // Use internal Supabase ID
            .maybeSingle();

        if (userError) {
             console.error(`[user-profile] Supabase error for user_id ${userDbId}:`, userError);
             throw new Error("Database query failed");
        }

        let responseBody;
        if (!userData) {
            console.log(`[user-profile] User profile not found for user_id: ${userDbId}. Returning default free user state.`);
            responseBody = { tokens: 0, subscription_type: 'free', subscription_end: null };
        } else {
            console.log(`[user-profile] Profile data found for user_id ${userDbId}.`);
            responseBody = userData;
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(responseBody)
        };

    } catch (error) {
        console.error(`[user-profile] Catch block error for user ${verifiedTgId} (DB ID: ${userDbId}):`, error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error while fetching profile.' })
         };
    }
};
