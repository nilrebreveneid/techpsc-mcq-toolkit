# Use the toolkit in another project

This guide is a reusable integration recipe for a Node.js project that keeps MCQ banks as JSON. It is not evidence that the toolkit is wired into TechPSC’s private production pipeline.

## Pin the toolkit release

After the `v0.1.2` GitHub release is available, add that exact tag as a dev dependency from the project that owns the question banks:

```sh
npm install --save-dev git+https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git#v0.1.2
```

Commit the resulting `package.json` and `package-lock.json`. In the consuming project’s `package.json`, add:

```json
{
  "scripts": {
    "check:question-bank": "mcq-check ./question-banks --fail-on-warnings"
  }
}
```

Run `npm run check:question-bank` before merging content changes. The tool only reads JSON and exits nonzero for structural errors (and for warnings when the flag is enabled); it does not repair or upload files.

## GitHub Actions template

Add this workflow to a consuming Node.js repository after adding the pinned dependency and script above:

```yaml
name: Validate question banks

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check:question-bank
```

For an offline smoke test of the CLI’s error format, use the deliberately invalid, synthetic fixture in `docs/fixtures/invalid-answer.json`:

```sh
node bin/mcq-check.mjs docs/fixtures/invalid-answer.json
```

Expected output (exit code `1`):

```text
1 files · 1 questions · 1 errors · 0 warnings
ERROR invalid-answer.json $.questions[0].answer INVALID_ANSWER: answer must be a zero-based integer index into options.
```

## Data and privacy boundaries

- Start with synthetic or already-public example banks.
- Do not commit paid, licensed, unreleased, or learner-submitted content to a public repository.
- Validation reports omit question and answer text, but they include filenames and structural locations. Review filenames and CI logs before sharing them.
- If content must remain confidential, confirm the CI provider, repository visibility, log retention and runner access meet your requirements; use a controlled self-hosted runner where appropriate.
- The toolkit validates structure only. It does not check factual correctness, copyright, answer quality, or security of external resources.

The workflow above is intentionally a copyable template. Claim a real project integration only after the consuming repository has adopted it and its owners have verified the data and CI boundaries.
