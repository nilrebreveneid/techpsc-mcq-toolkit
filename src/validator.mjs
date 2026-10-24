/** Local-only structural checks. No network access or factual answer verification. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const normalize = value => value.normalize('NFC').trim().toLowerCase().replace(/\s+/gu, ' ');
const DEFAULT_MIN_TOPIC_MATCH = 0.5;

function globExpression(pattern) {
  const normalized = normalize(pattern);
  const source = Array.from(normalized, character => {
    if (character === '*') return '.*';
    if (character === '?') return '.';
    return character.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }).join('');
  return new RegExp(`^${source}$`, 'u');
}

function parseTopicKeywords(topicKeywords) {
  if (!isObject(topicKeywords)) throw new TypeError('topicKeywords must be an object mapping file or quizId globs to keyword arrays.');
  const entries = Object.entries(topicKeywords);
  if (!entries.length) throw new TypeError('topicKeywords must contain at least one file or quizId pattern.');
  return entries.map(([pattern, keywords]) => {
    if (!nonEmpty(pattern) || !Array.isArray(keywords) || !keywords.length || keywords.some(keyword => !nonEmpty(keyword))) {
      throw new TypeError('Each topicKeywords entry must have a non-empty pattern and a non-empty array of keyword strings.');
    }
    return { matches: globExpression(pattern), keywords: keywords.map(normalize) };
  });
}

function validateExtendedSettings(settings) {
  const minTopicMatch = settings.minTopicMatch ?? DEFAULT_MIN_TOPIC_MATCH;
  if (typeof minTopicMatch !== 'number' || !Number.isFinite(minTopicMatch) || minTopicMatch < 0 || minTopicMatch > 1) {
    throw new TypeError('minTopicMatch must be a number between 0 and 1.');
  }
  if (settings.styleChecks !== undefined && typeof settings.styleChecks !== 'boolean') {
    throw new TypeError('styleChecks must be a boolean.');
  }
  if (settings.verbose !== undefined && typeof settings.verbose !== 'boolean') {
    throw new TypeError('verbose must be a boolean.');
  }
  if (settings.fileName !== undefined && typeof settings.fileName !== 'string') {
    throw new TypeError('fileName must be a string.');
  }
  return {
    minTopicMatch,
    topicRules: settings.topicKeywords === undefined ? undefined : parseTopicKeywords(settings.topicKeywords),
    styleChecks: settings.styleChecks === true,
    verbose: settings.verbose === true,
    fileName: settings.fileName
  };
}

function keywordsForDocument(payload, fileName, topicRules) {
  const identities = [fileName, payload.quizId]
    .filter(nonEmpty)
    .map(normalize);
  const keywords = new Set();
  for (const rule of topicRules) {
    if (identities.some(identity => rule.matches.test(identity))) {
      for (const keyword of rule.keywords) keywords.add(keyword);
    }
  }
  return [...keywords];
}

function questionContainsKeyword(question, keywords) {
  if (!isObject(question)) return false;
  const questionText = has(question, 'question') ? question.question : question.q;
  const searchable = [questionText, ...(Array.isArray(question.options) ? question.options : [])]
    .filter(value => typeof value === 'string')
    .map(normalize)
    .join(' ');
  return keywords.some(keyword => searchable.includes(keyword));
}

function applyTopicCoherence(payload, issues, { topicRules, fileName, minTopicMatch, verbose }) {
  if (!topicRules || !Array.isArray(payload.questions) || payload.questions.length === 0) return;
  const keywords = keywordsForDocument(payload, fileName, topicRules);
  if (!keywords.length) return;

  const matches = payload.questions.map(question => questionContainsKeyword(question, keywords));
  const matchedCount = matches.filter(Boolean).length;
  const questionCount = matches.length;
  const ratio = matchedCount / questionCount;
  if (ratio < minTopicMatch) {
    issues.push({ severity: 'warning', code: 'TOPIC_LOW_MATCH', path: '$.questions',
      message: `Topic keywords matched ${matchedCount} of ${questionCount} questions (${(ratio * 100).toFixed(1)}%); minimum is ${(minTopicMatch * 100).toFixed(1)}%.` });
  }
  if (verbose) {
    matches.forEach((matched, index) => {
      if (!matched) issues.push({ severity: 'info', code: 'TOPIC_NO_KEYWORD', path: `$.questions[${index}]`,
        message: `Question index ${index + 1} did not match a configured topic keyword.` });
    });
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function applyStyleChecks(payload, issues) {
  if (!Array.isArray(payload.questions)) return;
  const questions = payload.questions;

  if (questions.length >= 20) {
    const answerCounts = new Map();
    let validAnswers = 0;
    for (const question of questions) {
      if (!isObject(question) || !Array.isArray(question.options) || !Number.isSafeInteger(question.answer) ||
          question.answer < 0 || question.answer >= question.options.length) continue;
      validAnswers++;
      answerCounts.set(question.answer, (answerCounts.get(question.answer) ?? 0) + 1);
    }
    if (validAnswers > 0) {
      const [position, count] = [...answerCounts.entries()].sort((left, right) => right[1] - left[1])[0];
      const share = count / validAnswers;
      if (share > 0.5) {
        issues.push({ severity: 'warning', code: 'ANSWER_POSITION_SKEW', path: '$.questions',
          message: `Answer option index ${position} holds ${count} of ${validAnswers} valid answers (${(share * 100).toFixed(1)}%); maximum is 50.0%.` });
      }
    }
  }

  const evaluable = [];
  for (const question of questions) {
    if (!isObject(question) || !Array.isArray(question.options) || question.options.length < 2 ||
        !Number.isSafeInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length ||
        question.options.some(option => !nonEmpty(option))) continue;
    const lengths = question.options.map(option => Array.from(normalize(option)).length);
    const correctLength = lengths[question.answer];
    const longest = Math.max(...lengths);
    evaluable.push(correctLength === longest && correctLength > 2 * median(lengths));
  }
  if (evaluable.length) {
    const giveawayCount = evaluable.filter(Boolean).length;
    const share = giveawayCount / evaluable.length;
    if (share >= 0.6) {
      issues.push({ severity: 'warning', code: 'OPTION_LENGTH_GIVEAWAY', path: '$.questions',
        message: `The correct option is longest and over 2x the median length in ${giveawayCount} of ${evaluable.length} evaluable questions (${(share * 100).toFixed(1)}%); threshold is 60.0%.` });
    }
  }
}

export function validateSettings({ optionCount = 4, expectedQuestions } = {}) {
  if (!Number.isSafeInteger(optionCount) || optionCount < 2 || optionCount > 100) {
    throw new TypeError('optionCount must be an integer between 2 and 100.');
  }
  if (expectedQuestions !== undefined && (!Number.isSafeInteger(expectedQuestions) || expectedQuestions < 1)) {
    throw new TypeError('expectedQuestions must be a positive safe integer.');
  }
  return { optionCount, expectedQuestions };
}

/** Report locations and issue codes, not question text or answer contents. */
export function validateQuiz(payload, settings = {}) {
  const { optionCount, expectedQuestions } = validateSettings(settings);
  const extended = validateExtendedSettings(settings);
  const issues = [];
  const add = (severity, code, path, message) => issues.push({ severity, code, path, message });
  const result = count => ({ questionCount: count, issues, valid: !issues.some(issue => issue.severity === 'error') });
  if (!isObject(payload)) {
    add('error', 'INVALID_ROOT', '$', 'Expected an object with a questions array.');
    return result(0);
  }
  if (!Array.isArray(payload.questions)) {
    add('error', 'MISSING_QUESTIONS', '$.questions', 'Expected a questions array.');
    return result(0);
  }
  if (!payload.questions.length) add('error', 'EMPTY_QUIZ', '$.questions', 'At least one question is required.');
  if (expectedQuestions !== undefined && payload.questions.length !== expectedQuestions) {
    add('error', 'QUESTION_COUNT', '$.questions', `Expected ${expectedQuestions} questions; found ${payload.questions.length}.`);
  }
  const seenQuestions = new Map();
  const seenIds = new Set();
  Array.from(payload.questions).forEach((question, index) => {
    const path = `$.questions[${index}]`;
    if (!isObject(question)) {
      add('error', 'INVALID_QUESTION', path, 'Expected a question object.');
      return;
    }
    const text = has(question, 'question') ? question.question : question.q;
    if (has(question, 'question') && has(question, 'q') && question.question !== question.q) {
      add('error', 'CONFLICTING_TEXT', path, 'question and q must not contain different values.');
    }
    if (!nonEmpty(text)) add('error', 'MISSING_TEXT', path, 'A non-empty question or q string is required.');
    else {
      const key = normalize(text);
      if (seenQuestions.has(key)) {
        add('warning', 'DUPLICATE_QUESTION', path, `Normalized text duplicates question ${seenQuestions.get(key) + 1}.`);
      } else seenQuestions.set(key, index);
    }
    if (has(question, 'id')) {
      if (!nonEmpty(question.id)) add('error', 'INVALID_ID', `${path}.id`, 'An optional id must be a non-empty string.');
      else if (seenIds.has(question.id)) add('error', 'DUPLICATE_ID', `${path}.id`, 'Question ids must be unique within a quiz.');
      else seenIds.add(question.id);
    }
    if (!Array.isArray(question.options)) {
      add('error', 'INVALID_OPTIONS', `${path}.options`, 'Expected an array of text options.');
    } else {
      if (question.options.length !== optionCount) {
        add('error', 'OPTION_COUNT', `${path}.options`, `Expected ${optionCount} options; found ${question.options.length}.`);
      }
      const options = new Set();
      Array.from(question.options).forEach((option, optionIndex) => {
        if (!nonEmpty(option)) add('error', 'INVALID_OPTION', `${path}.options[${optionIndex}]`, 'Options must be non-empty strings.');
        else {
          const key = normalize(option);
          if (options.has(key)) add('error', 'DUPLICATE_OPTION', `${path}.options[${optionIndex}]`, 'Normalized option text must be distinct.');
          options.add(key);
        }
      });
    }
    if (!Number.isSafeInteger(question.answer) || question.answer < 0 ||
        !Array.isArray(question.options) || question.answer >= question.options.length) {
      add('error', 'INVALID_ANSWER', `${path}.answer`, 'answer must be a zero-based integer index into options.');
    }
    if (has(question, 'explanation') && !nonEmpty(question.explanation)) {
      add('warning', 'EMPTY_EXPLANATION', `${path}.explanation`, 'An optional explanation should be a non-empty string.');
    }
  });
  applyTopicCoherence(payload, issues, extended);
  if (extended.styleChecks) applyStyleChecks(payload, issues);
  return result(payload.questions.length);
}

/** Documents: [{ name: relativeFilename, payload: parsedJSON }]. Does not mutate input. */
export function validateCollection(documents, settings = {}) {
  validateSettings(settings);
  if (!Array.isArray(documents)) throw new TypeError('documents must be an array.');
  const seen = new Map();
  const files = documents.map((document, fileIndex) => {
    if (!isObject(document) || typeof document.name !== 'string') throw new TypeError('Each document needs a name string and payload.');
    const report = { file: document.name, ...validateQuiz(document.payload, { ...settings, fileName: document.name }) };
    if (Array.isArray(document.payload?.questions)) {
      for (const [questionIndex, question] of document.payload.questions.entries()) {
        if (!isObject(question)) continue;
        const text = has(question, 'question') ? question.question : question.q;
        if (!nonEmpty(text)) continue;
        const key = normalize(text);
        const previous = seen.get(key);
        if (previous && previous.fileIndex !== fileIndex) {
          report.issues.push({ severity: 'warning', code: 'CROSS_FILE_DUPLICATE', path: `$.questions[${questionIndex}]`,
            message: `Normalized text also appears in ${previous.file}, question ${previous.questionIndex + 1}.` });
        } else if (!previous) seen.set(key, { fileIndex, file: document.name, questionIndex });
      }
    }
    return report;
  });
  return summarize(files);
}

export function summarize(files) {
  const issues = files.flatMap(file => file.issues);
  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.filter(issue => issue.severity === 'warning').length;
  return { valid: errors === 0, fileCount: files.length,
    questionCount: files.reduce((sum, file) => sum + file.questionCount, 0), errors, warnings, files };
}
