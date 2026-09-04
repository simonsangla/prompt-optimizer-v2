// Deterministic unit tests - no LLM required. Run: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedSpans, numberTokens, urlTokens } from '../lib/extract.mjs';
import { spanRetention, noInvention, structureCheck, guessLanguage, languageMatch, contentCoverage } from '../lib/verify.mjs';
import { heuristicOptimize } from '../lib/heuristic.mjs';

test('protectedSpans catches urls, numbers, identifiers, quotes, code', () => {
  const spans = protectedSpans(
    'Fix the `parseDate` bug on https://example.com/app, budget 500 EUR, call it "QuickFix", update user_config and MyService by 15:30',
  );
  const values = spans.map((s) => s.span);
  assert.ok(values.includes('https://example.com/app'));
  assert.ok(values.includes('parseDate'));
  assert.ok(values.some((v) => v.includes('500')));
  assert.ok(values.includes('QuickFix'));
  assert.ok(values.includes('user_config'));
  assert.ok(values.includes('MyService'));
  assert.ok(values.includes('15:30'));
});

test('spanRetention fails when a protected detail is dropped', () => {
  const spans = protectedSpans('budget 500 EUR, use https://a.io');
  const good = spanRetention(spans, 'Keep the budget of 500 EUR and link https://a.io');
  assert.equal(good.passed, true);
  const bad = spanRetention(spans, 'Keep the budget reasonable');
  assert.equal(bad.passed, false);
  assert.ok(bad.missing.length >= 1);
});

test('noInvention flags numbers and urls absent from source', () => {
  const ok = noInvention('deliver in 3 days', '', 'Deliver the work in 3 days.');
  assert.equal(ok.passed, true);
  const bad = noInvention('deliver soon', '', 'Deliver in 5 days via https://invented.example');
  assert.equal(bad.passed, false);
  assert.deepEqual(bad.inventedNumbers, ['5']);
  assert.deepEqual(bad.inventedUrls, ['https://invented.example']);
});

test('noInvention ignores ordered-list markers', () => {
  const r = noInvention('do the thing', '', '1. First step\n2. Second step');
  assert.equal(r.passed, true);
});

test('noInvention accepts numbers coming from the context block', () => {
  const r = noInvention('build the page', 'stack: node 22', 'Build the page with node 22.');
  assert.equal(r.passed, true);
});

test('structureCheck detects missing sections', () => {
  const ok = structureCheck('# Goal\nx\n# Context\ny', ['Goal', 'Context']);
  assert.equal(ok.passed, true);
  const bad = structureCheck('# Goal\nx', ['Goal', 'Context']);
  assert.equal(bad.passed, false);
  assert.deepEqual(bad.missing, ['Context']);
});

test('guessLanguage separates en and fr, unknown on thin input', () => {
  assert.equal(guessLanguage('make me a landing page for my bakery, it needs to be modern and I dont want react'), 'en');
  assert.equal(guessLanguage('cree une page pour la boulangerie avec des couleurs et pas de react dans le code'), 'fr');
  assert.equal(guessLanguage('xyz'), 'unknown');
});

test('languageMatch fails on translation', () => {
  const en = 'make me a landing page for my bakery, it needs an order form and the design must be modern';
  const fr = 'Creer une page pour la boulangerie avec une forme de commande et un design moderne, pas de react dans le code';
  assert.equal(languageMatch(en, fr).passed, false);
  assert.equal(languageMatch(en, 'Build the landing page for the bakery with an order form and a modern design').passed, true);
});

test('heuristic fallback rearranges without inventing and asks instead of guessing', () => {
  const input = 'Write a blog post about our Snowflake migration. Must not exceed 800 words. We are a fintech startup.';
  const r = heuristicOptimize(input, { target: 'chat' });
  assert.equal(r.mode, 'heuristic');
  assert.ok(r.optimized.includes('800'));
  assert.ok(r.optimized.includes('Snowflake'));
  const inv = noInvention(input, '', r.optimized);
  assert.equal(inv.passed, true);
  assert.ok(r.openQuestions.length >= 1); // no output format given -> must ask
});

test('heuristic buckets constraints and output cues', () => {
  const r = heuristicOptimize('Summarize the report. Avoid jargon. Return it as a table.', { target: 'chat' });
  assert.ok(/# Constraints/.test(r.optimized));
  assert.ok(/# Output format/.test(r.optimized));
});

test('protectedSpans captures proper nouns and unit-suffixed numbers', () => {
  const values = protectedSpans(
    'write about our migration from Redshift to Snowflake, cut query time from 45s to 3s, poster at Teatro Aberto',
  ).map((s) => s.span);
  assert.ok(values.includes('Redshift'));
  assert.ok(values.includes('Snowflake'));
  assert.ok(values.includes('Teatro Aberto')); // multi-word proper noun kept as one phrase
  assert.ok(values.includes('45s'));
});

test('properNouns ignores sentence-initial capitals', () => {
  const values = protectedSpans('Write a post. The team uses Snowflake.').map((s) => s.span);
  assert.ok(!values.includes('Write'));
  assert.ok(!values.includes('The'));
  assert.ok(values.includes('Snowflake'));
});

test('numberTokens ignores digits that are part of a token', () => {
  assert.deepEqual([...numberTokens('a 2D representation')], []);
  assert.deepEqual([...numberTokens('3D render')], []);
  assert.ok([...numberTokens('from 45s to 3s')].includes('45')); // real units still count
});

test('noInvention no longer false-positives on 2D but still catches real inventions', () => {
  assert.equal(noInvention('make a poster', '', 'A 2D poster design.').passed, true);
  assert.equal(noInvention('make a social post', '', 'Under 140 characters for Twitter.').passed, false);
});

test('contentCoverage catches a wholesale dropped requirement', () => {
  const src = 'write a blog post for data engineers about the migration';
  const kept = '# Task\nWrite a blog post about the migration.\n# Context\n- Audience: data engineers';
  const dropped = '# Task\nWrite a blog post about the migration.\n# Context\n- Audience: general readers';
  assert.equal(contentCoverage(src, kept, 0.85).passed, true);
  assert.equal(contentCoverage(src, dropped, 0.85).passed, false);
  assert.ok(contentCoverage(src, dropped, 0.85).missing.includes('engineers'));
});

// --- K1 (mission-os#617): section-filler check ---------------------------
import { sectionFiller } from '../lib/verify.mjs';

test('sectionFiller flags tone/audience lines the source never stated', () => {
  const src = 'need a LinkedIn post about the MetricPilot launch, under 120 words, no hashtags';
  const out = '# Task\nWrite a LinkedIn post announcing MetricPilot.\n# Context\n- Audience: professionals in the industry\n# Constraints\n- Tone: informal and humorous\n- Length: under 120 words\n- Exclusions: no hashtags';
  const r = sectionFiller(src, '', out);
  assert.equal(r.name, 'section_filler');
  assert.equal(r.passed, false);
  const keys = r.flagged.map((f) => f.key.toLowerCase());
  assert.ok(keys.includes('audience'));
  assert.ok(keys.includes('tone'));
  assert.ok(!keys.includes('length')); // "120 words" is in the source
  assert.ok(!keys.includes('exclusions')); // "hashtags" is in the source
});

test('sectionFiller passes when every filler line is backed by source or context', () => {
  const src = 'write a friendly blog post for data engineers about the migration, 800 words max';
  const out = '# Task\nWrite a blog post about the migration.\n# Context\n- Audience: data engineers\n# Constraints\n- Tone: friendly\n- Length: 800 words max';
  assert.equal(sectionFiller(src, '', out).passed, true);
  const ctxOnly = sectionFiller('write a blog post about the migration', 'audience: data engineers', out.replace('- Tone: friendly\n', '').replace('- Length: 800 words max', ''));
  assert.equal(ctxOnly.passed, true);
});

test('sectionFiller exempts lines tagged (assumption) and whole Assumptions / Open questions sections', () => {
  const src = 'write a blog post about the migration';
  const tagged = '# Task\nWrite a blog post about the migration.\n# Constraints\n- Tone: formal (assumption)\n# Assumptions\n- Audience: data engineers\n# Open questions\n- Tone: formal or casual?';
  assert.equal(sectionFiller(src, '', tagged).passed, true);
});

test('sectionFiller always flags hedge values', () => {
  const src = 'write a blog post for data engineers about the migration';
  const out = '# Task\nWrite a blog post about the migration.\n# Context\n- Audience: data engineers\n# Constraints\n- Length: Not specified, but aim for a typical blog post length';
  const r = sectionFiller(src, '', out);
  assert.equal(r.passed, false);
  assert.equal(r.flagged[0].reason, 'hedge');
});

test('sectionFiller reads French and Portuguese keys', () => {
  const fr = sectionFiller('Écris un poème sur Lisbonne avec le tram.', '', '# Task\nÉcrire un poème sur Lisbonne avec le tram.\n# Constraints\n- Ton : amical et encourageant');
  assert.equal(fr.passed, false);
  const pt = sectionFiller('Faz um resumo da reunião, sem jargão.', '', '# Task\nFazer um resumo da reunião.\n# Constraints\n- Tom: amigável\n- Exclusões: não incluir jargão');
  assert.deepEqual(pt.flagged.map((f) => f.key.toLowerCase()), ['tom']);
});

// --- K0 (mission-os#617): one-call mode, judge off the critical path -------
import { computeLevel, optimize, InputTooLarge } from '../lib/pipeline.mjs';

const ok = (name, advisory = false) => ({ name, passed: true, advisory });
const bad = (name, advisory = false) => ({ name, passed: false, advisory });

test('computeLevel: judge off -> level comes from deterministic checks only', () => {
  assert.equal(computeLevel([ok('span_retention'), ok('content_coverage', true)], null, 'off').level, 'verified');
  assert.equal(computeLevel([ok('span_retention'), bad('content_coverage', true)], null, 'off').level, 'review');
  assert.equal(computeLevel([bad('span_retention'), ok('content_coverage', true)], null, 'off').level, 'failed');
  assert.equal(computeLevel([ok('span_retention')], null, 'off').basis, 'deterministic');
});

test('computeLevel: advisory judge never changes the level; blocking judge does', () => {
  const checks = [ok('span_retention'), ok('content_coverage', true)];
  const failingJudge = { name: 'meaning_judge', passed: false, verdict: 'altered' };
  assert.equal(computeLevel(checks, failingJudge, 'advisory').level, 'verified');
  assert.equal(computeLevel(checks, failingJudge, 'advisory').basis, 'deterministic');
  assert.equal(computeLevel(checks, failingJudge, 'blocking').level, 'review');
  assert.equal(computeLevel(checks, failingJudge, 'blocking').basis, 'deterministic+judge');
  assert.equal(computeLevel([bad('span_retention')], { passed: true }, 'blocking').level, 'failed');
});

test('optimize rejects over-budget input up front with a typed error (no silent truncation)', async () => {
  process.env.OPTIMIZER_FORCE_HEURISTIC = '1';
  await assert.rejects(() => optimize('x'.repeat(13000)), (e) => e instanceof InputTooLarge && e.status === 413);
  await assert.rejects(() => optimize('short', { context: 'y'.repeat(13000) }), InputTooLarge);
  const r = await optimize('Write a haiku about Lisbon.');
  assert.equal(r.fidelity.basis, 'deterministic');
  assert.ok(r.timings && typeof r.timings.checksMs === 'number');
});
