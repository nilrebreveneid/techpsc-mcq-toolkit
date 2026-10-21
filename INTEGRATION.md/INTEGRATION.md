# Use the toolkit in another project

This recipe is for Node.js projects that keep MCQ banks as JSON. It is not evidence that the toolkit is integrated into TechPSC's private production pipeline.

## Install a pinned version

After release v0.1.2 is available, install the exact tag as a development dependency:

```sh
npm install --save-dev git+https://github.com/nilrebreveneid/techpsc-mcq-toolkit.git#v0.1.2
```

Commit package.json and package-lock.json. Add this script to the consuming project's package.json:

```json
{
  "scripts": {
    "check:question-bank": "mcq-check ./question-banks --fail-on-warnings"
  }
}
```

Run npm run check:question-bank before merging content changes. The tool reads files only; it never repairs or uploads them.

## GitHub Actions template

Add this workflow to the consuming repository after adding the dependency and script:

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

## Error-output example

Run the deliberately invalid synthetic fixture:

```sh
node bin/mcq-check.mjs docs/fixtures/invalid-answer.json
```

Expected output (exit code 1):

```text
1 files · 1 questions · 1 errors · 0 warnings
ERROR invalid-answer.json $.questions[0].answer INVALID_ANSWER: answer must be a zero-based integer index into options.
```

## Data and privacy

- Begin with synthetic or already-public examples. Never put paid, licensed, unreleased, or learner-submitted content in a public repository.
- Reports omit question/answer text but include filenames and structural locations. Review paths and CI logs before sharing them.
- For confidential content, verify repository visibility, CI provider, log retention, and runner access; use a controlled self-hosted runner when appropriate.
- The toolkit checks structure only, not factual correctness, copyright, answer quality, or URL safety.

The workflow is a template. Claim project integration only after the consuming repository adopts it and its maintainers verify data and CI boundaries.
