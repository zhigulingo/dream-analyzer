// bot/functions/refresh-token.js

const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

// --- CORS Headers ---
const generateCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.ALLOWED_WEB_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true', // Important for cookies
});

exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // --- Handle Preflight (OPTIONS) ---
    if (event.httpMethod === 'OPTIONS') {
        console.log("[refresh-token] OPTIONS preflight from origin:", event.headers.origin || event.headers.Origin);
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // --- Only allow POST ---
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    // --- Check Configuration ---
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
        console.error("[refresh-token] Server configuration missing");
        return { 
            statusCode: 500, 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) 
        };
    }

    try {
        // --- Extract refresh token ---
        console.log("[refresh-token] Request origin:", event.headers.origin || event.headers.Origin);
        let refreshToken = null;

        // Prefer JSON body token for web Bearer flow
        try {
            if (event.body) {
                const parsed = JSON.parse(event.body);
                if (parsed && typeof parsed.refreshToken === 'string' && parsed.refreshToken.length > 0) {
                    refreshToken = parsed.refreshToken;
                }
            }
        } catch (_) {
            // ignore parse error, will fallback to cookies
        }

        // Fallback: httpOnly cookie for backward compatibility
        if (!refreshToken) {
            const cookies = event.headers.cookie || '';
            const match = cookies.match(/dream_analyzer_refresh=([^;]+)/);
            if (match) {
                refreshToken = match[1];
            }
        }

        if (!refreshToken) {
            console.warn("[refresh-token] No refresh token provided (body or cookie)");
            return { 
                statusCode: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ error: 'No refresh token provided.' }) 
            };
        }

        // --- Verify refresh token ---
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        } catch (jwtError) {
            console.warn("[refresh-token] Invalid refresh token:", jwtError.message);
            return { 
                statusCode: 401, 
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'dream_analyzer_refresh=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' // Clear invalid refresh token
                }, 
                body: JSON.stringify({ error: 'Invalid refresh token.' }) 
            };
        }

        const { userId, tgId, tokenVersion } = decoded;

        // --- Verify user exists and token version matches ---
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { 
            auth: { autoRefreshToken: false, persistSession: false } 
        });

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, tg_id, token_version')
            .eq('id', userId)
            .eq('tg_id', tgId)
            .maybeSingle();

        if (userError) {
            console.error("[refresh-token] Database error:", userError);
            return { 
                statusCode: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ error: 'Database error.' }) 
            };
        }

        if (!user) {
            console.warn("[refresh-token] User not found for refresh token");
            return { 
                statusCode: 401, 
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'dream_analyzer_refresh=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
                }, 
                body: JSON.stringify({ error: 'User not found.' }) 
            };
        }

        // Check token version to invalidate old refresh tokens
        if (user.token_version && tokenVersion && user.token_version !== tokenVersion) {
            console.warn("[refresh-token] Token version mismatch - refresh token revoked");
            return { 
                statusCode: 401, 
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'dream_analyzer_refresh=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
                }, 
                body: JSON.stringify({ error: 'Refresh token revoked.' }) 
            };
        }

        // --- Generate new access token ---
        const newAccessToken = jwt.sign(
            { userId: user.id, tgId: user.tg_id }, 
            JWT_SECRET, 
            { expiresIn: '15m' } // Short-lived access token
        );

        // --- Generate new refresh token ---
        const newRefreshToken = jwt.sign(
            { userId: user.id, tgId: user.tg_id, tokenVersion: user.token_version || 1 }, 
            REFRESH_SECRET, 
            { expiresIn: '7d' } // Long-lived refresh token
        );

        console.log(`[refresh-token] Tokens refreshed successfully for user ${userId}`);

        // --- Set cookies (compat) and return tokens in JSON ---
        const secureCookieSettings = `Path=/; HttpOnly; SameSite=None; Secure; Max-Age=`;

        return {
            statusCode: 200,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json'
            },
            multiValueHeaders: {
                'Set-Cookie': [
                    `dream_analyzer_jwt=${newAccessToken}; ${secureCookieSettings}900`,
                    `dream_analyzer_refresh=${newRefreshToken}; ${secureCookieSettings}604800`
                ]
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Tokens refreshed successfully',
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            })
        };

    } catch (error) {
        console.error("[refresh-token] Unexpected error:", error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error during token refresh.' })
        };
    }
};