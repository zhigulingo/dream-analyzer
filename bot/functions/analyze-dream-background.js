// bot/functions/analyze-dream-background.js

const { createClient } = require('@supabase/supabase-js');
const geminiService = require('./shared/services/gemini-service');
const embeddingService = require('./shared/services/embedding-service');
const hvdcService = require('./shared/services/hvdc-service');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TMA_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://dream-analyzer.netlify.app';

async function sendTelegramMessage(chatId, text, replyMarkup) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = { chat_id: chatId, text };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.warn('[analyze-dream-background] Failed to send message', res.status, t);
    }
}

async function deleteTelegramMessage(chatId, messageId) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
    const body = { chat_id: chatId, message_id: messageId };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

function parseAnalysisWithMeta(rawText, originalDreamText) {
    const result = { analysis: '', title: null, tags: [] };
    if (!rawText || typeof rawText !== 'string') return result;
    const lines = rawText.split(/\r?\n/);
    let title = null; let tags = [];
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
            title = line.replace(/^Заголовок\s*:/i, '').trim().replace(/[\p{P}\p{S}]/gu, '').slice(0,60);
            lines.splice(i, 1);
            continue;
        }
        if (title && tags.length) break;
    }
    const analysisText = lines.join('\n').trim();
    result.analysis = analysisText || String(rawText);
    result.title = title && title.length ? title : null;
    result.tags = tags;
    return result;
}

async function embed(text) {
    try { 
        return await embeddingService.embed(text); 
    } catch (err) { 
        console.warn('[analyze-dream-background] Embedding failed:', err?.message);
        return null; 
    }
}

function truncateDream(text, maxLen = 3000) {
    try {
        const t = String(text || '');
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen) + '…';
    } catch { return ''; }
}

exports.handler = async (event) => {
    if (String(process.env.BOT_PAUSED || 'true').toLowerCase() === 'true') {
        return { statusCode: 202, body: 'Paused' };
    }
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
            console.error('[analyze-dream-background] Missing required env vars');
            return { statusCode: 500, body: 'Missing env' };
        }

        const { tgUserId, userDbId, chatId, statusMessageId, dreamText } = JSON.parse(event.body || '{}');
        if (!tgUserId || !userDbId || !chatId || !dreamText) {
            return { statusCode: 400, body: 'Bad request' };
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        // Enforce beta whitelist + access_at gate
        try {
            const { data: u, error: uErr } = await supabase
                .from('users')
                .select('beta_whitelisted, beta_access_at, subscription_type')
                .eq('tg_id', tgUserId)
                .single();
            if (uErr && uErr.code !== 'PGRST116') {
                throw uErr;
            }
            const sub = String(u?.subscription_type || '').toLowerCase();
            const accessAt = u?.beta_access_at ? new Date(u.beta_access_at).getTime() : null;

            // Gate only for beta application/whitelist states; allow normal plans (free/premium) to proceed
            if (!u || !u.beta_whitelisted) {
                if (sub === 'beta') {
                    if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
                    const back = truncateDream(dreamText);
                    const txt = 'Ваша заявка на участие в бета-тесте принята. Дождитесь одобрения.';
                    await sendTelegramMessage(chatId, `${txt}\n\n${back}`);
                    return { statusCode: 202, body: 'Not whitelisted (applied)' };
                }
                // else: not whitelisted and not in beta application → proceed without gating
            } else {
                // Whitelisted: gate only if access not opened yet OR explicit onboarding state
                if (accessAt && accessAt > Date.now()) {
                    const secs = Math.max(0, Math.floor((accessAt - Date.now()) / 1000));
                    const hours = Math.floor(secs / 3600);
                    const minutes = Math.floor((secs % 3600) / 60);
                    if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
                    const back = truncateDream(dreamText);
                    await sendTelegramMessage(chatId, `Доступ скоро появится. Осталось примерно ${hours}ч ${minutes}м.\n\n${back}`);
                    return { statusCode: 202, body: 'Access pending' };
                }
                if (sub === 'whitelisted') {
                    if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
                    const back = truncateDream(dreamText);
                    await sendTelegramMessage(chatId, `Перед анализом пройдите короткий онбординг — откройте мини‑приложение (кнопка в /start).\n\n${back}`);
                    return { statusCode: 202, body: 'Onboarding pending' };
                }
                // else (e.g., free/premium etc.) → proceed
            }
        } catch (e) {
            console.warn('[analyze-dream-background] Whitelist check failed', e?.message);
            if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
            const back = truncateDream(dreamText);
            await sendTelegramMessage(chatId, `Временная ошибка. Попробуйте позже.\n\n${back}`);
            return { statusCode: 202, body: 'Whitelist check error' };
        }

        // Retrieve RAG context if possible
        let augmented = dreamText;
        let knowledgeMatches = [];
        try {
            const qEmb = await embed(dreamText);
            if (Array.isArray(qEmb)) {
                const { data, error } = await supabase.rpc('match_knowledge', { query_embedding: qEmb, match_limit: 5, min_similarity: 0.6 });
                if (error) console.warn('[analyze-dream-background] match_knowledge error', error?.message);
                const matches = Array.isArray(data) ? data : [];
                knowledgeMatches = matches;
                console.log(`[analyze-dream-background] RAG matches: ${matches.length}`);
                if (matches.length) {
                    const ctx = matches.slice(0, 5).map((item, idx) => `(${idx + 1}) ${item.title || 'Контекст'}\n${item.chunk || ''}`).join('\n\n');
                    augmented = `${dreamText.trim()}\n\nДополнительный контекст (символы, архетипы, статистика):\n${ctx}`;
                }
            }
        } catch (e) { console.warn('[analyze-dream-background] RAG retrieval failed', e?.message); }

        // Run Gemini
        let analysisText;
        try {
            analysisText = await geminiService.analyzeDream(augmented, 'basic_meta');
        } catch (e) {
            console.error('[analyze-dream-background] Gemini error', e?.message);
            if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
            const back = truncateDream(dreamText);
            await sendTelegramMessage(chatId, `Ошибка приложения. Ваш сон не проанализирован:\n\n${back}`);
            return { statusCode: 202, body: 'Gemini error' };
        }

        const parsed = parseAnalysisWithMeta(analysisText, dreamText);
        // Prefer DB symbols from knowledge matches (fallback to wider search)
        try {
            let dbSymbols = (knowledgeMatches || [])
              .filter(it => String(it.category || '').toLowerCase() === 'symbols')
              .map(it => it.title).filter(Boolean);
            if (!dbSymbols.length) {
              const { data: more } = await supabase.rpc('match_knowledge', { query_embedding: await embed(dreamText), match_limit: 20, min_similarity: 0.55 });
              dbSymbols = (Array.isArray(more) ? more : [])
                .filter(it => String(it.category || '').toLowerCase() === 'symbols')
                .map(it => it.title).filter(Boolean);
            }
            if (dbSymbols.length) parsed.tags = Array.from(new Set(dbSymbols)).slice(0, 5);
        } catch (_) {}
        // HVdC computation (non-blocking)
        let hvdcResult = null;
        try {
            const { data: demoRow } = await supabase
              .from('users')
              .select('age_range, gender')
              .eq('id', userDbId)
              .single();
            hvdcResult = await hvdcService.computeHVDC({ supabase, dreamText, age_range: demoRow?.age_range, gender: demoRow?.gender });
        } catch (_) { hvdcResult = null; }

        // Save to DB
        try {
            await supabase.from('analyses').insert({
                user_id: userDbId,
                dream_text: dreamText,
                analysis: parsed.analysis || analysisText || '',
                deep_source: { title: parsed.title || null, tags: parsed.tags || [], hvdc: hvdcResult || null }
            });
        } catch (e) { console.warn('[analyze-dream-background] Save error', e?.message); }

        // Decrement token after success
        try {
            await supabase.rpc('decrement_token_if_available', { user_tg_id: tgUserId });
        } catch (e) { console.warn('[analyze-dream-background] Token decrement error', e?.message); }

        // Notify user
        try {
            if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
        } catch (_) {}
        const replyMarkup = {
            inline_keyboard: [[{ text: 'Открыть Личный кабинет', web_app: { url: TMA_URL } }]]
        };
        await sendTelegramMessage(chatId, 'Анализ готов и сохранён! ✨\n\nПосмотрите его в разделе «Личный кабинет».', replyMarkup);

        return { statusCode: 202, body: 'OK' };
    } catch (e) {
        console.error('[analyze-dream-background] Fatal error', e?.message);
        try {
            const body = JSON.parse(event.body || '{}');
            const { chatId, statusMessageId, dreamText } = body;
            if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
            const back = truncateDream(dreamText);
            await sendTelegramMessage(chatId, `Ошибка приложения. Ваш сон не проанализирован:\n\n${back}`);
        } catch (_) {}
        return { statusCode: 202, body: 'Error' };
    }
};


