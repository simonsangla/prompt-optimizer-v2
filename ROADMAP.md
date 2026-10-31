# Roadmap

Planned work on Intact, roughly in priority order. Each item is sized so it can be picked up independently.

## Correctness and trust
- [ ] Fix `DEFAULT_MODEL` in `lib/ollama.mjs` (`llama3.1:8b` returns "does not support chat" on current Ollama) and detect an installed, chat-capable model at startup.
- [ ] Add an `npm run eval:adversarial` script (currently invoked as `node eval/adversarial.mjs`).
- [ ] Extend `content_coverage` beyond English (currently an English-only proxy).
- [ ] Add negative controls for any new check, per the rule in `CLAUDE.md`.
- [ ] Grow `eval/stress.mjs` with each real prompt that breaks extraction.

## Product
- [ ] Per-target templates beyond `claude-code`, `chat`, `api`, `image` (e.g. agent/system-prompt target).
- [ ] Show the fidelity report diff inline in the web UI (kept / flagged / open question).
- [ ] Shell and editor integrations built on `bin/optimize.mjs` (exit codes 0/1/2/3 already defined).
- [ ] Surface which engine (LLM or deterministic) produced a result in every transport.

## Quality and docs
- [ ] Unit tests for `server.mjs` and `api/*.mjs` transports.
- [ ] CI workflow running `npm test`, `node eval/adversarial.mjs` and `npm run eval:stress`.
- [ ] Contributor guide and a short architecture diagram in `docs/`.
- [ ] Confirm all fixtures in `eval/fixtures.json` use made-up data only.
