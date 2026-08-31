export function recordAnswer(state, button) {
  const [key, value] = button.dataset.fact.split('|');
  state.facts.splice(0, state.facts.length, ...state.facts.filter(([existing]) => existing !== key), [key, value]);
  return key;
}

export function nextQuestion(key) {
  return key === 'Primary action' ? 'question2' : key === 'Visual direction' ? 'question3' : null;
}

export function deriveSourceFacts(prompt) {
  return /\breact\b/i.test(prompt) ? [['Original constraint', 'Do not use React']] : [];
}
