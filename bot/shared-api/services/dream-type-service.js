// Dream Type classification service: memory (консолидация), emotion (эмоциональная регуляция), anticipation (прогностическое моделирование)
const geminiService = require('./gemini-service');

function clamp01(n) {
  const x = Number(n);
  if (!isFinite(x)) return 0;
  if (x < 0) return 0; if (x > 1) return 1; return x;
}

function round2(n) { return Math.round(Number(n) * 100) / 100; }

function deriveDominant(scores) {
  const entries = [
    ['memory', clamp01(scores?.memory ?? 0)],
    ['emotion', clamp01(scores?.emotion ?? 0)],
    ['anticipation', clamp01(scores?.anticipation ?? 0)]
  ];
  entries.sort((a,b)=>b[1]-a[1]);
  const leader = entries[0];
  const second = entries[1];
  const confidence = round2(Math.max(0, (leader?.[1] ?? 0) - (second?.[1] ?? 0)));
  return { dominant: leader?.[0] || 'memory', confidence };
}

// Heuristic fallback when LLM JSON is missing/unavailable
function heuristicClassify(dreamText) {
  try {
    const s = String(dreamText || '').toLowerCase();
    const countMatches = (arr) => arr.reduce((acc, k) => acc + (s.includes(k) ? 1 : 0), 0);

    const emotionKeys = ['страх','ужас','паник','тревог','стыд','гнев','злост','плак','слез','крич','кошмар','тоска','грусть','печал'];
    const anticipationKeys = ['экзам','выступл','собесед','защит','проект','подготов','завтра','предсто','ожидан','волнен','презентац','поездк','путешеств','нов','работа','интервью'];
    const memoryKeys = ['вчера','сегодня','работ','школ','универ','дом','квартир','улиц','друг','подруг','родител','коллег','город'];

    const eCount = countMatches(emotionKeys);
    const aCount = countMatches(anticipationKeys);
    const mCount = countMatches(memoryKeys);

    // Base scores if nothing detected
    let e = eCount > 0 ? Math.min(1, eCount / 3) : 0;
    let a = aCount > 0 ? Math.min(1, aCount / 3) : 0;
    let m = mCount > 0 ? Math.min(1, 0.5 + mCount / 5) : 0;

    if (e === 0 && a === 0 && m === 0) {
      // Neutral default leaning to memory
      m = 0.6; e = 0.2; a = 0.2;
    }

    const scores = { memory: round2(clamp01(m)), emotion: round2(clamp01(e)), anticipation: round2(clamp01(a)) };
    const { dominant, confidence } = deriveDominant(scores);
    return { schema: 'dream_type_v1', scores, dominant, confidence };
  } catch (_) {
    return null;
  }
}

async function computeDreamType({ dreamText }) {
  try {
    const raw = await geminiService.analyzeDream(dreamText, 'dream_type_json');
    let obj;
    try {
      const cleaned = String(raw).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
      obj = JSON.parse(cleaned);
    } catch (_) {
      const s = String(raw);
      const a = s.indexOf('{'); const b = s.lastIndexOf('}');
      if (a !== -1 && b !== -1 && b > a) {
        try { obj = JSON.parse(s.slice(a, b+1)); } catch (_) {}
      }
    }
    if (!obj || typeof obj !== 'object') {
      // Fallback to heuristic classification
      return heuristicClassify(dreamText);
    }
    const scores = {
      memory: round2(clamp01(obj?.scores?.memory ?? 0)),
      emotion: round2(clamp01(obj?.scores?.emotion ?? 0)),
      anticipation: round2(clamp01(obj?.scores?.anticipation ?? 0))
    };
    const { dominant, confidence } = deriveDominant(scores);
    return { schema: 'dream_type_v1', scores, dominant, confidence };
  } catch (_) {
    // Heuristic fallback on any failure
    return heuristicClassify(dreamText);
  }
}

module.exports = { computeDreamType };
