/**
 * Removes hesitation sounds when a statement is finalised.
 *
 * The lists are deliberately conservative and language-aware, because the
 * obvious English fillers are ordinary German words: "um" ("um fünf Uhr") and
 * "er" ("er sagt") would wreck a German transcript. When the language is not
 * known, only sounds that are unambiguous in both languages are removed.
 */
const GERMAN = ['äh', 'ähh', 'ähm', 'ähhm', 'ähem', 'öh', 'öhm', 'hm', 'hmm', 'hmmm', 'mhm', 'mmh'];

const ENGLISH = ['um', 'umm', 'ummm', 'uh', 'uhh', 'uhm', 'er', 'erm', 'hm', 'hmm', 'hmmm', 'mm', 'mmm'];

/** Safe in either language: no German or English word collides with these. */
const AMBIGUOUS_SAFE = ['äh', 'ähh', 'ähm', 'ähhm', 'öh', 'öhm', 'hmm', 'hmmm', 'mhm'];

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function fillersFor(language: string): string[] {
  if (language === 'de') return GERMAN;
  if (language === 'en') return ENGLISH;
  return AMBIGUOUS_SAFE;
}

/**
 * @returns the cleaned statement, or "" when nothing but hesitation was said —
 *          the caller drops those rather than showing an empty box.
 */
export function stripFillers(text: string, language: string): string {
  const words = fillersFor(language);
  // \b is ASCII-only, so "äh" would not match on its own boundaries. Unicode
  // lookarounds do the same job for umlauts.
  // The leading `,` is optional so a parenthetical filler — "Ich bin, ähm,
  // müde" — does not leave its opening comma stranded.
  const pattern = new RegExp(
    `(?:,\\s*)?(?<![\\p{L}\\p{N}])(?:${words.map(escape).join('|')})(?![\\p{L}\\p{N}])[\\s,]*`,
    'giu',
  );

  const cleaned = text
    // A space, not nothing, or "I was, uh, really" closes up to "I wasreally".
    .replace(pattern, ' ')
    // Tidy what removal left behind.
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?…;:])/g, '$1')
    .replace(/^[\s,;:…]+/, '')
    .replace(/^[.!?]+\s*/, '')
    .trim();

  // Nothing but punctuation left means the whole statement was hesitation.
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return '';

  // Removing a leading filler leaves the next word lower-case mid-sentence.
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
