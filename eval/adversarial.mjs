// Negative controls: proof the verifier can FAIL.
// A fidelity check that never fires is worthless - it looks identical to a
// working one. Each case below is a deliberately corrupted rewrite that a
// specific check MUST catch. Deterministic only: no LLM, runs in milliseconds.
// Run: node eval/adversarial.mjs
import { writeFile } from 'node:fs/promises';
import { protectedSpans } from '../lib/extract.mjs';
import { spanRetention, noInvention, structureCheck, languageMatch, contentCoverage } from '../lib/verify.mjs';

const SOURCE =
  'write a blog post about our migration from Redshift to Snowflake, 800 words max, for data engineers, mention we cut costs by 40% and query time from 45s to 3s';

const CASES = [
  {
    id: 'faithful-control',
    corruption: 'none - a faithful rewrite',
    mustFail: null,
    optimized:
      '# Task\nWrite a blog post about the migration from Redshift to Snowflake.\n# Context\n- Audience: data engineers\n# Constraints\n- 800 words max\n- Mention costs cut by 40%\n- Mention query time from 45s to 3s\n# Output format\n- Blog post prose',
  },
  {
    id: 'dropped-constraint',
    corruption: 'the 800-word limit is silently dropped',
    mustFail: 'span_retention',
    optimized:
      '# Task\nWrite a blog post about the migration from Redshift to Snowflake.\n# Context\n- Audience: data engineers\n# Constraints\n- Mention costs cut by 40%\n- Mention query time from 45s to 3s\n# Output format\n- Blog post prose',
  },
  {
    id: 'altered-number',
    corruption: '40% quietly becomes 60%',
    mustFail: 'no_invention',
    optimized:
      '# Task\nWrite a blog post about the migration from Redshift to Snowflake.\n# Context\n- Audience: data engineers\n# Constraints\n- 800 words max\n- Mention costs cut by 60%\n- Mention query time from 45s to 3s\n# Output format\n- Blog post prose',
  },
  {
    id: 'invented-url',
    corruption: 'a source URL the user never gave is added',
    mustFail: 'no_invention',
    optimized:
      '# Task\nWrite a blog post about the migration from Redshift to Snowflake.\n# Context\n- Audience: data engineers\n- Reference: https://docs.snowflake.com/migration\n# Constraints\n- 800 words max\n- Mention costs cut by 40%\n- Mention query time from 45s to 3s\n# Output format\n- Blog post prose',
    },
  {
    id: 'dropped-audience',
    corruption: 'the "data engineers" audience is replaced by a generic one',
    mustFail: 'content_coverage',
    optimized:
      '# Task\nWrite a blog post about the migration from Redshift to Snowflake.\n# Context\n- Audience: general readers\n# Constraints\n- 800 words max\n- Mention costs cut by 40%\n- Mention query time from 45s to 3s\n# Output format\n- Blog post prose',
  },
  {
    id: 'translated-output',
    corruption: 'the prompt is translated to French',
    mustFail: 'language_match',
    optimized:
      "# Task\nEcrire un article de blog sur la migration de Redshift vers Snowflake pour les ingenieurs de donnees.\n# Context\n- Le public est constitue d'ingenieurs\n# Constraints\n- 800 mots maximum\n- Il faut mentionner que les couts ont ete reduits de 40% et que le temps est passe de 45s a 3s\n# Output format\n- Un article de blog",
  },
  {
    id: 'missing-structure',
    corruption: 'required sections are missing',
    mustFail: 'structure',
    optimized:
      'Write a blog post about the migration from Redshift to Snowflake for data engineers, 800 words max, mentioning costs cut by 40% and query time from 45s to 3s.',
  },
];

const REQUIRED = ['Task', 'Context', 'Constraints', 'Output format'];
const spans = protectedSpans(SOURCE);

const rows = [];
for (const c of CASES) {
  const checks = [
    spanRetention(spans, c.optimized),
    noInvention(SOURCE, '', c.optimized),
    structureCheck(c.optimized, REQUIRED),
    languageMatch(SOURCE, c.optimized),
    contentCoverage(SOURCE, c.optimized),
  ];
  const failedNames = checks.filter((x) => !x.passed).map((x) => x.name);
  const caught = c.mustFail === null ? failedNames.length === 0 : failedNames.includes(c.mustFail);
  rows.push({ id: c.id, corruption: c.corruption, expected: c.mustFail || 'nothing (must pass clean)', failed: failedNames.join(', ') || 'none', caught });
  console.log(`${caught ? 'CAUGHT ' : 'MISSED '} ${c.id.padEnd(20)} expected=${(c.mustFail || 'clean').padEnd(15)} actual=[${failedNames.join(', ') || 'none'}]`);
}

const passed = rows.filter((r) => r.caught).length;
console.log(`\n${passed}/${rows.length} negative controls handled correctly`);

const md = `# Intact - adversarial (negative control) evidence

- Date: ${new Date().toISOString()}
- Purpose: prove the fidelity checks actually FIRE. A check that never fails is
  indistinguishable from a check that works.
- Method: deterministic only (no LLM). Each case is a deliberately corrupted
  rewrite of one source prompt; the named check must catch it. The first case is
  a faithful rewrite that must pass cleanly (guards against a check that fails
  on everything).

Result: **${passed}/${rows.length}** handled correctly.

| case | corruption injected | check that must fire | checks that fired | verdict |
|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.corruption} | ${r.expected} | ${r.failed} | ${r.caught ? 'CAUGHT' : 'MISSED'} |`).join('\n')}

## Source prompt used

\`\`\`
${SOURCE}
\`\`\`
`;
await writeFile(new URL('./EVIDENCE-adversarial.md', import.meta.url), md);
console.log('Wrote eval/EVIDENCE-adversarial.md');
process.exit(passed === rows.length ? 0 : 1);
