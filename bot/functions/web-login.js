// bot/functions/web-login.js

const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);
const jwt = require('jsonwebtoken'); // Assuming you have jsonwebtoken installed

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET; // You need to set this environment variable
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

// --- CORS Headers ---
const getCorsHeaders = (event) => {
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const allowOrigin = requestOrigin || process.env.ALLOWED_WEB_ORIGIN || '*';
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
};

exports.handler = async (event) => {
    const corsHeaders = getCorsHeaders(event);

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
        console.log("[web-login] OPTIONS preflight from origin:", event.headers.origin || event.headers.Origin);
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // --- Only allow POST ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- Check Configuration ---
     if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
        console.error("[web-login] Server configuration missing (Supabase URL/Key, JWT Secret)");
        return { statusCode: 500, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
     }

    // --- Parse Request Body ---
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error("[web-login] Failed to parse request body:", error);
        return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid request body.' }) };
    }

    const { tg_id, password } = requestBody;
    console.log("[web-login] Incoming login request for tg_id:", tg_id, "origin:", event.headers.origin || event.headers.Origin);

    if (!tg_id || !password) {
        return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Telegram ID and password are required.' }) };
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        // --- Fetch user with password hash ---
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, web_password_hash')
            .eq('tg_id', tg_id)
            .maybeSingle();

        if (userError) {
            console.error(`[web-login] Supabase query error for tg_id ${tg_id}:`, userError);
            throw new Error("Database query failed");
        }

        if (!user || !user.web_password_hash) {
            // User not found or no password set
            console.warn(`[web-login] Login failed for tg_id ${tg_id}: User not found or no password set.`);
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid Telegram ID or password.' }) };
        }

        // --- Compare password hash ---
        const [salt, hash] = user.web_password_hash.split(':');
        const derivedKey = await scryptAsync(password, salt, 64);

        const hashMatch = crypto.timingSafeEqual(Buffer.from(derivedKey.toString('hex'), 'hex'), Buffer.from(hash, 'hex'));

        if (!hashMatch) {
             console.warn(`[web-login] Login failed for tg_id ${tg_id}: Password mismatch.`);
             return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid Telegram ID or password.' }) };
        }

        // --- Authentication successful, generate JWT tokens ---
        console.log(`[web-login] Authentication successful for tg_id ${tg_id}. Generating tokens...`);
        
        // Generate access token (short-lived)
        const accessToken = jwt.sign({ userId: user.id, tgId: tg_id }, JWT_SECRET, { expiresIn: '15m' });
        
        // Generate refresh token (long-lived)
        const refreshToken = jwt.sign(
            { userId: user.id, tgId: tg_id, tokenVersion: 1 }, 
            REFRESH_SECRET, 
            { expiresIn: '7d' }
        );

        // --- Set secure httpOnly cookies ---
        // Always require cross-site cookies; Netlify uses HTTPS, set explicit flags
        const secureCookieSettings = `Path=/; HttpOnly; SameSite=None; Secure; Max-Age=`;

        return {
            statusCode: 200,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Set-Cookie': [
                    `dream_analyzer_jwt=${accessToken}; ${secureCookieSettings}900`, // 15 minutes
                    `dream_analyzer_refresh=${refreshToken}; ${secureCookieSettings}604800` // 7 days
                ]
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: { id: user.id, tgId: tg_id }
            })
        };

    } catch (error) {
        console.error(`[web-login] Catch block error for tg_id ${tg_id}:`, error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error during login.' })
         };
    }
};
