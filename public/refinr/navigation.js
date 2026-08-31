export function wireNavigation(root, { reset, showResearch }) {
  root.getElementById('newPrompt').addEventListener('click', reset);
  root.querySelectorAll('.thread').forEach((item, index) => {
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    const activate = index === 0 ? reset : showResearch;
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
  });
}
