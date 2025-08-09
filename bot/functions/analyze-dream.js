const { createClient } = require("@supabase/supabase-js");
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');
const userCacheService = require('./shared/services/user-cache-service');
const { createSuccessResponse, createErrorResponse } = require('./shared/middleware/error-handler');
const geminiService = require('./shared/services/gemini-service');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN;

// Gemini/AI analysis logic using unified service
async function getGeminiAnalysis(dreamText) {
    try {
        return await geminiService.analyzeDream(dreamText, 'basic');
    } catch (error) {
        console.error("[getGeminiAnalysis] Error from Gemini service:", error);
        throw error;
    }
}

// --- Internal Handler Function ---
async function handleAnalyzeDream(event, context, corsHeaders) {
    console.log(`[analyze-dream] Processing dream analysis request`);

    // JWT auth - support both Authorization header and httpOnly cookies
    const authHeader = event.headers['authorization'];
    const cookies = event.headers.cookie || '';
    let verifiedTgId = null;
    let userDbId = null;
    
    // Try JWT from Authorization header first
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId;
        } catch (error) {
            throw createApiError('Unauthorized: Invalid or expired token.', 401);
        }
    }
    // Try JWT from httpOnly cookie as fallback
    else if (cookies.includes('dream_analyzer_jwt=')) {
        try {
            const jwtMatch = cookies.match(/dream_analyzer_jwt=([^;]+)/);
            if (jwtMatch) {
                const token = jwtMatch[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                verifiedTgId = decoded.tgId;
                userDbId = decoded.userId;
            } else {
                throw new Error('JWT cookie found but could not extract token');
            }
        } catch (error) {
            throw createApiError('Unauthorized: Invalid or expired token.', 401);
        }
    } else {
        throw createApiError('Unauthorized: Missing token.', 401);
    }

    // Parse dream_text from body
    let dreamText;
    try {
        const body = JSON.parse(event.body);
        dreamText = body.dream_text;
    } catch (e) {
        throw createApiError('Invalid JSON body.', 400);
    }
    if (!dreamText || typeof dreamText !== 'string') {
        throw createApiError('Missing or invalid dream_text.', 400);
    }

    // Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // Get user DB ID if not in JWT
    if (!userDbId && verifiedTgId) {
        const { data: userData, error: fetchIdError } = await supabase
            .from('users').select('id').eq('tg_id', verifiedTgId).single();
        if (fetchIdError || !userData) {
            throw createApiError('Could not retrieve internal user ID.', 500);
        }
        userDbId = userData.id;
    }
    if (!userDbId) {
        throw createApiError('Internal authentication error.', 500);
    }

    // Check and decrement token
    const { data: tokenDecremented, error: rpcError } = await supabase
        .rpc('decrement_token_if_available', { user_tg_id: verifiedTgId });
    if (rpcError) {
        throw createApiError(`Internal token error: ${rpcError.message}`, 500);
    }
    if (!tokenDecremented) {
        throw createApiError('Insufficient tokens for analysis.', 402);
    }

    // Analyze dream
    let analysisResultText;
    try {
        analysisResultText = await getGeminiAnalysis(dreamText);
    } catch (error) {
        throw createApiError(error.message || 'Analysis failed.', 500);
    }

    // Save result to DB
    try {
        const { error: insertError } = await supabase
            .from('analyses').insert({ user_id: userDbId, dream_text: dreamText, analysis: analysisResultText });
        if (insertError) {
            throw createApiError(`Error saving analysis: ${insertError.message}`, 500);
        }
    } catch (error) {
        if (error.statusCode) throw error; // Re-throw our own errors
        throw createApiError('Internal Server Error while saving analysis.', 500);
    }

    // Invalidate user cache so tokens/profile are fresh on next fetch
    try { await userCacheService.invalidateUser(verifiedTgId); } catch (_) {}

    // Return analysis result
    return createSuccessResponse({ analysis: analysisResultText }, corsHeaders);
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleAnalyzeDream, {
    allowedMethods: 'POST',
    allowedOrigins: [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean),
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'GEMINI_API_KEY']
}); 