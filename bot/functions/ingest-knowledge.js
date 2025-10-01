// bot/functions/ingest-knowledge.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const embeddingService = require('./shared/services/embedding-service');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function handler(event) {
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Missing Supabase env' }) };
        }
        // Auth check
        const method = (event.httpMethod || 'GET').toUpperCase();
        if (method !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }
        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch (_) {}
        const reset = Boolean(body.reset || (event.queryStringParameters && event.queryStringParameters.reset));

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        // Optional reset (delete all rows)
        if (reset) {
            const { error: delErr } = await supabase.from('knowledge_chunks').delete().neq('id', null);
            if (delErr) {
                return { statusCode: 500, body: JSON.stringify({ error: 'Failed to reset table', details: delErr.message }) };
            }
        }

        // Read source JSON
        const filePath = path.resolve(__dirname, '../../docs/dream_symbols_archetypes.json');
        if (!fs.existsSync(filePath)) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Source JSON not found' }) };
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const entries = normalizeEntries(parsed);
        if (!entries.length) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No entries in source' }) };
        }

        // Build rows with embeddings
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

        // Insert in batches
        const BATCH = 50;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const slice = rows.slice(i, i + BATCH);
            const { error } = await supabase.from('knowledge_chunks').insert(slice);
            if (error) {
                return { statusCode: 500, body: JSON.stringify({ error: 'Insert failed', details: error.message, inserted }) };
            }
            inserted += slice.length;
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true, inserted, reset }) };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e?.message || 'Unknown error' }) };
    }
}

exports.handler = handler;


