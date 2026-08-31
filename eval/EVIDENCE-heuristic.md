# Intact - eval evidence

- Date: 2026-08-31T12:49:16.707Z
- Mode: heuristic (deterministic fallback)
- Fixtures: 10

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | 10/10 (100%) |
| No invention (no new numbers/URLs) | 10/10 (100%) |
| Language preserved | 10/10 (100%) |
| Required structure present | n/a |
| Meaning judge (LLM) verdict "preserved" | n/a |
| Content coverage above 85% (advisory) | 10/10 (100%) |
| Verdict "verified" (every check clean) | 10/10 |
| Verdict "review" (literals clean, soft signal flagged) | 0/10 |
| Verdict "failed" (a blocking check fired) | 0/10 |
| Overall fidelity (all checks) | 10/10 (100%) |
| Runs needing the repair round | 0/10 |

## Per fixture

| id | category | spans kept | invention | language | structure | coverage | judge | verdict | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 2 | 0 |
| bug-fix | coding, specific | 1/1 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 2 | 0 |
| blog-post | writing | 6/6 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 1 | 0 |
| vague-marketing | vague | 0/0 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 3 | 0 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 3 | 0 |
| french-email | non-english | 2/2 | PASS | PASS | n/a | n/a | n/a | verified | 0s | 3 | 0 |
| analytics-query | analytics | 0/0 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 2 | 0 |
| already-structured | already-structured | 3/3 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 1 | 0 |
| image-poster | image | 3/3 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 3 | 0 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | n/a | 1 | n/a | verified | 0s | 2 | 0 |

All fixtures passed.

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
