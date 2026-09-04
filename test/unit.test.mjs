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
  assert.equal(computeLevel([ok('span_retention'), ok('content_coverage', true)], null, 'off').level, 'checked'); // K4: no judge ran
  assert.equal(computeLevel([ok('span_retention'), bad('content_coverage', true)], null, 'off').level, 'review');
  assert.equal(computeLevel([bad('span_retention'), ok('content_coverage', true)], null, 'off').level, 'failed');
  assert.equal(computeLevel([ok('span_retention')], null, 'off').basis, 'deterministic');
});

test('computeLevel: advisory judge never changes the level; blocking judge does', () => {
  const checks = [ok('span_retention'), ok('content_coverage', true)];
  const failingJudge = { name: 'meaning_judge', passed: false, verdict: 'altered' };
  assert.equal(computeLevel(checks, failingJudge, 'advisory').level, 'checked'); // K4
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

// --- K6 (mission-os#617): negation-aware spans; exempt sections do not count ---
test('protectedSpans marks spans inside a "do not mention" scope as negated', () => {
  const spans = protectedSpans('Write a blog post about our Q3 results, we grew 40%, but do not mention churn, which was 12%, format as markdown.');
  const by = Object.fromEntries(spans.map((s) => [s.span, !!s.negated]));
  assert.equal(by['40%'], false);
  assert.equal(by['12%'], true); // relative clause stays attached to the negated noun
  assert.ok(!('markdown' in by) || by['markdown'] === false); // next imperative segment is outside the scope
});

test('protectedSpans reads French and Portuguese negation cues', () => {
  const fr = protectedSpans('Résume la mission pour Hubert, sans mentionner le prix de 600 EUR.');
  assert.equal(fr.find((s) => s.span === '600 EUR').negated, true);
  assert.equal(!!fr.find((s) => s.span === 'Hubert').negated, false);
  const pt = protectedSpans('Faz um resumo, sem mencionar o valor de 600 EUR, para o Hubert.');
  assert.equal(pt.find((s) => s.span === '600 EUR').negated, true);
});

test('spanRetention does not require negated spans and reports them as exempt', () => {
  const spans = protectedSpans('Write about our Q3 results, we grew 40%, but do not mention churn, which was 12%.');
  const r = spanRetention(spans, '# Task\nWrite about our Q3 results.\n# Constraints\n- We grew 40%.\n- Do not mention churn.');
  assert.equal(r.passed, true);
  assert.ok(r.exempt.some((s) => s.span === '12%'));
  assert.equal(r.total, spans.filter((s) => !s.negated).length);
});

test('spanRetention ignores spans that only appear in Assumptions / Open questions', () => {
  const spans = protectedSpans('Refactor the parser, budget 500 EUR.');
  const r = spanRetention(spans, '# Task\nRefactor the parser.\n# Open questions\n- Is the 500 EUR budget firm?');
  assert.equal(r.passed, false);
  assert.ok(r.missing.some((m) => m.span.includes('500')));
});

test('contentCoverage ignores terms that only appear in Assumptions / Open questions', () => {
  const src = 'Only refactor the parser; do not touch the tests or the CLI.';
  const demoted = '# Task\nRefactor the parser.\n# Constraints\nNone specified.\n# Open questions\n- Should tests be touched?\n- What is the CLI?';
  const kept = '# Task\nRefactor the parser only.\n# Constraints\n- Do not touch the tests or the CLI.';
  assert.equal(contentCoverage(src, kept, 0.85).passed, true);
  assert.equal(contentCoverage(src, demoted, 0.85).passed, false);
  assert.ok(contentCoverage(src, demoted, 0.85).missing.includes('tests'));
});

// --- K2 + K5 (mission-os#617): tokenised retention, Unicode spans, safe regexes ---
test('spanRetention matches whole tokens, not substrings', () => {
  const spans = [{ span: 'Paris', kind: 'proper-noun' }, { span: '5', kind: 'number' }, { span: 'React', kind: 'proper-noun' }];
  const r = spanRetention(spans, '# Task\nA comparison of 2025 with Preact.');
  assert.equal(r.passed, false);
  assert.equal(r.missing.length, 3); // was: all three "kept" by comparison / 2025 / Preact
  assert.equal(spanRetention(spans, '# Task\nParis, 5 items, React.').passed, true);
});

test('spanRetention still matches inside punctuation and case-insensitively', () => {
  const spans = [{ span: 'Snowflake', kind: 'proper-noun' }, { span: '800 words', kind: 'number' }];
  assert.equal(spanRetention(spans, '# Task\n- "snowflake", 800 words max.').passed, true);
});

test('protectedSpans keeps accented and non-Latin proper nouns', () => {
  const values = protectedSpans('Envoie le devis a Hubert Gregoire et a Sonia Pinto pour Sao Paulo.').map((s) => s.span);
  assert.ok(values.includes('Hubert Gregoire'));
  assert.ok(values.includes('Sonia Pinto'));
  const accented = protectedSpans('Envoie le devis a Hubert Grégoire et a Sónia Pinto.').map((s) => s.span);
  assert.ok(accented.includes('Hubert Grégoire'), JSON.stringify(accented));
  assert.ok(accented.includes('Sónia Pinto'), JSON.stringify(accented));
});

test('protectedSpans reads curly quotes and relative paths', () => {
  const curly = protectedSpans('Use “move fast, ship daily” as the tagline.').map((s) => s.span);
  assert.ok(curly.includes('move fast, ship daily'), JSON.stringify(curly));
  const paths = protectedSpans('Edit lib/pipeline.mjs and src/app.ts, not ./scripts/run.sh').map((s) => s.span);
  assert.ok(paths.includes('lib/pipeline.mjs'), JSON.stringify(paths));
  assert.ok(paths.includes('src/app.ts'));
  assert.ok(paths.includes('./scripts/run.sh'));
});

test('unit-suffixed numbers require a word boundary ("3 sections" is not "3 sec")', () => {
  const values = protectedSpans('Give me 3 sections of 200 words each.').map((s) => s.span);
  assert.ok(!values.includes('3 sec'), JSON.stringify(values));
  assert.ok(values.includes('3'));
  assert.ok(protectedSpans('cut query time from 45s to 3s').map((s) => s.span).includes('45s'));
});

test('extraction stays linear on long unbroken input (K5: no catastrophic backtracking)', () => {
  const hostile = 'a'.repeat(40000);
  const t0 = Date.now();
  protectedSpans(hostile);
  const ms = Date.now() - t0;
  assert.ok(ms < 250, `protectedSpans took ${ms}ms on 40k unbroken chars`);
});

// --- K3 + K4 (mission-os#617): script-aware language, honest level vocabulary ---
import { guessScript } from '../lib/verify.mjs';
import { LEVELS } from '../lib/pipeline.mjs';

test('guessScript separates writing systems the stopword profile cannot see', () => {
  assert.equal(guessScript('東京の観光スポットを3つ紹介してください'), 'han');
  assert.equal(guessScript('Introduce three tourist spots in Tokyo'), 'latin');
  assert.equal(guessScript('اكتب قصيدة قصيرة'), 'arabic');
  assert.equal(guessScript('Γράψε ένα ποίημα'), 'greek');
  assert.equal(guessScript('42 - !'), 'unknown');
});

test('languageMatch catches translation out of a non-Latin script', () => {
  const ja = '東京の観光スポットを3つ、それぞれ50字以内で紹介してください。';
  assert.equal(languageMatch(ja, '# Task\nIntroduce three Tokyo tourist spots, 50 characters each.').passed, false);
  assert.equal(languageMatch(ja, '# Task\n東京の観光スポットを3つ紹介する。各50字以内。').passed, true);
});

test('languageMatch does not fail an English prompt over the Portuguese stopword "as"', () => {
  const src = 'Use as many examples as you can, as long as each one is as short as the previous one.';
  assert.equal(languageMatch(src, '# Task\nUse as many examples as possible, each as short as the previous one.').passed, true);
});

test('languageMatch needs a clear winner, not a tie', () => {
  // French source whose rewrite carries the template's English scaffolding.
  const fr = 'Écris un poème sur Lisbonne avec le tram.';
  const mixed = '# Task\nÉcrire un poème sur Lisbonne avec le tram.\n# Open questions\n- Is there a tone you prefer to use for this?';
  assert.equal(languageMatch(fr, mixed).passed, true);
});

test('LEVELS vocabulary is honest: the top deterministic level is not called verified', () => {
  assert.deepEqual(LEVELS, ['checked', 'review', 'failed']);
  assert.equal(computeLevel([ok('span_retention')], null, 'off').level, 'checked');
  assert.equal(computeLevel([ok('span_retention')], { passed: true }, 'blocking').level, 'verified');
});

// --- K8 (mission-os#617): the heuristic must not detach a clause from its noun ---
test('heuristic keeps a relative clause attached to its antecedent', () => {
  const r = heuristicOptimize('Write a blog post about our Q3 results, we grew 40%, but do not mention churn, which was 12%, format as markdown.', { target: 'chat' });
  assert.ok(!/Q3 results which was 12%/.test(r.optimized), r.optimized);
  assert.ok(/churn, which was 12%/.test(r.optimized), r.optimized);
  assert.ok(/# Task\nWrite a blog post about our Q3 results\.?$/m.test(r.optimized), r.optimized);
});

test('heuristic does not concatenate several goal segments into one sentence', () => {
  const r = heuristicOptimize('Build the report. Send it to Andre. Then archive it.', { target: 'chat' });
  const task = r.optimized.split('\n# ')[0];
  assert.ok(!/report\. Send it to Andre\. Then archive it\./.test(task.replace(/\n/g, ' ')) || task.includes('\n- '), r.optimized);
  assert.ok(r.optimized.includes('Andre'));
  assert.ok(r.optimized.includes('archive'));
});

test('heuristic still splits a comma-spliced prompt into its buckets', () => {
  const r = heuristicOptimize('Make a landing page for my bakery, must not use React, return it as one HTML file.', { target: 'chat' });
  assert.ok(/# Constraints/.test(r.optimized), r.optimized);
  assert.ok(/# Output format/.test(r.optimized), r.optimized);
  assert.ok(/must not use React/.test(r.optimized));
});

// --- K9 (mission-os#617): token boundaries in scripts with no word separator ---
import { containsToken } from '../lib/verify.mjs';

test('containsToken treats CJK and Thai neighbours as boundaries, not word characters', () => {
  // Japanese has no spaces: "3" is always glued to a letter, so a Latin-style
  // boundary rejected a number the rewrite had actually kept.
  assert.equal(containsToken('紹介東京の観光スポット 3つ、それぞれ50字以内', '3'), true);
  assert.equal(containsToken('50字以内で紹介してください', '50'), true);
  assert.equal(containsToken('3つの観光スポット', '観光スポット'), true);
  assert.equal(containsToken('ราคา 600 บาท', '600'), true);
});

test('containsToken still rejects a digit inside a longer number', () => {
  assert.equal(containsToken('a comparison of 2025', '5'), false);
  assert.equal(containsToken('5 items', '5'), true);
  assert.equal(containsToken('Preact renders', 'React'), false);
  assert.equal(containsToken('banana bread', 'Ana'), false);
});

test('spanRetention keeps a Japanese rewrite that kept its numbers', () => {
  const spans = protectedSpans('東京の観光スポットを3つ、それぞれ50字以内で紹介してください。');
  const kept = '# Task\n紹介東京の観光スポット 3つ、それぞれ50字以内を紹介してください。\n# Constraints\n- 50文字以内';
  assert.equal(spanRetention(spans, kept).passed, true, JSON.stringify(spanRetention(spans, kept).missing));
});

test('paths do not swallow the sentence full stop', () => {
  const values = protectedSpans('Run ./scripts/run.sh. Then edit lib/pipeline.mjs, and open /etc/hosts.').map((s) => s.span);
  assert.ok(values.includes('./scripts/run.sh'), JSON.stringify(values));
  assert.ok(!values.includes('./scripts/run.sh.'), JSON.stringify(values));
  assert.ok(values.includes('/etc/hosts'));
  assert.ok(values.includes('lib/pipeline.mjs'));
});
