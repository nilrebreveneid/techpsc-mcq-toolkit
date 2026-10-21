import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuiz, validateCollection } from '../src/validator.mjs';

const question = (overrides = {}) => ({ question: 'What is 2 + 3?', options: ['4', '5', '6', '7'], answer: 1, ...overrides });
const quiz = (...questions) => ({ questions });
const codes = report => report.issues.map(issue => issue.code);

test('accepts text MCQs and does not mutate input', () => {
  const input = quiz(question());
  const before = JSON.stringify(input);
  assert.equal(validateQuiz(input).valid, true);
  assert.equal(JSON.stringify(input), before);
});
test('accepts Nepali Unicode and q alias', () => {
  assert.equal(validateQuiz(quiz({ q: '४ र २ को योगफल कति हुन्छ?', options: ['४', '५', '६', '७'], answer: 2 })).valid, true);
});
for (const value of [null, [], 1, 'text']) {
  test(`rejects non-object root ${JSON.stringify(value)}`, () => assert.equal(validateQuiz(value).valid, false));
}
test('rejects missing questions and empty bank', () => {
  assert.deepEqual(codes(validateQuiz({})), ['MISSING_QUESTIONS']);
  assert.deepEqual(codes(validateQuiz(quiz())), ['EMPTY_QUIZ']);
});
test('rejects null or sparse question items', () => {
  assert.ok(codes(validateQuiz(quiz(null))).includes('INVALID_QUESTION'));
  assert.ok(codes(validateQuiz({ questions: Array(1) })).includes('INVALID_QUESTION'));
});
test('rejects blank and non-string text', () => {
  for (const value of ['', '  ', 42]) assert.ok(codes(validateQuiz(quiz(question({ question: value })))).includes('MISSING_TEXT'));
});
test('rejects ambiguous question and q fields', () => {
  assert.ok(codes(validateQuiz(quiz(question({ q: 'Another text' })))).includes('CONFLICTING_TEXT'));
  assert.equal(validateQuiz(quiz(question({ q: 'What is 2 + 3?' }))).valid, true);
});
test('requires configurable option count', () => {
  const input = quiz(question({ options: ['One', 'Two'], answer: 0 }));
  assert.equal(validateQuiz(input).valid, false);
  assert.equal(validateQuiz(input, { optionCount: 2 }).valid, true);
});
test('rejects missing, non-array, blank, non-text and sparse options', () => {
  for (const options of [undefined, 'abcd', ['a', '', 'c', 'd'], ['a', null, 'c', 'd'], Array(4)]) {
    assert.equal(validateQuiz(quiz(question({ options }))).valid, false);
  }
});
test('detects normalized duplicate options', () => {
  assert.ok(codes(validateQuiz(quiz(question({ options: ['One', ' one ', 'Three', 'Four'] })))).includes('DUPLICATE_OPTION'));
});
for (const answer of [-1, 4, 0.5, '1', null, undefined]) {
  test(`rejects invalid answer ${String(answer)}`, () => {
    assert.ok(codes(validateQuiz(quiz(question({ answer })))).includes('INVALID_ANSWER'));
  });
}
test('accepts first and last zero-based indexes', () => {
  assert.equal(validateQuiz(quiz(question({ answer: 0 }))).valid, true);
  assert.equal(validateQuiz(quiz(question({ answer: 3 }))).valid, true);
});
test('checks expected question total', () => {
  assert.ok(codes(validateQuiz(quiz(question()), { expectedQuestions: 2 })).includes('QUESTION_COUNT'));
  assert.equal(validateQuiz(quiz(question()), { expectedQuestions: 1 }).valid, true);
});
test('within-file duplicates are warnings', () => {
  const result = validateQuiz(quiz(question(), question({ question: '  WHAT IS 2 + 3?  ' })));
  assert.equal(result.valid, true);
  assert.ok(codes(result).includes('DUPLICATE_QUESTION'));
});
test('normalizes canonically equivalent Unicode text', () => {
  const result = validateQuiz(quiz(question({ question: 'Café?' }), question({ question: 'Cafe\u0301?' })));
  assert.ok(codes(result).includes('DUPLICATE_QUESTION'));
});
test('enforces optional nonempty unique ids', () => {
  assert.ok(codes(validateQuiz(quiz(question({ id: '' })))).includes('INVALID_ID'));
  assert.ok(codes(validateQuiz(quiz(question({ id: 'a' }), question({ id: 'a' })))).includes('DUPLICATE_ID'));
});
test('empty optional explanation is a warning', () => {
  assert.ok(codes(validateQuiz(quiz(question({ explanation: '' })))).includes('EMPTY_EXPLANATION'));
});
test('cross-file duplicates are reported with correct location and totals', () => {
  const result = validateCollection([{ name: 'a.json', payload: quiz(question()) }, { name: 'b.json', payload: quiz(question()) }]);
  assert.equal(result.fileCount, 2);
  assert.equal(result.questionCount, 2);
  assert.equal(result.warnings, 1);
  assert.equal(result.errors, 0);
  assert.ok(codes(result.files[1]).includes('CROSS_FILE_DUPLICATE'));
});
test('malformed collection payload does not crash validation', () => {
  const result = validateCollection([{ name: 'bad.json', payload: null }]);
  assert.equal(result.valid, false);
  assert.equal(result.errors, 1);
});
test('reports omit question and option content', () => {
  const result = validateQuiz(quiz(question({ question: 'PRIVATE QUESTION TEXT', options: ['SECRET', 'SECRET', 'C', 'D'] })));
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('PRIVATE QUESTION TEXT'), false);
  assert.equal(serialized.includes('SECRET'), false);
});
test('validates settings and collection API arguments', () => {
  for (const optionCount of [1, 101, 2.5, '4']) assert.throws(() => validateQuiz(quiz(), { optionCount }));
  for (const expectedQuestions of [0, -1, 1.5]) assert.throws(() => validateQuiz(quiz(), { expectedQuestions }));
  assert.throws(() => validateCollection(null));
  assert.throws(() => validateCollection([null]));
});
