# Maintainer guide

This project is intentionally small, dependency-free, and local-first. Keep
changes useful to maintainers of independent question banks; do not make the
public toolkit depend on private TechPSC systems.

## Issue triage

- Reproduce reports with a small synthetic fixture before changing behavior.
- Ask reporters to remove real learner data, premium material, and private
  question text from public issues.
- Label factual-answer concerns as content-review issues: this validator checks
  structure, not correctness.
- Add a regression test for every confirmed bug fix.

## Pull requests and checks

Run the same checks used in GitHub Actions:

```sh
node --test
npm run check:examples
npm run check:invalid-example
```

Review the format contract, privacy implications of diagnostics, Node.js 22
compatibility, and whether examples remain original/synthetic. Do not merge
changes that add production question banks, credentials, user records, or
network access without a separate documented design and security review.

## Releases

1. Update `package.json` and `CHANGELOG.md` together using semantic versioning.
2. Run tests and strict example validation on the declared minimum Node.js
   version, then review the exact files included by `npm pack --dry-run`.
3. Create a GitHub release whose tag matches the package version and summarize
   user-visible changes and compatibility notes.
4. Keep npm publication separate: `private: true` remains until the maintainer
   explicitly decides to publish and can support the package lifecycle.

## Adoption and impact claims

Report only evidence attributable to this repository, such as actual downloads,
external issues, contributions, or verified integrations. TechPSC app usage is
context about the problem and maintainer experience; it is not toolkit adoption.
