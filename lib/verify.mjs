// Fidelity verification: deterministic checks that the optimized prompt neither
// drops protected meaning nor invents new facts. The LLM judge (in pipeline.mjs)
// covers semantics; these checks cover literals and are not model-dependent.
import { numberTokens, urlTokens } from './extract.mjs';

export function spanRetention(spans, optimized) {
  const haystack = optimized.toLowerCase();
  const missing = [];
  for (const { span, kind } of spans) {
    const needle = kind === 'url' || kind === 'code' || kind === 'path' ? span : span.toLowerCase();
    const target = kind === 'url' || kind === 'code' || kind === 'path' ? optimized : haystack;
    if (!target.includes(needle)) missing.push({ span, kind });
  }
  return {
    name: 'span_retention',
    passed: missing.length === 0,
    total: spans.length,
    kept: spans.length - missing.length,
    missing,
  };
}

export function noInvention(source, context, optimized) {
  const allowed = numberTokens(source + '\n' + context);
  const allowedUrls = urlTokens(source + '\n' + context);
  const inventedNumbers = [...numberTokens(optimized)].filter((n) => !allowed.has(n));
  const inventedUrls = [...urlTokens(optimized)].filter((u) => !allowedUrls.has(u));
  return {
    name: 'no_invention',
    passed: inventedNumbers.length === 0 && inventedUrls.length === 0,
    inventedNumbers,
    inventedUrls,
  };
}

export function structureCheck(optimized, requiredSections) {
  const missing = requiredSections.filter(
    (s) => !new RegExp(`^#+\\s*${s}|^${s}\\s*:`, 'im').test(optimized),
  );
  return { name: 'structure', passed: missing.length === 0, missing };
}

// Deterministic language guess via stopword profiling. Coarse on purpose:
// it only needs to catch the "model translated the prompt" failure mode.
const STOPWORDS = {
  en: ['the', 'and', 'is', 'are', 'to', 'of', 'for', 'with', 'that', 'this', 'it', 'on', 'be', 'make', 'use', 'my', 'dont', 'needs'],
  fr: ['le', 'la', 'les', 'des', 'une', 'est', 'pour', 'avec', 'que', 'ce', 'sur', 'doit', 'pas', 'dans', 'et', 'du', 'aux', 'mon'],
  pt: ['os', 'as', 'um', 'uma', 'para', 'com', 'que', 'este', 'em', 'nao', 'deve', 'ser', 'uma', 'meu', 'minha', 'pagina'],
  es: ['el', 'los', 'las', 'un', 'una', 'para', 'con', 'que', 'este', 'en', 'no', 'debe', 'ser', 'mi', 'pagina', 'hacer'],
};

export function guessLanguage(text) {
  const words = text.toLowerCase().replace(/[^a-z\u00c0-\u024f\s]/g, ' ').split(/\s+/);
  const counts = {};
  for (const [lang, stops] of Object.entries(STOPWORDS)) {
    const set = new Set(stops);
    counts[lang] = words.filter((w) => set.has(w)).length;
  }
  const [best, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return bestCount >= 3 ? best : 'unknown';
}

export function languageMatch(source, optimized) {
  const src = guessLanguage(source);
  const out = guessLanguage(optimized);
  const passed = src === 'unknown' || out === 'unknown' || src === out;
  return { name: 'language_match', passed, source: src, optimized: out };
}
