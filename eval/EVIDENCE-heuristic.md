# Intact - eval evidence

- Date: 2026-08-30T18:48:06.807Z
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
| Overall fidelity (all checks) | 10/10 (100%) |
| Runs needing the repair round | 0/10 |

## Per fixture

| id | category | spans kept | invention | language | structure | judge | overall | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |
| bug-fix | coding, specific | 1/1 | PASS | PASS | n/a | n/a | PASS | 0s | 3 | 0 |
| blog-post | writing | 2/2 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |
| vague-marketing | vague | 0/0 | PASS | PASS | n/a | n/a | PASS | 0s | 3 | 0 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |
| french-email | non-english | 0/0 | PASS | PASS | n/a | n/a | PASS | 0s | 3 | 0 |
| analytics-query | analytics | 0/0 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |
| already-structured | already-structured | 2/2 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |
| image-poster | image | 1/1 | PASS | PASS | n/a | n/a | PASS | 0s | 3 | 0 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | n/a | n/a | PASS | 0s | 2 | 0 |

All fixtures passed.

## Reading guide

- span retention / no-invention / language are DETERMINISTIC - they cannot hallucinate.
- the judge is a local LLM prompted to refute; a FAIL means "review", not proven alteration.
- "repaired" means the first draft failed a check and one automatic repair round ran.
