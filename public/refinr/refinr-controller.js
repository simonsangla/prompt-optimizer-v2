/**
 * Refinr prototype controller.
 * UI-only, dependency-free, and intentionally independent from the optimizer API.
 * The controller owns the workshop state; markup remains the reusable shell.
 */
const QUESTIONS = 3;

export function createRefinrController(root = document) {
  const state = { facts: [] };
  const $ = (id) => root.getElementById(id);
  const inspector = root.querySelector('.inspector');
  const toggle = $('reviewToggle');
  const close = root.createElement('button');
  close.className = 'review-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close review');
  close.textContent = '×';
  inspector.id = 'inspector';
  inspector.setAttribute('aria-label', 'Human validation');
  inspector.prepend(close);

  const setReviewOpen = (open) => {
    inspector.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) close.focus();
    else toggle.focus();
  };

  const reset = () => {
    state.facts.length = 0;
    $('empty').hidden = false;
    $('conversation').hidden = true;
    $('roughPrompt').value = '';
    $('apply').classList.remove('applied');
    $('apply').textContent = 'Apply confirmed answers';
    root.querySelectorAll('.option').forEach((button) => button.removeAttribute('aria-pressed'));
    $('question2').hidden = true;
    $('question3').hidden = true;
    $('result').hidden = true;
    setReviewOpen(false);
    update();
  };

  function update() {
    const count = state.facts.length;
    $('status').textContent = `${count} confirmed · ${QUESTIONS - count} open`;
    $('mobileStatus').textContent = `${count} of ${QUESTIONS} confirmed`;
    $('stage').textContent = count < QUESTIONS
      ? `Question ${count + 1} of ${QUESTIONS} · confirmation required`
      : 'Ready for human review';
    $('facts').innerHTML = '<div class="fact"><b>Original constraint</b><span>Do not use React</span></div>'
      + state.facts.map(([key, value]) => `<div class="fact"><b>${key}</b><span>${value}</span></div>`).join('');
    const primary = state.facts.find(([key]) => key === 'Primary action');
    const visual = state.facts.find(([key]) => key === 'Visual direction');
    $('diff').innerHTML = `The primary action is ${primary ? `<span class="add">${primary[1]}</span>` : '<span class="add">not set yet</span>'}. Visual direction is ${visual && visual[1] !== 'Keep it open' ? `<span class="add">${visual[1]}</span>` : '<span class="reject">left open</span>'}.`;
    $('apply').disabled = !(count > 0 && ['intentCheck', 'constraintCheck', 'openCheck'].every((id) => $(id).checked));
  }

  $('start').addEventListener('click', () => {
    const raw = $('roughPrompt').value.trim();
    if (raw) root.querySelector('.message.user .bubble p').textContent = raw;
    $('empty').hidden = true;
    $('conversation').hidden = false;
    $('question2').hidden = true;
    $('question3').hidden = true;
    $('result').hidden = true;
    update();
  });

  root.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('.message');
    card.querySelectorAll('.option').forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    const pair = button.dataset.fact.split('|');
    state.facts.splice(0, state.facts.length, ...state.facts.filter(([key]) => key !== pair[0]), pair);
    const next = card.id === 'question2' ? 'question3' : 'question2';
    if (card.id === 'question3') $('result').hidden = false;
    else $(next).hidden = false;
    card.querySelector('.question-card').style.opacity = '.72';
    $('apply').classList.remove('applied');
    update();
  }));

  ['intentCheck', 'constraintCheck', 'openCheck'].forEach((id) => $(id).addEventListener('change', update));
  $('apply').addEventListener('click', () => {
    if ($('apply').disabled) return;
    $('result').hidden = false;
    $('resultText').textContent = 'Applied in demo: confirmed choices are now the optimizer source material. Next screen would show the verified structured prompt and diff.';
    $('apply').textContent = 'Applied · open verified result';
    $('apply').classList.add('applied');
    $('stage').textContent = 'Confirmed source material applied · verification next';
  });

  $('newPrompt').addEventListener('click', reset);
  root.querySelectorAll('.thread').forEach((item, index) => {
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    const activate = index === 0 ? reset : () => { $('stage').textContent = 'Research summary · draft not started'; };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
  });
  toggle.addEventListener('click', () => setReviewOpen(!inspector.classList.contains('open')));
  close.addEventListener('click', () => setReviewOpen(false));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && inspector.classList.contains('open')) setReviewOpen(false);
  });
  update();
  return { reset, update, setReviewOpen, state };
}

createRefinrController();
