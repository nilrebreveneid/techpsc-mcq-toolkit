# TechPSC MCQ Toolkit

A dependency-free Node.js toolkit for validating text-based multiple-choice question banks. English and Nepali Unicode are supported. Processing is local: no network calls, accounts, analytics, or paid services.

## Why it exists

Exam-preparation teams maintain question banks separately from the apps that display them. A malformed answer index, missing option, duplicate prompt, or invalid JSON can make a question unusable. Unicode normalization and whitespace checks are especially useful for bilingual banks. This toolkit catches structural issues before integration.

It is intended for independent exam-preparation developers, educators, and small content teams using JSON MCQs. It does not check whether an answer is factually correct or pedagogically sound; human review is still required.

Version 0.1.2 includes the validator, CLI, tests, and original bilingual arithmetic/science examples. No quiz player or npm package is included.

## Install and use

Requires Node.js 22 or newer; there are no runtime dependencies.

```sh
git clone https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git
cd techpsc-mcq-toolkit
node --test
node bin/mcq-check.mjs examples --fail-on-warnings
node bin/mcq-check.mjs /path/to/question-banks --fail-on-warnings
```

To use the CLI in another Node.js project, install a pinned release as a development dependency:

```sh
npm install --save-dev git+https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git#v0.1.2
npx mcq-check ./question-banks --fail-on-warnings
```

See [INTEGRATION.md](INTEGRATION.md) for a consumer CI template, error-output example, and privacy guidance. The workflow is a template, not evidence of production integration.

## Checks and limits

- Valid UTF-8 JSON and a nonempty `questions` array.
- Nonempty question text, configured option count (default 4), and zero-based integer answer indexes.
- Blank/duplicate options, duplicate questions within/across files, optional unique IDs, explanations, and expected question counts.
- Unicode NFC, case-insensitive, whitespace-normalized duplicate checks. This is not semantic or translation matching.

Errors fail validation. Duplicate questions and empty optional explanations are warnings; `--fail-on-warnings` makes warnings fail CI. Images, rich text, and multilingual-object options are unsupported; options must be text strings.

**It does not verify factual correctness, educational quality, copyright, URL safety, or scientific accuracy.** The tool never rewrites source files. It skips hidden directories, `node_modules` and symlinks; selected files over 16 MiB are rejected. Reports contain codes and locations, not question/answer text, but filenames may reveal information.

## Library API

```js
import { validateQuiz } from './src/validator.mjs';
const result = validateQuiz({ questions: [{ question: '2 + 3?', options: ['4', '5', '6', '7'], answer: 1 }] });
console.log(result.valid, result.issues);
```

See [FORMAT.md](FORMAT.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [CLI_UX.md](CLI_UX.md) for details.

## Background and scope

The concept comes from maintaining quiz content for TechPSC. This standalone implementation does not include the TechPSC app, production question banks, premium material, backend, admin tools, user records, or credentials. Its English and Nepali examples are synthetic and original.

No adoption or download figures are claimed. TechPSC app usage is not evidence of toolkit adoption. The repository demonstrates its own checks through examples, automated tests, and GitHub Actions. **No TechPSC production integration is claimed.**

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [MAINTAINING.md](MAINTAINING.md). Use synthetic data only. MIT license applies only to this standalone toolkit, not the TechPSC app, branding, or production content. `private: true` prevents accidental npm publication; GitHub installation remains available.
