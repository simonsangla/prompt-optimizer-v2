# Intact - eval evidence

- Date: 2026-08-31T12:46:45.642Z
- Mode: llm (llama3.2:3b) with judge + 1 repair round
- Fixtures: 10

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | 10/10 (100%) |
| No invention (no new numbers/URLs) | 9/10 (90%) |
| Language preserved | 10/10 (100%) |
| Required structure present | 10/10 (100%) |
| Meaning judge (LLM) verdict "preserved" | 9/10 (90%) |
| Content coverage above 85% (advisory) | 7/10 (70%) |
| Verdict "verified" (every check clean) | 6/10 |
| Verdict "review" (literals clean, soft signal flagged) | 3/10 |
| Verdict "failed" (a blocking check fired) | 1/10 |
| Overall fidelity (all checks) | 6/10 (60%) |
| Runs needing the repair round | 5/10 |

## Per fixture

| id | category | spans kept | invention | language | structure | coverage | judge | verdict | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | PASS | 0.917 | PASS | verified | 10s | 2 | 2 |
| bug-fix | coding, specific | 1/1 | PASS | PASS | PASS | 0.9 | PASS | verified | 12s | 1 | 2 |
| blog-post | writing | 6/6 | FAIL | PASS | PASS | 0.923 | PASS | failed (repaired) | 32s | 1 | 1 |
| vague-marketing | vague | 0/0 | PASS | PASS | PASS | 0.667 | PASS | review (repaired) | 22s | 1 | 1 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | PASS | 1 | PASS | verified (repaired) | 28s | 1 | 1 |
| french-email | non-english | 2/2 | PASS | PASS | PASS | 0.571 | FAIL | review | 23s | 0 | 0 |
| analytics-query | analytics | 0/0 | PASS | PASS | PASS | 0.75 | PASS | review (repaired) | 33s | 1 | 1 |
| already-structured | already-structured | 3/3 | PASS | PASS | PASS | 0.889 | PASS | verified | 13s | 1 | 1 |
| image-poster | image | 3/3 | PASS | PASS | PASS | 1 | PASS | verified (repaired) | 19s | 1 | 1 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | PASS | 0.941 | PASS | verified | 14s | 1 | 2 |

## Failure details

### blog-post
- failed checks: no_invention {"passed":false,"inventedNumbers":["100","400","300"],"inventedUrls":[]}
- judge: passed

<details><summary>output</summary>

```
# Task
Write a blog post about our migration from Redshift to Snowflake.

# Context
The target audience is data engineers. The background is that we cut costs by 40% and query time from 45s to 3s while migrating our data warehouse from Redshift to Snowflake, resulting in significant performance improvements.

# Constraints
- Tone: Informative
- Length: 800 words maximum
- Exclusions: None specified

# Output format
Structure of the reply:
```
Introduction (approx. 100 words)
- Brief overview of the migration process
- Importance of the migration for data engineers

Main Content (approx. 400 words)
- Technical details of the migration (e.g., data transfer, schema changes)
- Performance improvements achieved
- Lessons learned during the migration process

Conclusion (approx. 300 words)
- Recap of key takeaways from the migration experience
- Final thoughts on the benefits of migrating to Snowflake for data engineers
```
# Assumptions
- The company has successfully migrated its data warehouse from Redshift to Snowflake.

# Open questions
- What specific technical details should be included in the blog post?
```
</details>

### vague-marketing
- failed checks: content_coverage {"passed":false,"ratio":0.667,"missing":["next","week"],"total":6,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Create a post for social media announcing the upcoming product launch.

# Context
The audience is likely customers and potential buyers, with some background knowledge of the company's products. The tone should be exciting and promotional.

# Constraints
* Tone: Friendly and enthusiastic.
* Exclusions: None specified.

# Output format
Structure the reply as a short sentence or phrase with an optional call-to-action (CTA) at the end.

# Assumptions
(assumption): The product launch is a significant event that will generate interest among customers.

# Open questions
None
```
</details>

### french-email
- failed checks: content_coverage {"passed":false,"ratio":0.571,"missing":["ecris","email","reunion","reste","mais","francais"],"total":14,"threshold":0.85,"advisory":true}
- judge: {"added":["Inconnue (assumption)","Exclusions : Nulle"],"dropped":[],"altered":[]}

<details><summary>output</summary>

```
# Task
Répondre à l'e-mail du client Teresa pour repousser la réunion de mardi à jeudi 14h.

# Context
Audience : Client Teresa
Background : Réunion programmée

# Constraints
- Ton : Poli et bref
- Longueur : Inconnue (assumption)
- Exclusions : Nulle

# Output format
Réponse en français, avec une structure de réponse concise.
```
</details>

### analytics-query
- failed checks: content_coverage {"passed":false,"ratio":0.75,"missing":["build","prompt","takes","customer"],"total":16,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# System
## API Endpoint
`classify_sentiment`

# User
## Request Body
```json
{
  "reviews": [
    {
      "text": "I loved the product!",
      "language": "en"
    },
    {
      "text": "O produto foi muito ruim.",
      "language": "pt"
    }
  ]
}
```
## Query Parameters
None

# Output Format
```json
{
  "sentiment": [
    {
      "review": "I loved the product!",
      "confidence": null,
      "label": "positive"
    },
    {
      "review": "O produto foi muito ruim.",
      "confidence": null,
      "label": "negative"
    }
  ],
  "fields": ["sentiment", "confidence"],
  "neutral": false
}
```
# Assumptions
- The input reviews are in English and Portuguese.

# Open questions
- What is the expected format of the `reviews` array?
```
</details>

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
