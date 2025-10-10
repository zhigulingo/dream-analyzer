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
    if (!obj || typeof obj !== 'object') return null;
    const scores = {
      memory: round2(clamp01(obj?.scores?.memory ?? 0)),
      emotion: round2(clamp01(obj?.scores?.emotion ?? 0)),
      anticipation: round2(clamp01(obj?.scores?.anticipation ?? 0))
    };
    const { dominant, confidence } = deriveDominant(scores);
    return { schema: 'dream_type_v1', scores, dominant, confidence };
  } catch (_) {
    return null;
  }
}

module.exports = { computeDreamType };
