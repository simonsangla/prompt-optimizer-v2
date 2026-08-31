import { createState, resetState } from './state.js';
import { deriveSourceFacts, recordAnswer, nextQuestion } from './questions.js';
import { clearChecks } from './validation.js';
import { wireNavigation } from './navigation.js';
import { wireDrawer } from './drawer.js';
import { render, setActiveQuestion } from './render.js';
import { optimizePrompt } from './optimizer.js';

const root = document;
const state = createState();
const $ = (id) => root.getElementById(id);

function reset() {
  resetState(state);
  clearChecks(root);
  $('empty').hidden = false;
  $('conversation').hidden = true;
  $('roughPrompt').value = '';
  $('apply').classList.remove('applied');
  $('apply').textContent = 'Apply confirmed answers';
  root.querySelectorAll('.option').forEach((button) => button.removeAttribute('aria-pressed'));
  root.querySelectorAll('.option').forEach((button) => { button.disabled = false; });
  setActiveQuestion(root, null);
  $('result').hidden = true;
  render(root, state);
}

$('start').addEventListener('click', () => {
  const raw = $('roughPrompt').value.trim();
  if (raw) root.querySelector('.message.user .bubble p').textContent = raw;
  state.sourceFacts = deriveSourceFacts(raw);
  state.started = true;
  state.optimizing = true;
  state.optimizationError = '';
  $('empty').hidden = true;
  $('conversation').hidden = false;
  setActiveQuestion(root, 'question1');
  $('result').hidden = true;
  render(root, state);
  optimizePrompt(raw).then((result) => {
    state.optimization = result;
    state.optimizing = false;
    render(root, state);
  }).catch((error) => {
    state.optimization = null;
    state.optimizing = false;
    state.optimizationError = error.message;
    render(root, state);
  });
});

root.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => {
  const card = button.closest('.message');
  card.querySelectorAll('.option').forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
  button.setAttribute('aria-pressed', 'true');
  card.querySelectorAll('.option').forEach((choice) => { choice.disabled = true; });
  const key = recordAnswer(state, button);
  const next = nextQuestion(key);
  if (next) setActiveQuestion(root, next);
  else {
    setActiveQuestion(root, null);
    $('result').hidden = false;
  }
  card.querySelector('.question-card').style.opacity = '.72';
  state.applied = false;
  $('apply').classList.remove('applied');
  render(root, state);
}));

['intentCheck', 'constraintCheck', 'openCheck'].forEach((id) => $(id).addEventListener('change', () => render(root, state)));
$('apply').addEventListener('click', () => {
  if ($('apply').disabled) return;
  state.applied = true;
  $('result').hidden = false;
  $('resultText').textContent = 'Applied in demo: confirmed choices are now the optimizer source material. Next screen would show the verified structured prompt and diff.';
  $('apply').textContent = 'Applied · open verified result';
  $('apply').classList.add('applied');
  $('stage').textContent = 'Confirmed source material applied · verification next';
});

const drawer = wireDrawer(root);
const originalReset = reset;
// Keep reset reusable while ensuring an open mobile review never survives into
// a new prompt session.
function resetAndCloseReview() { drawer.setOpen(false); originalReset(); }
// Navigation is wired after the drawer so reset can close the review surface.
wireNavigation(root, { reset: resetAndCloseReview, showResearch: () => { $('stage').textContent = 'Research summary · draft not started'; } });
render(root, state);
