/**
 * The deck's rules, and the cases that nearly got through.
 *
 * Every assertion here has a counterpart in the schema — `cards_code_shape`,
 * `cards_one_per_cell`, `tracks_tempo_sane`, the write-once trigger — and
 * `deck.db.test.ts` is what proves the database refuses the same things. This
 * file is about the FORM: the operator should be told in a sentence, before a
 * write is sent, rather than shown a Postgres error code afterwards.
 */
import { describe, expect, it } from 'vitest';
import {
  CELLS,
  CODE_CEILING,
  cardIdFor,
  cellId,
  codeFor,
  isAxisValue,
  isCardCode,
  isLicenceType,
  nextFreeCode,
  nextId,
  parseCellId,
  sameCell,
  validateArtwork,
  validateCard,
  validateTrack,
} from './deckRules';

describe('a card code', () => {
  it('runs MC-01 to MC-99', () => {
    expect(isCardCode('MC-01')).toBe(true);
    expect(isCardCode('MC-09')).toBe(true);
    expect(isCardCode('MC-10')).toBe(true);
    expect(isCardCode('MC-99')).toBe(true);
  });

  /* The three that a looser regex lets through, and each would reach paper. */
  it('is not MC-00, MC-1 or MC-100', () => {
    expect(isCardCode('MC-00')).toBe(false);
    expect(isCardCode('MC-1')).toBe(false);
    expect(isCardCode('MC-100')).toBe(false);
  });

  it('is not another prefix, lower case, or padded with spaces', () => {
    expect(isCardCode('XX-01')).toBe(false);
    expect(isCardCode('mc-01')).toBe(false);
    expect(isCardCode(' MC-01')).toBe(false);
    expect(isCardCode('MC-01 ')).toBe(false);
    expect(isCardCode('')).toBe(false);
  });

  it('implies its id, which is the lower case and nothing else', () => {
    expect(cardIdFor('MC-07')).toBe('mc-07');
  });

  it('is built zero-padded from a number', () => {
    expect(codeFor(1)).toBe('MC-01');
    expect(codeFor(10)).toBe('MC-10');
  });
});

describe('the next free code', () => {
  it('is the lowest nobody has taken', () => {
    expect(nextFreeCode(['MC-01', 'MC-02'])).toBe('MC-03');
  });

  it('fills a hole rather than counting from the end', () => {
    expect(nextFreeCode(['MC-01', 'MC-03'])).toBe('MC-02');
  });

  it('is MC-01 for an empty deck', () => {
    expect(nextFreeCode([])).toBe('MC-01');
  });

  /**
   * THE WHOLE POINT. A retired card keeps its code forever, so the list this
   * is given is every code the deck has ever had. Offering MC-03 again would
   * make every diary entry that drew the first MC-03 point at a card it never
   * drew.
   */
  it('does not re-offer a retired card\'s code', () => {
    const everUsed = ['MC-01', 'MC-02', 'MC-03'];
    expect(nextFreeCode(everUsed)).toBe('MC-04');
  });

  it('is case-insensitive about what counts as taken', () => {
    expect(nextFreeCode(['mc-01'])).toBe('MC-02');
  });

  it('is null when all ninety-nine are gone', () => {
    const all = Array.from({ length: CODE_CEILING }, (_, i) => codeFor(i + 1));
    expect(nextFreeCode(all)).toBeNull();
  });
});

describe('the grid', () => {
  it('is twenty-five cells', () => {
    expect(CELLS).toHaveLength(25);
  });

  it('is in reading order — top row first, left to right', () => {
    expect(CELLS[0]).toEqual({ valence: -2, arousal: 2 });
    expect(CELLS[4]).toEqual({ valence: 2, arousal: 2 });
    expect(CELLS[24]).toEqual({ valence: 2, arousal: -2 });
  });

  it('holds every position exactly once', () => {
    const ids = new Set(CELLS.map(cellId));
    expect(ids.size).toBe(25);
  });

  it('runs −2 to +2 and no further', () => {
    expect(isAxisValue(-2)).toBe(true);
    expect(isAxisValue(2)).toBe(true);
    expect(isAxisValue(-3)).toBe(false);
    expect(isAxisValue(3)).toBe(false);
    expect(isAxisValue(1.5)).toBe(false);
  });

  /* The id is what `content_edits.row_id` carries for a cell, and what
     `admin_write` splits back apart — so it has to survive the round trip. */
  it('names a cell by its position, and reads it back', () => {
    for (const cell of CELLS) {
      expect(parseCellId(cellId(cell))).toEqual(cell);
    }
  });

  it('refuses an id that is not a position', () => {
    expect(parseCellId('3,0')).toBeNull();
    expect(parseCellId('1')).toBeNull();
    expect(parseCellId('1,2,3')).toBeNull();
    expect(parseCellId('a,b')).toBeNull();
  });

  it('compares two cells, nulls included', () => {
    expect(sameCell({ valence: 1, arousal: 1 }, { valence: 1, arousal: 1 })).toBe(true);
    expect(sameCell({ valence: 1, arousal: 1 }, { valence: 1, arousal: 2 })).toBe(false);
    expect(sameCell(null, null)).toBe(true);
    expect(sameCell(null, { valence: 0, arousal: 0 })).toBe(false);
  });
});

describe('the next opaque id', () => {
  it('follows the highest in use', () => {
    expect(nextId('trk', ['trk-01', 'trk-09'])).toBe('trk-10');
    expect(nextId('art', ['art-01'])).toBe('art-02');
  });

  it('starts at 01', () => {
    expect(nextId('trk', [])).toBe('trk-01');
  });

  /* The highest, not the count — five pieces with ids up to trk-09 must not
     mint trk-06 and collide. */
  it('is the highest and not the count', () => {
    expect(nextId('trk', ['trk-01', 'trk-04', 'trk-09'])).toBe('trk-10');
  });
});

describe('a licence type', () => {
  it('is one of the three', () => {
    expect(isLicenceType('subscription')).toBe(true);
    expect(isLicenceType('per_track')).toBe(true);
    expect(isLicenceType('none_yet')).toBe(true);
  });

  it('is not prose', () => {
    expect(isLicenceType('Epidemic Sound')).toBe(false);
    expect(isLicenceType('')).toBe(false);
  });
});

describe('validating a card', () => {
  const placed = { code: 'MC-10', valence: 1, arousal: 1 };

  it('passes a well-formed one', () => {
    expect(validateCard(placed, ['MC-01'])).toEqual([]);
  });

  it('refuses a code outside the space, and says what the space is', () => {
    const problems = validateCard({ ...placed, code: 'MC-100' }, []);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('MC-01 to MC-99');
  });

  it('refuses a code that has ever been used, and says why', () => {
    const problems = validateCard(placed, ['MC-10']);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('never reused');
  });

  /* A card off the grid is legal — made but not yet dealt. */
  it('allows a card with no cell at all', () => {
    expect(validateCard({ code: 'MC-10', valence: null, arousal: null }, [])).toEqual([]);
  });

  it('refuses half a coordinate', () => {
    const problems = validateCard({ code: 'MC-10', valence: 1, arousal: null }, []);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('half-placed');
  });

  it('refuses a cell off the grid', () => {
    expect(validateCard({ code: 'MC-10', valence: 3, arousal: 0 }, [])).toHaveLength(1);
  });
});

describe('validating a piece of music', () => {
  const piece = {
    title: 'Little Yellow Petals',
    artist: 'Rachel Sandy',
    album: null,
    releaseYear: null,
    tempoBpm: null,
    licenceType: 'subscription',
    durationSeconds: 219,
  };

  it('passes a credited one', () => {
    expect(validateTrack(piece)).toEqual([]);
  });

  /* The credit is what `reveal-track` exists to say, and it cannot say
     nothing. */
  it('needs a title and an artist', () => {
    expect(validateTrack({ ...piece, title: '   ' })).toHaveLength(1);
    expect(validateTrack({ ...piece, artist: '' })).toHaveLength(1);
  });

  it('leaves everything else optional, because a blank is honest', () => {
    expect(validateTrack({
      ...piece, album: null, releaseYear: null, tempoBpm: null, licenceType: null,
    })).toEqual([]);
  });

  it('refuses an implausible year or tempo', () => {
    expect(validateTrack({ ...piece, releaseYear: 1800 })).toHaveLength(1);
    expect(validateTrack({ ...piece, releaseYear: 2200 })).toHaveLength(1);
    expect(validateTrack({ ...piece, tempoBpm: 0 })).toHaveLength(1);
    expect(validateTrack({ ...piece, tempoBpm: 401 })).toHaveLength(1);
  });

  it('accepts the edges of both', () => {
    expect(validateTrack({ ...piece, releaseYear: 1900, tempoBpm: 1 })).toEqual([]);
    expect(validateTrack({ ...piece, releaseYear: 2100, tempoBpm: 400 })).toEqual([]);
  });

  it('refuses a licence type it does not know', () => {
    expect(validateTrack({ ...piece, licenceType: 'cleared' })).toHaveLength(1);
  });

  /**
   * A duration of zero is what a decoder reports when it could not read the
   * file, and the message has to say that rather than "this field is
   * required" — nobody can fix a measurement by typing in it.
   */
  it('treats a zero duration as a broken upload, not a missing field', () => {
    const problems = validateTrack({ ...piece, durationSeconds: 0 });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('never typed');
  });

  it('allows no duration yet, for a piece with no file', () => {
    expect(validateTrack({ ...piece, durationSeconds: null })).toEqual([]);
  });
});

describe('validating artwork', () => {
  it('needs a file', () => {
    expect(validateArtwork({ src: '', altDe: null, altEn: null })).toHaveLength(1);
  });

  /* Null in BOTH is data: nobody has described the picture yet. */
  it('allows no alt text at all', () => {
    expect(validateArtwork({
      src: 'artworks/art-01.webp', altDe: null, altEn: null,
    })).toEqual([]);
  });

  it('allows alt text in both', () => {
    expect(validateArtwork({
      src: 'artworks/art-01.webp', altDe: 'Ein Feld bei Sonnenaufgang', altEn: 'A field at sunrise',
    })).toEqual([]);
  });

  /* Null in ONE is the dropped translation `missing_translations` reports. */
  it('refuses alt text in one language only', () => {
    const problems = validateArtwork({
      src: 'artworks/art-01.webp', altDe: 'Ein Feld', altEn: null,
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('both languages or in neither');
  });

  it('counts whitespace as nothing written', () => {
    expect(validateArtwork({
      src: 'artworks/art-01.webp', altDe: '   ', altEn: 'A field',
    })).toHaveLength(1);
  });
});
