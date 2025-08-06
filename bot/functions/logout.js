// bot/functions/logout.js

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

    try {
        console.log("[logout] Processing logout request");

        // --- Clear cookies by setting them to expire immediately ---
        const isProduction = process.env.NODE_ENV === 'production';
        const secureCookieSettings = `Path=/; HttpOnly; SameSite=Strict; ${isProduction ? 'Secure;' : ''} Max-Age=0`;

        return {
            statusCode: 200,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Set-Cookie': [
                    `dream_analyzer_jwt=; ${secureCookieSettings}`, // Clear access token
                    `dream_analyzer_refresh=; ${secureCookieSettings}` // Clear refresh token
                ]
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Logged out successfully' 
            })
        };

    } catch (error) {
        console.error("[logout] Unexpected error:", error.message);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error during logout.' })
        };
    }
};