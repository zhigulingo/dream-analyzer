#!/usr/bin/env node
// scripts/ingest-knowledge.js
// Загружает данные из docs/dream_symbols_archetypes.json в таблицу knowledge_chunks (Supabase)

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('[ingest-knowledge] Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or GEMINI_API_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

function normalizeEntries(raw) {
  const items = [];

  if (Array.isArray(raw)) {
    raw.forEach((entry, index) => {
      const content = entry?.content ?? entry?.text ?? '';
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

async function embed(text) {
  const response = await embeddingModel.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768
  });
  return response.embedding.values;
}

async function insertRows(rows) {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('knowledge_chunks').insert(chunk);
    if (error) {
      console.error('[ingest-knowledge] Insert error', error);
      throw error;
    }
    console.log(`[ingest-knowledge] Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
}

async function main() {
  const filePath = path.resolve(__dirname, '../docs/dream_symbols_archetypes.json');
  if (!fs.existsSync(filePath)) {
    console.error(`[ingest-knowledge] File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const entries = normalizeEntries(parsed);

  if (!entries.length) {
    console.error('[ingest-knowledge] No entries with content found in source file');
    process.exit(1);
  }

  console.log(`[ingest-knowledge] Preparing ${entries.length} entries for embedding...`);

  const rows = [];
  for (const entry of entries) {
    const chunks = await chunkText(entry.content);
    for (const chunk of chunks) {
      const embedding = await embed(chunk);
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

  console.log(`[ingest-knowledge] Uploading ${rows.length} chunks to Supabase...`);
  await insertRows(rows);
  console.log('[ingest-knowledge] Done.');
}

main().catch((err) => {
  console.error('[ingest-knowledge] Fatal error', err);
  process.exit(1);
});
