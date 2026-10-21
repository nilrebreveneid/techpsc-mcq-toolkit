# MCQ JSON format, version 0.1

The root must be an object with a nonempty `questions` array. Optional `title`
and unknown metadata are allowed but not validated.

```json
{
  "title": "Demo",
  "questions": [
    {
      "id": "demo-1",
      "question": "What is 2 + 3?",
      "options": ["4", "5", "6", "7"],
      "answer": 1,
      "explanation": "Two plus three equals five."
    }
  ]
}
```

| Field | Required | Contract |
| --- | --- | --- |
| `question` | Yes, or `q` | Nonempty Unicode string |
| `q` | Alternative | Legacy alias; if both fields exist they must be identical |
| `options` | Yes | Array of nonempty, distinct strings; default exactly 4 |
| `answer` | Yes | Integer, zero-based; `0` selects the first option |
| `id` | No | Nonempty string, unique within the file |
| `explanation` | No | Nonempty string recommended; invalid/empty values produce a warning |

Answer indexes always use JSON numeric values, not quoted numbers or Nepali digit
strings. For example, `"answer": 2` selects the third option. No automatic
one-based conversion or answer inference is performed.

Use `--options N` to change the number of options and `--expected N` to require a
specific number of questions per file. Each selected file must satisfy the same
settings. Mixed question counts can be checked in separate invocations.

Question text is normalized to NFC, lowercase and single whitespace for duplicate
checks. Original text is never modified. Identical text with different diagrams
can produce a warning: image-aware question identity is not supported yet.

Reports contain `valid`, counts, `files`, and issue objects with `severity`,
`code`, `path` and `message`. Paths such as `$.questions[0].answer` are zero-based
locations; explanatory messages use human-readable one-based question numbers.
