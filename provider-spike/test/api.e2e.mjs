import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
let server;
const liveModel = process.env.E2E_LIVE === '1';

async function request(path, options) {
  return fetch(`${BASE}${path}`, options);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await request('/api/health');
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('server did not become ready');
}

function jsonPost(path, body) {
  return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('backend adaptive question flow and optimizer contract', async (t) => {
  server = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), OPTIMIZER_MODEL: process.env.OPTIMIZER_MODEL || 'llama3.2:3b', ...(liveModel ? {} : { OPTIMIZER_FORCE_HEURISTIC: '1' }) },
    stdio: 'ignore',
  });
  t.after(() => server.kill('SIGTERM'));
  await waitForServer();

  const health = await (await request('/api/health')).json();
  if (!liveModel) assert.equal(health.forced, true);
  if (liveModel) assert.equal(health.ollama, true);

  const invalid = await jsonPost('/api/refine/question', { prompt: '', turns: [] });
  assert.equal(invalid.status, 400);

  const prompt = 'Write a short welcome for a bakery.';
  const first = await (await jsonPost('/api/refine/question', { prompt, turns: [], maxQuestions: 3 })).json();
  assert.equal(first.done, false);
  assert.ok(first.question.id);
  assert.ok(first.question.text);

  const turns = [
    { role: 'assistant', type: 'question', id: first.question.id, text: first.question.text },
    { role: 'user', type: 'answer', text: 'First-time visitors' },
  ];
  const second = await (await jsonPost('/api/refine/question', { prompt, turns, maxQuestions: 3 })).json();
  assert.equal(second.done, false);
  assert.notEqual(second.question.id, first.question.id);

  const limited = await (await jsonPost('/api/refine/question', { prompt, turns, maxQuestions: 1 })).json();
  assert.equal(limited.done, true);

  const optimizedResponse = await jsonPost('/api/refine/optimize', { prompt, turns: [...turns, { role: 'assistant', type: 'question', id: second.question.id, text: second.question.text }, { role: 'user', type: 'answer', text: 'One short paragraph' }] });
  assert.equal(optimizedResponse.status, 200);
  const optimized = await optimizedResponse.json();
  assert.equal(typeof optimized.optimized, 'string');
  assert.ok(optimized.optimized.includes('# Task'));
  assert.ok(optimized.fidelity);
  assert.equal(typeof optimized.elapsedMs, 'number');
  assert.equal(typeof optimized.inputChars, 'number');
  const response = await request('/api/refine/question', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
});
