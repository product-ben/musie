import { describe, expect, it } from 'vitest';
import { stripFillers } from './fillers';

/**
 * F.3. Three things are being pinned down here, and the middle one is the
 * reason this file is language-aware at all:
 *
 *  1. the hesitation sounds come off, and what is left is punctuated like
 *     something a person wrote rather than like something a regex edited;
 *  2. THE um/äh SPLIT — the obvious English fillers are ordinary German words,
 *     so stripping the English list from German speech destroys meaning
 *     silently. "Ich komme um fünf" is not hesitating;
 *  3. a statement that was nothing but hesitation comes back as "", because
 *     the caller drops those rather than showing an empty box.
 *
 * One behaviour worth naming before it surprises somebody: the function
 * ALWAYS capitalises the first character, whether or not it removed anything.
 * It has to — removing a leading filler leaves the next word lower-case — and
 * it cannot know whether it removed a leading one without tracking it, so the
 * tests below assert the capital everywhere rather than pretending it is
 * conditional.
 */
describe('stripFillers', () => {
  /* ── German ───────────────────────────────────────────────────────────── */

  it('removes the German hesitation sounds', () => {
    expect(stripFillers('Äh, mir geht es gut', 'de')).toBe('Mir geht es gut');
    expect(stripFillers('Ähm, ich bin müde', 'de')).toBe('Ich bin müde');
    expect(stripFillers('Öhm, keine Ahnung', 'de')).toBe('Keine Ahnung');
    expect(stripFillers('Hmm, ja', 'de')).toBe('Ja');
  });

  it('removes a parenthetical filler without stranding its comma', () => {
    expect(stripFillers('Ich bin, ähm, müde', 'de')).toBe('Ich bin müde');
    expect(stripFillers('Es war, äh, ganz okay', 'de')).toBe('Es war ganz okay');
  });

  it('leaves a space where it removed a word, not nothing', () => {
    // Without this the two neighbours close up into one word, which is the
    // failure the implementation's own comment names.
    expect(stripFillers('Ich war äh wirklich müde', 'de')).toBe('Ich war wirklich müde');
  });

  it('pulls the punctuation back onto the word it belongs to', () => {
    expect(stripFillers('Ich bin müde, äh.', 'de')).toBe('Ich bin müde.');
    expect(stripFillers('Ich bin müde, ähm!', 'de')).toBe('Ich bin müde!');
  });

  it('capitalises what is left when the filler was in front of it', () => {
    expect(stripFillers('äh ich weiß nicht', 'de')).toBe('Ich weiß nicht');
    expect(stripFillers('ähm, vielleicht', 'de')).toBe('Vielleicht');
  });

  it('matches whatever case the sound was transcribed in', () => {
    expect(stripFillers('ÄHM, ich bin müde', 'de')).toBe('Ich bin müde');
    expect(stripFillers('Ähm, ich bin müde', 'de')).toBe('Ich bin müde');
  });

  it('does not touch a real word that starts with a hesitation sound', () => {
    // \b is ASCII-only, so "äh" would not see its own boundaries — the
    // implementation uses Unicode lookarounds instead, and this is what they
    // are for. "ähnlich" is the word that breaks the naive version.
    expect(stripFillers('Das war ähnlich wie gestern', 'de')).toBe(
      'Das war ähnlich wie gestern',
    );
    expect(stripFillers('Ähnlich wie gestern', 'de')).toBe('Ähnlich wie gestern');
    expect(stripFillers('Der Hammer lag da', 'de')).toBe('Der Hammer lag da');
  });

  /* ── The um / äh split ────────────────────────────────────────────────── */

  it('does NOT remove "um" from German, because "um" is a German word', () => {
    expect(stripFillers('Ich komme um fünf Uhr', 'de')).toBe('Ich komme um fünf Uhr');
    expect(stripFillers('Es ging um meine Mutter', 'de')).toBe('Es ging um meine Mutter');
  });

  it('does NOT remove "er" from German either', () => {
    expect(stripFillers('er sagt, dass es gut war', 'de')).toBe('Er sagt, dass es gut war');
  });

  it('DOES remove "um" and "er" from English, where they are hesitation', () => {
    expect(stripFillers('I um went home', 'en')).toBe('I went home');
    expect(stripFillers('It was, er, fine', 'en')).toBe('It was fine');
    expect(stripFillers('Erm, I think so', 'en')).toBe('I think so');
  });

  it('shows what the split is protecting: the English list applied to German', () => {
    // NOT a recommendation — a demonstration. This is the exact damage the
    // language parameter exists to prevent, and it is silent: the sentence
    // still reads as a sentence, and it now says something else.
    expect(stripFillers('Um fünf Uhr', 'en')).toBe('Fünf Uhr');
  });

  it('keeps English words that merely contain a filler', () => {
    expect(stripFillers('The number is um seven', 'en')).toBe('The number is seven');
    expect(stripFillers('Summer was quiet', 'en')).toBe('Summer was quiet');
    expect(stripFillers('I was there', 'en')).toBe('I was there');
  });

  it('removes only what is unambiguous when the language is unknown', () => {
    // "auto": OpenAI was asked to detect the language and has not said yet.
    // "äh" is a hesitation in both languages; "um", "uh", "er" and "hm" are
    // ordinary words in at least one, so they stay.
    expect(stripFillers('Äh, mir geht es gut', 'auto')).toBe('Mir geht es gut');
    expect(stripFillers('Ähm, ich bin müde', 'auto')).toBe('Ich bin müde');
    expect(stripFillers('I um went home', 'auto')).toBe('I um went home');
    expect(stripFillers('Ich komme um fünf', 'auto')).toBe('Ich komme um fünf');
    expect(stripFillers('Hm, ja', 'auto')).toBe('Hm, ja');
  });

  it('treats an unrecognised language tag as unknown rather than as English', () => {
    // A detected "fr" or a "de-DE" must not fall through to the English list.
    expect(stripFillers('I um went home', 'fr')).toBe('I um went home');
    expect(stripFillers('Ich komme um fünf', 'de-DE')).toBe('Ich komme um fünf');
  });

  /* ── The whole statement was hesitation ───────────────────────────────── */

  it('returns "" when nothing but hesitation was said', () => {
    expect(stripFillers('Äh', 'de')).toBe('');
    expect(stripFillers('Ähm, äh', 'de')).toBe('');
    expect(stripFillers('Ähm… äh, hmm.', 'de')).toBe('');
    expect(stripFillers('Hmm, hm, mhm', 'de')).toBe('');
    expect(stripFillers('Um, uh, um…', 'en')).toBe('');
    expect(stripFillers('Er… erm.', 'en')).toBe('');
  });

  it('returns "" for an empty or punctuation-only statement', () => {
    expect(stripFillers('', 'de')).toBe('');
    expect(stripFillers('   ', 'de')).toBe('');
    expect(stripFillers('…', 'de')).toBe('');
    expect(stripFillers('...', 'de')).toBe('');
  });

  it('keeps a digit-only statement, because a number is something said', () => {
    // The emptiness test is "no letters AND no numbers", not "no letters".
    expect(stripFillers('Äh, 1995', 'de')).toBe('1995');
  });

  it('does not empty a statement whose hesitation it was not allowed to remove', () => {
    // The mirror of the split: in "auto" the same statement is all filler and
    // survives whole, because nothing here is safe to remove. A statement the
    // user never meant is better than a statement the tool invented.
    expect(stripFillers('Um, uh', 'auto')).toBe('Um, uh');
  });

  /* ── Leftovers ────────────────────────────────────────────────────────── */

  it('collapses the whitespace a removal left behind', () => {
    expect(stripFillers('Ich   war äh   müde', 'de')).toBe('Ich war müde');
  });

  it('drops the punctuation a leading filler was carrying', () => {
    expect(stripFillers('Ähm. Ich bin müde', 'de')).toBe('Ich bin müde');
    expect(stripFillers('… äh, ich bin müde', 'de')).toBe('Ich bin müde');
  });

  it('leaves a clean statement exactly as it was, apart from the capital', () => {
    expect(stripFillers('Mir geht es heute wirklich gut.', 'de')).toBe(
      'Mir geht es heute wirklich gut.',
    );
    expect(stripFillers('mir geht es gut', 'de')).toBe('Mir geht es gut');
  });
});
