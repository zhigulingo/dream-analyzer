#!/usr/bin/env node
/*
  Compute HVdC demographic norms from a DreamBank-like dataset and upsert into Supabase hvdc_norms.
  Usage:
    node scripts/compute-hvdc-norms.js --file path/to/dataset.csv
  Env:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i+1]) { out.file = args[i+1]; i++; }
  }
  return out;
}

function toAgeRange(age) {
  const a = Number(age);
  if (!Number.isFinite(a)) return 'any';
  if (a < 20) return '0-20';
  if (a < 30) return '20-30';
  if (a < 40) return '30-40';
  if (a < 50) return '40-50';
  return '50+';
}

function norm100(dist) {
  const keys = ['characters','emotions','actions','symbols','settings'];
  let sum = 0; const out = {};
  for (const k of keys) { out[k] = Math.max(0, Number(dist[k]||0)); sum += out[k]; }
  if (sum <= 0) return { characters:0, emotions:0, actions:0, symbols:0, settings:0 };
  for (const k of keys) out[k] = out[k] * 100 / sum;
  // round and rebalance
  let rsum = 0; for (const k of keys) { out[k] = Math.round(out[k]); rsum += out[k]; }
  if (rsum !== 100) {
    let maxKey = 'characters'; for (const k of keys) if (out[k] > out[maxKey]) maxKey = k;
    out[maxKey] += (100 - rsum);
  }
  return out;
}

function detectColumns(header) {
  const cols = header.map((h, idx) => ({ h: h.toLowerCase().trim(), idx }));
  const pick = (patterns) => {
    const re = new RegExp(patterns.join('|'), 'i');
    const found = cols.filter(c => re.test(c.h)).map(c=>c.idx);
    return found;
  };
  return {
    age: cols.find(c => /\bage\b/.test(c.h))?.idx ?? null,
    gender: cols.find(c => /\bgender\b|\bsex\b/.test(c.h))?.idx ?? null,
    characters: pick(['character','characters']),
    emotions: pick(['emotion','affect','valence','positive','negative']),
    activities: pick(['activity','activities','physical']),
    interactions: pick(['interaction','aggress','friendly','friend','sexual','sex']),
    settings: pick(['setting','location','place','scene','scenery']),
    symbols: pick(['object','objects','symbol','symbols','artifact'])
  };
}

function sumCols(row, idxs) { let s = 0; for (const i of idxs) { const v = Number(row[i]); if (Number.isFinite(v)) s += v; } return s; }

async function main() {
  const { file } = parseArgs();
  if (!file) { console.error('Usage: node scripts/compute-hvdc-norms.js --file <dataset.csv>'); process.exit(1); }
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) { console.error('File not found:', abs); process.exit(1); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, persistSession:false } });

  const csv = fs.readFileSync(abs, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (csv.length < 2) { console.error('Dataset appears empty'); process.exit(1); }
  const header = csv[0].split(',').map(s=>s.trim());
  const idx = detectColumns(header);
  const groups = new Map();

  for (let r=1; r<csv.length; r++) {
    const row = csv[r].split(',').map(s=>s.trim());
    const age = idx.age != null ? row[idx.age] : '';
    const genderRaw = idx.gender != null ? String(row[idx.gender]||'').toLowerCase() : '';
    const gender = genderRaw.includes('f') ? 'female' : (genderRaw.includes('m') ? 'male' : 'any');
    const ageRange = toAgeRange(age);

    const dist = {
      characters: sumCols(row, idx.characters),
      emotions:   sumCols(row, idx.emotions),
      actions:    sumCols(row, [...idx.activities, ...idx.interactions]),
      symbols:    sumCols(row, idx.symbols),
      settings:   sumCols(row, idx.settings)
    };
    const normed = norm100(dist);
    const key = `${ageRange}__${gender}`;
    const acc = groups.get(key) || { n:0, sums: {characters:0,emotions:0,actions:0,symbols:0,settings:0}, age_range:ageRange, gender }; 
    for (const k of Object.keys(acc.sums)) acc.sums[k] += normed[k];
    acc.n += 1; groups.set(key, acc);
  }

  const payload = [];
  for (const [k, g] of groups) {
    if (g.n === 0) continue;
    const avg = {}; for (const kk of Object.keys(g.sums)) avg[kk] = Math.round(g.sums[kk] / g.n);
    // rebalance to 100
    let s = 0; for (const kk of Object.keys(avg)) s += avg[kk];
    if (s !== 100) { let maxK='characters'; for (const kk of Object.keys(avg)) if (avg[kk]>avg[maxK]) maxK=kk; avg[maxK]+= (100-s); }
    payload.push({ age_range: g.age_range, gender: g.gender, distribution: avg, source: `computed:${path.basename(abs)}` });
  }

  console.log('Upserting groups:', payload.length);
  const { error } = await supabase.from('hvdc_norms').upsert(payload, { onConflict: 'age_range,gender' });
  if (error) { console.error('Upsert error:', error.message); process.exit(1); }
  console.log('Done.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
