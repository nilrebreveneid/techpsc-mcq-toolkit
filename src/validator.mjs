/** Local-only structural checks. No network access or factual answer verification. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const normalize = value => value.normalize('NFC').trim().toLowerCase().replace(/\s+/gu, ' ');

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
  return result(payload.questions.length);
}

/** Documents: [{ name: relativeFilename, payload: parsedJSON }]. Does not mutate input. */
export function validateCollection(documents, settings = {}) {
  validateSettings(settings);
  if (!Array.isArray(documents)) throw new TypeError('documents must be an array.');
  const seen = new Map();
  const files = documents.map((document, fileIndex) => {
    if (!isObject(document) || typeof document.name !== 'string') throw new TypeError('Each document needs a name string and payload.');
    const report = { file: document.name, ...validateQuiz(document.payload, settings) };
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
