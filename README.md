# Intact - Prompt Optimizer v2

Transforms a rough intent into a clear, context-aware, executable prompt **without changing what you mean** - and proves it.

The differentiator over every previous generation of this concept (prompt-optimizer plugin, Refinr, PromptForge, Prompt Contract) is the **fidelity guarantee**: the optimized prompt is verified against the source, and the verification evidence is shown next to the result.

## How it works

```
rough prompt
   |
   v
extract   - deterministic: protected spans (numbers, URLs, paths, code
            identifiers, quoted phrases) that must survive verbatim
   |
   v
synthesize - local LLM (Ollama) restructures into the target's template;
             gaps become Open questions, inferences are tagged (assumption)
   |
   v
verify    - deterministic: span retention, no-invention (numbers/URLs),
            structure, language match
          - LLM judge prompted to REFUTE: added / dropped / altered meaning
   |
   v
repair    - one automatic round fixing ONLY the named violations, re-verified
   |
   v
optimized prompt + fidelity report (PASS/FAIL per check)
```

If Ollama is offline the pipeline degrades to a deterministic heuristic that only
rearranges source sentences - meaning-safe by construction.

## Who it's for

Anyone who writes rough prompts for coding agents, chat assistants or APIs and wants a structured version they can trust: every rewrite ships with a fidelity report showing what was kept, flagged or left as an open question. Built with plain Node.js (stdlib only, no dependencies).

## Scope

Intact is a text-processing tool for prompts. It does not train, fine-tune, serve or benchmark models; the `eval/` folder holds regression fixtures that test this tool's own checks, not model quality.

## Roadmap and license

See [ROADMAP.md](ROADMAP.md). Released under the [MIT License](LICENSE).

## Repo

https://github.com/simonsangla/prompt-optimizer-v2

## Live deployment

- Production: https://intact-prompt-optimizer.vercel.app
- Vercel has no Ollama, so the deployed build runs the deterministic engine:
  it restructures your own sentences and runs every fidelity check, but does
  not rephrase. The UI states which engine is live. LLM synthesis is local-only.

## Run

```bash
ollama serve          # optional but recommended (local, free, private)
node server.mjs       # http://localhost:8787 (binds 0.0.0.0 for LAN)
```

Set the model with `OPTIMIZER_MODEL` (verified with `llama3.2:3b`; the built-in default `llama3.1:8b` is rejected by current Ollama, so always set it). No API keys, no cloud calls,
no dependencies (`node:` stdlib only, Node 18+).

## Evidence

```bash
node --test test/unit.test.mjs     # deterministic units (no LLM)
node eval/run-eval.mjs             # full pipeline over eval/fixtures.json -> eval/EVIDENCE.md
node eval/run-eval.mjs --heuristic # fallback-mode eval (no LLM needed)
```

## Design notes

See `docs/DESIGN.md` for product rationale and the lineage from the four prior
prototypes.
