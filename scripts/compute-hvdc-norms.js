#!/usr/bin/env node
/*
  Compute HVdC demographic norms from one or more datasets (SDDB, DreamBank) and upsert into Supabase hvdc_norms.
  Usage examples:
    node scripts/compute-hvdc-norms.js --file docs/datasets/sddb.csv --file docs/datasets/dreambank_hvc.tsv \
      --symbols-json docs/dream_symbols_archetypes.json
    node scripts/compute-hvdc-norms.js --file docs/datasets/sddb.csv --inspect
  Env:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (_) {}
const { createClient } = require('@supabase/supabase-js');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { files: [], symbolsFromText: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i+1]) { out.files.push(argv[++i]); }
    else if (a === '--age-col' && argv[i+1]) { out.ageCol = argv[++i]; }
    else if (a === '--gender-col' && argv[i+1]) { out.genderCol = argv[++i]; }
    else if (a === '--bucket-characters' && argv[i+1]) { out.bucketCharacters = argv[++i]; }
    else if (a === '--bucket-emotions' && argv[i+1]) { out.bucketEmotions = argv[++i]; }
    else if (a === '--bucket-actions' && argv[i+1]) { out.bucketActions = argv[++i]; }
    else if (a === '--bucket-symbols' && argv[i+1]) { out.bucketSymbols = argv[++i]; }
    else if (a === '--bucket-settings' && argv[i+1]) { out.bucketSettings = argv[++i]; }
    else if (a === '--source' && argv[i+1]) { out.sourceType = argv[++i]; }
    else if (a === '--symbols-json' && argv[i+1]) { out.symbolsJson = argv[++i]; }
    else if (a === '--symbols-from-text') { out.symbolsFromText = true; }
    else if (a === '--no-symbols-from-text') { out.symbolsFromText = false; }
    else if (a === '--inspect') { out.inspect = true; }
  }
  return out;
}

function toAgeRangeNumber(age) {
  const a = Number(age);
  if (!Number.isFinite(a)) return 'any';
  if (a < 20) return '0-20';
  if (a < 30) return '20-30';
  if (a < 40) return '30-40';
  if (a < 50) return '40-50';
  return '50+';
}

function normalizeAgeRangeLabel(label) {
  const s = String(label || '').toLowerCase();
  if (!s) return 'any';
  if (/^(13-17|0-19|under\s*18|<\s*18)/.test(s)) return '0-20';
  if (/(18-24)/.test(s)) return '20-30';
  if (/(25-29|25-34|20-29)/.test(s)) return '20-30';
  if (/(30-39|30-34|35-39)/.test(s)) return '30-40';
  if (/(35-49|40-49|40-44|45-49)/.test(s)) return '40-50';
  if (/(50-64|50\+|65\+|60\+|55-64|65-74|75\+)/.test(s)) return '50+';
  // fallback: try parse number
  const num = Number(s.replace(/[^0-9.]/g, ''));
  return toAgeRangeNumber(num);
}

function norm100(dist) {
  const keys = ['characters','emotions','actions','symbols','settings'];
  let sum = 0; const out = {};
  for (const k of keys) { out[k] = Math.max(0, Number(dist[k]||0)); sum += out[k]; }
  if (sum <= 0) return { characters:0, emotions:0, actions:0, symbols:0, settings:0 };
  for (const k of keys) out[k] = out[k] * 100 / sum;
  let rsum = 0; for (const k of keys) { out[k] = Math.round(out[k]); rsum += out[k]; }
  if (rsum !== 100) {
    let maxKey = 'characters'; for (const k of keys) if (out[k] > out[maxKey]) maxKey = k;
    out[maxKey] += (100 - rsum);
  }
  return out;
}

function buildHeaderUtils(header) {
  const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const map = new Map(header.map((h, idx) => [norm(h), idx]));
  const byName = (name) => {
    const key = norm(name);
    if (map.has(key)) return map.get(key);
    // fallback: find contains
    for (const [k, v] of map.entries()) if (k.includes(key)) return v;
    return null;
  };
  const findAll = (pred) => header
    .map((h, i) => ({ h, i }))
    .filter(({h}) => pred(String(h)))
    .map(({i}) => i);
  return { norm, byName, findAll };
}

function detectDatasetType(header) {
  const { norm } = buildHeaderUtils(header);
  const keys = header.map(h=>norm(h));
  const has = (k) => keys.includes(k);
  const hasSub = (frag) => keys.some(k=>k.includes(frag));
  if (has('agerange') && has('sexassignedatbirth') && hasSub('nonphysicalaggression') && hasSub('friendliness')) return 'sddb';
  if (hasSub('acindex') && hasSub('fcindex') && hasSub('scindex')) return 'dreambank';
  return 'generic';
}

function dedup(arr) { return Array.from(new Set((arr||[]).filter(v=>v!=null))); }

function detectSddbColumns(header) {
  const utils = buildHeaderUtils(header);
  const { byName, findAll, norm } = utils;
  const pickStartsNorm = (prefix) => {
    const p = norm(prefix);
    const out = [];
    for (let i=0; i<header.length; i++) {
      const h = norm(header[i]);
      if (h.startsWith(p)) out.push(i);
    }
    return out;
  };
  const actions = dedup([
    ...pickStartsNorm('Friendliness '),
    ...pickStartsNorm('Non-Physical Aggression '),
    ...pickStartsNorm('Physical Aggression '),
    ...pickStartsNorm('Sexuality ')
  ]);
  const emotions = ['Anger','Fear','Happiness','Sadness','Wonder'].map(byName).filter(v=>v!=null);
  const settings = ['Familiar Settings','Inside Settings','Outside Settings'].map(byName).filter(v=>v!=null);
  // Prefer explicit total; else sum of subtype character columns
  const charTotal = byName('Total Characters');
  const charSubtypes = [
    'Animals','Children','Creatures','Dead Characters','Family Characters','Female Characters',
    'Friends','Imaginary Characters','Male Characters','Metamorphosis','Occupational Characters',
    'Prominent Characters','Racial/Ethnic Characters','Strangers'
  ].map(byName).filter(v=>v!=null);
  const charactersIdx = charTotal != null ? [charTotal] : dedup(charSubtypes);
  const textIdx = byName('answer_text') ?? byName('text_dream');
  return {
    dataset: 'sddb',
    age: byName('Age Range'),
    ageNum: byName('Age'),
    gender: byName('Sex Assigned at Birth'),
    text: textIdx,
    characters: dedup(charactersIdx),
    emotions: dedup(emotions),
    actions,
    settings: dedup(settings),
    symbols: []
  };
}

function detectDreambankColumns(header) {
  const { byName, findAll, norm } = buildHeaderUtils(header);
  const chars = dedup(['Male','Animal','Animals','Friends','Family','Dead&Imaginary','DeadImaginary','Dead & Imaginary']
    .map(byName).filter(v=>v!=null));
  const actions = dedup(['A/CIndex','F/CIndex','S/CIndex','ACIndex','FCIndex','SCIndex']
    .map(byName).filter(v=>v!=null));
  const emotions = dedup(['NegativeEmotions','Negative Emotions'].map(byName).filter(v=>v!=null));
  const textIdx = byName('text_dream') ?? byName('answer_text');
  return {
    dataset: 'dreambank',
    age: null,
    gender: null,
    text: textIdx,
    characters: chars,
    emotions,
    actions,
    settings: [],
    symbols: []
  };
}

const DEFAULT_SYMBOL_SYNONYMS_EN = {
  falling: ['fall','fell','falling','fall down','dropped','drop','plummet'],
  chase: ['chase','chasing','pursue','being chased','pursued'],
  exam: ['exam','test','final','quiz'],
  flying: ['fly','flying','flight','float','levitate','levitating','hover'],
  death: ['dead','death','die','dying','funeral','kill','killed','killing'],
  water: ['water','ocean','sea','river','lake','pool','waves','rain','flood'],
  animals: ['animal','animals','dog','cat','bird','snake','bear','wolf','horse','fish','dragon','turtle','cow','goat','chicken','lion','tiger','elephant','spider','insect'],
  house: ['house','home','room','kitchen','bathroom','bedroom','door','window','roof','attic','basement'],
  naked: ['naked','nude','without clothes','no clothes'],
  teeth: ['teeth','tooth','dentist'],
  transport: ['car','bus','train','plane','airplane','airport','boat','ship','bicycle','bike','motorcycle','subway','taxi'],
  pregnancy: ['pregnant','pregnancy','birth','baby','babies','give birth','labor','newborn'],
  wedding: ['wedding','marriage','bride','groom','fiance','fiancee'],
  money: ['money','cash','coins','treasure','gold','wealth','rich'],
  fire: ['fire','burn','flames','burning'],
  stairs: ['stairs','staircase','ladder','elevator','lift'],
  school: ['school','class','classroom','teacher','university','college'],
  nature: ['forest','woods','mountain','hill','valley','desert','beach','jungle'],
  hospital: ['hospital','clinic','ill','sick','disease','doctor','nurse'],
  old_age: ['old','elderly','grandma','grandpa','old man','old woman'],
  resurrection: ['resurrect','resurrection','revive','revived'],
  sex: ['sex','sexual','kiss','kissing','making love','intercourse'],
  parents: ['mother','father','mom','dad','parents'],
  children: ['child','children','kid','kids','son','daughter'],
  strangers: ['stranger','unknown person','someone i don’t know','someone i dont know'],
  hero: ['hero','celebrity','famous','star'],
  labyrinth: ['labyrinth','maze'],
  mirror: ['mirror','reflection'],
  angel: ['angel','wings'],
  prison: ['prison','jail','cell','locked up'],
  war: ['war','battle','fight','army','soldier'],
  clothing: ['clothes','clothing','dress','shirt','pants','skirt','coat','jacket'],
  food: ['food','eat','eating','meal','breakfast','lunch','dinner','restaurant'],
  music: ['music','song','sing','singing','dance','dancing'],
  work: ['work','job','office','boss','coworker'],
  road: ['road','street','highway','path','trail','route']
};

function loadSymbolsDict(symbolsJson) {
  try {
    if (!symbolsJson) return DEFAULT_SYMBOL_SYNONYMS_EN;
    const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), symbolsJson), 'utf-8'));
    const dict = { ...DEFAULT_SYMBOL_SYNONYMS_EN };
    const arr = Array.isArray(raw.symbols) ? raw.symbols : [];
    for (const s of arr) {
      const base = String(s.symbol || '').toLowerCase();
      if (!base) continue;
      if (!dict[base]) dict[base] = [];
      // keep only ascii words from description as weak hints
      const hints = [s.symbol, s.scientific, s.freud, s.jung]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .match(/[a-z][a-z\-']{2,}/g) || [];
      dict[base] = Array.from(new Set([...(dict[base]||[]), ...hints])).slice(0, 50);
    }
    return dict;
  } catch (_) {
    return DEFAULT_SYMBOL_SYNONYMS_EN;
  }
}

function buildSymbolMatchers(dict) {
  const entries = Object.entries(dict).map(([k, words]) => {
    const escaped = Array.from(new Set((words||[]).map(w=>String(w).toLowerCase().trim()).filter(Boolean)))
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!escaped.length) return null;
    const re = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'i');
    return { key: k, re };
  }).filter(Boolean);
  return entries;
}

function symbolsScore(text, matchers) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  let count = 0;
  for (const m of matchers) {
    if (m.re.test(t)) count++;
  }
  return count;
}

// Text heuristics to infer 4 HVdC buckets when coded columns are empty
const TEXT_HEURISTICS = {
  characters: [
    'man','woman','boy','girl','child','children','kid','kids','mother','father','mom','dad','friend','friends','people','crowd','stranger','teacher','doctor','nurse','lawyer','husband','wife','son','daughter','animal','dog','cat','bird','snake','bear','wolf','horse'
  ],
  actions: [
    'fight','argue','attack','hit','punch','kill','chase','kiss','love','hug','help','talk','talking','speak','speaking','sex','sexual','friendly','aggressive','violence'
  ],
  emotions: [
    'anger','angry','fear','scared','afraid','happy','happiness','sad','sadness','wonder','anxious','anxiety','joy','cry','tears'
  ],
  settings: [
    'house','home','room','kitchen','bathroom','bedroom','school','classroom','hospital','office','park','city','street','road','forest','mountain','valley','desert','beach','river','ocean','pool','inside','outside'
  ]
};

function textPresence4(text) {
  const t = String(text || '').toLowerCase();
  const hasAny = (arr) => arr.some(w => t.includes(w));
  const ch = hasAny(TEXT_HEURISTICS.characters) ? 1 : 0;
  const ac = hasAny(TEXT_HEURISTICS.actions) ? 1 : 0;
  const em = hasAny(TEXT_HEURISTICS.emotions) ? 1 : 0;
  const st = hasAny(TEXT_HEURISTICS.settings) ? 1 : 0;
  return { ch, ac, em, st };
}

function mapGender(val) {
  let s = String(val||'').toLowerCase();
  // normalize array-like values: ["Female"] -> female
  s = s.replace(/[^a-z]/g, ' ').trim();
  if (!s) return 'any';
  if (/prefer/.test(s) || /unknown/.test(s) || /na\b/.test(s)) return 'any';
  if (/\bfemale\b|^f\b/.test(s)) return 'female';
  if (/\bmale\b|^m\b/.test(s)) return 'male';
  return 'any';
}

function sumCols(row, idxs) {
  let s = 0; for (const i of idxs) { const v = Number(row[i]); if (Number.isFinite(v)) s += v; }
  return s;
}

function sumPresence(row, idxs) {
  let s = 0;
  for (const i of idxs) {
    const v = row[i];
    if (v == null) continue;
    const sv = String(v).trim();
    if (!sv) continue;
    if (sv === '0') continue;
    s += 1;
  }
  return s;
}

function parseDelimitedLine(s, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (inQuotes && s[i+1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === delimiter && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

async function main() {
  const args = parseArgs();
  if (!args.files.length) { console.error('Usage: node scripts/compute-hvdc-norms.js --file <dataset.csv> [--file <dataset2.tsv>]'); process.exit(1); }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, persistSession:false } });

  const dict = loadSymbolsDict(args.symbolsJson);
  const matchers = buildSymbolMatchers(dict);

  const groups = new Map();
  const demoStats = { total: 0, included: 0, age: new Map(), gender: new Map() };
  const inspectInfo = [];

  for (const f of args.files) {
    const abs = path.resolve(process.cwd(), f);
    if (!fs.existsSync(abs)) { console.error('File not found:', abs); process.exit(1); }
    const raw = fs.readFileSync(abs, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
    if (lines.length < 2) { console.error('Dataset appears empty:', abs); continue; }
    const delimiter = (lines[0].includes('\t') ? '\t' : ',');
    const split = (s) => delimiter === '\t' ? s.split('\t').map(x=>x.trim()) : parseDelimitedLine(s, ',');
    const header = split(lines[0]);

    const dsType = args.sourceType || detectDatasetType(header);
    const map = dsType === 'sddb' ? detectSddbColumns(header)
              : dsType === 'dreambank' ? detectDreambankColumns(header)
              : null;

    let idx = map;
    if (!idx) {
      // fallback to generic detector using manual overrides
      const cols = header.map((h, idx) => ({ h: h.toLowerCase().trim(), idx }));
      const byName = (name) => cols.find(c=>c.h===String(name||'').toLowerCase())?.idx ?? null;
      idx = {
        dataset: 'generic',
        age: args.ageCol ? byName(args.ageCol) : null,
        gender: args.genderCol ? byName(args.genderCol) : null,
        text: null,
        characters: [], emotions: [], actions: [], settings: [], symbols: []
      };
    }

    if (args.bucketCharacters) {
      const { norm: n, byName } = buildHeaderUtils(header);
      idx.characters = String(args.bucketCharacters).split(',').map(s=>byName(s.trim())).filter(v=>v!=null);
    }
    if (args.bucketEmotions) {
      const { byName } = buildHeaderUtils(header);
      idx.emotions = String(args.bucketEmotions).split(',').map(s=>byName(s.trim())).filter(v=>v!=null);
    }
    if (args.bucketActions) {
      const { byName } = buildHeaderUtils(header);
      idx.actions = String(args.bucketActions).split(',').map(s=>byName(s.trim())).filter(v=>v!=null);
    }
    if (args.bucketSettings) {
      const { byName } = buildHeaderUtils(header);
      idx.settings = String(args.bucketSettings).split(',').map(s=>byName(s.trim())).filter(v=>v!=null);
    }
    // symbols via text; keep any numeric symbol columns if explicitly provided
    const textCol = idx.text;

    if (args.inspect) {
      inspectInfo.push({ file: abs, dsType, mapping: idx });
      continue;
    }

    const SYMBOL_CAP = 3; // cap per-row symbols impact
    for (let r=1; r<lines.length; r++) {
      const row = split(lines[r]);
      demoStats.total++;
      let ageLabel = idx.age != null ? row[idx.age] : '';
      if (!ageLabel && idx.ageNum != null) ageLabel = row[idx.ageNum] || '';
      const genderRaw = idx.gender != null ? row[idx.gender] : '';
      const gender = mapGender(genderRaw);
      const ageRange = idx.dataset === 'sddb' ? normalizeAgeRangeLabel(ageLabel) : (idx.dataset === 'dreambank' ? 'any' : toAgeRangeNumber(ageLabel));

      // Build per-row normalized distribution (4 buckets)
      let rowDist = { characters:0, emotions:0, actions:0, settings:0 };
      let weight = 1;
      if (idx.dataset === 'sddb') {
        const chNum  = sumCols(row, idx.characters);
        let actPr  = sumPresence(row, idx.actions)  > 0 ? 1 : 0;
        let emoPr  = sumPresence(row, idx.emotions) > 0 ? 1 : 0;
        let setPr  = sumPresence(row, idx.settings) > 0 ? 1 : 0;
        let chPr   = chNum > 0 ? 1 : 0;
        let pres   = chPr + emoPr + actPr + setPr;
        if (pres === 0 && textCol != null) {
          const tp = textPresence4(row[textCol]);
          chPr = tp.ch; emoPr = tp.em; actPr = tp.ac; setPr = tp.st;
          pres = chPr + emoPr + actPr + setPr;
          if (pres > 0) weight = 0.4; // downweight text-only rows
        }
        if (pres === 0) continue;
        rowDist.characters = (chPr * 100) / pres;
        rowDist.emotions   = (emoPr * 100) / pres;
        rowDist.actions    = (actPr * 100) / pres;
        rowDist.settings   = (setPr * 100) / pres;
      } else {
        // Generic numeric fallback (not used when only SDDB is provided)
        const base = {
          characters: sumCols(row, idx.characters),
          emotions:   sumCols(row, idx.emotions),
          actions:    sumCols(row, idx.actions),
          settings:   sumCols(row, idx.settings)
        };
        const sum4 = base.characters + base.emotions + base.actions + base.settings;
        if (sum4 === 0) continue;
        rowDist.characters = (base.characters * 100) / sum4;
        rowDist.emotions   = (base.emotions   * 100) / sum4;
        rowDist.actions    = (base.actions    * 100) / sum4;
        rowDist.settings   = (base.settings   * 100) / sum4;
      }

      // Track demo stats for included rows
      demoStats.included++;
      const akey = ageRange || 'any'; demoStats.age.set(akey, (demoStats.age.get(akey)||0)+1);
      const gkey = gender || 'any'; demoStats.gender.set(gkey, (demoStats.gender.get(gkey)||0)+1);

      const key = `${ageRange}__${gender}`;
      const acc = groups.get(key) || { w:0, sums: {characters:0,emotions:0,actions:0,symbols:0,settings:0}, age_range:ageRange, gender };
      acc.sums.characters += rowDist.characters * weight;
      acc.sums.emotions   += rowDist.emotions   * weight;
      acc.sums.actions    += rowDist.actions    * weight;
      acc.sums.settings   += rowDist.settings   * weight;
      acc.w += weight;
      groups.set(key, acc);
    }
  }

  if (args.inspect) {
    for (const it of inspectInfo) {
      console.log('FILE:', it.file);
      console.log('Detected dataset:', it.dsType);
      console.log('Mapping:', it.mapping);
      console.log('---');
    }
    process.exit(0);
  }

  const multi = args.files.length > 1;
  const payload = [];
  // Build rollups: any__male, any__female, any__any
  const rollupByGender = (gender) => {
    const keys = Array.from(groups.keys()).filter(k => k.endsWith(`__${gender}`));
    if (!keys.length) return null;
    const agg = { w:0, sums:{characters:0,emotions:0,actions:0,symbols:0,settings:0} };
    for (const k of keys) {
      const g = groups.get(k); if (!g?.w) continue;
      for (const kk of Object.keys(agg.sums)) agg.sums[kk] += g.sums[kk];
      agg.w += g.w;
    }
    if (agg.w <= 0) return null;
    return { key: `any__${gender}`, data: { w: agg.w, sums: agg.sums, age_range: 'any', gender } };
  };
  for (const gen of ['male','female']) {
    const r = rollupByGender(gen); if (r) groups.set(r.key, r.data);
  }
  // any__any
  const allKeys = Array.from(groups.keys());
  if (allKeys.length) {
    const agg = { w:0, sums:{characters:0,emotions:0,actions:0,symbols:0,settings:0} };
    for (const k of allKeys) {
      const g = groups.get(k); if (!g?.w) continue;
      for (const kk of Object.keys(agg.sums)) agg.sums[kk] += g.sums[kk];
      agg.w += g.w;
    }
    if (agg.w > 0) groups.set('any__any', { w: agg.w, sums: agg.sums, age_range: 'any', gender: 'any' });
  }

  for (const [k, g] of groups) {
    if (!g.w || g.w <= 0) continue;
    const avg = {
      characters: Math.round(g.sums.characters / g.w),
      emotions:   Math.round(g.sums.emotions   / g.w),
      actions:    Math.round(g.sums.actions    / g.w),
      settings:   Math.round(g.sums.settings   / g.w)
    };
    let s4 = avg.characters + avg.emotions + avg.actions + avg.settings;
    if (s4 !== 100) {
      const maxKey = Object.keys(avg).reduce((a,b)=> avg[a] >= avg[b] ? a : b);
      avg[maxKey] += (100 - s4);
    }
    payload.push({ age_range: g.age_range, gender: g.gender, distribution: avg, source: multi ? 'computed:multi' : `computed:${path.basename(args.files[0])}` });
  }

  console.log('Upserting groups:', payload.length);
  // Debug demographics
  if (payload.length <= 1) {
    console.log('Demographics distribution (included rows / total rows):', demoStats.included, '/', demoStats.total);
    console.log('Age buckets:', Array.from(demoStats.age.entries()));
    console.log('Gender buckets:', Array.from(demoStats.gender.entries()));
  }
  const { error } = await supabase.from('hvdc_norms').upsert(payload, { onConflict: 'age_range,gender' });
  if (error) { console.error('Upsert error:', error.message); process.exit(1); }
  console.log('Done.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
