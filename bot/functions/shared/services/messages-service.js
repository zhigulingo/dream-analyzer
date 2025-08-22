// bot/functions/shared/services/messages-service.js

const fs = require('fs');
const path = require('path');

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(base?.[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function loadLocale(locale) {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  let defaults = {};
  try {
    defaults = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (_) { defaults = {}; }

  const envVar = process.env[`MESSAGES_${locale.toUpperCase()}_JSON`];
  const override = envVar ? safeJsonParse(envVar) : null;
  return deepMerge(defaults, override || {});
}

function interpolate(template, vars = {}) {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    return val == null ? '' : String(val);
  });
}

class MessagesService {
  constructor() {
    this.defaultLocale = process.env.DEFAULT_LOCALE || 'ru';
    this.cache = new Map();
  }

  getLocaleData(locale) {
    const loc = (locale || this.defaultLocale || 'ru').toLowerCase();
    if (this.cache.has(loc)) return this.cache.get(loc);
    const data = loadLocale(loc);
    this.cache.set(loc, data);
    return data;
  }

  get(key, vars = {}, locale) {
    const data = this.getLocaleData(locale);
    const parts = String(key).split('.');
    let node = data;
    for (const p of parts) {
      if (!node || typeof node !== 'object') { node = null; break; }
      node = node[p];
    }
    const val = typeof node === 'string' ? node : '';
    return interpolate(val, vars);
  }
}

module.exports = new MessagesService();


