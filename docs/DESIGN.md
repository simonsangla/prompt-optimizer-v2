# Intact - design rationale (2026-08-30)

## Goal

Transform rough intent into clear, context-aware, executable prompts without
changing what the user means, and deliver evidence of that fidelity.

## Lineage (research done against the local repos)

| Generation | What it contributed | What it lacked |
|---|---|---|
| prompt-optimizer (plugin) | One-shot rewrite into Goal/Context/Constraints/Output | No proof the rewrite kept the meaning |
| Refinr | Clarifying questions, readiness score, diff, local-first BYOK | Score measured completeness, not fidelity; needed a Groq key |
| PromptForge | Hosted variant (Firebase + Gemini) | Cloud dependency, same fidelity gap |
| Prompt Contract | Deterministic kernel, assumptions, verification criteria, offline | Deterministic-only; deferred model refinement entirely |

v2 keeps the best of each: local-first (Refinr), deterministic backbone
(Prompt Contract), structured rewrite (plugin) - and adds the missing piece:
**verified meaning preservation**.

## Core product decision

"Without changing what the user means" is not a prompt-engineering nicety, it is
the product. Therefore:

1. Anything not traceable to the source becomes an **Open question** or a tagged
   **(assumption)** - never a silent invention.
2. Fidelity is **checked, not claimed**: deterministic checks (span retention,
   no-invention, language match, structure) plus an LLM judge instructed to
   refute. The report ships with the result.
3. One bounded **repair round** fixes named violations; if checks still fail the
   result is delivered with a visible "review needed" verdict - honest reporting
   over silent retries.

## Architecture choices

- **Local Ollama, no keys.** Prior versions stalled on BYOK friction and a
  private Groq key rule. Local inference removes the credential problem and the
  privacy problem at once. Fallback heuristic keeps the tool useful offline.
- **Zero dependencies.** `node:` stdlib only. Nothing to install, nothing to
  audit, trivially portable.
- **Deterministic layer is the source of truth.** A 3B local judge is noisy;
  the deterministic checks cannot hallucinate. The judge can only escalate to
  "review needed", never overrule a deterministic pass into a silent pass.

## Session-learned findings (verified during the build)

- Old Ollama model manifests (llama3.1:8b, qwen2.5-coder:7b, pulled 7 months
  ago) return `does not support chat` on the current Ollama - only gemma2:2b
  worked until a fresh `llama3.2:3b` was pulled.
- Small local models translated an English prompt into French when the system
  prompt mentioned "French" as an example. Fixed by rewording the rule without
  naming any language AND adding a deterministic stopword-based language-match
  check plus a repair instruction. Evidence-over-judge in action: the failure
  mode is now caught mechanically.

## Deliberate exclusions (v2 prototype)

Auth, accounts, cloud sync, provider SDKs, streaming, history/versions,
clarifying-question interview loop (Refinr already proved that interaction;
this prototype proves fidelity), deployment.
