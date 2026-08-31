# Refinr provider spike

This isolated Vite/React spike reuses `@assistant-ui/react`'s runtime and thread primitives, while keeping the existing zero-dependency Refinr app untouched.

Run it with the local model backend:

```bash
OPTIMIZER_MODEL=llama3.2:3b node ../server.mjs
npm run dev
```

Open `http://localhost:5174`. Enter a rough prompt, choose the first model-generated answer, and verify that the next question is generated from the full transcript. The browser calls `POST /api/refine/question`; the final optimization kernel remains `lib/pipeline.mjs` and is intentionally not migrated in this spike.

Backend-first checks:

```bash
npm run test:e2e                 # deterministic heuristic contract test
E2E_LIVE=1 npm run test:e2e      # real Ollama question + optimization path
npm test                         # unit contract tests
npm run build                    # provider UI build
```
