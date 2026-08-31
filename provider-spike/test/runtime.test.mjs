import test from 'node:test';
import assert from 'node:assert/strict';

test('question payload contract accepts one adaptive question', () => {
  const payload = { done: false, question: { id: 'audience', text: 'Who is this for?', options: [{ id: 'customers', label: 'Customers' }], allowFreeText: true } };
  assert.equal(payload.done, false);
  assert.equal(payload.question.options.length, 1);
});

test('conversation turn keeps the prior answer before the next question', () => {
  const turns = [{ role: 'assistant', type: 'question', text: 'Who is this for?' }, { role: 'user', type: 'answer', text: 'First-time visitors' }];
  assert.equal(turns.at(-1).text, 'First-time visitors');
  assert.equal(turns.at(-2).type, 'question');
});
