import { chat, ollamaHealth, DEFAULT_MODEL } from './ollama.mjs';

const MAX_QUESTIONS = 3;
const QUESTION_SYSTEM = `You are Refinr's refinement-question agent.
Given a rough prompt and the complete prior transcript, identify the single most important missing decision.
Ask exactly one concise question at a time. Never invent facts or answer for the user.
Do not repeat a question already answered. Stop when the prompt is sufficiently specified.
Return JSON only, matching one of these shapes:
{"done":true,"question":null,"gaps":[],"reason":"..."}
{"done":false,"question":{"id":"stable_snake_case_id","text":"one question","options":[{"id":"stable_id","label":"short option"}],"allowFreeText":true},"gaps":["missing decision"],"reason":"..."}
Use at most three options. Use allowFreeText when an answer cannot safely be reduced to options.`;

function fallback(prompt, turns) {
  const answered = new Set(turns.filter((turn) => turn.type === 'question').map((turn) => turn.id || turn.text));
  const candidates = [
    { id: 'audience', text: 'Who is the intended audience?', options: [], allowFreeText: true },
    { id: 'outcome', text: 'What should the response help the reader do?', options: [], allowFreeText: true },
    { id: 'format', text: 'What output format do you want?', options: [{ id: 'paragraph', label: 'Short paragraph' }, { id: 'bullets', label: 'Bullet list' }], allowFreeText: true },
  ];
  const next = candidates.find((candidate) => !answered.has(candidate.id) && !turns.some((turn) => turn.text === candidate.text));
  return next ? { done: false, question: next, gaps: [next.id], reason: 'Deterministic fallback: one decision remains open.' } : { done: true, question: null, gaps: [], reason: 'No safe unanswered decision remains.' };
}

function parseQuestion(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.done !== 'boolean') throw new Error('question response must include boolean done');
  if (payload.done) return { done: true, question: null, gaps: Array.isArray(payload.gaps) ? payload.gaps.slice(0, 5) : [], reason: String(payload.reason || '') };
  const q = payload.question;
  if (!q || typeof q.id !== 'string' || !q.id || typeof q.text !== 'string' || !q.text || !Array.isArray(q.options) || q.options.length > 3 || typeof q.allowFreeText !== 'boolean') throw new Error('question response is not a valid single-question shape');
  const slug = (value, fallback) => {
    const normalized = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
    return normalized || fallback;
  };
  const questionId = q.id === 'stable_snake_case_id' ? slug(q.text, 'question') : q.id;
  const ids = new Set();
  const options = q.options.map((option) => {
    if (!option || typeof option.id !== 'string' || typeof option.label !== 'string' || !option.id || !option.label) throw new Error('question options must have unique id and label');
    const optionId = option.id === 'stable_id' ? slug(option.label, `option_${ids.size + 1}`) : option.id;
    if (ids.has(optionId)) throw new Error('question options must have unique id and label');
    ids.add(optionId);
    return { id: optionId, label: option.label };
  });
  if (!options.length && !q.allowFreeText) throw new Error('question needs options or free text');
  return { done: false, question: { id: questionId, text: q.text, options, allowFreeText: q.allowFreeText }, gaps: Array.isArray(payload.gaps) ? payload.gaps.slice(0, 5) : [], reason: String(payload.reason || '') };
}

function userMessage(prompt, turns, maxQuestions) {
  return `Rough prompt:\n---\n${prompt}\n---\nMaximum questions: ${maxQuestions}\nComplete transcript (oldest first):\n${JSON.stringify(turns)}`;
}

export async function askRefinementQuestion(prompt, turns = [], { maxQuestions = MAX_QUESTIONS, chatFn = chat } = {}) {
  if (!prompt || typeof prompt !== 'string') throw new Error('prompt is required');
  if (!Array.isArray(turns)) throw new Error('turns must be an array');
  const questionCount = turns.filter((turn) => turn?.type === 'question').length;
  if (questionCount >= Math.min(maxQuestions, MAX_QUESTIONS)) return fallback(prompt, turns).done ? fallback(prompt, turns) : { done: true, question: null, gaps: [], reason: 'Question limit reached; proceed to optimization.' };
  const health = await ollamaHealth();
  const preferred = health.models?.find((model) => model === 'llama3.2:3b');
  if (!health.ollama || (health.models.length && !health.models.includes(preferred || DEFAULT_MODEL) && !health.models.some((model) => model.startsWith(DEFAULT_MODEL.split(':')[0])))) return fallback(prompt, turns);
  const content = await chatFn([{ role: 'system', content: QUESTION_SYSTEM }, { role: 'user', content: userMessage(prompt, turns, Math.min(maxQuestions, MAX_QUESTIONS)) }], { model: preferred || DEFAULT_MODEL, jsonMode: true, timeoutMs: 60000 });
  const result = parseQuestion(JSON.parse(content));
  if (!result.done) {
    const priorIds = new Set(turns.filter((turn) => turn?.type === 'question').map((turn) => turn.id).filter(Boolean));
    const priorTexts = new Set(turns.filter((turn) => turn?.type === 'question').map((turn) => turn.text));
    if (priorIds.has(result.question.id) || priorTexts.has(result.question.text)) return fallback(prompt, turns);
  }
  return result;
}

export { MAX_QUESTIONS, parseQuestion };
