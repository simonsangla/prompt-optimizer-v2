// Evidence harness: runs every fixture through the real pipeline and scores
// meaning preservation with the same deterministic checks the product uses,
// plus the LLM judge. Writes eval/EVIDENCE.md. Run: node eval/run-eval.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { optimize } from '../lib/pipeline.mjs';
import { heuristicOptimize } from '../lib/heuristic.mjs';
import { protectedSpans } from '../lib/extract.mjs';
import { spanRetention, noInvention, languageMatch } from '../lib/verify.mjs';
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
        ],
        judge: null,
      },
      repaired: false,
      model: null,
    };
    result.fidelity.passed = result.fidelity.checks.every((c) => c.passed);
  } else {
    result = await optimize(f.input, { target: f.target });
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
| Overall fidelity (all checks) | ${pct((r) => r.overall)} |
| Runs needing the repair round | ${rows.filter((r) => r.repaired).length}/${rows.length} |

## Per fixture

| id | category | spans kept | invention | language | structure | judge | overall | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.category} | ${r.spans} | ${b(r.inventionPass)} | ${b(r.languagePass)} | ${b(r.structurePass)} | ${b(r.judgePass)} | ${b(r.overall)}${r.repaired ? ' (repaired)' : ''} | ${r.secs}s | ${r.openQuestions} | ${r.assumptions} |`).join('\n')}

${failDetails.length ? `## Failure details\n\n${failDetails.map((d) => `### ${d.id}\n- failed checks: ${d.checks.map((c) => c.name + ' ' + JSON.stringify({ ...c, name: undefined })).join('; ') || 'none'}\n- judge: ${d.judge ? JSON.stringify({ added: d.judge.added, dropped: d.judge.dropped, altered: d.judge.altered }) : 'passed'}\n\n<details><summary>output</summary>\n\n\`\`\`\n${d.optimized}\n\`\`\`\n</details>`).join('\n\n')}` : 'All fixtures passed.'}

## Reading guide

- span retention / no-invention / language are DETERMINISTIC - they cannot hallucinate.
- the judge is a local LLM prompted to refute; a FAIL means "review", not proven alteration.
- "repaired" means the first draft failed a check and one automatic repair round ran.
`;

await writeFile(new URL('./EVIDENCE.md', import.meta.url), md);
console.log('\nWrote eval/EVIDENCE.md');
