// bot/functions/ingest-knowledge-background.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const embeddingService = require('./shared/services/embedding-service');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;

async function sendTelegramMessage(chatId, text) {
    if (!BOT_TOKEN || !chatId) return;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = { chat_id: chatId, text };
    try {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (_) {}
}

function normalizeEntries(raw) {
    const items = [];
    if (Array.isArray(raw)) {
        raw.forEach((entry, index) => {
            const content = entry?.content ?? entry?.text ?? entry?.description ?? '';
            if (!content || !content.trim()) return;
            items.push({
                id: entry?.id || `doc-${index}-${crypto.randomUUID()}`,
                category: entry?.category || entry?.type || 'general',
                title: entry?.title || entry?.name || 'Без названия',
                content
            });
        });
        return items;
    }
    if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([category, arr]) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((entry, index) => {
                const content = entry?.content ?? entry?.text ?? entry?.description ?? '';
                if (!content || !content.trim()) return;
                items.push({
                    id: entry?.id || `${category}-${index}-${crypto.randomUUID()}`,
                    category,
                    title: entry?.title || entry?.name || entry?.symbol || 'Без названия',
                    content
                });
            });
        });
    }
    return items;
}

async function chunkText(text, maxChars = 1200) {
    if (text.length <= maxChars) return [text];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const slice = text.slice(start, start + maxChars);
        chunks.push(slice);
        start += maxChars;
    }
    return chunks;
}

exports.handler = async (event) => {
    // Background function returns 202 immediately; Netlify will run it to completion
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return { statusCode: 500, body: 'Missing Supabase env' };
        }
        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch (_) {}
        const reset = Boolean(body.reset);
        const chatId = body.chatId || null;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        // Optionally reset table
        if (reset) {
            await supabase.from('knowledge_chunks').delete().neq('id', null);
        }

        // Read JSON
        const filePath = path.resolve(__dirname, '../../docs/dream_symbols_archetypes.json');
        if (!fs.existsSync(filePath)) {
            await sendTelegramMessage(chatId, 'Инжест: исходный файл не найден');
            return { statusCode: 202, body: 'OK' };
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const entries = normalizeEntries(parsed);
        if (!entries.length) {
            await sendTelegramMessage(chatId, 'Инжест: нет записей в исходном файле');
            return { statusCode: 202, body: 'OK' };
        }

        const rows = [];
        for (const entry of entries) {
            const chunks = await chunkText(entry.content);
            for (const chunk of chunks) {
                const embedding = await embeddingService.embed(chunk);
                rows.push({
                    source: entry.id,
                    category: entry.category,
                    title: entry.title,
                    chunk,
                    embedding,
                    metadata: {
                        original_length: entry.content.length,
                        chunk_count: chunks.length
                    }
                });
            }
        }

        const BATCH = 50;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const slice = rows.slice(i, i + BATCH);
            const { error } = await supabase.from('knowledge_chunks').insert(slice);
            if (error) {
                await sendTelegramMessage(chatId, `Инжест: ошибка вставки после ${inserted}: ${error.message}`);
                return { statusCode: 202, body: 'OK' };
            }
            inserted += slice.length;
        }

        await sendTelegramMessage(chatId, `Инжест завершён. Вставлено чанков: ${inserted}.`);
        return { statusCode: 202, body: 'OK' };
    } catch (e) {
        try { await sendTelegramMessage(null, `Инжест: ошибка ${e?.message}`); } catch (_) {}
        return { statusCode: 202, body: 'OK' };
    }
};


