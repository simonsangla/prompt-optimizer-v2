// Intact - Prompt Optimizer v2. Zero-dependency Node server.
// Serves the UI from public/ and exposes the optimization pipeline.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { optimize } from './lib/pipeline.mjs';
import { ollamaHealth } from './lib/ollama.mjs';
import { askRefinementQuestion } from './lib/questioner.mjs';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = new URL('./public/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function json(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data);
}

async function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/health') {
      const health = await ollamaHealth();
      return json(res, 200, { ok: true, ...health });
    }

    if (url.pathname === '/api/optimize' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'invalid JSON body' }); }
      const input = String(body.input || '').trim();
      if (!input) return json(res, 400, { error: 'input is required' });
      if (input.length > 20000) return json(res, 400, { error: 'input too long (20k char max)' });
      const started = Date.now();
      const result = await optimize(input, {
        target: String(body.target || 'chat'),
        context: String(body.context || '').trim(),
        model: body.model ? String(body.model) : undefined,
      });
      result.elapsedMs = Date.now() - started;
      return json(res, 200, result);
    }

    if (url.pathname === '/api/refine/question' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'invalid JSON body' }); }
      const prompt = String(body.prompt || '').trim();
      if (!prompt) return json(res, 400, { error: 'prompt is required' });
      if (prompt.length > 20000) return json(res, 400, { error: 'prompt too long (20k char max)' });
      const turns = body.turns || [];
      if (!Array.isArray(turns) || turns.length > 12) return json(res, 400, { error: 'turns must be an array of at most 12 items' });
      const result = await askRefinementQuestion(prompt, turns, { maxQuestions: Number(body.maxQuestions || 3) });
      return json(res, 200, result);
    }

    if (url.pathname === '/api/refine/optimize' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'invalid JSON body' }); }
      const prompt = String(body.prompt || '').trim();
      const turns = body.turns || [];
      if (!prompt) return json(res, 400, { error: 'prompt is required' });
      if (!Array.isArray(turns) || turns.length > 12) return json(res, 400, { error: 'turns must be an array of at most 12 items' });
      const transcript = turns.map((turn) => `${turn.role === 'user' ? 'User answer' : 'Refinr question'}: ${String(turn.text || '').trim()}`).join('\n');
      const started = Date.now();
      const result = await optimize(prompt, {
        target: String(body.target || 'chat'),
        context: transcript ? `Confirmed conversation answers:\n${transcript}` : '',
        model: body.model ? String(body.model) : undefined,
      });
      result.elapsedMs = Date.now() - started;
      result.inputChars = prompt.length + transcript.length;
      return json(res, 200, result);
    }

    // static files
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    path = normalize(path).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      return res.end(data);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
  } catch (err) {
    return json(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Intact (Prompt Optimizer v2) listening on http://localhost:${PORT} (bound ${HOST})`);
});
