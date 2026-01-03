// Minimal HVdC computation service: builds HVdC JSON via LLM and compares with demographic norm from knowledge base
const geminiService = require('./gemini-service');
const embeddingService = require('./embedding-service');

const PROMPT_KEYS = {
  NO_DEMO: 'hvdc_json_nodemo',
  WITH_DEMO: 'hvdc_json_demo',
  PARSE_STATS: 'hvdc_stats_parse'
};

function clampPercent(n) {
  const x = Number(n);
  if (!isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function normalizeDistribution(dist) {
  // Only 4 buckets: characters, emotions, actions, settings
  const keys = ['characters','emotions','actions','settings'];
  const out = {};
  let sum = 0;
  for (const k of keys) {
    const v = clampPercent(dist?.[k] ?? 0);
    out[k] = Math.round(v);
    sum += out[k];
  }
  if (sum === 100) return out;
  // simple rebalancing to sum 100
  const diff = 100 - sum;
  // spread the diff to the largest component to keep shape stable
  let maxKey = 'characters';
  for (const k of keys) if (out[k] > out[maxKey]) maxKey = k;
  out[maxKey] = clampPercent(out[maxKey] + diff);
  return out;
}

function buildComparison(dist, norm) {
  const keys = ['characters','emotions','actions','settings'];
  const cmp = {};
  for (const k of keys) {
    const a = Number(dist?.[k] ?? 0);
    const b = Number(norm?.[k] ?? 0);
    const delta = +(a - b).toFixed(1);
    cmp[k] = delta;
  }
  return cmp;
}

async function retrieveNormChunks(supabase, age_range, gender) {
  try {
    const q = `HVDC statistics; age:${age_range || 'any'}; gender:${gender || 'any'}`;
    const emb = await embeddingService.embed(q);
    const { data, error } = await supabase.rpc('match_knowledge', { query_embedding: emb, match_limit: 5, min_similarity: 0.6 });
    if (error) return [];
    const items = Array.isArray(data) ? data : [];
    return items.filter(x => String(x.category || '').toLowerCase().includes('stat'));
  } catch (_) { return []; }
}

async function retrieveNormFromTable(supabase, age_range, gender) {
  if (!supabase) return null;
  const order = [
    { age: age_range || 'any', gen: gender || 'any' },
    { age: age_range || 'any', gen: 'any' },
    { age: 'any', gen: gender || 'any' },
    { age: 'any', gen: 'any' }
  ];
  for (const key of order) {
    try {
      const { data, error } = await supabase
        .from('hvdc_norms')
        .select('distribution,id')
        .eq('age_range', key.age)
        .eq('gender', key.gen)
        .maybeSingle();
      if (!error && data && data.distribution) {
        return { norm: normalizeDistribution(data.distribution), sourceIds: [data.id] };
      }
    } catch (_) {}
  }
  return null;
}

async function parseNormFromText(text) {
  try {
    const prompt = require('../prompts/dream-prompts').getPrompt(PROMPT_KEYS.PARSE_STATS, text);
    const model = await geminiService.initialize();
    const res = await model.generateContent(prompt);
    const t = (await res.response).text().trim();
    const cleaned = t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
    const obj = JSON.parse(cleaned);
    return normalizeDistribution(obj?.distribution || {});
  } catch (_) { return null; }
}

async function buildNormFromChunks(chunks) {
  if (!chunks?.length) return { norm: null, sourceIds: [] };
  // try JSON parse from chunks directly; else use parseNormFromText on best chunk
  let parsed = null;
  for (const c of chunks) {
    try {
      const maybe = JSON.parse(c.chunk);
      const dist = normalizeDistribution(maybe?.distribution || maybe || {});
      parsed = dist; break;
    } catch (_) { /* noop */ }
  }
  if (!parsed) {
    const best = chunks[0];
    parsed = await parseNormFromText(best?.chunk || '');
  }
  return { norm: parsed, sourceIds: chunks.map(c => c.id).slice(0,3) };
}

async function computeHVDC({ supabase, dreamText, age_range, gender }) {
  try {
    const hasDemo = Boolean(age_range && gender);
    let normCtxText = '';
    let norm = null; let normSourceIds = [];

    if (hasDemo) {
      // 1) Try explicit hvdc_norms table
      const fromTable = await retrieveNormFromTable(supabase, age_range, gender);
      if (fromTable?.norm) {
        norm = fromTable.norm; normSourceIds = fromTable.sourceIds || [];
      } else {
        // 2) Fallback: try RAG knowledge chunks (optional)
        const chunks = await retrieveNormChunks(supabase, age_range, gender);
        const { norm: parsedNorm, sourceIds } = await buildNormFromChunks(chunks);
        norm = parsedNorm; normSourceIds = sourceIds;
        if (chunks?.length) {
          const lines = chunks.slice(0,3).map((c,i)=>`(${i+1}) ${c.title || 'Статистика'}\n${c.chunk}`);
          normCtxText = `Норма HVdC (контекст):\n${lines.join('\n\n')}`;
        }
      }
    }

    const promptKey = hasDemo ? PROMPT_KEYS.WITH_DEMO : PROMPT_KEYS.NO_DEMO;
    const payload = hasDemo && normCtxText ? `${dreamText}\n\n${normCtxText}` : dreamText;
    const raw = await geminiService.analyzeDream(payload, promptKey);
    let obj;
    try {
      const cleaned = String(raw).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
      obj = JSON.parse(cleaned);
    } catch (_) {
      // fallback: try to find first {...}
      const s = String(raw);
      const a = s.indexOf('{'); const b = s.lastIndexOf('}');
      if (a !== -1 && b !== -1 && b > a) {
        try { obj = JSON.parse(s.slice(a, b+1)); } catch (_) {}
      }
    }
    if (!obj || typeof obj !== 'object') throw new Error('HVDC JSON parse failed');
    // Map any 5-bucket payloads to 4-bucket by ignoring 'symbols'
    const rawDist = obj.distribution || {};
    const four = {
      characters: rawDist.characters,
      emotions: rawDist.emotions,
      actions: rawDist.actions,
      settings: rawDist.settings
    };
    const distribution = normalizeDistribution(four);
    const result = {
      schema: 'hvdc_v1',
      distribution,
      demographic_used: hasDemo,
      norm_group: hasDemo ? { age_range, gender } : null
    };
    if (hasDemo) {
      const rawNorm = obj.norm ? {
        characters: obj.norm.characters,
        emotions: obj.norm.emotions,
        actions: obj.norm.actions,
        settings: obj.norm.settings
      } : null;
      const finalNorm = norm || (rawNorm ? normalizeDistribution(rawNorm) : null);
      if (finalNorm) {
        result.norm = finalNorm;
        result.comparison = buildComparison(distribution, finalNorm);
        if (normSourceIds?.length) result.norm_source_ids = normSourceIds;
      }
    }
    return result;
  } catch (e) {
    return null; // non-blocking
  }
}

module.exports = { computeHVDC };
