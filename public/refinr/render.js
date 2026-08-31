import { QUESTION_COUNT } from './state.js';
import { canApply } from './validation.js';

export function setActiveQuestion(root, activeId) {
  ['question1', 'question2', 'question3'].forEach((id) => {
    const question = root.getElementById(id);
    if (!question) return;
    const active = id === activeId;
    question.hidden = !active;
    question.setAttribute('aria-hidden', String(!active));
  });
}

export function render(root, state) {
  const count = state.facts.length;
  root.getElementById('status').textContent = `${count} confirmed · ${QUESTION_COUNT - count} open`;
  root.getElementById('mobileStatus').textContent = `${count} of ${QUESTION_COUNT} confirmed`;
  root.getElementById('stage').textContent = count < QUESTION_COUNT ? `Question ${count + 1} of ${QUESTION_COUNT} · confirmation required` : 'Ready for human review';
  root.getElementById('facts').innerHTML = state.sourceFacts.map(([key, value]) => `<div class="fact"><b>${key}</b><span>${value}</span></div>`).join('') + state.facts.map(([key, value]) => `<div class="fact"><b>${key}</b><span>${value}</span></div>`).join('') || '<div class="fact"><b>No source constraints detected</b><span>Nothing is added without confirmation.</span></div>';
  const primary = state.facts.find(([key]) => key === 'Primary action');
  const visual = state.facts.find(([key]) => key === 'Visual direction');
  root.getElementById('diff').innerHTML = `The primary action is ${primary ? `<span class="add">${primary[1]}</span>` : '<span class="add">not set yet</span>'}. Visual direction is ${visual && visual[1] !== 'Keep it open' ? `<span class="add">${visual[1]}</span>` : '<span class="reject">left open</span>'}.`;
  root.getElementById('apply').disabled = !canApply(root, state);
  const result = root.getElementById('resultText');
  if (result) {
    if (state.optimizing) result.textContent = 'Running the local optimizer…';
    else if (state.optimizationError) result.textContent = `Optimizer unavailable: ${state.optimizationError}`;
    else if (state.optimization?.optimized) result.textContent = state.optimization.optimized;
    else result.textContent = 'Your confirmed choices are ready to apply.';
  }
  const fidelity = root.getElementById('fidelityEvidence');
  if (fidelity) {
    const data = state.optimization;
    fidelity.innerHTML = data ? `<b>${data.fidelity?.level || (data.fidelity?.passed ? 'verified' : 'review')}</b> · ${data.mode || 'local'}${data.model ? ` · ${data.model}` : ''}<br><span>${(data.fidelity?.checks || []).map((check) => `${check.passed ? 'PASS' : 'REVIEW'} ${check.name}`).join(' · ') || 'Fidelity checks returned with the optimization.'}</span>` : 'Waiting for local optimization evidence.';
  }
}
