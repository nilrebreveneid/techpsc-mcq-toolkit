import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuiz } from '../src/validator.mjs';

const keywordMap = { 'geometry*.json': ['triangle', 'angle', 'त्रिभुज', 'कोण'] };
const question = text => ({ question: text, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0 });
const quiz = (...questions) => ({ questions });
const topicWarnings = result => result.issues.filter(issue => issue.code === 'TOPIC_LOW_MATCH');

test('coherent topic bank passes with text and option matches', () => {
  const result = validateQuiz(quiz(question('A triangle has three sides.'), question('Choose the correct angle.')),
    { topicKeywords: keywordMap, fileName: 'geometry-ok.json' });
  assert.equal(result.valid, true);
  assert.equal(topicWarnings(result).length, 0);
});

test('keyword matching is case-insensitive, whitespace-normalized, and searches options', () => {
  const result = validateQuiz(quiz(
    { question: 'A synthetic topic prompt.', options: ['Triangle', 'Circle', 'Square', 'Oval'], answer: 0 },
    { question: 'An interior     angle is being studied.', options: ['Acute', 'Right', 'Obtuse', 'Straight'], answer: 1 }
  ), { topicKeywords: { 'geometry.json': ['TRIANGLE', 'interior angle'] }, fileName: 'geometry.json' });
  assert.equal(topicWarnings(result).length, 0);
});

test('a scrambled geometry bank warns without exposing question text', () => {
  const privatePrompt = 'Which gas is released in this synthetic chemistry question?';
  const result = validateQuiz(quiz(question(privatePrompt), question('What is the chemical symbol for sodium?')),
    { topicKeywords: keywordMap, fileName: 'geometry-scrambled.json' });
  assert.equal(topicWarnings(result).length, 1);
  assert.match(topicWarnings(result)[0].message, /0 of 2 questions \(0\.0%\)/u);
  assert.equal(JSON.stringify(result).includes(privatePrompt), false);
});

test('file and quizId patterns support wildcard matching', () => {
  const result = validateQuiz({ quizId: 'weekly-geometry-civil', questions: [question('The triangle has three sides.')] },
    { topicKeywords: { 'weekly-geometry-*': ['triangle'] } });
  assert.equal(topicWarnings(result).length, 0);
});

test('Nepali keywords match canonical NFC and NFD forms', () => {
  const nfcKeyword = '\u0958लम';
  const nfdQuestion = `यो ${nfcKeyword.normalize('NFD')} हो।`;
  const result = validateQuiz(quiz(question(nfdQuestion)),
    { topicKeywords: { 'nepali-*': [nfcKeyword] }, fileName: 'nepali-bank.json' });
  assert.equal(topicWarnings(result).length, 0);
});

test('exact topic threshold passes and a higher threshold warns', () => {
  const payload = quiz(question('A triangle has three sides.'), question('A synthetic chemistry prompt.'));
  const exact = validateQuiz(payload, { topicKeywords: keywordMap, fileName: 'geometry.json', minTopicMatch: 0.5 });
  const higher = validateQuiz(payload, { topicKeywords: keywordMap, fileName: 'geometry.json', minTopicMatch: 0.5001 });
  assert.equal(topicWarnings(exact).length, 0);
  assert.equal(topicWarnings(higher).length, 1);
  assert.match(topicWarnings(higher)[0].message, /1 of 2 questions \(50\.0%\)/u);
});

test('verbose topic detail lists question indexes only', () => {
  const secret = 'DO NOT ECHO THIS PRIVATE SYNTHETIC QUESTION';
  const result = validateQuiz(quiz(question('A triangle is a polygon.'), question(secret)),
    { topicKeywords: keywordMap, fileName: 'geometry.json', verbose: true });
  const detail = result.issues.find(issue => issue.code === 'TOPIC_NO_KEYWORD');
  assert.equal(detail.severity, 'info');
  assert.equal(detail.path, '$.questions[1]');
  assert.match(detail.message, /Question index 2/u);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test('unmatched file patterns do not produce a topic warning', () => {
  const result = validateQuiz(quiz(question('A synthetic chemistry prompt.')),
    { topicKeywords: keywordMap, fileName: 'chemistry.json' });
  assert.equal(topicWarnings(result).length, 0);
});

test('invalid topic rules and match thresholds are rejected', () => {
  assert.throws(() => validateQuiz(quiz(question('A triangle.')), { topicKeywords: [] }), /topicKeywords must be an object/u);
  assert.throws(() => validateQuiz(quiz(question('A triangle.')), { topicKeywords: { 'geometry.json': [] } }), /non-empty array/u);
  for (const minTopicMatch of [-0.1, 1.1, NaN, '0.5']) {
    assert.throws(() => validateQuiz(quiz(question('A triangle.')), { minTopicMatch }), /between 0 and 1/u);
  }
});
