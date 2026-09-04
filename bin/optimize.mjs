#!/usr/bin/env node
// Shell entrypoint for the kernel (surface 1, mission-os#617).
//
// Why this exists rather than reusing a transport: server.mjs needs a daemon
// listening on a port, and api/optimize.mjs is a Vercel handler that expects a
// (req, res) pair. Neither can be called from a shell one line without either
// starting a background server or shimming a fake response object. This reads
// stdin, calls optimize() unchanged, and prints - so every shell-reachable
// surface (a Claude Code skill, a Shortcut over ssh, a macOS Quick Action)
// shares one code path with the HTTP transports.
//
//   echo "rough prompt" | node bin/optimize.mjs --target claude-code
//   node bin/optimize.mjs --json < prompt.txt
//
// Exit codes: 0 checked/verified, 1 review, 2 failed, 3 usage or budget error.
import { readFile } from 'node:fs/promises';
import { optimize, InputTooLarge } from '../lib/pipeline.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

if (has('help')) {
  console.log(`optimize - restructure a prompt without changing what it means

  echo "<prompt>" | optimize [--target chat|claude-code|api|image]
                             [--context <text>] [--context-file <path>]
                             [--model <ollama model>] [--judge off|advisory|blocking]
                             [--json] [--quiet]

Exit: 0 checked, 1 review, 2 failed, 3 usage/budget error.
Without a local Ollama it falls back to the deterministic engine, which
restructures your own sentences and never rephrases.`);
  process.exit(0);
}

const readStdin = async () => {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const input = (flag('input') ?? (await readStdin())).trim();
if (!input) {
  console.error('optimize: no prompt on stdin. Try: echo "your prompt" | optimize   (--help for options)');
  process.exit(3);
}

const contextFile = flag('context-file');
const context = contextFile ? await readFile(contextFile, 'utf8') : (flag('context') ?? '');

let result;
try {
  result = await optimize(input, {
    target: flag('target', 'chat'),
    context,
    ...(flag('model') ? { model: flag('model') } : {}),
    ...(flag('judge') ? { judge: flag('judge') } : {}),
  });
} catch (err) {
  if (err instanceof InputTooLarge) { console.error(`optimize: ${err.message}`); process.exit(3); }
  console.error(`optimize: ${err.message || err}`);
  process.exit(3);
}

const { level } = result.fidelity;
if (has('json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.optimized);
  if (!has('quiet')) {
    const failing = result.fidelity.checks.filter((c) => !c.passed);
    const exempt = result.fidelity.checks.find((c) => c.name === 'span_retention')?.exempt ?? [];
    const engine = result.mode === 'llm' ? `${result.model}` : 'deterministic engine (no model available)';
    console.error(`\n--- ${level.toUpperCase()} - ${engine}${result.repaired ? ', one repair round' : ''}`);
    for (const c of failing) console.error(`    ${c.advisory ? 'advisory' : 'FAILED  '}  ${c.name}${c.missing?.length ? ': ' + c.missing.map((m) => m.span).join(', ') : ''}${c.flagged?.length ? ': ' + c.flagged.map((f) => f.key).join(', ') : ''}`);
    if (exempt.length) console.error(`    exempt (you asked not to mention): ${exempt.map((s) => s.span).join(', ')}`);
    if (result.openQuestions?.length) console.error(`    open questions: ${result.openQuestions.length}`);
  }
}
process.exit(level === 'failed' ? 2 : level === 'review' ? 1 : 0);
