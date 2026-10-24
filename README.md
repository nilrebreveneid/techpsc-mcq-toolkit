# TechPSC MCQ Toolkit

[![CI](https://github.com/nilrebreveneid/techpsc-mcq-toolkit/actions/workflows/validate.yml/badge.svg)](https://github.com/nilrebreveneid/techpsc-mcq-toolkit/actions/workflows/validate.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥22](https://img.shields.io/badge/Node.js-%E2%89%A522-339933.svg)](https://nodejs.org/)

A small, dependency-free Node.js toolkit for checking text-based multiple-choice
question banks before they reach learners. English and Nepali Unicode text are
supported. All processing happens locally; there are no network calls, accounts,
analytics, or paid services.

## Why it exists

Exam-preparation teams maintain question banks separately from the apps that display them. A malformed answer index, missing option, duplicate prompt, or invalid JSON can make a question unusable. Unicode normalization and whitespace checks are especially useful for bilingual banks. This toolkit catches structural issues before integration.

It is intended for independent exam-preparation developers, educators, and small content teams using JSON MCQs. It does not check whether an answer is factually correct or pedagogically sound; human review is still required.

Version 0.2.0 includes a validator, CLI, tests, original bilingual demo
questions, optional topic-coherence checks, and optional writing-style warnings.
A quiz player is not included. The source is MIT-licensed; no npm package has
been published.

## Install and use

Requires Node.js 22 or newer; there are no runtime dependencies.

```sh
git clone https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git
cd techpsc-mcq-toolkit
node --test
node bin/mcq-check.mjs examples --fail-on-warnings
node bin/mcq-check.mjs /path/to/question-banks --fail-on-warnings
```

## Quick example

```text
$ node bin/mcq-check.mjs examples/topic-coherence/geometry-scrambled.json --topic-keywords examples/topic-coherence/keywords.json
1 files · 4 questions · 0 errors · 1 warnings
WARNING geometry-scrambled.json $.questions TOPIC_LOW_MATCH: Topic keywords matched 0 of 4 questions (0.0%); minimum is 50.0%.
$ node bin/mcq-check.mjs examples/topic-coherence/geometry-scrambled.json --topic-keywords examples/topic-coherence/keywords.json --min-topic-match 0
1 files · 4 questions · 0 errors · 0 warnings
```

The topic check is opt-in and searches normalized question text and options.
Use `--verbose` for mismatch indexes only, or `--style-checks` to enable the
answer-position and option-length heuristics.

To use the CLI from another Node.js project, install the public GitHub
repository as a development dependency (this does not publish it to npm):

```sh
npm install --save-dev git+https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git#v0.2.0
npx mcq-check ./question-banks --fail-on-warnings
```

See [INTEGRATION.md](INTEGRATION.md) for a consumer CI template, error-output example, and privacy guidance. The workflow is a template, not evidence of production integration.

## Checks and limits

- Valid UTF-8 JSON and a nonempty `questions` array.
- Nonempty question text and the configured number of text options (default 4).
- Zero-based integer answer indexes within the options array.
- Blank or duplicate answer options.
- Duplicate question text within and across files, using Unicode NFC,
  case-insensitive and whitespace-normalized comparisons.
- Optional topic-coherence warnings based on file/quizId keyword mappings.
- Optional answer-position skew and unusually long correct-option warnings.
- Optional unique question IDs, optional explanations, and question counts.

Errors fail validation. Duplicate questions and empty optional explanations are warnings; `--fail-on-warnings` makes warnings fail CI. Images, rich text, and multilingual-object options are unsupported; options must be text strings.

**This does not verify factual correctness, educational quality, copyright,
security of URLs, or scientific accuracy.** Answer indexes can be structurally
valid while pointing to factually incorrect answers. Human review is essential.
Image, rich-text and multilingual-object options are outside version 0.2.0;
provide plain string options. Unknown metadata fields are ignored.
The tool never rewrites source files. It skips hidden directories, `node_modules`
and symlinks; selected files over 16 MiB are rejected. Reports contain codes and
locations, not question/answer text, but filenames may reveal information.

## Library API

```js
import { validateQuiz } from './src/validator.mjs';
const result = validateQuiz({ questions: [{ question: '2 + 3?', options: ['4', '5', '6', '7'], answer: 1 }] });
console.log(result.valid, result.issues);
```

See [FORMAT.md](FORMAT.md) for the input contract and
[docs/nepali-unicode.md](docs/nepali-unicode.md) for Unicode matching notes.
See [ARCHITECTURE.md](ARCHITECTURE.md) and [CLI_UX.md](CLI_UX.md) for the
architecture and command-line interaction guidelines.
Reports contain issue codes,
relative filenames and question locations, not the original question/option
contents or answer values. Filenames may still reveal information: review reports
before sharing them.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | No errors; warnings allowed unless `--fail-on-warnings` is set |
| 1 | Structural validation errors or warnings configured to fail |
| 2 | Invalid CLI arguments, missing/unreadable input or invalid JSON |

No reports are written automatically. Shell redirection can save JSON output.
This CLI is not a sandbox: run it only on directories you intend to inspect, not
on a tree being modified by an untrusted process. Keep banks to reasonable sizes;
the 16 MiB limit is per file, not a total memory budget.

## Background and scope

The concept comes from maintaining quiz content for TechPSC. This standalone implementation does not include the TechPSC app, production question banks, premium material, backend, admin tools, user records, or credentials. Its English and Nepali examples are synthetic and original.

No adoption or download figures are claimed. TechPSC app usage is not evidence of toolkit adoption. The repository demonstrates its own checks through examples, automated tests, and GitHub Actions. **No TechPSC production integration is claimed.**

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [MAINTAINING.md](MAINTAINING.md), and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
The repository must remain useful without access to private TechPSC systems.
Add tests for every behavior change and use synthetic data only.

## Roadmap

Ideas and requested improvements are tracked in [GitHub Issues](https://github.com/nilrebreveneid/techpsc-mcq-toolkit/issues). Roadmap items are proposals, not scheduled commitments.

## License

MIT — see [LICENSE](LICENSE). This applies only to the files in this standalone
toolkit, not the TechPSC app, branding or production content. `private: true`
in package.json intentionally prevents accidental npm publication. The source
remains public and usable from GitHub; npm publication is a separate release
decision.
