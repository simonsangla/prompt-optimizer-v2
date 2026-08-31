export const QUESTION_COUNT = 3;

export function createState() {
    return { facts: [], sourceFacts: [], rawPrompt: '', started: false, applied: false, optimizing: false, optimization: null, optimizationError: '' };
}

export function resetState(state) {
  state.facts.length = 0;
  state.sourceFacts.length = 0;
  state.rawPrompt = '';
  state.started = false;
  state.applied = false;
  state.optimizing = false;
  state.optimization = null;
  state.optimizationError = '';
}
