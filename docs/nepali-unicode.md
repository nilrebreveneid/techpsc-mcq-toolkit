# Nepali and Devanagari Unicode notes

The toolkit reads UTF-8 JSON and preserves the original text. Duplicate-question
checks and optional topic-keyword matching compare text after Unicode NFC
normalization, lowercase conversion, trimming, and collapsing whitespace. The
validator never rewrites a question bank.

## Canonical composition (NFC/NFD)

Some characters can be represented as one precomposed code point or as a base
character followed by a combining mark. These two synthetic spellings of the
same Devanagari text compare equal after NFC normalization:

```js
const composed = '\u0958लम';
const decomposed = '\u0915\u093Cलम';
console.log(composed.normalize('NFC') === decomposed.normalize('NFC')); // true
```

This can prevent duplicate checks or topic matching from missing canonically
equivalent text. NFC does not transliterate text, correct spelling, or equate
different words and punctuation.

## Joiners and shaping

Zero-width joiner (`U+200D`) and zero-width non-joiner (`U+200C`) can affect how
Devanagari conjuncts are shaped. They are intentionally **not removed** by the
toolkit: they may be meaningful to rendering, and removing them could change
text. Strings that look similar on screen but differ by a joiner may therefore
not compare as duplicates. When a suspected duplicate is missed, inspect the
code points or retype the text in a trusted editor rather than deleting format
characters blindly.

## Other common differences

- Whitespace runs (including line breaks) are collapsed for matching, but the
  source file remains unchanged.
- Nepali digits such as `०१२` are distinct from ASCII `012`. The `answer` field
  must always be a JSON number such as `0`; it is a zero-based option index,
  not a localized digit string.
- The Devanagari danda `।` and ASCII full stop `.` are distinct punctuation.
- Nukta, vowel signs, conjuncts, and spelling variants are not transliterated
  or guessed. NFC only unifies canonically equivalent encodings.

Keep Unicode regression examples short and synthetic. Avoid copying private or
paid question-bank text into tests, bug reports, or CI logs.
