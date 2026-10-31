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
      // Unicode-aware: Bremond and Brémond, Monica and Mónica, Sao and São all
      // carry the same meaning and must be protected alike (K2, mission-os#617).
      const token = tokenRaw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}%]+$/gu, '');
      const isCap = /^\p{Lu}[\p{L}\p{N}]{2,}$/u.test(token) && !CAP_STOP.has(token);
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

// K6 (mission-os#617): spans inside a "do not mention X" scope are NEGATED.
// Requiring them verbatim taught the model to satisfy retention by listing the
// forbidden values in an exclusion line. Scope = from the cue to the end of the
// sentence, except that a comma/semicolon followed by anything other than a
// relative pronoun ends it ("do not mention churn, which was 12%, format as
// markdown" negates "churn" and "12%", not "markdown").
const NEG_CUE = new RegExp(
  [
    String.raw`\b(?:do not|don'?t|never|without|no)\s+(?:mention(?:ing)?|includ(?:e|ing)|cit(?:e|ing)|referenc(?:e|ing)|list(?:ing)?|nam(?:e|ing)|discuss(?:ing)?|show(?:ing)?)\b`,
    String.raw`\b(?:exclud(?:e|ing)|omit(?:ting)?|leave out|leaving out|avoid(?:ing)?)\b`,
    String.raw`\b(?:sans (?:mentionner|inclure|citer|parler de)|ne (?:pas )?(?:mentionn\w*|inclu\w*|cit\w*)|exclu(?:re|ant)|omet(?:tre|tant))\b`,
    String.raw`\b(?:sem (?:mencionar|incluir|citar|falar de)|n[aã]o (?:mencion\w*|inclu\w*|cit\w*)|exclu(?:ir|indo)|omit(?:ir|indo))\b`,
  ].join('|'),
  'gi',
);
const RELATIVE = /^\s*(?:which|that|who|whose|whom|where|qui|que|dont|lequel|laquelle|o qual|a qual|onde)\b/i;

export function negatedRanges(text) {
  const ranges = [];
  for (const m of text.matchAll(NEG_CUE)) {
    let i = m.index + m[0].length;
    while (i < text.length) {
      const ch = text[i];
      if (/[.!?\n]/.test(ch)) break;
      if (ch === ',' || ch === ';') {
        if (!RELATIVE.test(text.slice(i + 1))) break;
      }
      i++;
    }
    ranges.push([m.index, i]);
  }
  return ranges;
}

function allOccurrencesInside(text, span, ranges) {
  if (!ranges.length) return false;
  let from = 0; let seen = false;
  while (true) {
    const at = text.indexOf(span, from);
    if (at === -1) break;
    seen = true;
    if (!ranges.some(([a, b]) => at >= a && at + span.length <= b)) return false;
    from = at + span.length;
  }
  return seen;
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
  // Bounded quantifiers: the unbounded local part backtracked quadratically on
  // long unbroken text (350ms at 20k chars, 13s at 120k) - K5, mission-os#617.
  collect(/[\w.+-]{1,64}@[\w-]{1,63}\.[\w.-]{0,190}\w/g, 'email');
  collect(/`([^`\n]+)`/g, 'code');
  collect(/"([^"\n]{2,120})"/g, 'quote');
  collect(/[\u201c]([^\u201d\n]{2,120})[\u201d]/g, 'quote'); // curly quotes
  collect(/[\u2018]([^\u2019\n]{2,120})[\u2019]/g, 'quote');
  // stripTrail as for URLs: "run ./scripts/run.sh." ends a sentence, and the
  // full stop is not part of the path - demanding it verbatim fails a rewrite
  // that kept the path correctly (found in the live 32-fixture run).
  collect(/(?:^|[\s(])((?:~\/|\.\/|\/)[\w.-]+(?:\/[\w.-]+)+)/gm, 'path', stripTrail);
  // Relative paths with a file extension (lib/pipeline.mjs, src/app.ts): the
  // extension is what separates a path from prose like "and/or".
  collect(/(?<![\w/@.])((?:[\w.-]+\/)+[\w-]+\.[a-zA-Z]{1,5})\b/g, 'path');
  // The unit list needs a trailing boundary, or "3 sections" is read as the
  // quantity "3 sec" and then demanded verbatim (K2, mission-os#617).
  collect(/\b\d+(?:[.,:]\d+)+\b|\b\d+\s?%|\b\d+\s?(?:eur|euros?|usd|px|ms|sec|seconds?|min|minutes?|hours?|days?|weeks?|kb|mb|gb|k|words?|chars?|characters?)\b|\b\d+[shdm]\b|\b\d+\b/gi, 'number');
  collect(/\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g, 'identifier'); // CamelCase
  collect(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, 'identifier'); // snake_case
  collect(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?:\.[a-z]{2,4})?\b/g, 'identifier'); // kebab-case / domains
  collect(/\b[A-Z]{2,6}\d*\b/g, 'acronym');

  for (const noun of properNouns(text)) if (!spans.has(noun)) spans.set(noun, 'proper-noun');

  for (const [span, kind] of [...spans]) {
    if (kind === 'acronym' && NOISE_ACRONYMS.has(span)) spans.delete(span);
    if (kind === 'number' && /^[01]$/.test(span)) spans.delete(span); // "1"/"0" too noisy
  }
  const ranges = negatedRanges(text);
  return [...spans.entries()].map(([span, kind]) => {
    const negated = allOccurrencesInside(text, span, ranges);
    return negated ? { span, kind, negated: true } : { span, kind };
  });
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
