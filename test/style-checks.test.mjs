import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuiz } from '../src/validator.mjs';

const question = (answer = 0, giveaway = false, label = 'one') => ({
  question: `Synthetic sample question ${label}?`,
  options: giveaway ? ['This is a deliberately much longer correct answer', 'No', 'Maybe', 'Other'] : ['A', 'B', 'C', 'D'],
  answer
});
const quiz = (...questions) => ({ questions });
const codes = result => result.issues.map(issue => issue.code);

test('style checks are opt-in and leave the default validateQuiz report unchanged', () => {
  const payload = quiz(...Array.from({ length: 20 }, (_, index) => question(0, true, index)));
  const defaultReport = validateQuiz(payload);
  assert.deepEqual(defaultReport, { questionCount: 20, issues: [], valid: true });
  const checked = validateQuiz(payload, { styleChecks: true });
  assert.ok(codes(checked).includes('ANSWER_POSITION_SKEW'));
  assert.ok(codes(checked).includes('OPTION_LENGTH_GIVEAWAY'));
});

test('answer-position skew warns only above 50 percent and with at least 20 questions', () => {
  const exactHalf = quiz(...Array.from({ length: 20 }, (_, index) => question(index < 10 ? 0 : 1, false, index)));
  const overHalf = quiz(...Array.from({ length: 20 }, (_, index) => question(index < 11 ? 0 : 1, false, index)));
  const short = quiz(...Array.from({ length: 19 }, (_, index) => question(0, false, index)));
  assert.equal(codes(validateQuiz(exactHalf, { styleChecks: true })).includes('ANSWER_POSITION_SKEW'), false);
  assert.equal(codes(validateQuiz(overHalf, { styleChecks: true })).includes('ANSWER_POSITION_SKEW'), true);
  assert.equal(codes(validateQuiz(short, { styleChecks: true })).includes('ANSWER_POSITION_SKEW'), false);
});

test('option-length giveaway warns at 60 percent and does not expose question text', () => {
  const privatePrompt = 'PRIVATE SYNTHETIC PROMPT THAT MUST NOT APPEAR';
  const giveaway = [0, 1, 2].map(index => question(0, true, index));
  const payload = quiz({ ...giveaway[0], question: privatePrompt }, giveaway[1], giveaway[2], question(1, false, 3), question(2, false, 4));
  const result = validateQuiz(payload, { styleChecks: true });
  const issue = result.issues.find(item => item.code === 'OPTION_LENGTH_GIVEAWAY');
  assert.ok(issue);
  assert.match(issue.message, /3 of 5 evaluable questions \(60\.0%\)/u);
  assert.equal(JSON.stringify(result).includes(privatePrompt), false);
});

test('option-length giveaway does not warn below the 60 percent threshold', () => {
  const giveaway = [0, 1].map(index => question(0, true, index));
  const result = validateQuiz(quiz(...giveaway, question(1, false, 2), question(2, false, 3), question(3, false, 4)), { styleChecks: true });
  assert.equal(codes(result).includes('OPTION_LENGTH_GIVEAWAY'), false);
});

test('invalid styleChecks option is rejected', () => {
  assert.throws(() => validateQuiz(quiz(question()), { styleChecks: 'yes' }), /styleChecks must be a boolean/u);
});
