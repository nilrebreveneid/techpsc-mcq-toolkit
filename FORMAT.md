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

## Optional topic-coherence keywords

Pass `--topic-keywords path/to/keywords.json` to check whether each matched bank
contains enough questions that mention its expected topic. The JSON file maps a
file-name or `quizId` glob to one or more keywords:

```json
{
  "geometry*.json": ["triangle", "angle", "त्रिभुज", "कोण"],
  "weekly-civil-*": ["surveying", "survey", "सर्वेक्षण"]
}
```

`*` matches any sequence and `?` matches one character. Patterns are matched
against a file's relative path and, when present, its top-level `quizId`;
matching is case-insensitive and NFC/whitespace-normalized. For each question,
the validator searches normalized question text and string options for any
configured keyword as a substring. It does not inspect explanations or infer
semantic similarity. A keyword map matching no file or `quizId` produces no
topic check. The keyword map is configuration, not a question bank, so a
recognized map is skipped during recursive directory validation.

`--min-topic-match` accepts a ratio from `0` through `1` and defaults to `0.5`.
A matched file below that share gets one `TOPIC_LOW_MATCH` warning containing
only the matched/total counts and ratio. Add `--verbose` to include
`TOPIC_NO_KEYWORD` info entries with question indexes only; they do not affect
warning counts or exit status.

## Optional writing-style checks

`--style-checks` enables two warnings; neither is enabled by default.
`ANSWER_POSITION_SKEW` is evaluated for files with at least 20 questions and
warns when one zero-based answer option index holds more than 50% of valid
answers. `OPTION_LENGTH_GIVEAWAY` warns when the correct option is the longest
and more than twice the median option length in at least 60% of questions with
valid answer indexes and nonempty string options. These are heuristic review
signals, not proof of a content defect. No dictionary-based typo checker is
provided.

Reports contain `valid`, counts, `files`, and issue objects with `severity`,
`code`, `path` and `message`. Paths such as `$.questions[0].answer` are zero-based
locations; explanatory messages use human-readable one-based question numbers.
