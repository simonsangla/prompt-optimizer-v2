export async function optimizePrompt(input, target = 'chat') {
  const health = await fetch('/api/health').then((response) => response.ok ? response.json() : null).catch(() => null);
  const preferred = health?.models?.find((model) => model === 'llama3.2:3b');
  const response = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input, target, ...(preferred ? { model: preferred } : {}) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || `Optimizer request failed (${response.status})`);
  return payload;
}
