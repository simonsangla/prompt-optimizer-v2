// Evidence harness: runs every fixture through the real pipeline and scores
// meaning preservation with the same deterministic checks the product uses,
// plus the LLM judge. Writes eval/EVIDENCE.md. Run: node eval/run-eval.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { optimize } from '../lib/pipeline.mjs';
import { heuristicOptimize } from '../lib/heuristic.mjs';
import { protectedSpans } from '../lib/extract.mjs';
import { spanRetention, noInvention, languageMatch, contentCoverage } from '../lib/verify.mjs';
import { DEFAULT_MODEL } from '../lib/ollama.mjs';

const fixturesPath = new URL('./fixtures.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixturesPath, 'utf8'));
const heuristicOnly = process.argv.includes('--heuristic');

const rows = [];
const failDetails = [];

for (const f of fixtures) {
  process.stdout.write(`[eval] ${f.id} ... `);
  const started = Date.now();
  let result;
  if (heuristicOnly) {
    const h = heuristicOptimize(f.input, { target: f.target });
    const spans = protectedSpans(f.input);
    result = {
      ...h,
      fidelity: {
        checks: [
          spanRetention(spans, h.optimized),
          noInvention(f.input, '', h.optimized),
          languageMatch(f.input, h.optimized),
          { ...contentCoverage(f.input, h.optimized), advisory: true },
        ],
        judge: null,
      },
      repaired: false,
      model: null,
    };
    result.fidelity.passed = result.fidelity.checks.every((c) => c.passed);
  } else {
    try {
      result = await optimize(f.input, { target: f.target });
    } catch (err) {
      console.log(`ERROR (${String(err.message || err).slice(0, 60)})`);
      rows.push({ id: f.id, category: f.category, mode: 'error', spans: '-', spanPass: null, inventionPass: null, languagePass: null, structurePass: null, judgePass: null, repaired: false, overall: false, secs: ((Date.now() - started) / 1000).toFixed(0), openQuestions: 0, assumptions: 0, error: String(err.message || err) });
      failDetails.push({ id: f.id, checks: [], judge: null, optimized: `PIPELINE ERROR: ${err.message || err}` });
      continue;
    }
  }
  const secs = ((Date.now() - started) / 1000).toFixed(0);

  const byName = Object.fromEntries(result.fidelity.checks.map((c) => [c.name, c]));
  const row = {
    id: f.id,
    category: f.category,
    mode: result.mode,
    spans: byName.span_retention ? `${byName.span_retention.kept}/${byName.span_retention.total}` : '-',
    spanPass: byName.span_retention?.passed ?? null,
    inventionPass: byName.no_invention?.passed ?? null,
    languagePass: byName.language_match?.passed ?? null,
    structurePass: byName.structure?.passed ?? null,
    judgePass: result.fidelity.judge ? result.fidelity.judge.passed : null,
    coverage: byName.content_coverage ? byName.content_coverage.ratio : null,
    coveragePass: byName.content_coverage ? byName.content_coverage.passed : null,
    level: result.fidelity.level || (result.fidelity.passed ? 'verified' : 'failed'),
    repaired: result.repaired,
    overall: result.fidelity.passed,
    secs,
    openQuestions: (result.openQuestions || []).length,
    assumptions: (result.assumptions || []).length,
  };
  rows.push(row);
  if (!row.overall) {
    failDetails.push({ id: f.id, checks: result.fidelity.checks.filter((c) => !c.passed), judge: result.fidelity.judge && !result.fidelity.judge.passed ? result.fidelity.judge : null, optimized: result.optimized });
  }
  console.log(row.overall ? `PASS (${secs}s${row.repaired ? ', repaired' : ''})` : `FAIL (${secs}s)`);
}

const pct = (sel) => {
  const applicable = rows.filter((r) => sel(r) !== null);
  if (!applicable.length) return 'n/a';
  const passed = applicable.filter((r) => sel(r)).length;
  return `${passed}/${applicable.length} (${Math.round((100 * passed) / applicable.length)}%)`;
};

const b = (v) => (v === null ? 'n/a' : v ? 'PASS' : 'FAIL');
const mode = heuristicOnly ? 'heuristic (deterministic fallback)' : `llm (${DEFAULT_MODEL}) with judge + 1 repair round`;

const md = `# Intact - eval evidence

- Date: ${new Date().toISOString()}
- Mode: ${mode}
- Fixtures: ${rows.length}

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | ${pct((r) => r.spanPass)} |
| No invention (no new numbers/URLs) | ${pct((r) => r.inventionPass)} |
| Language preserved | ${pct((r) => r.languagePass)} |
| Required structure present | ${pct((r) => r.structurePass)} |
| Meaning judge (LLM) verdict "preserved" | ${pct((r) => r.judgePass)} |
| Content coverage above ${Math.round(100 * 0.85)}% (advisory) | ${pct((r) => r.coveragePass)} |
| Verdict "verified" (every check clean) | ${rows.filter((r) => r.level === 'verified').length}/${rows.length} |
| Verdict "review" (literals clean, soft signal flagged) | ${rows.filter((r) => r.level === 'review').length}/${rows.length} |
| Verdict "failed" (a blocking check fired) | ${rows.filter((r) => r.level === 'failed').length}/${rows.length} |
| Overall fidelity (all checks) | ${pct((r) => r.overall)} |
| Runs needing the repair round | ${rows.filter((r) => r.repaired).length}/${rows.length} |

## Per fixture

| id | category | spans kept | invention | language | structure | coverage | judge | verdict | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.category} | ${r.spans} | ${b(r.inventionPass)} | ${b(r.languagePass)} | ${b(r.structurePass)} | ${r.coverage === null ? 'n/a' : r.coverage} | ${b(r.judgePass)} | ${r.level}${r.repaired ? ' (repaired)' : ''} | ${r.secs}s | ${r.openQuestions} | ${r.assumptions} |`).join('\n')}

${failDetails.length ? `## Failure details\n\n${failDetails.map((d) => `### ${d.id}\n- failed checks: ${d.checks.map((c) => c.name + ' ' + JSON.stringify({ ...c, name: undefined })).join('; ') || 'none'}\n- judge: ${d.judge ? JSON.stringify({ added: d.judge.added, dropped: d.judge.dropped, altered: d.judge.altered }) : 'passed'}\n\n<details><summary>output</summary>\n\n\`\`\`\n${d.optimized}\n\`\`\`\n</details>`).join('\n\n')}` : 'All fixtures passed.'}

## Reading guide

- span retention / no-invention / language are DETERMINISTIC - they cannot hallucinate.
- the judge is a local LLM prompted to refute; a FAIL means "review", not proven alteration.
- "repaired" means the first draft failed a check and the repair round produced a
  better draft (the pipeline keeps whichever of the two violates less).
- content_coverage is ADVISORY: it can lower a verdict to "review" but never to
  "failed", because legitimate rephrasing can drop a source word without
  changing meaning.
- verdicts: verified = every check clean; review = literals clean but a soft
  signal fired; failed = a blocking deterministic check fired.
`;

const outName = heuristicOnly ? './EVIDENCE-heuristic.md' : './EVIDENCE.md';
await writeFile(new URL(outName, import.meta.url), md);
console.log(`\nWrote eval/${outName.slice(2)}`);
