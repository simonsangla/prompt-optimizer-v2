// Vercel serverless entry. Same pipeline as the local server.
// On Vercel there is no Ollama reachable, so OPTIMIZER_FORCE_HEURISTIC=1 keeps
// the deterministic engine and skips a pointless 2s probe on every request.
import { optimize } from '../lib/pipeline.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const input = String(body.input || '').trim();
    if (!input) { res.status(400).json({ error: 'input is required' }); return; }
    if (input.length > 20000) { res.status(400).json({ error: 'input too long (20k char max)' }); return; }
    const started = Date.now();
    const result = await optimize(input, {
      target: String(body.target || 'chat'),
      context: String(body.context || '').trim(),
      ...(body.judge ? { judge: String(body.judge) } : {}),
    });
    result.elapsedMs = Date.now() - started;
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message || err) });
  }
}
