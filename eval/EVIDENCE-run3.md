# Intact - eval evidence

- Date: 2026-08-31T12:41:25.512Z
- Mode: llm (llama3.2:3b) with judge + 1 repair round
- Fixtures: 10

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | 10/10 (100%) |
| No invention (no new numbers/URLs) | 8/10 (80%) |
| Language preserved | 10/10 (100%) |
| Required structure present | 10/10 (100%) |
| Meaning judge (LLM) verdict "preserved" | 10/10 (100%) |
| Overall fidelity (all checks) | 8/10 (80%) |
| Runs needing the repair round | 6/10 |

## Per fixture

| id | category | spans kept | invention | language | structure | judge | overall | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | PASS | PASS | PASS (repaired) | 17s | 0 | 0 |
| bug-fix | coding, specific | 1/1 | PASS | PASS | PASS | PASS | PASS | 10s | 2 | 2 |
| blog-post | writing | 2/2 | PASS | PASS | PASS | PASS | PASS (repaired) | 18s | 1 | 1 |
| vague-marketing | vague | 0/0 | FAIL | PASS | PASS | PASS | FAIL (repaired) | 11s | 0 | 0 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | PASS | PASS | PASS (repaired) | 14s | 1 | 1 |
| french-email | non-english | 0/0 | PASS | PASS | PASS | PASS | PASS | 7s | 0 | 0 |
| analytics-query | analytics | 0/0 | PASS | PASS | PASS | PASS | PASS (repaired) | 18s | 2 | 1 |
| already-structured | already-structured | 2/2 | PASS | PASS | PASS | PASS | PASS | 8s | 2 | 1 |
| image-poster | image | 1/1 | FAIL | PASS | PASS | PASS | FAIL (repaired) | 11s | 0 | 1 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | PASS | PASS | PASS | 7s | 0 | 0 |

## Failure details

### vague-marketing
- failed checks: no_invention {"passed":false,"inventedNumbers":["140"],"inventedUrls":[]}
- judge: passed

<details><summary>output</summary>

```
# Task
Create a social media post announcing the upcoming product launch.

# Context
The audience is likely tech-savvy individuals interested in the latest gadgets and innovations. The background is that the product has been in development for several months, and there's significant buzz around its release.

# Constraints
- Tone: Exciting and energetic
- Length: Under 140 characters (due to Twitter character limit)
- Exclusions: No explicit calls-to-action or links

# Output format
Reply should be a concise, engaging message that builds anticipation for the product launch.
```
</details>

### image-poster
- failed checks: no_invention {"passed":false,"inventedNumbers":["2"],"inventedUrls":[]}
- judge: passed

<details><summary>output</summary>

```
# Subject
Poster for a jazz concert at Teatro Aberto on March 15

# Style
Art Deco vibes

# Composition
Framing, Lighting: Warm and intimate

# Avoid
Negative prompt items:
- Text on the image
- Any other visual elements not implied by the source

# Assumptions
(assumption) The poster is a 2D representation of the concert.

# Open questions
```
</details>

## Reading guide

- span retention / no-invention / language are DETERMINISTIC - they cannot hallucinate.
- the judge is a local LLM prompted to refute; a FAIL means "review", not proven alteration.
- "repaired" means the first draft failed a check and one automatic repair round ran.
