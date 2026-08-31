import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestion, askRefinementQuestion } from '../../lib/questioner.mjs';

test('parseQuestion accepts exactly one question with options', () => {
  const result = parseQuestion({ done: false, question: { id: 'audience', text: 'Who is this for?', options: [{ id: 'customers', label: 'Customers' }], allowFreeText: true }, gaps: ['audience'] });
  assert.equal(result.question.id, 'audience');
});

test('parseQuestion rejects multiple or optionless questions without free text', () => {
  assert.throws(() => parseQuestion({ done: false, question: { id: 'x', text: 'Pick?', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }], allowFreeText: false } }));
  assert.throws(() => parseQuestion({ done: false, question: { id: 'x', text: 'Pick?', options: [], allowFreeText: false } }));
});

test('askRefinementQuestion replaces a repeated model question with a new safe question', async () => {
  const result = await askRefinementQuestion('Write a welcome.', [{ role: 'assistant', type: 'question', id: 'tone', text: 'What tone should it use?' }, { role: 'user', type: 'answer', text: 'Warm' }], {
    chatFn: async () => JSON.stringify({ done: false, question: { id: 'tone', text: 'What tone should it use?', options: [{ id: 'stable_id', label: 'Warm' }], allowFreeText: true } }),
  });
  assert.notEqual(result.question.id, 'tone');
});
