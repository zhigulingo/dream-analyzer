// bot/functions/web-login.js

const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);
const jwt = require('jsonwebtoken'); // Assuming you have jsonwebtoken installed

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET; // You need to set this environment variable

// --- CORS Headers (consider making this a shared helper) ---
const generateCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.ALLOWED_WEB_ORIGIN || '*', // Set ALLOWED_WEB_ORIGIN
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allow Authorization header
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
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

        // --- Authentication successful, generate JWT ---
        console.log(`[web-login] Authentication successful for tg_id ${tg_id}. Generating token...`);
        const token = jwt.sign({ userId: user.id, tgId: tg_id }, JWT_SECRET, { expiresIn: '7d' }); // Token expires in 7 days

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
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
