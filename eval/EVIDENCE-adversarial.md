# Intact - adversarial (negative control) evidence

- Date: 2026-08-31T12:52:09.268Z
- Purpose: prove the fidelity checks actually FIRE. A check that never fails is
  indistinguishable from a check that works.
- Method: deterministic only (no LLM). Each case is a deliberately corrupted
  rewrite of one source prompt; the named check must catch it. The first case is
  a faithful rewrite that must pass cleanly (guards against a check that fails
  on everything).

Result: **7/7** handled correctly.

| case | corruption injected | check that must fire | checks that fired | verdict |
|---|---|---|---|---|
| faithful-control | none - a faithful rewrite | nothing (must pass clean) | none | CAUGHT |
| dropped-constraint | the 800-word limit is silently dropped | span_retention | span_retention | CAUGHT |
| altered-number | 40% quietly becomes 60% | no_invention | span_retention, no_invention | CAUGHT |
| invented-url | a source URL the user never gave is added | no_invention | no_invention | CAUGHT |
| dropped-audience | the "data engineers" audience is replaced by a generic one | content_coverage | content_coverage | CAUGHT |
| translated-output | the prompt is translated to French | language_match | language_match, content_coverage | CAUGHT |
| missing-structure | required sections are missing | structure | structure | CAUGHT |

## Source prompt used

```
write a blog post about our migration from Redshift to Snowflake, 800 words max, for data engineers, mention we cut costs by 40% and query time from 45s to 3s
```
