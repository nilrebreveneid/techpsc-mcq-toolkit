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

Version 0.1.1 includes a validator, CLI, tests, and original demo questions.
A quiz player is not included. The source is MIT-licensed; no npm package has
been published.

## Install and use

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

Select a directory containing only question-bank JSON files. The CLI recursively
checks `.json` files, ignores hidden folders and `node_modules`, and skips
symbolic-link entries. It never rewrites input files. An explicitly selected
symlink is rejected. Files over 16 MiB are rejected.

```sh
node bin/mcq-check.mjs examples --options 4 --expected 1
```

## What it checks

- Valid UTF-8 JSON and a nonempty `questions` array.
- Nonempty question text and the configured number of text options (default 4).
- Zero-based integer answer indexes within the options array.
- Blank or duplicate answer options.
- Duplicate question text within and across files, using Unicode NFC,
  case-insensitive and whitespace-normalized comparisons.
- Optional unique question IDs, optional explanations, and question counts.

Errors fail validation. Duplicate question text and empty optional explanations
are warnings: they may be intentional. `--fail-on-warnings` treats warnings as a
failed check for CI. Text normalization is not semantic similarity detection;
translations and paraphrases are not automatically identified as duplicates.

**This does not verify factual correctness, educational quality, copyright,
security of URLs, or scientific accuracy.** Answer indexes can be structurally
valid while pointing to factually incorrect answers. Human review is essential.
Image, rich-text and multilingual-object options are outside version 0.1.1;
provide plain string options. Unknown metadata fields are ignored.

## Library API

```js
import { validateQuiz, validateCollection } from './src/validator.mjs';

const result = validateQuiz({
  questions: [{
    question: 'What is 2 + 3?',
    options: ['4', '5', '6', '7'],
    answer: 1
  }]
});
console.log(result.valid, result.issues);

const collection = validateCollection([
  { name: 'sample.json', payload: { questions: [] } }
]);
console.log(collection.errors, collection.warnings);
```

See [FORMAT.md](FORMAT.md) for the input contract. Reports contain issue codes,
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

The concept comes from maintaining quiz content for TechPSC. This standalone
implementation generalizes structural checks used during that work; it does not
include the TechPSC app, production question banks, premium material, backend,
admin tools, user records, or credentials. The English and Nepali demonstration
questions were written for this repository.

No adoption figures, download totals, awards or program acceptance are claimed.
TechPSC app usage is not evidence of adoption of this toolkit.

The repository currently demonstrates the public toolkit's own checks through
synthetic English and Nepali examples, automated tests, and GitHub Actions. It
does not claim integration with TechPSC's production question-bank pipeline.
That integration will be documented only if it is implemented and verified.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [MAINTAINING.md](MAINTAINING.md).
The repository must remain useful without access to private TechPSC systems.
Add tests for every behavior change and use synthetic data only.

## License

MIT — see [LICENSE](LICENSE). This applies only to the files in this standalone
toolkit, not the TechPSC app, branding or production content. `private: true`
in package.json intentionally prevents accidental npm publication. The source
remains public and usable from GitHub; npm publication is a separate release
decision.
