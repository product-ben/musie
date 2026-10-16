/**
 * `music.mjs` — the rules that decide what reaches the two tables.
 *
 * This is also the only TypeScript that imports every export of
 * `scripts/music.d.mts`, so it is what keeps that hand-written declaration
 * honest — the arrangement `deck.test.ts` already has for the deck.
 *
 * The real library in `supabase/content/music.json` is read at the bottom,
 * because a validator that passes every test here and rejects the file in the
 * repository would be a validator nobody can use.
 */
import { describe, expect, it } from 'vitest';

import {
  ENDINGS, LOCALES, POSTURES, assertMusic, checkMusic, introSeconds, orderedPieces,
  orderedCuts, readMusic, cutId, rows,
} from '../../scripts/music.mjs';
import type { MusicLibrary, MusicPiece, MusicCut } from '../../scripts/music.mjs';

const piece = (over: Partial<MusicPiece> = {}): MusicPiece => ({
  id: 'trk-10',
  title: 'Klangreise',
  artist: 'Somebody Real',
  licenceRef: null,
  file: 'trk-10.mp3',
  durationSeconds: 574,
  ...over,
});

/** Bodyscan's shape: one recording, both files, no answers named. */
const cut = (over: Partial<MusicCut> = {}): MusicCut => ({
  exercise: 'body-scan-soundwalk',
  locale: 'de',
  mixed: 'cut-body-scan-soundwalk-de-any-any-mixed-4343cfff.mp3',
  voice: 'cut-body-scan-soundwalk-de-any-any-voice-ed6246c4.mp3',
  durationSeconds: 183,
  ...over,
});

const library = (over: Partial<MusicLibrary> = {}): MusicLibrary => ({
  pieces: [piece()],
  cuts: [cut()],
  ...over,
});

const problems = (music: unknown) => checkMusic(music).problems;

describe('cutId', () => {
  /* `any` rather than an empty segment: `cut-x-de--` is a string nobody can
     read in a migration diff. */
  it('spells an omitted dimension as `any`', () => {
    expect(cutId(cut())).toBe('cut-body-scan-soundwalk-de-any-any');
    expect(cutId({ ...cut(), ending: 'sleep' }))
      .toBe('cut-body-scan-soundwalk-de-any-sleep');
    expect(cutId({ ...cut(), posture: 'lying', ending: 'day' }))
      .toBe('cut-body-scan-soundwalk-de-lying-day');
  });

  it('gives every combination its own id, wildcards included', () => {
    const ids = new Set<string>();
    for (const locale of LOCALES) {
      for (const posture of [...POSTURES, null]) {
        for (const ending of [...ENDINGS, null]) {
          ids.add(cutId({ exercise: 'sound-journey', locale, posture, ending }));
        }
      }
    }
    expect(ids.size).toBe(LOCALES.length * 3 * 3);
  });
});

describe('checkMusic · the problems that stop a migration', () => {
  it('accepts the delivered shape — one recording serving every answer', () => {
    expect(problems(library())).toEqual([]);
  });

  it('accepts a cut that names only its ending', () => {
    expect(problems(library({
      cuts: [cut({ ending: 'sleep', voice: undefined })],
    }))).toEqual([]);
  });

  /* THE MIX IS THE RECORDING. Without it there is nothing to play, and the
     column is `not null`. */
  it('refuses a cut with no mix', () => {
    expect(problems(library({ cuts: [cut({ mixed: undefined })] })).join(' '))
      .toContain('mixed is required');
  });

  /* The guidance-only cut is what the switch hands over to, and its absence is
     a settled state rather than an unfinished one: Klangreise "makes no sense
     with one of the stems muted" (Ben, 2026-10-12), so it has no cut and no
     switch, permanently. Accepted, and NOT warned about — a warning that fires
     forever on a decision is what teaches people to skim the output. */
  it('accepts a cut with no guidance-only cut, and says nothing about it', () => {
    const only = library({ cuts: [cut({ voice: undefined })] });
    expect(problems(only)).toEqual([]);
    expect(checkMusic(only).warnings.join(' ')).not.toContain('switch');
  });

  it('refuses an answer the check constraints do not allow', () => {
    expect(problems(library({ cuts: [cut({ locale: 'fr' as never })] })).join(' '))
      .toContain('locale must be one of');
    expect(problems(library({ cuts: [cut({ posture: 'laying' as never })] })).join(' '))
      .toContain('posture must be');
    expect(problems(library({ cuts: [cut({ ending: 'relax' as never })] })).join(' '))
      .toContain('how it ENDS');
  });

  /* `nulls not distinct` on the unique constraint means two wildcard rows
     collide in the database. Caught here so the migration does not fail
     halfway through a reset. */
  it('refuses two cuts claiming the same answers, wildcards included', () => {
    expect(problems(library({
      cuts: [cut(), cut({ voice: undefined, mixed: 'other.mp3' })],
    })).join(' ')).toContain('claim these answers');
  });

  it('refuses one object key used twice, however it is reached', () => {
    expect(problems(library({
      pieces: [piece({ file: 'cut-body-scan-soundwalk-de-any-any-mixed-4343cfff.mp3' })],
    })).join(' ')).toContain('already used by');
  });

  it('refuses an object key that is not one — a title, a space, a capital', () => {
    expect(problems(library({ pieces: [piece({ file: 'Klangreise Mix.mp3' })] })).join(' '))
      .toContain('not an object key');
  });

  it('refuses a cut crediting a piece the file does not declare', () => {
    expect(problems(library({ cuts: [cut({ piece: 'trk-99' })] })).join(' '))
      .toContain('is not in this file');
  });

  it('refuses a piece with no credit, and a duration that is not whole seconds', () => {
    expect(problems(library({ pieces: [piece({ title: '  ' })] })).join(' '))
      .toContain('title is required');
    for (const bad of [0, -1, 12.5, null, '574']) {
      expect(problems(library({ pieces: [piece({ durationSeconds: bad as number })] })).length)
        .toBeGreaterThan(0);
    }
  });

  it('accepts a piece with no file, which is five of the nine deck cards', () => {
    expect(problems(library({ pieces: [piece({ file: null })], cuts: [] }))).toEqual([]);
  });
});

describe('checkMusic · the warnings that do not', () => {
  it('names the silent pieces once, not once each', () => {
    const { warnings } = checkMusic(library({
      pieces: [piece({ id: 'trk-10', file: null }), piece({ id: 'trk-11', file: null })],
      cuts: [],
    }));
    const silent = warnings.filter((line) => line.includes('simulated clock'));
    expect(silent).toHaveLength(1);
    expect(silent[0]).toContain('trk-10, trk-11');
  });

  /* Both delivered exercises credit nothing yet: the unducked original is
     still to come, and until it does nothing of them reaches
     /discovered-music. Worth saying on every run. */
  it('says when a cut credits no piece', () => {
    expect(checkMusic(library()).warnings.join(' ')).toContain('/discovered-music');
  });

  /* The deck plays nine pieces through `exercise_tracks`, which this module
     does not own and cannot see — so a warning would be wrong nine times. */
  it('says nothing about a piece no cut plays', () => {
    expect(checkMusic(library({ cuts: [] })).warnings.join(' '))
      .not.toContain('no cut');
  });
});

describe('assertMusic', () => {
  it('returns the library when it is usable', () => {
    const music = library();
    expect(assertMusic(music)).toBe(music);
  });

  it('throws with every problem listed, not just the first', () => {
    const broken = library({ pieces: [piece({ title: '', artist: '' })], cuts: [] });
    expect(() => assertMusic(broken)).toThrow(/title is required[\s\S]*artist is required/);
  });
});

describe('rows', () => {
  it('maps a piece onto the columns of public.tracks', () => {
    expect(rows(library()).tracks).toEqual([{
      id: 'trk-10',
      src: 'trk-10.mp3',
      duration_seconds: 574,
      title: 'Klangreise',
      artist: 'Somebody Real',
      licence_ref: null,
    }]);
  });

  it('maps a cut onto the columns of public.exercise_cuts', () => {
    expect(rows(library()).exercise_cuts).toEqual([{
      id: 'cut-body-scan-soundwalk-de-any-any',
      exercise_id: 'body-scan-soundwalk',
      locale: 'de',
      posture: null,
      ending: null,
      mixed_src: 'cut-body-scan-soundwalk-de-any-any-mixed-4343cfff.mp3',
      voice_src: 'cut-body-scan-soundwalk-de-any-any-voice-ed6246c4.mp3',
      duration_seconds: 183,
      /* The fixture names no mark, and a cut without one is the ordinary
         case — the Bodyscan's guidance starts immediately. */
      intro_until: null,
      track_id: null,
    }]);
  });

  /* An omitted dimension becomes a NULL and not the string "any": `any` is how
     the id reads, and null is what the database means by it. */
  it('writes null for an omitted posture or ending, never a word', () => {
    const [row] = rows(library({ cuts: [cut({ ending: 'sleep' })] }))
      .exercise_cuts;
    expect(row.posture).toBeNull();
    expect(row.ending).toBe('sleep');
  });

  it('writes null rather than undefined for an absent cut, licence or credit', () => {
    const [row] = rows(library({
      cuts: [{ ...cut(), voice: undefined, piece: undefined }],
    })).exercise_cuts;
    expect(row.voice_src).toBeNull();
    expect(row.track_id).toBeNull();
  });

  /* Two runs of the generator must emit one order, or every regeneration is a
     diff of moved lines. */
  it('orders pieces and cuts independently of the file', () => {
    const shuffled = library({
      pieces: [piece({ id: 'trk-12' }), piece({ id: 'trk-10' })],
      cuts: [
        cut({ ending: 'sleep', voice: undefined, mixed: 'b.mp3' }),
        cut({ ending: 'day', voice: undefined, mixed: 'a.mp3' }),
      ],
    });
    expect(orderedPieces(shuffled).map((p) => p.id)).toEqual(['trk-10', 'trk-12']);
    expect(orderedCuts(shuffled).map((r) => r.ending)).toEqual(['day', 'sleep']);
  });
});

describe('the library in the repository', () => {
  /* THE CENSUS CAME OUT ON 2026-10-15, and it was `toHaveLength(9)` beside
     `filter(src !== null)).toHaveLength(4)` — the library as the recordings
     migration left it in September. The first export from hosted found twenty
     pieces and fifteen files, because eleven were uploaded at `/maintenance`.
     Both numbers were a snapshot of a library that is now operator-managed, so
     counting them asserts that nobody uses the screen.

     What is worth asserting is that the READER still reads: a known September
     piece comes back whole, with its own file-naming form, and nothing in the
     library is half a row. `trk-01` is the fixture because it is the first
     piece ever cleared and it is not going anywhere. */
  it('reads the library, and a September piece comes back whole', async () => {
    const { tracks } = rows(await readMusic());

    expect(tracks.length, 'the library reads as empty').toBeGreaterThan(0);
    expect(tracks.find((row) => row.id === 'trk-01')).toMatchObject({
      src: 'trk-01.mp3',
      duration_seconds: 219,
      title: 'Little Yellow Petals',
    });

    /* Every piece is named, and every file is named after its own id — the
       same property `db.content.db.test.ts` asserts against the database, held
       here against the file. */
    for (const row of tracks) {
      expect(row.title, `${row.id} has no title`).toBeTruthy();
      if (row.src !== null) {
        expect(row.src, `${row.id} names something other than its id`).toMatch(
          new RegExp(`^${row.id}(-[0-9a-f]{8})?\\.[a-z0-9]+$`),
        );
      }
    }
  });

  /* THE DELIVERED AUDIO, AS THE FILE DESCRIBES IT. Bodyscan is one recording
     for every answer; Klangreise is two that differ by ending and not by
     posture. If somebody adds a posture dimension to either, this is where it
     shows up — and `missing_cuts` is where the holes it opens show up. */
  it('describes three German cuts and no English ones', async () => {
    const { exercise_cuts: cuts } = rows(await readMusic());

    expect(cuts.map((row) => row.id)).toEqual([
      'cut-body-scan-soundwalk-de-any-any',
      'cut-sound-journey-de-any-day',
      'cut-sound-journey-de-any-sleep',
    ]);
    expect(cuts.every((row) => row.locale === 'de')).toBe(true);
    expect(cuts.every((row) => row.posture === null)).toBe(true);
  });

  /* ONLY BODYSCAN HAS A GUIDANCE-ONLY CUT, so only Bodyscan offers the switch
     — and that is a decision rather than a delivery that is still arriving.
     Ben, 2026-10-12: Klangreise "makes no sense with one of the stems muted,
     so there is no adaptation possible". If a cut for it ever appears, this
     test is where the decision gets re-read.

     Asserted on the LIBRARY and not on `rows()`, because before `music:upload`
     has run a cut carries its sources and not its keys — and this fact
     is true either side of that. A test written against `voice_src` would be
     red on a freshly edited library and green on an uploaded one, which makes
     it a test of the upload rather than of the delivery. */
  it('gives the switch to Bodyscan and to nothing else', async () => {
    const music = await readMusic();
    const withCut = music.cuts
      .filter((r) => (r.voiceSource ?? r.voice) !== undefined)
      .map((r) => r.exercise);

    expect(withCut).toEqual(['body-scan-soundwalk']);
  });
});

/**
 * THE INTRO MARK — a timecode in the file, seconds in the row.
 *
 * It is the one field of a cut a human types rather than a tool measures, so
 * it is the one field that can be typed wrong. `checkMusic` is what stops a
 * wrong one reaching a migration, which is why the refusals matter as much as
 * the parse.
 */
describe('introUntil', () => {
  it('reads a timecode as whole seconds', () => {
    expect(introSeconds({ introUntil: '01:35' })).toBe(95);
    expect(introSeconds({ introUntil: '00:07' })).toBe(7);
    expect(introSeconds({ introUntil: '10:00' })).toBe(600);
  });

  it('is null where there is none, and null where it is unreadable', () => {
    expect(introSeconds({})).toBeNull();
    expect(introSeconds({ introUntil: null })).toBeNull();
    expect(introSeconds({ introUntil: '95' })).toBeNull();
    expect(introSeconds({ introUntil: '1:5' })).toBeNull();
    expect(introSeconds({ introUntil: '01:60' })).toBeNull();
    expect(introSeconds({ introUntil: '1m35s' })).toBeNull();
  });

  /* The three the database would refuse, refused here first — a problem stops
     the generator, where the constraint would stop a `db reset` halfway. */
  it('refuses a mark that is unreadable, at zero, or past the end', async () => {
    const music = await readMusic();
    const withMark = (introUntil: string): MusicLibrary => ({
      pieces: music.pieces,
      cuts: [{ ...music.cuts.find((cut) => cut.exercise === 'sound-journey')!, introUntil }],
    });

    expect(checkMusic(withMark('95')).problems.join(' ')).toContain('timecode');
    expect(checkMusic(withMark('00:00')).problems.join(' ')).toContain('start of the');
    expect(checkMusic(withMark('20:00')).problems.join(' ')).toContain('past');
    expect(checkMusic(withMark('01:35')).problems).toEqual([]);
  });

  /* The Klangreise arrives for ninety-five seconds before the piece begins;
     the Bodyscan starts talking immediately. The difference IS the feature, so
     it is asserted on the library rather than left to the database. */
  it('marks the Klangreise and nothing else', async () => {
    const music = await readMusic();
    const marked = music.cuts.filter((cut) => introSeconds(cut) !== null);

    expect([...new Set(marked.map((cut) => cut.exercise))]).toEqual(['sound-journey']);
    expect(marked.every((cut) => introSeconds(cut) === 95)).toBe(true);
    expect(rows(music).exercise_cuts.filter((row) => row.intro_until !== null)).toHaveLength(2);
  });
});
