# TechPSC MCQ Toolkit

A small, dependency-free Node.js toolkit for checking text-based multiple-choice
question banks before they reach learners. English and Nepali Unicode text are
supported. All processing happens locally; there are no network calls, accounts,
analytics, or paid services.

## The problem it addresses

Exam-preparation teams often maintain question banks separately from the app
that displays them. A malformed answer index, missing option, duplicate prompt,
or invalid JSON can make a question confusing or unusable for learners. These
checks are especially useful when a bank contains both English and Nepali text:
Unicode normalization and whitespace differences can otherwise hide repeated
items. This toolkit catches structural issues before a bank is integrated.

It is intended for independent exam-preparation developers, educators, and
small content teams who keep MCQs in JSON. It checks structure and consistency,
not whether an answer is factually correct or pedagogically sound; human review
is still required.

Version 0.1.2 includes a validator, CLI, tests, and original bilingual demo
questions covering arithmetic and basic science.
A quiz player is not included. The source is MIT-licensed; no npm package has
been published.

## Install and use

Architecture and scope: [ARCHITECTURE.md](ARCHITECTURE.md) · CLI interaction guidelines: [CLI_UX.md](CLI_UX.md).

Requires Node.js 22 or newer. The toolkit has no runtime dependencies. Clone it
to validate banks directly:

```sh
git clone https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git
cd techpsc-mcq-toolkit
node --test
node bin/mcq-check.mjs examples
node bin/mcq-check.mjs examples --format json
node bin/mcq-check.mjs /path/to/your/question-banks --fail-on-warnings
```

To use the CLI from another Node.js project, install the public GitHub
repository as a development dependency (this does not publish it to npm):

```sh
npm install --save-dev git+https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git
npx mcq-check ./question-banks --fail-on-warnings
```

Or import the validator from the installed package:

```js
import { validateQuiz } from 'techpsc-mcq-toolkit';
```

For a repeatable project workflow, add a script such as
`"check:question-bank": "mcq-check ./question-banks --fail-on-warnings"` to
your own `package.json` and run it in local checks or CI. Keep real learner or
premium question content out of public fixtures and logs.

See [INTEGRATION.md](INTEGRATION.md) for a pinned-release install example, a
copyable consumer CI workflow, and privacy guidance.

Select a directory containing only question-bank JSON files. The CLI recursively
