export function wireDrawer(root) {
  const inspector = root.querySelector('.inspector');
  const toggle = root.getElementById('reviewToggle');
  const close = root.createElement('button');
  close.className = 'review-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close review');
  close.textContent = '×';
  inspector.id = 'inspector';
  inspector.setAttribute('aria-label', 'Human validation');
  inspector.prepend(close);
  const setOpen = (open) => {
    inspector.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    (open ? close : toggle).focus();
  };
  toggle.addEventListener('click', () => setOpen(!inspector.classList.contains('open')));
  close.addEventListener('click', () => setOpen(false));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && inspector.classList.contains('open')) setOpen(false);
  });
  return { setOpen };
}
