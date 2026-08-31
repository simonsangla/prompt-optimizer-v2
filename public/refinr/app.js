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
  $('reply').value = '';
  $('composer').hidden = true;
  $('apply').classList.remove('applied');
  $('apply').textContent = 'Apply confirmed answers';
  root.querySelectorAll('.option').forEach((button) => button.removeAttribute('aria-pressed'));
  root.querySelectorAll('.option').forEach((button) => { button.disabled = false; });
  setActiveQuestion(root, null);
  $('result').hidden = true;
  render(root, state);
}

function runOptimization(raw) {
  state.rawPrompt = raw;
  state.sourceFacts = deriveSourceFacts(raw);
  state.started = true;
  state.optimizing = true;
  state.optimization = null;
  state.optimizationError = '';
  $('empty').hidden = true;
  $('conversation').hidden = false;
  $('composer').hidden = false;
  $('result').hidden = true;
  setActiveQuestion(root, 'question1');
  render(root, state);
  return optimizePrompt(raw).then((result) => {
    state.optimization = result;
    state.optimizing = false;
    $('result').hidden = false;
    render(root, state);
  }).catch((error) => {
    state.optimization = null;
    state.optimizing = false;
    state.optimizationError = error.message;
    $('result').hidden = false;
    render(root, state);
  });
}

$('start').addEventListener('click', () => {
  const raw = $('roughPrompt').value.trim();
  if (!raw) {
    $('roughPrompt').focus();
    return;
  }
  if (raw) root.querySelector('.message.user .bubble p').textContent = raw;
  runOptimization(raw);
});

$('send').addEventListener('click', () => {
  const raw = $('reply').value.trim();
  if (!raw || state.optimizing) return;
  state.facts.length = 0;
  clearChecks(root);
  state.applied = false;
  $('apply').classList.remove('applied');
  $('apply').textContent = 'Apply confirmed answers';
  root.querySelectorAll('.option').forEach((button) => {
    button.removeAttribute('aria-pressed');
    button.disabled = false;
  });
  root.querySelector('.message.user .bubble p').textContent = raw;
  $('reply').value = '';
  runOptimization(raw);
});

$('reply').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('send').click();
  }
});

// The plus control adds an explicit context prefix to the next message; it is
// deliberately functional so the composer never contains a decorative CTA.
$('contextAction').addEventListener('click', () => {
  const reply = $('reply');
  if (!reply.value.trim()) reply.value = 'Context: ';
  else if (!reply.value.trimStart().startsWith('Context:')) reply.value = `Context: ${reply.value}`;
  reply.focus();
  reply.setSelectionRange(reply.value.length, reply.value.length);
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
  const confirmed = state.facts.map(([key, value]) => `- ${key}: ${value}`).join('\n');
  state.optimizing = true;
  state.applied = false;
  $('result').hidden = false;
  $('stage').textContent = 'Applying confirmed source material · verifying result';
  render(root, state);
  optimizePrompt(`${state.rawPrompt}\n\nConfirmed source material:\n${confirmed}`).then((result) => {
    state.optimization = result;
    state.optimizing = false;
    state.applied = true;
    $('apply').textContent = 'Applied · verified result';
    $('apply').classList.add('applied');
    $('stage').textContent = 'Confirmed source material applied · verification complete';
    render(root, state);
  }).catch((error) => {
    state.optimizing = false;
    state.optimizationError = error.message;
    $('stage').textContent = 'Verification failed · review the optimizer error';
    render(root, state);
  });
});

const drawer = wireDrawer(root);
const originalReset = reset;
// Keep reset reusable while ensuring an open mobile review never survives into
// a new prompt session.
function resetAndCloseReview() { drawer.setOpen(false); originalReset(); }
// Navigation is wired after the drawer so reset can close the review surface.
wireNavigation(root, { reset: resetAndCloseReview, showResearch: () => { $('stage').textContent = 'Research summary · draft not started'; } });
render(root, state);
