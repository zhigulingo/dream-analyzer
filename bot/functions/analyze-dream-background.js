// bot/functions/analyze-dream-background.js

const { createClient } = require('@supabase/supabase-js');
const geminiService = require('./shared/services/gemini-service');
const embeddingService = require('./shared/services/embedding-service');

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
                .select('beta_whitelisted, beta_access_at')
                .eq('tg_id', tgUserId)
                .single();
            if (uErr && uErr.code !== 'PGRST116') {
                throw uErr;
            }
            const accessAt = u?.beta_access_at ? new Date(u.beta_access_at).getTime() : null;
            if (!u || !u.beta_whitelisted) {
                if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
                await sendTelegramMessage(chatId, 'Бета-доступ пока закрыт. Заполните анкету и дождитесь одобрения.');
                return { statusCode: 202, body: 'Not whitelisted' };
            }
            if (accessAt && accessAt > Date.now()) {
                const secs = Math.max(0, Math.floor((accessAt - Date.now()) / 1000));
                const hours = Math.floor(secs / 3600);
                const minutes = Math.floor((secs % 3600) / 60);
                if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
                await sendTelegramMessage(chatId, `Доступ скоро появится. Осталось примерно ${hours}ч ${minutes}м.`);
                return { statusCode: 202, body: 'Access pending' };
            }
        } catch (e) {
            console.warn('[analyze-dream-background] Whitelist check failed', e?.message);
            if (statusMessageId) await deleteTelegramMessage(chatId, statusMessageId);
            await sendTelegramMessage(chatId, 'Временная ошибка. Попробуйте позже.');
            return { statusCode: 202, body: 'Whitelist check error' };
        }

        // Retrieve RAG context if possible
        let augmented = dreamText;
        try {
            const qEmb = await embed(dreamText);
            if (Array.isArray(qEmb)) {
                const { data, error } = await supabase.rpc('match_knowledge', { query_embedding: qEmb, match_limit: 5, min_similarity: 0.6 });
                if (error) console.warn('[analyze-dream-background] match_knowledge error', error?.message);
                const matches = Array.isArray(data) ? data : [];
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
            await sendTelegramMessage(chatId, `Произошла ошибка при анализе сна: ${e.message || 'Неизвестная ошибка'}. Попробуйте позже.`);
            return { statusCode: 202, body: 'Gemini error' };
        }

        const parsed = parseAnalysisWithMeta(analysisText, dreamText);

        // Save to DB
        try {
            await supabase.from('analyses').insert({
                user_id: userDbId,
                dream_text: dreamText,
                analysis: parsed.analysis || analysisText || '',
                deep_source: { title: parsed.title || null, tags: parsed.tags || [] }
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
        return { statusCode: 202, body: 'Error' };
    }
};


