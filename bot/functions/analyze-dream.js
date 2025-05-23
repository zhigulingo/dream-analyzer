const { createClient } = require("@supabase/supabase-js");
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN;

// Gemini/AI analysis logic (copied from bot.js)
async function getGeminiAnalysis(dreamText) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const MAX_DREAM_LENGTH = 4000;
    if (!dreamText || dreamText.trim().length === 0) throw new Error("Empty dream text.");
    if (dreamText.length > MAX_DREAM_LENGTH) throw new Error(`Dream too long (> ${MAX_DREAM_LENGTH} chars).`);
    try {
        const prompt = `You are an empathetic dream interpreter. Analyze the dream, maintaining confidentiality, avoiding medical diagnoses/predictions. Dream: "${dreamText}". Analysis (2-4 paragraphs): 1. Symbols/meanings. 2. Emotions/connection to reality (if applicable). 3. Themes/messages. Respond softly, supportively.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        if (response.promptFeedback?.blockReason) {
            throw new Error(`Analysis blocked (${response.promptFeedback.blockReason}).`);
        }
        const analysisText = response.text();
        if (!analysisText || analysisText.trim().length === 0) {
            throw new Error("Empty response from analysis service.");
        }
        return analysisText;
    } catch (error) {
        if (error.message?.includes("API key not valid")) throw new Error("Invalid Gemini API key.");
        else if (error.status === 404 || error.message?.includes("404") || error.message?.includes("is not found")) throw new Error("Gemini model not found.");
        else if (error.message?.includes("quota")) throw new Error("Gemini API quota exceeded.");
        throw new Error(`Error communicating with analysis service (${error.message})`);
    }
}

exports.handler = async (event) => {
    const allowedOrigins = [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean);
    const requestOrigin = event.headers.origin || event.headers.Origin;
    const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !GEMINI_API_KEY) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
    }

    // JWT auth
    const authHeader = event.headers['authorization'];
    let verifiedTgId = null;
    let userDbId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            verifiedTgId = decoded.tgId;
            userDbId = decoded.userId;
        } catch (error) {
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }) };
        }
    } else {
        return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing token.' }) };
    }

    // Parse dream_text from body
    let dreamText;
    try {
        const body = JSON.parse(event.body);
        dreamText = body.dream_text;
    } catch (e) {
        return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
    }
    if (!dreamText || typeof dreamText !== 'string') {
        return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing or invalid dream_text.' }) };
    }

    // Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // Get user DB ID if not in JWT
    if (!userDbId && verifiedTgId) {
        const { data: userData, error: fetchIdError } = await supabase
            .from('users').select('id').eq('tg_id', verifiedTgId).single();
        if (fetchIdError || !userData) {
            return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Could not retrieve internal user ID.' }) };
        }
        userDbId = userData.id;
    }
    if (!userDbId) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal authentication error.' }) };
    }

    // Check and decrement token
    const { data: tokenDecremented, error: rpcError } = await supabase
        .rpc('decrement_token_if_available', { user_tg_id: verifiedTgId });
    if (rpcError) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Internal token error: ${rpcError.message}` }) };
    }
    if (!tokenDecremented) {
        return { statusCode: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Insufficient tokens for analysis.' }) };
    }

    // Analyze dream
    let analysisResultText;
    try {
        analysisResultText = await getGeminiAnalysis(dreamText);
    } catch (error) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Analysis failed.' }) };
    }

    // Save result to DB
    try {
        const { error: insertError } = await supabase
            .from('analyses').insert({ user_id: userDbId, dream_text: dreamText, analysis: analysisResultText });
        if (insertError) {
            return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Error saving analysis: ${insertError.message}` }) };
        }
    } catch (error) {
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error while saving analysis.' }) };
    }

    // Return analysis result
    return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: analysisResultText })
    };
}; 