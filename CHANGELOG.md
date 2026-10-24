# Changelog

## 0.2.0 — 2026-10-24

- Add opt-in topic-coherence checks with file/quizId keyword globs, Unicode
  normalization, configurable match thresholds, privacy-safe warnings, and
  verbose index-only details.
- Add opt-in answer-position skew and correct-option length-giveaway warnings.
- Add original synthetic topic-coherence examples and tests for English,
  Nepali NFC/NFD, thresholds, privacy, style checks, CLI errors, and Unicode
  paths.
- Document the topic-keyword format, optional checks, architecture, CLI output,
  and Nepali/Devanagari Unicode behavior.
- Add Contributor Covenant 2.1, GitHub issue forms, a pull-request checklist,
  repository badges, and an unscheduled GitHub Issues roadmap.
- Expand CI to Node.js 22 and 24 on Ubuntu and Windows.
- Add scheduled CI, concurrency cancellation, and an intentionally invalid
  bilingual fixture that CI verifies is rejected without exposing question text.
- Clarify private vulnerability reporting, supported versions, and the target
  acknowledgement window.
- Align the README and package homepage with the public project page.
- Keep the package dependency-free and `private: true`; no npm publication or
  TechPSC production integration is claimed.

## 0.1.2 — 2026-10-21

- Expand original English and Nepali samples to six questions across arithmetic and basic science.
- Add a consumer integration guide with a pinned GitHub dependency example and privacy-safe CI guidance.
- Make the example-check script fail on warnings and use it in repository CI.
- Include the integration guide and documentation fixtures in package contents.

## 0.1.1 — 2026-10-21

- Explain the education and bilingual data-quality problem and identify the intended users.
- Document GitHub-based installation and integration into a Node.js project’s validation script.
- Add automated GitHub Actions checks for tests and synthetic English/Nepali examples.
- Add a regression test for whitespace-normalized duplicate Nepali questions.
- Add maintainer and release guidance; clarify that production integration and toolkit adoption are not claimed.
