import { describe, expect, it } from 'vitest';
import { segment, splitOnPunctuation } from './segmentation';

/**
 * F.3. `splitOnPunctuation` is a HEURISTIC, and these tests are written to pin
 * the heuristic down rather than to claim it is a parser: where it errs, the
 * test says which way it errs and why that is the safer direction. Cutting one
 * spoken thought into two statements is the expensive mistake — the person
 * then has to drag two boxes back together — and leaving two thoughts in one
 * box costs a tap on Edit. So every guard here trades a missed split for a
 * false one.
 */
describe('splitOnPunctuation', () => {
  it('splits on each of the four terminators', () => {
    expect(splitOnPunctuation('Mir geht es gut. Ich bin müde.')).toEqual([
      'Mir geht es gut.',
      'Ich bin müde.',
    ]);
    expect(splitOnPunctuation('Wie geht es dir? Gut.')).toEqual(['Wie geht es dir?', 'Gut.']);
    expect(splitOnPunctuation('Das war schön! Wirklich.')).toEqual([
      'Das war schön!',
      'Wirklich.',
    ]);
    expect(splitOnPunctuation('Ich weiß nicht… Vielleicht doch.')).toEqual([
      'Ich weiß nicht…',
      'Vielleicht doch.',
    ]);
  });

  it('needs whitespace after the terminator, so a decimal or a domain survives', () => {
    expect(splitOnPunctuation('Ich habe 1.000 Schritte gemacht.')).toEqual([
      'Ich habe 1.000 Schritte gemacht.',
    ]);
  });

  it('keeps a transcript with no terminator as one statement', () => {
    expect(splitOnPunctuation('mir geht es heute ganz okay')).toEqual([
      'mir geht es heute ganz okay',
    ]);
  });

  it('trims each piece and drops what is left over', () => {
    expect(splitOnPunctuation('  Eins.   Zwei.  ')).toEqual(['Eins.', 'Zwei.']);
    expect(splitOnPunctuation('')).toEqual([]);
    expect(splitOnPunctuation('   ')).toEqual([]);
  });

  /* ── The German abbreviations ──────────────────────────────────────────── */

  it('does not split after a German abbreviation', () => {
    expect(splitOnPunctuation('Ich war z.B. müde.')).toEqual(['Ich war z.B. müde.']);
    expect(splitOnPunctuation('Das heißt d.h. eigentlich nichts.')).toEqual([
      'Das heißt d.h. eigentlich nichts.',
    ]);
    expect(splitOnPunctuation('Ca. zehn Minuten Ruhe.')).toEqual(['Ca. zehn Minuten Ruhe.']);
    expect(splitOnPunctuation('Vgl. Dienstag.')).toEqual(['Vgl. Dienstag.']);
  });

  it('matches the abbreviation whatever case it was transcribed in', () => {
    // The Realtime API capitalises sentence-initially, so the same
    // abbreviation arrives as "Z.B." at the start of a turn and "z.B." inside
    // one. The set is lower-case and the lookup lower-cases what it compares.
    expect(splitOnPunctuation('Z.B. heute Morgen.')).toEqual(['Z.B. heute Morgen.']);
    expect(splitOnPunctuation('Ich denke Z.B. an gestern.')).toEqual([
      'Ich denke Z.B. an gestern.',
    ]);
  });

  it('holds an abbreviation together even when the next word really did start a new sentence', () => {
    // THE HEURISTIC ERRING, ON PURPOSE. "usw." ends a sentence at least as
    // often as it sits inside one, and nothing in the text can tell the
    // difference. Joining is the cheaper mistake: one Edit, rather than two
    // boxes to drag back together.
    expect(splitOnPunctuation('Ich habe gelesen, gekocht usw. Dann war es spät.')).toEqual([
      'Ich habe gelesen, gekocht usw. Dann war es spät.',
    ]);
  });

  it('carries the English abbreviations too, because the transcript can be either language', () => {
    expect(splitOnPunctuation('I felt tired, e.g. after lunch.')).toEqual([
      'I felt tired, e.g. after lunch.',
    ]);
    expect(splitOnPunctuation('Dr. Meier hat angerufen.')).toEqual(['Dr. Meier hat angerufen.']);
  });

  it('splits normally after a word that merely ends in a full stop', () => {
    // The guard is a lookup in a fixed set, not a rule about short words.
    expect(splitOnPunctuation('Ich war im Bad. Danach war ich ruhig.')).toEqual([
      'Ich war im Bad.',
      'Danach war ich ruhig.',
    ]);
  });

  /* ── The lower-case continuation ───────────────────────────────────────── */

  it('keeps a hesitant thought together when it resumes in lower case', () => {
    // The case that named the guard: a pause mid-thought, not a full stop.
    expect(splitOnPunctuation('Ich weiß nicht… vielleicht doch.')).toEqual([
      'Ich weiß nicht… vielleicht doch.',
    ]);
    expect(splitOnPunctuation('mir geht es. ganz okay')).toEqual(['mir geht es. ganz okay']);
  });

  it('starts a new statement at a capital, which is what German nouns guarantee', () => {
    expect(splitOnPunctuation('Es war ruhig. Der Morgen war lang.')).toEqual([
      'Es war ruhig.',
      'Der Morgen war lang.',
    ]);
  });

  it('cannot see a lower-case first word as a new sentence, and that is the known cost', () => {
    // "ich" is lower-case mid-sentence in German, so a genuinely new sentence
    // beginning with it is absorbed. Same trade as the abbreviation guard.
    expect(splitOnPunctuation('Es war ruhig. ich war müde.')).toEqual([
      'Es war ruhig. ich war müde.',
    ]);
  });

  it('absorbs a run of continuations into the statement they belong to', () => {
    expect(splitOnPunctuation('Ich denke z.B. an gestern… also eher an den Abend. Gut.')).toEqual([
      'Ich denke z.B. an gestern… also eher an den Abend.',
      'Gut.',
    ]);
  });

  it('normalises the whitespace it joined across', () => {
    expect(splitOnPunctuation('Ich weiß nicht…     vielleicht.')).toEqual([
      'Ich weiß nicht… vielleicht.',
    ]);
  });
});

describe('segment', () => {
  it('splits only in punctuation mode', () => {
    const turn = 'Mir geht es gut. Ich bin müde.';
    expect(segment(turn, 'punctuation')).toEqual(['Mir geht es gut.', 'Ich bin müde.']);
    // silence and semantic already arrive one chunk per turn, so the text is
    // handed on whole however many full stops it happens to contain.
    expect(segment(turn, 'silence')).toEqual([turn]);
    expect(segment(turn, 'semantic')).toEqual([turn]);
  });

  it('yields nothing for an empty or blank turn, in every mode', () => {
    for (const mode of ['silence', 'semantic', 'punctuation'] as const) {
      expect(segment('', mode)).toEqual([]);
      expect(segment('   \n  ', mode)).toEqual([]);
    }
  });

  it('trims the turn before anything else looks at it', () => {
    expect(segment('  Ich bin müde.  ', 'silence')).toEqual(['Ich bin müde.']);
    expect(segment('  Ich bin müde.  ', 'punctuation')).toEqual(['Ich bin müde.']);
  });
});
