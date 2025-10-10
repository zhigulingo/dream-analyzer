#!/usr/bin/env node
/*
  Import demographic HVdC norms from a simple CSV into Supabase hvdc_norms.
  CSV expected columns (case-insensitive, extra columns ignored):
    age_range, gender, characters, emotions, actions, settings[, source]

  - age_range: one of 0-20,20-30,30-40,40-50,50+,any (auto-mapped from common labels)
  - gender: male,female,any
  - values are percentages; if sum != 100, will be normalized and rebalanced

  Usage:
    node scripts/import-hvdc-norms.js --file docs/datasets/norms.csv [--truncate] [--inspect]

  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (loaded from .env)
*/

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (_) {}
const { createClient } = require('@supabase/supabase-js');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { file: 'docs/datasets/norms.csv', truncate: false, inspect: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i+1]) { out.file = argv[++i]; }
    else if (a === '--truncate') { out.truncate = true; }
    else if (a === '--inspect') { out.inspect = true; }
  }
  return out;
}

function normKey(s){
  return String(s||'')
    .toLowerCase()
    .replace(/[\u2013\u2014]/g,'-') // en/em dashes -> hyphen
    .replace(/[%\s]/g,'')
    .replace(/[^a-z0-9+\-]/g,'');
}

function toAgeRange(v){
  const s = normKey(v);
  if (!s) return 'any';
  if (/(^|\b)(0-20|20-30|30-40|40-50|50\+|any)(\b|$)/.test(s)) return s.replace(/[^0-9+\-]/g,'');
  if (/(13-17|under18|<18|0-19)/.test(s)) return '0-20';
  if (/(18-24|20-29|25-29|25-34)/.test(s)) return '20-30';
  if (/(30-34|35-39|30-39)/.test(s)) return '30-40';
  if (/(40-44|45-49|35-49|40-49)/.test(s)) return '40-50';
  if (/(50-64|55-64|60\+|65\+|65-74|75\+)/.test(s)) return '50+';
  const n = Number(String(v).replace(/[^0-9.]/g,''));
  if (Number.isFinite(n)) {
    if (n < 20) return '0-20'; if (n < 30) return '20-30'; if (n < 40) return '30-40'; if (n < 50) return '40-50'; return '50+';
  }
  return 'any';
}

function toGender(v){
  const raw = String(v||'').toLowerCase().trim();
  if (!raw) return 'any';
  if (/(^|\b)(male|m\b|муж|мужской)(\b|$)/.test(raw)) return 'male';
  if (/(^|\b)(female|f\b|жен|женский)(\b|$)/.test(raw)) return 'female';
  const s = normKey(raw);
  if (/^male\b|\bm\b/.test(s)) return 'male';
  if (/^female\b|\bf\b/.test(s)) return 'female';
  return 'any';
}

function parseDelimitedLine(s, delimiter=','){
  const out=[]; let cur=''; let q=false;
  for (let i=0;i<s.length;i++){
    const ch=s[i];
    if (ch==='"') { if (q && s[i+1]==='"'){ cur+='"'; i++; } else { q=!q; } continue; }
    if (ch===delimiter && !q){ out.push(cur); cur=''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x=>x.trim());
}

function clamp01(n){ const x=Number(String(n).replace(/,/g,'.')); return Number.isFinite(x)?Math.max(0,x):0; }

function toDistribution(row, cols){
  const d={
    characters: clamp01(row[cols.characters] ?? 0),
    emotions:   clamp01(row[cols.emotions] ?? 0),
    actions:    clamp01(row[cols.actions] ?? 0),
    settings:   clamp01(row[cols.settings] ?? 0)
  };
  // normalize to 100
  let sum = d.characters + d.emotions + d.actions + d.settings;
  if (sum <= 0) return d; // leave zeros
  let out={};
  out.characters = Math.round(d.characters * 100 / sum);
  out.emotions   = Math.round(d.emotions   * 100 / sum);
  out.actions    = Math.round(d.actions    * 100 / sum);
  out.settings   = Math.round(d.settings   * 100 / sum);
  let rsum = out.characters + out.emotions + out.actions + out.settings;
  if (rsum !== 100){
    const maxKey = ['characters','emotions','actions','settings'].reduce((a,b)=> out[a]>=out[b]?a:b);
    out[maxKey] += (100 - rsum);
  }
  return out;
}

async function main(){
  const args = parseArgs();
  const abs = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(abs)) { console.error('File not found:', abs); process.exit(1); }
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, persistSession:false } });

  const text = fs.readFileSync(abs,'utf-8');
  const lines = text.split(/\r?\n/).filter(l=>l.length>0);
  if (lines.length < 2){
    console.error('CSV is empty or missing header. Expected a header and at least 1 data row.');
    console.error('Example header: age_range,gender,characters,emotions,actions,settings,source');
    process.exit(1);
  }
  const header = parseDelimitedLine(lines[0]);
  const idxRaw = Object.fromEntries(header.map((h,i)=>[h, i]));
  const keyOf = (names) => {
    for (const [orig, i] of Object.entries(idxRaw)) {
      const h = normKey(orig);
      const hBase = h.replace(/(pct|percent|percentage)$/,'');
      for (const name of names) {
        const nk = normKey(name);
        if (!nk) continue; // skip empty tokens (e.g., non-latin labels reduced to '')
        if (h === nk || hBase === nk || (h.startsWith(nk) && nk.length>=3) || (hBase.startsWith(nk) && nk.length>=3)) return i;
      }
    }
    return null;
  };
  // Support EN/RU header synonyms
  const idx = {
    'age_range': keyOf(['age_range','age range','age','age_group','age group','возраст','возрастная группа','возрастная_группа']),
    'gender':    keyOf(['gender','sex','пол']),
    'characters':keyOf(['characters','chars','персонажи','characters_pct']),
    'emotions':  keyOf(['emotions','emo','эмоции','emotions_pct']),
    'actions':   keyOf(['actions','acts','действия','actions_pct']),
    'settings':  keyOf(['settings','scenes','сцены','сцены/места','сцены_места','scenes_pct']),
    'source':    keyOf(['source','источник'])
  };
  const need = ['age_range','gender','characters','emotions','actions','settings'];
  for (const k of need){ if (idx[k] == null){ console.error('Missing column in CSV:', k, 'Headers:', header); process.exit(1); } }
  // If age_range/gender absent, default to any
  if (idx['age_range'] == null) idx['age_range'] = null;
  if (idx['gender'] == null) idx['gender'] = null;

  if (args.inspect){
    console.log('Detected columns:', idx);
  }

  if (args.truncate){
    const { error } = await supabase.from('hvdc_norms').delete().neq('age_range','__protect__');
    if (error){ console.error('Truncate error:', error.message); process.exit(1); }
  }

  const payload = [];
  for (let r=1;r<lines.length;r++){
    const row = parseDelimitedLine(lines[r]);
    const age_range = idx['age_range']!=null ? toAgeRange(row[idx['age_range']]) : 'any';
    const gender = idx['gender']!=null ? toGender(row[idx['gender']]) : 'any';
    const distribution = toDistribution(row, idx);
    const source = idx['source']!=null ? row[idx['source']] : 'import:norms.csv';
    payload.push({ age_range, gender, distribution, source });
  }

  // Deduplicate by (age_range, gender) to avoid ON CONFLICT targeting same row twice
  const byKey = new Map();
  for (const p of payload){
    const key = `${p.age_range}__${p.gender}`;
    byKey.set(key, p); // last one wins
  }
  const uniquePayload = Array.from(byKey.values());

  if (args.inspect){
    console.log('Preview groups:', Array.from(byKey.keys()));
    console.log('First rows:', uniquePayload.slice(0, Math.min(5, uniquePayload.length)));
  }

  console.log('Upserting groups:', uniquePayload.length);
  const { error } = await supabase.from('hvdc_norms').upsert(uniquePayload, { onConflict: 'age_range,gender' });
  if (error){ console.error('Upsert error:', error.message); process.exit(1); }
  console.log('Done.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
