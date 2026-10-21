# Security and privacy

The tool has no network calls, credentials or telemetry. It reads only the input
path selected by the caller, and never changes question-bank files. Tests create
and remove their own uniquely named temporary fixtures.

Scope limitations:

- This is a structural validator, not a sanitizer, factual reviewer or sandbox.
- Do not execute downloaded question content or render it as trusted HTML.
- Reports omit question and option contents, but filenames and counts can still
  be sensitive. Review reports before sharing them.
- Avoid directories that are concurrently modified by an untrusted process.
- Symlink entries are skipped, not treated as a security boundary against races.
- File size is bounded per file; total input size and number of files are not.

Do not post a secret, production dataset or exploit against a live service in a
public issue. After publication, use GitHub's private vulnerability-reporting
feature if the maintainer enables it. No dedicated vulnerability inbox or response
time is currently promised.
