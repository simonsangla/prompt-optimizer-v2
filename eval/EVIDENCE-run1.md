# Intact - eval evidence

- Date: 2026-08-30T19:00:16.662Z
- Mode: llm (llama3.2:3b) with judge + 1 repair round
- Fixtures: 10

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | 8/10 (80%) |
| No invention (no new numbers/URLs) | 9/10 (90%) |
| Language preserved | 10/10 (100%) |
| Required structure present | 10/10 (100%) |
| Meaning judge (LLM) verdict "preserved" | 7/10 (70%) |
| Overall fidelity (all checks) | 6/10 (60%) |
| Runs needing the repair round | 7/10 |

## Per fixture

| id | category | spans kept | invention | language | structure | judge | overall | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | PASS | PASS | PASS (repaired) | 158s | 2 | 2 |
| bug-fix | coding, specific | 1/1 | PASS | PASS | PASS | PASS | PASS | 47s | 0 | 0 |
| blog-post | writing | 0/2 | PASS | PASS | PASS | FAIL | FAIL (repaired) | 101s | 1 | 1 |
| vague-marketing | vague | 0/0 | FAIL | PASS | PASS | FAIL | FAIL (repaired) | 104s | 1 | 1 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | PASS | PASS | PASS (repaired) | 78s | 1 | 1 |
| french-email | non-english | 0/0 | PASS | PASS | PASS | PASS | PASS | 39s | 1 | 1 |
| analytics-query | analytics | 0/0 | PASS | PASS | PASS | FAIL | FAIL (repaired) | 92s | 0 | 0 |
| already-structured | already-structured | 2/2 | PASS | PASS | PASS | PASS | PASS (repaired) | 77s | 1 | 1 |
| image-poster | image | 0/1 | PASS | PASS | PASS | PASS | FAIL (repaired) | 59s | 0 | 1 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | PASS | PASS | PASS | 34s | 0 | 0 |

## Failure details

### blog-post
- failed checks: span_retention {"passed":false,"total":2,"kept":0,"missing":[{"span":"800","kind":"number"},{"span":"40%","kind":"number"}]}
- judge: {"added":["45s to 3s","Length: 800 words max"],"dropped":["costs by 40%"],"altered":[]}

<details><summary>output</summary>

```
# Task
Write a blog post about our migration from Redshift to Snowflake.

# Context
The target audience is data engineers. The background is that the company has recently migrated its database from Redshift to Snowflake.

# Constraints
- Tone: professional
- Length: 
- Exclusions: none specified
- Query time reduction: 45s to 3s

# Output format
- Reply structure: introduction, overview of migration process, benefits and cost savings, technical details, conclusion

# Assumptions
- The company has successfully completed the migration from Redshift to Snowflake.

# Open questions
- What specific technical details should be included in the blog post?
```
</details>

### vague-marketing
- failed checks: no_invention {"passed":false,"inventedNumbers":["100"],"inventedUrls":[]}
- judge: {"added":["unique selling point"],"dropped":[],"altered":[]}

<details><summary>output</summary>

```
# Task
Create a social media post announcing the upcoming product launch.

# Context
The target audience is likely customers and potential buyers who are interested in the new product. The background is that the product has been developed to address a specific need or problem.

# Constraints
* Tone: Informative and exciting
* Length: around 100 words
* Exclusions: No explicit calls-to-action, no links

# Output format
A short paragraph with a brief introduction to the new product launch, followed by a statement about what customers can expect from it.

# Assumptions
* The product has a unique selling point or benefit that will appeal to customers.

# Open questions
* What is the name of the new product?
```
</details>

### analytics-query
- failed checks: none
- judge: {"added":["function","JSON shape"],"dropped":[],"altered":[]}

<details><summary>output</summary>

```
# System
Build a function that takes raw customer reviews as input and returns JSON output with the classified sentiment (positive, negative, or neutral) and corresponding confidence score.

# User
Input: `reviews` - a list of strings containing raw customer reviews in English and Portuguese. Example: `[ "I loved this product!", "O produto é muito ruim.", "This is an okay product." ]`

# Output format
Output JSON shape:
```json
{
  "sentiment": string,
  "confidence": float
}
```
Assumptions:
- The input reviews are in English and Portuguese.

Open questions: 
- How should the function handle reviews with missing or invalid data?
```
</details>

### image-poster
- failed checks: span_retention {"passed":false,"total":1,"kept":0,"missing":[{"span":"15","kind":"number"}]}
- judge: passed

<details><summary>output</summary>

```
# Subject
Poster for a jazz concert at Teatro Aberto

# Style
Art Deco, Gold, Dark Blue

# Composition
Framing: None specified, Lighting: Warm and inviting

# Avoid
Negative prompt items:
- Text on the image

# Assumptions
(assumption): The poster is intended to evoke a sense of luxury and sophistication.

# Open questions
```
</details>

## Reading guide

- span retention / no-invention / language are DETERMINISTIC - they cannot hallucinate.
- the judge is a local LLM prompted to refute; a FAIL means "review", not proven alteration.
- "repaired" means the first draft failed a check and one automatic repair round ran.
