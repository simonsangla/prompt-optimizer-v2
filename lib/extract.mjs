// Deterministic extraction of "protected spans": literal strings in the source
// prompt that carry meaning and must survive optimization verbatim.
// This is the ground truth the verifier checks against - no LLM involved.

const NOISE_ACRONYMS = new Set(['OK', 'TODO', 'FIXME', 'NOTE', 'AND', 'OR', 'NOT', 'THE', 'FOR']);

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
  collect(/\b\d+(?:[.,:]\d+)+\b|\b\d+\s?(?:%|eur|euros?|usd|px|ms|sec|seconds?|min|minutes?|hours?|days?|weeks?|kb|mb|gb|k\b)|\b\d+\b/gi, 'number');
  collect(/\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g, 'identifier'); // CamelCase
  collect(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, 'identifier'); // snake_case
  collect(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?:\.[a-z]{2,4})?\b/g, 'identifier'); // kebab-case / domains
  collect(/\b[A-Z]{2,6}\d*\b/g, 'acronym');

  for (const [span, kind] of [...spans]) {
    if (kind === 'acronym' && NOISE_ACRONYMS.has(span)) spans.delete(span);
    if (kind === 'number' && /^[01]$/.test(span)) spans.delete(span); // "1"/"0" too noisy
  }
  return [...spans.entries()].map(([span, kind]) => ({ span, kind }));
}

// Numbers that appear in a text, used by the invention check.
export function numberTokens(text) {
  const out = new Set();
  // strip ordinal list markers ("1." / "2)" at line starts) before scanning
  const stripped = text.replace(/^\s*\d+[.)]\s/gm, '');
  for (const m of stripped.matchAll(/\d+(?:[.,:]\d+)*/g)) out.add(m[0]);
  return out;
}

export function urlTokens(text) {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s)>\]"']+/g)) out.add(m[0].replace(/[.,;:!?]+$/, ''));
  return out;
}
