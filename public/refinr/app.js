import { createState, resetState } from './state.js';
import { deriveSourceFacts, recordAnswer, nextQuestion } from './questions.js';
import { clearChecks } from './validation.js';
import { wireNavigation } from './navigation.js';
import { wireDrawer } from './drawer.js';
import { render } from './render.js';

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
  ['question2', 'question3', 'result'].forEach((id) => { $(id).hidden = true; });
  render(root, state);
}

$('start').addEventListener('click', () => {
  const raw = $('roughPrompt').value.trim();
  if (raw) root.querySelector('.message.user .bubble p').textContent = raw;
  state.sourceFacts = deriveSourceFacts(raw);
  state.started = true;
  $('empty').hidden = true;
  $('conversation').hidden = false;
  ['question2', 'question3', 'result'].forEach((id) => { $(id).hidden = true; });
  render(root, state);
});

root.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => {
  const card = button.closest('.message');
  card.querySelectorAll('.option').forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
  button.setAttribute('aria-pressed', 'true');
  const key = recordAnswer(state, button);
  const next = nextQuestion(key);
  if (next) $(next).hidden = false;
  else $('result').hidden = false;
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

wireNavigation(root, { reset, showResearch: () => { $('stage').textContent = 'Research summary · draft not started'; } });
wireDrawer(root);
render(root, state);
