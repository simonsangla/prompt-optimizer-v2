# Intact - eval evidence

- Date: 2026-09-04T21:29:57.400Z
- Mode: llm (llama3.2:3b), judge off, 1 repair round on a blocking failure
- Fixtures: 32

## Aggregate metrics

| Metric | Result |
|---|---|
| Protected-span retention (all source details kept) | 26/30 (87%) |
| No invention (no new numbers/URLs) | 30/30 (100%) |
| Language preserved | 30/30 (100%) |
| Required structure present | 29/30 (97%) |
| Meaning judge (LLM) verdict "preserved" | n/a |
| Content coverage above 85% (advisory) | 21/32 (66%) |
| Verdict "checked"/"verified" (every check clean) | 18/32 |
| Verdict "review" (literals clean, soft signal flagged) | 7/32 |
| Verdict "failed" (a blocking check fired) | 5/32 |
| Overall fidelity (all checks) | 18/32 (56%) |
| Runs needing the repair round | 16/32 |

## Per fixture

| id | category | spans kept | invention | language | structure | coverage | judge | verdict | time | open Qs | assumptions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bakery-landing | web-dev, vague-with-constraints | 3/3 | PASS | PASS | PASS | 1 | n/a | checked | 13s | 2 | 1 |
| bug-fix | coding, specific | 2/2 | PASS | PASS | PASS | 0.9 | n/a | checked (repaired) | 27s | 1 | 1 |
| blog-post | writing | 6/6 | PASS | PASS | PASS | 0.846 | n/a | review (repaired) | 15s | 0 | 2 |
| vague-marketing | vague | 0/0 | PASS | PASS | PASS | 1 | n/a | checked | 6s | 1 | 1 |
| contradictory | contradictory-constraints | 2/2 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 16s | 1 | 1 |
| french-email | non-english | 2/2 | PASS | PASS | PASS | n/a | n/a | checked | 11s | 1 | 1 |
| analytics-query | analytics | 0/0 | PASS | PASS | PASS | 0.938 | n/a | checked (repaired) | 15s | 1 | 1 |
| already-structured | already-structured | 3/3 | PASS | PASS | PASS | 0.778 | n/a | review (repaired) | 15s | 1 | 1 |
| image-poster | image | 3/3 | PASS | PASS | PASS | 0.769 | n/a | review (repaired) | 10s | 0 | 0 |
| refactor-scoped | coding, scope-limits | 3/3 | PASS | PASS | PASS | 0.882 | n/a | checked | 13s | 1 | 2 |
| stress-typos | stress, garbled | 0/2 | PASS | PASS | PASS | 0.111 | n/a | failed (repaired) | 12s | 1 | 2 |
| stress-chat-noise | stress, garbled | 3/3 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 12s | 0 | 1 |
| stress-json-blob | stress, garbled | 4/9 | PASS | PASS | PASS | 0.417 | n/a | failed (repaired) | 14s | 1 | 2 |
| stress-fr-short | stress, multilingual | 1/1 | PASS | PASS | PASS | n/a | n/a | checked | 11s | 1 | 1 |
| stress-pt-short | stress, multilingual | 2/2 | PASS | PASS | PASS | n/a | n/a | checked | 9s | 1 | 1 |
| stress-mix-fr-en-pt | stress, multilingual | 5/6 | PASS | PASS | PASS | n/a | n/a | failed (repaired) | 26s | 1 | 1 |
| stress-japanese | stress, multilingual | 2/2 | PASS | PASS | PASS | 1 | n/a | checked | 6s | 2 | 0 |
| stress-en-with-as | stress, multilingual | 0/0 | PASS | PASS | PASS | 0.25 | n/a | review | 6s | 1 | 1 |
| stress-one-word | stress, very short | 0/0 | PASS | PASS | PASS | 0 | n/a | review | 5s | 1 | 1 |
| stress-punctuation-only | stress, very short | 0/0 | PASS | PASS | PASS | 1 | n/a | checked | 4s | 1 | 1 |
| stress-lone-url | stress, very short | 2/2 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 11s | 1 | 1 |
| stress-negation | stress, meaning trap | 0/1 | PASS | PASS | PASS | 0.889 | n/a | failed (repaired) | 505s | 1 | 2 |
| stress-relative-clause | stress, meaning trap | 1/1 | PASS | PASS | PASS | 1 | n/a | checked | 7s | 0 | 0 |
| stress-only-scope | stress, meaning trap | 1/1 | PASS | PASS | PASS | 1 | n/a | checked | 12s | 0 | 0 |
| stress-number-noun | stress, meaning trap | - | n/a | n/a | n/a | undefined | n/a | undefined | 1979s | 0 | 0 |
| stress-deadline-budget | stress, meaning trap | 8/8 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 2034s | 0 | 0 |
| stress-accented-names | stress, extraction | - | n/a | n/a | n/a | undefined | n/a | undefined | 1850s | 0 | 0 |
| stress-paths-and-quotes | stress, extraction | 4/4 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 43s | 1 | 1 |
| stress-substring-trap | stress, extraction | 2/2 | PASS | PASS | PASS | 1 | n/a | checked (repaired) | 11s | 0 | 0 |
| stress-fr-negation | stress, meaning trap | 1/1 | PASS | PASS | FAIL | n/a | n/a | failed (repaired) | 835s | 0 | 2 |
| stress-pt-negation | stress, meaning trap | 1/1 | PASS | PASS | PASS | 0.4 | n/a | review | 11s | 1 | 1 |
| stress-long-unbroken | stress, performance | 0/0 | PASS | PASS | PASS | 0 | n/a | review | 13s | 1 | 1 |

## Failure details

### blog-post
- failed checks: content_coverage {"passed":false,"ratio":0.846,"missing":["data","engineers"],"total":13,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Write a blog post about our migration from Redshift to Snowflake.

# Context
None specified.

# Constraints
- Length: 800 words max
- Mention we cut costs by 40% and query time from 45s to 3s

# Output format
Structure of the reply is not requested, but the content should be in a standard blog post format.

# Assumptions
- Tone: professional (assumption)
- Exclusions: None specified (assumption)
```
</details>

### already-structured
- failed checks: content_coverage {"passed":false,"ratio":0.778,"missing":["goal","context","constraints","output"],"total":18,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Summarize quarterly sales report.

# Context
Board presentation for a non-technical audience.

# Constraints
One page, no jargon, highlight 12% YoY growth.

# Output format
Use bullet points to present the main points.

# Assumptions
(assumption) The quarterly sales report is available and contains relevant data on sales growth.

# Open questions
Is there a specific section or aspect of the report that should be highlighted?
```
</details>

### image-poster
- failed checks: content_coverage {"passed":false,"ratio":0.769,"missing":["gold","dark","blue"],"total":13,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Subject
Image of a jazz concert poster at Teatro Aberto on March 15
# Style
Art Deco style with teatro and aberto vibes
# Composition
Framing: ornate border, Lighting: dramatic spotlight on stage
# Avoid
Negative prompt items:
- Text on the image
```
</details>

### stress-typos
- failed checks: span_retention {"passed":false,"total":2,"kept":0,"missing":[{"span":"40%","kind":"number"},{"span":"12%","kind":"number"}],"exempt":[]}; section_filler {"passed":false,"flagged":[{"key":"Exclusions","value":" ","reason":"unsupported"}]}; content_coverage {"passed":false,"ratio":0.111,"missing":["wrte","blogpost","reslts","grew","mentoin","churn","wich","formt"],"total":9,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Write a blog post about Q3 results.

# Context
Audience and background for the blog post are not specified.

# Constraints
- Exclusions: 

# Output format
Structure of the reply is not specified, but it should be in Markdown format.

# Assumptions
- Tone: (assumption)
- Length: (assumption)

# Open questions
- Are there any specific requirements for the tone?
```
</details>

### stress-json-blob
- failed checks: span_retention {"passed":false,"total":9,"kept":4,"missing":[{"span":"https://docs.getdbt.com/reference/node-selection","kind":"url"},{"span":"task","kind":"quote"},{"span":"max_words","kind":"quote"},{"span":"source","kind":"quote"},{"span":"node-selection","kind":"identifier"}],"exempt":[]}; section_filler {"passed":false,"flagged":[{"key":"Audience","value":"data engineers, Background: None specified","reason":"hedge"}]}; content_coverage {"passed":false,"ratio":0.417,"missing":["task","source","https","docs","getdbt","reference","node-selection"],"total":12,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Summarize the concept of node selection in DBT documentation.

# Context
Audience: data engineers, Background: None specified

# Constraints
- Length: 150 words or less

# Output format
Structure: a brief summary statement followed by an explanation of node selection.

# Assumptions
- Tone: formal (assumption)
- Exclusions: None specified (assumption)

# Open questions
- Is there any specific aspect of node selection that should be emphasized in the summary?
```
</details>

### stress-mix-fr-en-pt
- failed checks: span_retention {"passed":false,"total":6,"kept":5,"missing":[{"span":"Viaposte","kind":"proper-noun"}],"exempt":[]}
- judge: passed

<details><summary>output</summary>

```
# Task
Fait un résumé de la mission de Viapostes pour Hubert Grégoire, en portugais, avec les chiffres : 600 EUR/jour, 12 jours, Sónia Pinto fait la facture.

# Context
Aucune information sur l'audience et le contexte n'est fournie.

# Constraints
Tone est pas spécifié. Longueur est pas spécifiée. Exclusions sont pas spécifiées.

# Output format
La réponse devrait être structurée comme un résumé de la mission de Viapostes pour Hubert Grégoire en portugais, avec les chiffres.

# Assumptions
(assumption): Les chiffres mentionnés (600 EUR/jour et 12 jours) sont pertinents à la mission de Viapostes.

# Open questions
- Sont-ils des informations supplémentaires qui devraient être incluses dans le résumé ?
```
</details>

### stress-en-with-as
- failed checks: content_coverage {"passed":false,"ratio":0.25,"missing":["long","short","previous"],"total":4,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Produce a response that uses as many examples as possible in a concise manner.

# Context
None specified.

# Constraints
None specified.

# Output format
List of examples with decreasing length.

# Assumptions
(assumption): Each example is related to the topic at hand, but its exact nature is unknown.

# Open questions
- What is the topic at hand?
```
</details>

### stress-one-word
- failed checks: content_coverage {"passed":false,"ratio":0,"missing":["lisbon"],"total":1,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Produce a response in the chat assistant.

# Context
None specified.

# Constraints
None specified.

# Output format
None specified.

# Assumptions
(assumption) The response should be brief and concise, similar to a short answer or a location-based query.

# Open questions
- What type of information is expected about Lisbon?
```
</details>

### stress-negation
- failed checks: span_retention {"passed":false,"total":1,"kept":0,"missing":[{"span":"40%","kind":"number"}],"exempt":[{"span":"12%","kind":"number","negated":true}]}
- judge: passed

<details><summary>output</summary>

```
# Task
Write a blog post about our Q3 results.

# Context
None specified.

# Constraints
- Exclusions: mention of churn

# Output format
Format as markdown.

# Assumptions
- Tone: neutral (assumption)
- Length: unspecified (assumption)

# Open questions
- Audience and background
```
</details>

### stress-number-noun
- failed checks: none
- judge: passed

<details><summary>output</summary>

```
PIPELINE ERROR: The operation was aborted due to timeout
```
</details>

### stress-accented-names
- failed checks: none
- judge: passed

<details><summary>output</summary>

```
PIPELINE ERROR: The operation was aborted due to timeout
```
</details>

### stress-fr-negation
- failed checks: structure {"passed":false,"missing":["Output format"]}
- judge: passed

<details><summary>output</summary>

```
# Task
Résumé de la mission pour Hubert

# Context
Aucune information sur l'audience ou le background est fournie.

# Constraints
- Exclusions : mentionner le prix de 600 EUR

# Assumptions
- Longueur: non spécifiée (assumption)
- Ton à utiliser : formel
```
</details>

### stress-pt-negation
- failed checks: content_coverage {"passed":false,"ratio":0.4,"missing":["mencionar","valor","para"],"total":5,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Resumir informações sobre o Hubert

# Context
Audiência e background não estão especificados

# Constraints
Tono neutro, nenhuma exclusão

# Output format
Resumo em uma frase ou duas frases

# Assumptions
(assumption): O resumo deve ser conciso e informativo.

# Open questions
Valor de 600 EUR do Hubert
```
</details>

### stress-long-unbroken
- failed checks: content_coverage {"passed":false,"ratio":0,"missing":["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],"total":1,"threshold":0.85,"advisory":true}
- judge: passed

<details><summary>output</summary>

```
# Task
Produce a response to the input.

# Context
None specified.

# Constraints
None specified.

# Output format
Reply in full sentences.

# Assumptions
None.

# Open questions
- What is the nature of the input that will be provided?
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
- verdicts: checked = every check clean, no judge ran; verified = same with a
  judge that voted; review = literals clean but a soft
  signal fired; failed = a blocking deterministic check fired.
