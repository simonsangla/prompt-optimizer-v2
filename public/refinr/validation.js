const CHECKS = ['intentCheck', 'constraintCheck', 'openCheck'];

export function canApply(root, state) {
  return state.facts.length > 0 && CHECKS.every((id) => root.getElementById(id).checked);
}

export function clearChecks(root) {
  CHECKS.forEach((id) => { root.getElementById(id).checked = false; });
}
