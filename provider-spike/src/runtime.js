export class RefinrRuntime {
  async ask(prompt, turns) {
    const response = await fetch('/api/refine/question', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, turns, maxQuestions: 3 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) throw new Error(payload.error || `Question request failed (${response.status})`);
    return payload.done ? null : payload.question;
  }
}
