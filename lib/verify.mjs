// Fidelity verification: deterministic checks that the optimized prompt neither
// drops protected meaning nor invents new facts. The LLM judge (in pipeline.mjs)
// covers semantics; these checks cover literals and are not model-dependent.
import { numberTokens, urlTokens } from './extract.mjs';

// Whole-token matching. Bare includes() let "Paris" be "kept" by "comparison",
// "5" by "2025" and "React" by "Preact", so a dropped span could pass
// (K2, mission-os#617). Boundaries are Unicode letter/digit/underscore, so a
// span may still sit next to punctuation or quotes.
const WORDISH = '[\\p{L}\\p{N}_]';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function containsToken(haystack, span) {
  const esc = escapeRe(span);
  const lead = new RegExp(`^${WORDISH}`, 'u').test(span) ? `(?<!${WORDISH})` : '';
  const tail = new RegExp(`${WORDISH}$`, 'u').test(span) ? `(?!${WORDISH})` : '';
  return new RegExp(`${lead}${esc}${tail}`, 'iu').test(haystack);
}

// Assumptions / Open questions are labelled as not source-backed, so nothing
// found only there counts as retained or covered (K6, mission-os#617): a
// requirement demoted to an open question is a dropped requirement.
const EXEMPT_HEADING = /assumption|open question|hypoth|question|suposi|pergunta/i;

export function mainSections(optimized) {
  const out = [];
  let exempt = false;
  for (const line of optimized.split('\n')) {
    const h = line.match(/^#+\s*(.+)$/);
    if (h) { exempt = EXEMPT_HEADING.test(h[1]); continue; }
    if (!exempt) out.push(line);
  }
  return out.join('\n');
}

export function spanRetention(spans, optimized) {
  const body = mainSections(optimized);
  const required = spans.filter((s) => !s.negated);
  const exempt = spans.filter((s) => s.negated);
  const missing = [];
  for (const { span, kind } of required) {
    // URLs, code and paths are case-sensitive and already distinctive enough to
    // match literally; everything else needs token boundaries.
    const kept = kind === 'url' || kind === 'code' || kind === 'path' ? body.includes(span) : containsToken(body, span);
    if (!kept) missing.push({ span, kind });
  }
  return {
    name: 'span_retention',
    passed: missing.length === 0,
    total: required.length,
    kept: required.length - missing.length,
    missing,
    exempt, // negated in the source: not demanded, listed so the reader sees it
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
  // The stopword list is English-only, so on other languages this measures
  // noise, not omission. Report it as not applicable rather than a false alarm.
  const lang = guessLanguage(source);
  if (lang !== 'en' && lang !== 'unknown') {
    return { name: 'content_coverage', passed: true, ratio: null, missing: [], total: 0, applicable: false };
  }
  const terms = contentTerms(source);
  if (terms.length === 0) return { name: 'content_coverage', passed: true, ratio: 1, missing: [], total: 0 };
  const hay = mainSections(optimized).toLowerCase();
  // stem-lite: a term counts as present if its first 5 chars appear, so
  // "engineers"/"engineering" and "migration"/"migrate" both match.
  const missing = terms.filter((t) => !hay.includes(t.length > 5 ? t.slice(0, 5) : t));
  const ratio = (terms.length - missing.length) / terms.length;
  return { name: 'content_coverage', passed: ratio >= threshold, ratio: Number(ratio.toFixed(3)), missing, total: terms.length, threshold };
}

// Section filler: catches the dominant small-model failure measured on
// mission-os#617 (22-fixture run, 2026-09-04). Asked for "Constraints = tone,
// length, exclusions" the model fills every slot, so "Tone: informative and
// neutral" and "Audience: likely professionals" appear on prompts that said
// nothing of the kind, and the judge waves them through as rephrasing.
// Deterministic rule: a key: value line in a main section must share at least
// one content term with source+context, or carry an "(assumption)" tag, or be
// flagged. Hedge values ("not specified", "likely", "unknown") are always
// flagged: they are the model narrating its own guess.
const FILLER_KEYS = /^\s*[-*]?\s*(tone|tonality|audience|length|style|format|structure|background|exclusions?|ton|tonalit[eé]|longueur|public|publico|p[uú]blico|tom|comprimento|formato|exclus[õo]es)\s*:\s*(.+?)\s*$/i;
const ASSUMPTION_TAG = /\((assumption|hypoth[eè]se|suposi[cç][aã]o)\)/i;
const HEDGE = /\b(not specified|none specified|unspecified|unknown|not given|likely|probably|assume[ds]?|non sp[eé]cifi[eé]|inconnu|n[aã]o especificad[oa]|desconhecid[oa])\b/i;

export function sectionFiller(source, context, optimized) {
  const allowed = new Set(contentTerms(`${source}\n${context || ''}`).map((t) => (t.length > 5 ? t.slice(0, 5) : t)));
  const flagged = [];
  let exempt = false;
  for (const line of optimized.split('\n')) {
    const heading = line.match(/^#+\s*(.+)$/);
    if (heading) { exempt = EXEMPT_HEADING.test(heading[1]); continue; }
    if (exempt) continue;
    const m = line.match(FILLER_KEYS);
    if (!m) continue;
    const [, key, value] = m;
    if (ASSUMPTION_TAG.test(value)) continue;
    if (HEDGE.test(value)) { flagged.push({ key, value, reason: 'hedge' }); continue; }
    const terms = contentTerms(value);
    const backed = terms.some((t) => allowed.has(t.length > 5 ? t.slice(0, 5) : t));
    if (!backed) flagged.push({ key, value, reason: 'unsupported' });
  }
  return { name: 'section_filler', passed: flagged.length === 0, flagged };
}
