# Toolkit architecture

This document describes only the public MCQ validation toolkit. It is not an
architecture guide for the TechPSC Android app or its private services.

## Design goals

- Validate text-based MCQ JSON locally with no network access or runtime
  dependencies.
- Keep the library usable from Node.js code and expose the same checks through
  a small command-line interface.
- Report actionable locations and stable issue codes without echoing question
  text, option text, or answer values.
- Treat validation as structural: factual and pedagogical review remains a
  human responsibility.

## Components and flow

```text
JSON file(s) -> CLI input collection/parsing -> validateCollection()
                                           -> validateQuiz()
                                           -> summarize()
                                           -> text or JSON report + exit code
```

- `src/validator.mjs` implements settings validation, single-quiz checks,
  cross-file duplicate checks, and aggregate summaries. It does not mutate its
  inputs or access the filesystem/network.
- `bin/mcq-check.mjs` parses arguments, discovers JSON files under an explicit
  input path, safely reads bounded UTF-8 JSON, calls the library, and formats
  results. It skips hidden directories, `node_modules`, and symlinks when
  traversing a directory. An explicitly supplied symlink is rejected.
- `examples/` contains original synthetic English and Nepali fixtures.
- `test/` contains Node's built-in test-runner coverage for library and CLI
  behavior.
- `.github/workflows/validate.yml` runs tests and strict example validation on
  Node.js 22 for pushes and pull requests.

## Trust and data boundaries

The CLI reads only the path explicitly provided by its caller. It does not
rewrite files, upload content, or emit question/option/answer values in reports.
Directory traversal ignores symlinks and hidden folders. Each JSON file is
limited to 16 MiB; this per-file limit is not a total process memory budget.
Validation is not a security sandbox and should not be pointed at directories
being concurrently modified by untrusted processes.

Unknown metadata is ignored. The format currently supports plain Unicode text
and string options; it does not validate image/rich content, semantic
similarity, factual accuracy, copyright, or answer correctness.

## Change guidance

Preserve the library/CLI separation and deterministic behavior. For behavior
changes, add synthetic regression tests, update `FORMAT.md` or the README when
the public contract changes, and review report privacy. See `MAINTAINING.md` for
release and review checks.
