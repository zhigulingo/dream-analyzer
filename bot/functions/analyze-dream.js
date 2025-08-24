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

// Gemini/AI analysis logic using simplified prompt with metadata lines
async function getGeminiAnalysisRaw(dreamText) {
    try {
        return await geminiService.analyzeDream(dreamText, 'basic_meta');
    } catch (error) {
        console.error("[getGeminiAnalysisRaw] Error from Gemini service:", error);
        throw error;
    }
}

// Parse final two metadata lines: "Заголовок: ..." and "Теги: a, b, c"
function parseAnalysisWithMeta(rawText, originalDreamText) {
    const result = { analysis: '', title: null, tags: [] };
    if (!rawText || typeof rawText !== 'string') return result;
    const lines = rawText.split(/\r?\n/);
    let title = null;
    let tags = [];
    // Scan from bottom up to find meta lines
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;
        if (!tags.length && /^Теги\s*:/i.test(line)) {
            const after = line.replace(/^Теги\s*:/i, '').trim();
            tags = after.split(',').map(s => s.trim()).filter(Boolean).slice(0,5);
            lines.splice(i, 1);
            continue;
        }
        if (!title && /^Заголовок\s*:/i.test(line)) {
            title = line.replace(/^Заголовок\s*:/i, '').trim();
            // remove punctuation/specials, keep short
            title = title.replace(/[\p{P}\p{S}]/gu, '').trim().slice(0, 60);
            lines.splice(i, 1);
            continue;
        }
        // stop once both found
        if (title && tags.length) break;
    }
    const analysisText = lines.join('\n').trim();
    result.analysis = analysisText || String(rawText);
    result.title = title && title.length ? title : null;
    if (!tags.length) {
        // fallback simple tags from text
        tags = extractFallbackTags(analysisText || originalDreamText);
    }
    result.tags = tags;
    return result;
}

// Simple fallback tag extraction (RU stopwords)
function extractFallbackTags(text, maxTags = 5) {
    try {
        if (!text) return [];
        const stop = new Set(['и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','была','сам','чтоб','без','будто','чего','раз','тоже','себе','под','будет','ж','тогда','кто','этот','того','потому','этого','какой','совсем','ним','здесь','этом','один','почти','мой','тем','чтобы','нее','кажется','сейчас','были','куда','зачем','всех','никогда','можно','при','наконец','два','об','другой','хоть','после','над','больше','тот','через','эти','нас','про','всего','них','какая','много','разве','три','эту','моя','впрочем','хорошо','свою','этой','перед','иногда','лучше','чуть','том','нельзя','такой','им','более','всегда','конечно','всю','между']);
        const tokens = String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
        const freq = new Map();
        for (const t of tokens) {
            if (t.length < 4 || stop.has(t)) continue;
            freq.set(t, (freq.get(t) || 0) + 1);
        }
        const sorted = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0, maxTags).map(([w])=>w);
        return sorted;
    } catch (_) { return []; }
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
    let analysisResult;
    try {
        const raw = await getGeminiAnalysisRaw(dreamText);
        analysisResult = parseAnalysisWithMeta(raw, dreamText);
    } catch (error) {
        throw createApiError(error.message || 'Analysis failed.', 500);
    }

    // Save result to DB
    try {
        // Generate a short 2-3 word title (heuristic; stored in deep_source.title for now)
        // Fallbacks for title/tags if model returned plain text
        const finalTitle = analysisResult?.title || null;
        const finalTags = Array.isArray(analysisResult?.tags) && analysisResult.tags.length > 0
            ? analysisResult.tags
            : extractFallbackTags(analysisResult?.analysis || dreamText);

        const { error: insertError } = await supabase
            .from('analyses').insert({ 
                user_id: userDbId, 
                dream_text: dreamText, 
                analysis: analysisResult?.analysis || '',
                deep_source: { 
                    title: finalTitle,
                    tags: finalTags
                }
            });
        if (insertError) {
            throw createApiError(`Error saving analysis: ${insertError.message}`, 500);
        }
        // Transition onboarding: if user is in onboarding2/stage2, mark as completed (stage3/free)
        try {
            const { data: u } = await supabase
                .from('users')
                .select('id, subscription_type')
                .eq('id', userDbId)
                .single();
            if (u && String(u.subscription_type).toLowerCase() === 'onboarding2') {
                await supabase
                    .from('users')
                    .update({ subscription_type: 'free' })
                    .eq('id', userDbId);
            }
        } catch (_) {}
        // После успешного сохранения обычного анализа пытаемся выдать бесплатный кредит глубокого анализа,
        // если пользователь впервые достиг 5 снов
        try {
            await supabase.rpc('grant_free_deep_if_eligible', { user_tg_id: verifiedTgId });
        } catch (_) {}
    } catch (error) {
        if (error.statusCode) throw error; // Re-throw our own errors
        throw createApiError('Internal Server Error while saving analysis.', 500);
    }

    // Invalidate user cache so tokens/profile are fresh on next fetch
    try { await userCacheService.invalidateUser(verifiedTgId); } catch (_) {}

    // Return analysis result
    return createSuccessResponse({ 
        analysis: analysisResult?.analysis || '',
        title: analysisResult?.title || null,
        tags: Array.isArray(analysisResult?.tags) ? analysisResult.tags : []
    }, corsHeaders);
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleAnalyzeDream, {
    allowedMethods: 'POST',
    allowedOrigins: [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean),
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'GEMINI_API_KEY']
}); 