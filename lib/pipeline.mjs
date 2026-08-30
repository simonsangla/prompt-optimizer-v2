// The Intact pipeline: extract -> synthesize -> verify -> (repair once).
// Contract: the optimized prompt may only contain meaning traceable to the
// source (or the user-supplied context). Gaps become open questions or tagged
// assumptions - never silent inventions. Verification produces evidence.
import { chat, ollamaHealth, DEFAULT_MODEL } from './ollama.mjs';
import { protectedSpans } from './extract.mjs';
import { spanRetention, noInvention, structureCheck, languageMatch } from './verify.mjs';
import { heuristicOptimize } from './heuristic.mjs';
import { TARGETS } from './templates.mjs';

const SYNTH_SYSTEM = `You are a prompt optimizer. You restructure a rough prompt into a clear, executable one WITHOUT changing what the user means.

Hard rules:
1. Use ONLY information present in the source prompt (and the extra context block if given). Do not add facts, names, technologies, numbers, URLs, or requirements that are not there.
2. Preserve every specific detail verbatim: numbers, URLs, file paths, code identifiers, quoted phrases, product names.
3. If something important is missing, DO NOT guess. Put a question in the "Open questions" section instead.
4. If you must make a minor inference to keep the prompt coherent, tag it inline with "(assumption)" and also list it under "Assumptions".
5. Write the optimized prompt in the SAME language the source prompt is written in. Do not translate.
6. Output ONLY the optimized prompt in Markdown with the required section headings. No preamble, no commentary.`;

const JUDGE_SYSTEM = `You are a meaning-preservation auditor for prompt rewrites. A rewrite restructures a rough prompt into sections. Your job: check the rewrite says the SAME THING, no more, no less.

Rules:
- Formatting is NOT meaning: section headings (Goal, Context, Constraints, etc.), bullets, and rephrasing are fine and must never be reported.
- Content inside "Assumptions" and "Open questions" sections is exempt: it is explicitly labeled as not source-backed. Never report it.
- "added" = a concrete fact, requirement, number, or technology in the rewrite's main sections that the source never stated or implied.
- "dropped" = a concrete requirement from the source that appears NOWHERE in the rewrite.
- "altered" = a source requirement whose meaning changed (e.g. "under 100 words" became "under 1000 words").
- Report each item as a short phrase (under 12 words). Never quote whole sections or the whole source.

Example:
SOURCE: "write me a poem about lisbon, short, in english, mention the tram"
OPTIMIZED: "# Task\nWrite a short poem about Lisbon in English.\n# Constraints\n- Mention the tram.\n# Open questions\n- What tone do you prefer?"
Correct answer: {"verdict":"preserved","added":[],"dropped":[],"altered":[]}
(The headings and the open question are not additions. Nothing was dropped.)

Respond with JSON only: {"verdict":"preserved"|"altered","added":[],"dropped":[],"altered":[]}
"verdict" is "altered" ONLY if at least one array is non-empty.`;

function requiredSections(target) {
  return (TARGETS[target] || TARGETS.chat).sections;
}

function synthUserMessage(input, target, context) {
  const profile = TARGETS[target] || TARGETS.chat;
  return [
    `Target: ${profile.label}`,
    `Required section headings (use "# <name>" for each, in this order): ${profile.sections.join(', ')}. Add "# Assumptions" and "# Open questions" sections at the end when non-empty.`,
    `Section guidance: ${profile.guidance}`,
    context ? `\nExtra context provided by the user (treat as source material):\n${context}` : '',
    `\nSource prompt to optimize:\n---\n${input}\n---`,
  ].filter(Boolean).join('\n');
}

function parseSections(optimized) {
  const grab = (name) => {
    const m = optimized.match(new RegExp(`^#+\\s*${name}\\s*$([\\s\\S]*?)(?=^#+\\s|$(?![\\s\\S]))`, 'im'));
    if (!m) return [];
    return m[1].split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  };
  return { assumptions: grab('Assumptions'), openQuestions: grab('Open questions') };
}

async function yesNo(question, model) {
  try {
    const content = await chat(
      [{ role: 'user', content: `${question}\nAnswer with JSON only: {"answer": true} or {"answer": false}.` }],
      { model, jsonMode: true, timeoutMs: 60000 },
    );
    return JSON.parse(content).answer === true;
  } catch { return false; }
}

// Each flagged item gets a focused entailment re-check; small local models are
// far more reliable on one yes/no question than on open-ended diffing, so this
// kills most judge false positives while keeping real violations flagged.
async function refineJudge(raw, input, context, optimized, model) {
  const src = `SOURCE PROMPT:\n${input}${context ? `\n\nCONTEXT:\n${context}` : ''}`;
  const added = [];
  for (const item of raw.added.slice(0, 5)) {
    const supported = await yesNo(`${src}\n\nIs the following stated by, or a reasonable restatement of, the source prompt?\n"${item}"`, model);
    if (!supported) added.push(item);
  }
  const dropped = [];
  for (const item of raw.dropped.slice(0, 5)) {
    const covered = await yesNo(`REWRITTEN PROMPT:\n${optimized}\n\nDoes the rewritten prompt include or cover this requirement?\n"${item}"`, model);
    if (!covered) dropped.push(item);
  }
  const altered = [];
  for (const item of raw.altered.slice(0, 5)) {
    const consistent = await yesNo(`${src}\n\nREWRITTEN PROMPT:\n${optimized}\n\nRegarding "${item}": does the rewritten prompt keep the same meaning as the source on this point?`, model);
    if (!consistent) altered.push(item);
  }
  const passed = added.length === 0 && dropped.length === 0 && altered.length === 0;
  return { ...raw, added, dropped, altered, passed, verdict: passed ? 'preserved' : 'altered', rawFlags: raw.added.length + raw.dropped.length + raw.altered.length };
}

async function judge(input, context, optimized, model) {
  const content = await chat(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: `SOURCE:\n${input}\n${context ? `\nCONTEXT (also source material):\n${context}\n` : ''}\nOPTIMIZED:\n${optimized}` },
    ],
    { model, jsonMode: true },
  );
  let raw;
  try {
    const parsed = JSON.parse(content);
    raw = {
      name: 'meaning_judge',
      passed: parsed.verdict === 'preserved',
      verdict: parsed.verdict || 'unknown',
      added: parsed.added || [],
      dropped: parsed.dropped || [],
      altered: parsed.altered || [],
    };
  } catch {
    return { name: 'meaning_judge', passed: false, verdict: 'unparseable', added: [], dropped: [], altered: [] };
  }
  if (raw.passed) return raw;
  return refineJudge(raw, input, context, optimized, model);
}

function deterministicChecks(input, context, optimized, spans, target) {
  return [
    spanRetention(spans, optimized),
    noInvention(input, context, optimized),
    structureCheck(optimized, requiredSections(target)),
    languageMatch(input, optimized),
  ];
}

function repairMessage(checks, judgeResult) {
  const problems = [];
  for (const c of checks) {
    if (c.passed) continue;
    if (c.name === 'span_retention') problems.push(`These details from the source are missing and MUST appear verbatim: ${c.missing.map((m) => m.span).join(' | ')}`);
    if (c.name === 'no_invention') problems.push(`Remove these invented values not present in the source: ${[...c.inventedNumbers, ...c.inventedUrls].join(' | ')}`);
    if (c.name === 'structure') problems.push(`Add the missing required sections: ${c.missing.join(', ')}`);
    if (c.name === 'language_match') problems.push(`You wrote in the wrong language (${c.optimized}). Rewrite the whole prompt in the same language as the source (${c.source}). Do not translate the user's content into any other language.`);
  }
  if (judgeResult && !judgeResult.passed) {
    if (judgeResult.added.length) problems.push(`Remove or move to Open questions/Assumptions (not source-backed): ${judgeResult.added.join(' | ')}`);
    if (judgeResult.dropped.length) problems.push(`Restore these dropped requirements: ${judgeResult.dropped.join(' | ')}`);
    if (judgeResult.altered.length) problems.push(`Restore original meaning of: ${judgeResult.altered.join(' | ')}`);
  }
  return `Your rewrite failed fidelity verification. Fix ONLY these problems and output the corrected optimized prompt (same format, no commentary):\n- ${problems.join('\n- ')}`;
}

export async function optimize(input, { target = 'chat', context = '', model } = {}) {
  const spans = protectedSpans(input + (context ? '\n' + context : ''));
  const health = await ollamaHealth();
  const useModel = model || DEFAULT_MODEL;

  if (!health.ollama || (health.models.length && !health.models.includes(useModel) && !health.models.some((m) => m.startsWith(useModel.split(':')[0])))) {
    const fallback = heuristicOptimize(input, { target, context });
    const checks = deterministicChecks(input, context, fallback.optimized, spans, target);
    // structure check is advisory in heuristic mode (sections appear only when source has content for them)
    return {
      ...fallback,
      model: null,
      fidelity: {
        checks,
        judge: null,
        passed: checks.filter((c) => c.name !== 'structure').every((c) => c.passed),
        level: checks.filter((c) => c.name !== 'structure').every((c) => c.passed) ? 'verified' : 'failed',
      },
      repaired: false,
    };
  }

  const messages = [
    { role: 'system', content: SYNTH_SYSTEM },
    { role: 'user', content: synthUserMessage(input, target, context) },
  ];
  let optimized = (await chat(messages, { model: useModel })).trim();
  let checks = deterministicChecks(input, context, optimized, spans, target);
  let judgeResult = await judge(input, context, optimized, useModel);
  let repaired = false;

  const failed = () => checks.some((c) => !c.passed) || !judgeResult.passed;
  if (failed()) {
    repaired = true;
    const repairMessages = [
      ...messages,
      { role: 'assistant', content: optimized },
      { role: 'user', content: repairMessage(checks, judgeResult) },
    ];
    optimized = (await chat(repairMessages, { model: useModel })).trim();
    checks = deterministicChecks(input, context, optimized, spans, target);
    judgeResult = await judge(input, context, optimized, useModel);
  }

  const { assumptions, openQuestions } = parseSections(optimized);
  return {
    optimized,
    mode: 'llm',
    model: useModel,
    assumptions,
    openQuestions,
    repaired,
    fidelity: {
      checks,
      judge: judgeResult,
      passed: checks.every((c) => c.passed) && judgeResult.passed,
      level: !checks.every((c) => c.passed) ? 'failed' : judgeResult.passed ? 'verified' : 'review',
    },
  };
}
