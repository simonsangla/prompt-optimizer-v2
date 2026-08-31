import { ollamaHealth } from '../lib/ollama.mjs';

export default async function handler(req, res) {
  const health = await ollamaHealth();
  res.status(200).json({ ok: true, ...health });
}
