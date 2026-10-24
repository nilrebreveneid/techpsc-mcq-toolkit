# CLI user-experience guidelines

These guidelines cover the public command-line tool only. This repository does
not contain a quiz player or the TechPSC app's visual UI system.

## Interaction principles

- Require an explicit file or directory; never scan the current directory by
  default.
- Keep normal output compact: one summary line, then only actionable issues.
- Include severity, relative filename, JSON path, stable issue code, and a
  concise explanation for each issue.
- Keep JSON output machine-readable and stable enough for scripts; do not print
  ANSI decoration into JSON mode.
- Avoid exposing question text, answer values, or operating-system paths in
  diagnostics.
- Never modify source question-bank files. Users can safely rerun validation.
- Explain failures through clear exit codes: `0` passes, `1` validation fails,
  `2` usage or input failures.
- Make warning policy explicit: duplicates are warnings by default and can be
  made CI-blocking with `--fail-on-warnings`.
- Keep topic-coherence and style heuristics opt-in. Topic diagnostics report
  counts/ratios and indexes, never question text, answer text, or keywords.
- Keep `--help` available and document input limits and unsupported content.

## Accessibility and localization

Text output should remain readable in a standard terminal, including terminals
without color or Unicode decoration. Preserve Nepali Unicode in inputs and
outputs. Do not rely on color alone to distinguish errors from warnings.

## Example

```text
2 files · 40 questions · 0 errors · 1 warnings
WARNING gk.json $.questions[3] CROSS_FILE_DUPLICATE: Normalized text also appears in civil.json, question 2.
```

## Optional topic-coherence check

Use `--topic-keywords` with a JSON mapping from file-name or `quizId` globs to
English and/or Nepali keywords. The default minimum share is `0.5`; override it
with `--min-topic-match 0.6`. `--verbose` adds info-level question indexes only.
For example, given `geometry-scrambled.json` and
`{"geometry*.json":["triangle","त्रिभुज"]}`:

```text
$ node bin/mcq-check.mjs examples/topic-coherence --topic-keywords examples/topic-coherence/keywords.json
2 files · 8 questions · 0 errors · 1 warnings
WARNING geometry-scrambled.json $.questions TOPIC_LOW_MATCH: Topic keywords matched 0 of 4 questions (0.0%); minimum is 50.0%.
```

`--style-checks` opts into `ANSWER_POSITION_SKEW` and
`OPTION_LENGTH_GIVEAWAY` heuristics. These are warnings intended for review, not
automatic judgments of question quality. Informational `TOPIC_NO_KEYWORD`
entries do not change warning counts or exit codes.

The current CLI follows these conventions. Any future localization or richer
output format should preserve stable issue codes and paths for automation.
