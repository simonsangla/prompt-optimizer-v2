// Deterministic fallback optimizer. Used when Ollama is unavailable.
// It only REARRANGES sentences from the source into a structure - it cannot
// invent content, so it is meaning-safe by construction.
import { TARGETS } from './templates.mjs';

const CONSTRAINT_CUES = /\b(must|must not|should|shouldn't|don't|do not|avoid|never|only|always|at most|at least|no more than|without|except|keep|limit)\b/i;
const OUTPUT_CUES = /\b(format|return|output|respond|as a (list|table)|in (json|markdown|yaml|csv)|bullet|one[- ]pager|report|summary of)\b/i;
const CONTEXT_CUES = /\b(we|our|i have|i'm|i am|currently|existing|using|based on|background|my team|the app|the site|legacy)\b/i;

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function heuristicOptimize(input, { target = 'chat', context = '' } = {}) {
  const profile = TARGETS[target] || TARGETS.chat;
  const buckets = { goal: [], context: [], constraints: [], output: [] };

  for (const s of sentences(input)) {
    if (CONSTRAINT_CUES.test(s)) buckets.constraints.push(s);
    else if (OUTPUT_CUES.test(s)) buckets.output.push(s);
    else if (CONTEXT_CUES.test(s)) buckets.context.push(s);
    else buckets.goal.push(s);
  }
  if (context) buckets.context.push(context);

  const openQuestions = [];
  if (buckets.output.length === 0) openQuestions.push('What output format do you expect (list, table, code, prose, length)?');
  if (buckets.context.length === 0) openQuestions.push('Is there existing context (codebase, audience, prior work) the assistant should know about?');
  if (buckets.constraints.length === 0) openQuestions.push('Any hard constraints (things to avoid, limits, style rules)?');

  const lines = [];
  lines.push(`# ${profile.sections[0]}`);
  lines.push(buckets.goal.join(' ') || input);
  if (buckets.context.length) {
    lines.push('', '# Context');
    for (const c of buckets.context) lines.push(`- ${c}`);
  }
  if (buckets.constraints.length) {
    lines.push('', '# Constraints');
    for (const c of buckets.constraints) lines.push(`- ${c}`);
  }
  if (buckets.output.length) {
    lines.push('', '# Output format');
    for (const o of buckets.output) lines.push(`- ${o}`);
  }
  if (openQuestions.length) {
    lines.push('', '# Open questions');
    for (const q of openQuestions) lines.push(`- ${q}`);
  }

  return {
    optimized: lines.join('\n'),
    assumptions: [],
    openQuestions,
    mode: 'heuristic',
  };
}
