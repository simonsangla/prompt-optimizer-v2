// Deterministic extraction of "protected spans": literal strings in the source
// prompt that carry meaning and must survive optimization verbatim.
// This is the ground truth the verifier checks against - no LLM involved.

const NOISE_ACRONYMS = new Set(['OK', 'TODO', 'FIXME', 'NOTE', 'AND', 'OR', 'NOT', 'THE', 'FOR']);

// Capitalized words are proper nouns worth protecting - but only away from a
// sentence start, where capitalization carries no information.
const CAP_STOP = new Set(['I', 'The', 'This', 'That', 'These', 'Those', 'It', 'We', 'You', 'They', 'A', 'An', 'And', 'But', 'Or', 'If', 'When', 'Goal', 'Context', 'Constraints', 'Task', 'Output', 'System', 'User', 'Subject', 'Style', 'Composition', 'Avoid', 'Verification', 'Assumptions', 'Open']);

export function properNouns(text) {
  const found = new Set();
  for (const sentence of text.split(/(?<=[.!?\n])\s+/)) {
    const tokens = sentence.trim().split(/\s+/);
    let phrase = [];
    tokens.forEach((tokenRaw, i) => {
      const token = tokenRaw.replace(/^[^\w]+|[^\w%]+$/g, '');
      const isCap = /^[A-Z][a-zA-Z0-9]{2,}$/.test(token) && !CAP_STOP.has(token);
      if (isCap && i > 0) phrase.push(token);
      else {
        if (phrase.length) found.add(phrase.join(' '));
        phrase = [];
      }
    });
    if (phrase.length) found.add(phrase.join(' '));
  }
  return [...found];
}

export function protectedSpans(text) {
  const spans = new Map(); // span -> kind

  const collect = (regex, kind, transform = (s) => s) => {
    for (const m of text.matchAll(regex)) {
      const raw = transform(m[1] ?? m[0]).trim();
      if (raw && !spans.has(raw)) spans.set(raw, kind);
    }
  };

  const stripTrail = (x) => x.replace(/[.,;:!?]+$/, '');
  collect(/https?:\/\/[^\s)>\]"']+/g, 'url', stripTrail);
  collect(/[\w.+-]+@[\w-]+\.[\w.-]*\w/g, 'email');
  collect(/`([^`\n]+)`/g, 'code');
  collect(/"([^"\n]{2,120})"/g, 'quote');
  collect(/(?:^|[\s(])((?:~\/|\.\/|\/)[\w.-]+(?:\/[\w.-]+)+)/gm, 'path');
  collect(/\b\d+(?:[.,:]\d+)+\b|\b\d+\s?(?:%|eur|euros?|usd|px|ms|sec|seconds?|min|minutes?|hours?|days?|weeks?|kb|mb|gb|k\b)|\b\d+[shdm]\b|\b\d+\b/gi, 'number');
  collect(/\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g, 'identifier'); // CamelCase
  collect(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, 'identifier'); // snake_case
  collect(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?:\.[a-z]{2,4})?\b/g, 'identifier'); // kebab-case / domains
  collect(/\b[A-Z]{2,6}\d*\b/g, 'acronym');

  for (const noun of properNouns(text)) if (!spans.has(noun)) spans.set(noun, 'proper-noun');

  for (const [span, kind] of [...spans]) {
    if (kind === 'acronym' && NOISE_ACRONYMS.has(span)) spans.delete(span);
    if (kind === 'number' && /^[01]$/.test(span)) spans.delete(span); // "1"/"0" too noisy
  }
  return [...spans.entries()].map(([span, kind]) => ({ span, kind }));
}

// Numbers that appear in a text, used by the invention check.
// Units that legitimately attach to a digit ("45s", "20px"); any OTHER trailing
// letter means the digit is part of a token, not a quantity ("2D", "v3", "h2").
// Multi-letter units are case-insensitive; single-letter ones must be lowercase,
// otherwise "2D" reads as 2 days.
const UNIT_SUFFIX_MULTI = /^(ms|px|kb|mb|gb|eur|usd|min|sec|hrs?)\b/i;
const UNIT_SUFFIX_SINGLE = /^[shdmk]\b/;

export function numberTokens(text) {
  const out = new Set();
  // strip ordinal list markers ("1." / "2)" at line starts) before scanning
  const stripped = text.replace(/^\s*\d+[.)]\s/gm, '');
  for (const m of stripped.matchAll(/\d+(?:[.,:]\d+)*/g)) {
    const after = stripped.slice(m.index + m[0].length);
    const isUnit = UNIT_SUFFIX_MULTI.test(after) || UNIT_SUFFIX_SINGLE.test(after);
    if (/^[a-z]/i.test(after) && !isUnit) continue; // "2D", "v3"
    out.add(m[0]);
  }
  return out;
}

export function urlTokens(text) {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s)>\]"']+/g)) out.add(m[0].replace(/[.,;:!?]+$/, ''));
  return out;
}
