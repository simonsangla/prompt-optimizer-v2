import { QUESTION_COUNT } from './state.js';
import { canApply } from './validation.js';

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
}
