// Deterministic unit tests - no LLM required. Run: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedSpans, numberTokens, urlTokens } from '../lib/extract.mjs';
import { spanRetention, noInvention, structureCheck, guessLanguage, languageMatch } from '../lib/verify.mjs';
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
