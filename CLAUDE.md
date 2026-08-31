# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Intact** turns a rough prompt into a structured, executable one **without changing what the user means** — and proves it. The verification is the product, not a feature bolted onto a rewriter. Every optimization returns the rewritten prompt *plus* a fidelity report, and anything not traceable to the source becomes an explicit open question or a tagged `(assumption)` rather than a silent invention.

Zero dependencies (`node:` stdlib only, Node 18+). No API keys, no cloud inference. LLM synthesis runs against a local Ollama; when Ollama is absent the pipeline degrades to a deterministic engine instead of failing.

## Commands

```bash
npm start                  # server on :8787, binds 0.0.0.0 (LAN-reachable by design)
npm test                   # 15 deterministic unit tests, no LLM needed
npm run eval               # 10 fixtures through the real pipeline -> eval/EVIDENCE.md (needs Ollama, minutes)
npm run eval:heuristic     # same fixtures, deterministic engine -> eval/EVIDENCE-heuristic.md (seconds)
node eval/adversarial.mjs  # negative controls -> eval/EVIDENCE-adversarial.md (exits 1 if any control is missed)
```

Run one test by name:

```bash
node --test --test-name-pattern "contentCoverage catches" test/unit.test.mjs
```

`eval/adversarial.mjs` has no npm script yet; invoke it directly.

Environment: `OPTIMIZER_MODEL`, `OLLAMA_URL` (default `http://localhost:11434`), `OPTIMIZER_FORCE_HEURISTIC=1` (skip the Ollama probe entirely).

**Always set `OPTIMIZER_MODEL` for LLM mode.** `DEFAULT_MODEL` in `lib/ollama.mjs` is `llama3.1:8b`, and that manifest returns `"does not support chat"` on current Ollama — so the built-in default does not work. `qwen2.5-coder:7b` fails the same way; `llama3.2:3b` and `gemma2:2b` work. Every verified run used:

```bash
ollama serve
OPTIMIZER_MODEL=llama3.2:3b node server.mjs
```

Changing that default to a model that works is a known open fix (deliberately not bundled into the docs change that introduced this file).

## Architecture

`extract -> synthesize -> verify -> repair`, orchestrated by `lib/pipeline.mjs`, which is the only file that decides a verdict.

- `lib/extract.mjs` — **ground truth.** Pulls "protected spans" (numbers, URLs, paths, code identifiers, quoted phrases, proper nouns) that must survive verbatim. No LLM involved. If a class of detail isn't extracted here, no downstream check can protect it.
- `lib/verify.mjs` — the checks, each returning `{name, passed, ...detail}`.
- `lib/heuristic.mjs` — the deterministic engine. It only *rearranges the user's own sentences* into buckets, so it cannot invent content; that property is why it is a safe fallback rather than a degraded guess.
- `lib/templates.mjs` — per-target section contracts (`claude-code`, `chat`, `api`, `image`).
- `lib/ollama.mjs` — local chat client, one retry, 240s timeout.
- `server.mjs` (local) and `api/*.mjs` (Vercel serverless) are thin transports over the same `optimize()`.

### The verdict model — the part most likely to be broken by accident

Checks are either **blocking** or **advisory** (`advisory: true`). Three levels:

- `verified` — every check clean and the judge agrees.
- `review` — blocking checks clean, but an advisory check or the LLM judge flagged something.
- `failed` — a blocking check fired.

**An advisory check can never produce `failed`, and the LLM judge can never turn a blocking failure green.** The judge is a small local model and is noisy; it exists only to escalate to `review`. The deterministic checks are the actual guarantee. Preserve this asymmetry — it is the whole trust model.

`content_coverage` is advisory (heuristic proxy, English-only, threshold 0.85 calibrated against measured data — not guessed). `structure` is additionally marked advisory in heuristic mode, because that engine only emits a section when the source has content for it.

### Repair is best-of-two, not blind retry

On failure the pipeline asks for one repair round naming only the violations, then **keeps whichever draft violates less** (blocking failures weighted 3x, advisory 1x, judge 1x). A repair can regress by dropping spans it wasn't asked about, so never replace this with an unconditional overwrite of the first draft.

## If you add or change a fidelity check

Add a matching negative control to `eval/adversarial.mjs`. A check that never fires is indistinguishable from one that works — the suite exists to prove each check catches real corruption while a faithful control still passes clean. Adding a check without a control silently weakens the product's only real claim.

Watch for vacuous-passing generally: when narrowing a check to kill a false positive, confirm it still fires on the case it was built for.

## Deployment

Production is https://intact-prompt-optimizer.vercel.app (Vercel project `simonsanglas-projects/intact-prompt-optimizer`, private repo `simonsangla/prompt-optimizer-v2`).

**Production runs the deterministic engine only** — Vercel cannot host Ollama. The UI states which engine is live; keep that honest if you touch it.

Two deploy facts learned the hard way:

- `OPTIMIZER_FORCE_HEURISTIC=1` must exist as a **Vercel project environment variable**. Setting it in `vercel.json` alone did *not* survive a promote rebuild, leaving the function probing a dead Ollama on every request.
- `vercel promote` **rebuilds** rather than re-pointing at the artifact you validated, so re-verify after promoting.

After any production deploy, check `/api/health` returns `"forced": true`, then exercise `/api/optimize` — a 200 on the root page proves nothing about the pipeline.

## Evidence files

`eval/EVIDENCE.md` (LLM mode), `EVIDENCE-heuristic.md`, `EVIDENCE-adversarial.md`, plus `EVIDENCE-run1.md` / `EVIDENCE-run3.md` kept as historical comparison points. These are generated; treat them as output, not as documents to hand-edit.

`eval/adversarial.mjs` rewrites its own timestamp on every run, so that file shows as modified after each invocation even when nothing changed.

## Known inconsistency

In `lib/pipeline.mjs`, the heuristic branch computes `passed`/`level` by filtering on the check *name* (`c.name !== 'structure'`) rather than on the `advisory` flag it just set. A failing advisory `content_coverage` would therefore read as `failed` in heuristic mode, where the LLM branch would call it `review`. Practically unreachable today (the heuristic reuses source wording, so coverage sits at ~1.0), but fix it by filtering on `advisory` if you touch that branch.

## Governance

Work on this repo is tracked in Simon's mission-os: see simonsangla/mission-os#617 for the build record, evidence, and the open decision about how this relates to the existing `prompt-optimizer-plugin` product line.
