// Thin client for the local Ollama server. No API keys, nothing leaves the machine.
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
export const DEFAULT_MODEL = process.env.OPTIMIZER_MODEL || 'llama3.1:8b';

export async function ollamaHealth() {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ollama: false, models: [], defaultModel: DEFAULT_MODEL };
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name).filter((n) => !n.includes('cloud'));
    return { ollama: true, models, defaultModel: DEFAULT_MODEL };
  } catch {
    return { ollama: false, models: [], defaultModel: DEFAULT_MODEL };
  }
}

// Single non-streaming chat call. jsonMode forces valid-JSON output.
export async function chat(messages, { model = DEFAULT_MODEL, jsonMode = false, timeoutMs = 120000 } = {}) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(jsonMode ? { format: 'json' } : {}),
      options: { temperature: 0.2, num_predict: 1500 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? '';
}
