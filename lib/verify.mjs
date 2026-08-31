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

// Content coverage: catches dropped requirements expressed in plain words
// ("for data engineers") that carry no protectable literal. Tolerant of
// rephrasing by design - it only fires when source terms vanish outright.
const COMMON = new Set(['about','above','after','again','against','also','always','because','been','before','being','below','between','both','cannot','could','does','doing','done','down','during','each','either','else','ever','every','from','further','have','having','here','hers','herself','himself','into','itself','just','like','make','makes','many','more','most','much','must','need','needs','only','other','ours','ourselves','over','own','same','should','some','such','than','that','their','theirs','them','themselves','then','there','these','they','this','those','through','under','until','very','want','wants','were','what','when','where','which','while','with','would','your','yours','yourself','please','thing','things','something','anything','stuff','dont','doesnt','isnt','wont','cant','using','used','use','get','got','put','one','two','way','well','will','can','are','was','has','had','the','and','for','you','our','its','out','off','not','but','all','any','how','who','why','yet','per','via','etc']);

export function contentTerms(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !COMMON.has(w) && !/^\d+$/.test(w));
  return [...new Set(words)];
}

// Threshold is deliberately loose: a faithful rewrite rephrases freely, so this
// check exists to catch wholesale omission, not word-level drift.
export const COVERAGE_THRESHOLD = 0.85;

export function contentCoverage(source, optimized, threshold = COVERAGE_THRESHOLD) {
  const terms = contentTerms(source);
  if (terms.length === 0) return { name: 'content_coverage', passed: true, ratio: 1, missing: [], total: 0 };
  const hay = optimized.toLowerCase();
  // stem-lite: a term counts as present if its first 5 chars appear, so
  // "engineers"/"engineering" and "migration"/"migrate" both match.
  const missing = terms.filter((t) => !hay.includes(t.length > 5 ? t.slice(0, 5) : t));
  const ratio = (terms.length - missing.length) / terms.length;
  return { name: 'content_coverage', passed: ratio >= threshold, ratio: Number(ratio.toFixed(3)), missing, total: terms.length, threshold };
}
