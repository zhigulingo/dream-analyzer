const { createClient } = require("@supabase/supabase-js");
const jwt = require('jsonwebtoken');
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');
const userCacheService = require('./shared/services/user-cache-service');
const { createSuccessResponse, createErrorResponse } = require('./shared/middleware/error-handler');
const geminiService = require('./shared/services/gemini-service');
const embeddingService = require('./shared/services/embedding-service');
const hvdcService = require('./shared/services/hvdc-service');
const dreamTypeService = require('./shared/services/dream-type-service');

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

let knowledgeInitialized = false;
let knowledgeInitPromise = null;

async function ensureKnowledgeBase(supabase) {
    if (knowledgeInitialized) return;
    if (knowledgeInitPromise) return knowledgeInitPromise;

    knowledgeInitPromise = (async () => {
        try {
            const { count, error } = await supabase
                .from('knowledge_chunks')
                .select('id', { count: 'exact', head: true });
            if (error) {
                console.warn('[analyze-dream] Failed to query knowledge_chunks count', error);
            } else if ((count ?? 0) === 0) {
                console.warn('[analyze-dream] knowledge_chunks table is empty. Run npm run ingest:knowledge to pre-populate.');
            }
        } catch (err) {
            console.warn('[analyze-dream] ensureKnowledgeBase check error', err?.message || err);
        } finally {
            knowledgeInitialized = true;
            knowledgeInitPromise = null;
        }
    })();

    await knowledgeInitPromise;
}

async function retrieveKnowledgeContext(supabase, dreamText) {
    try {
        await ensureKnowledgeBase(supabase);
        const embedding = await embeddingService.embed(dreamText);
        const { data, error } = await supabase.rpc('match_knowledge', {
            query_embedding: embedding,
            match_limit: 5,
            min_similarity: 0.75
        });

        if (error) {
            console.warn('[analyze-dream] match_knowledge error', error);
            return [];
        }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[analyze-dream] Failed to retrieve knowledge context', err?.message || err);
        return [];
    }
}

function buildContextAugmentedDreamText(dreamText, knowledgeMatches) {
    if (!Array.isArray(knowledgeMatches) || knowledgeMatches.length === 0) {
        return dreamText;
    }

    const contextLines = knowledgeMatches
        .slice(0, 5)
        .map((item, idx) => {
            const header = item.title ? `${item.title}` : `Контекст ${idx + 1}`;
            const category = item.category ? `[${item.category}] ` : '';
            return `(${idx + 1}) ${category}${header}\n${item.chunk}`;
        });

    return `${dreamText.trim()}\n\nДополнительный контекст (символы, архетипы, статистика):\n${contextLines.join('\n\n')}`;
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

    // Analyze dream (с учётом найденного контекста из базы знаний)
    let analysisResult;
    let hvdcResult = null;
    let dreamType = null;
    try {
        const knowledgeMatches = await retrieveKnowledgeContext(supabase, dreamText);
        const augmentedDreamText = buildContextAugmentedDreamText(dreamText, knowledgeMatches);
        const raw = await getGeminiAnalysisRaw(augmentedDreamText);
        analysisResult = parseAnalysisWithMeta(raw, dreamText);
        // Prefer DB symbols from knowledge_matches over LLM tags
        try {
            let dbSymbols = (knowledgeMatches || [])
                .filter(it => String(it.category || '').toLowerCase() === 'symbols')
                .map(it => it.title).filter(Boolean);
            if (!dbSymbols.length) {
                const { data: more } = await supabase.rpc('match_knowledge', {
                    query_embedding: await embeddingService.embed(dreamText),
                    match_limit: 20,
                    min_similarity: 0.55
                });
                dbSymbols = (Array.isArray(more) ? more : [])
                    .filter(it => String(it.category || '').toLowerCase() === 'symbols')
                    .map(it => it.title).filter(Boolean);
            }
            if (dbSymbols.length) {
                analysisResult.tags = Array.from(new Set(dbSymbols)).slice(0, 5);
            }
        } catch (_) {}
        // Demographics for HVdC
        try {
            const { data: demoRow } = await supabase
                .from('users')
                .select('age_range, gender')
                .eq('id', userDbId)
                .single();
            hvdcResult = await hvdcService.computeHVDC({ supabase, dreamText, age_range: demoRow?.age_range, gender: demoRow?.gender });
        } catch (_) { hvdcResult = null; }
        // Dream Type classification (memory/emotion/anticipation)
        try {
            dreamType = await dreamTypeService.computeDreamType({ dreamText });
        } catch (_) { dreamType = null; }
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
                    tags: finalTags,
                    hvdc: hvdcResult || null,
                    dream_type: dreamType || null
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
            if (u && String(u.subscription_type).toLowerCase() === 'onboarding1') {
                await supabase
                    .from('users')
                    .update({ subscription_type: 'onboarding2' })
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
        tags: Array.isArray(analysisResult?.tags) ? analysisResult.tags : [],
        hvdc: hvdcResult || null
    }, corsHeaders);
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleAnalyzeDream, {
    allowedMethods: 'POST',
    allowedOrigins: [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean),
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'GEMINI_API_KEY']
}); 