export const QUESTION_COUNT = 3;

export function createState() {
  return { facts: [], sourceFacts: [], started: false, applied: false };
}

export function resetState(state) {
  state.facts.length = 0;
  state.sourceFacts.length = 0;
  state.started = false;
  state.applied = false;
}
