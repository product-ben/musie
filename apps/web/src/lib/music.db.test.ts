/**
 * THE DATABASE IS THE MUSIC FILE. This is the test that makes that true.
 *
 * `supabase/content/music.json` is only a source of truth if something fails
 * when it stops being one, and there are four ordinary ways for it to stop —
 * the same four `deck.db.test.ts` lists, because it is the same loop:
 *
 *   · the file is edited and `pnpm music:migration` is never run;
 *   · a generated migration is written and never applied (`supabase db reset`);
 *   · it is applied locally and never pushed (`supabase db push`) — this suite
 *     can be aimed at the hosted project, which is how that one gets caught;
 *   · somebody edits a row in Studio, where nothing stacks and nothing is
 *     recorded.
 *
 * All four look identical from inside the app, and all four are red here.
 *
 * The service role because this reads content to COMPARE it, not to prove who
 * may see it — `db.security.db.test.ts` owns that question. It reads every
 * column, including `title` and `artist`, which the client's column grant
 * withholds and which are exactly what makes a credit checkable.
 *
 * ── IT ALSO CHECKS THE TWO THINGS `music.mjs` CANNOT ──────────────────────
 * That every cut belongs to an exercise which exists and is
 * `listening_only`. The generator has no database, and hardcoding the list of
 * listening exercises there would be a third copy of something the schema
 * already knows — so the foreign key catches the first half and this file
 * catches the second.
 */
import { describe, expect, it } from 'vitest';

import { readMusic, rows } from '../../scripts/music.mjs';
import { serviceClient } from './db.support';

const expected = rows(await readMusic());
const service = serviceClient();

/** Ordered the same way on both sides, so a mismatch reads as a diff rather
 *  than as nine rows in a different sequence. */
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

describe('the database carries the library in supabase/content/music.json', () => {
  it('has the same pieces, with the same credit, file and duration', async () => {
    const { data, error } = await service
      .from('tracks')
      .select('id, src, duration_seconds, title, artist, licence_ref')
      .order('id');

    expect(error).toBeNull();
    expect([...(data ?? [])].sort(byId)).toEqual([...expected.tracks].sort(byId));
  });

  it('has the same cuts, with the same files and the same credit', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      /* ONE STRING LITERAL, NOT A CONCATENATION — supabase-js parses this
         select at the TYPE level and TypeScript does not fold `'a' + 'b'` into
         a literal type, so splitting it degrades the row to
         GenericStringError. `content.ts` documents the same trap at
         EXERCISE_SELECT; this test walked into it anyway. */
      // prettier-ignore
      .select('id, exercise_id, locale, posture, ending, mixed_src, voice_src, duration_seconds, track_id')
      .order('id');

    expect(error).toBeNull();
    expect([...(data ?? [])].sort(byId))
      .toEqual([...expected.exercise_cuts].sort(byId));
  });
});

describe('a cut belongs to a listening exercise', () => {
  it('names only exercises whose kind is listening_only', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, exercises(id, kind)');

    expect(error).toBeNull();
    for (const row of data ?? []) {
      /* PostgREST returns an object for a to-one embed and an array for a
         to-many one, and supabase-js infers the latter from the generated
         relationship — the trap `diary.ts` documents at `Embedded<T>`. */
      const embed = row.exercises as unknown;
      const exercise = (Array.isArray(embed) ? embed[0] : embed) as { kind: string } | null;
      expect(exercise, `${row.id} points at no exercise`).not.toBeNull();
      expect(exercise?.kind, `${row.id} is on a ${exercise?.kind} exercise`)
        .toBe('listening_only');
    }
  });
});

describe('the cuts and the pieces they credit', () => {
  /* A cut's two files are one recording exported twice, and the switch reads
     the position off one and writes it to the other — so a pair of different
     lengths hands over to the wrong moment. `music:upload` refuses a pair more
     than 250 ms apart; this is the database saying the same thing about what
     actually landed. */
  it('states one duration per cut, and the mix is never missing', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, mixed_src, duration_seconds');

    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.mixed_src, `${row.id} has no recording`).toBeTruthy();
      expect(row.duration_seconds, `${row.id}`).toBeGreaterThan(0);
    }
  });

  /* ── THE INTRO MARK — 2026-10-13 ──────────────────────────────────────
     `intro_until` is what puts *Intro überspringen* on the focus sheet, and
     the control seeks to it without clamping — so a mark at or past the end
     would end the recording instead of skipping its opening.
     `exercise_cuts_intro_until_inside` refuses that; this is the same claim
     read back off whatever actually landed.

     THE NUMBER ITSELF IS NOT ASSERTED HERE. `20261013100000` states 01:35 and
     is the only place that does — `music.json` does not carry the mark yet
     (OPEN-QUESTIONS.md) — so repeating 95 in a test would be the same fact in
     two files, able to disagree. What is asserted is the SHAPE the button
     depends on. */
  it('marks an intro only inside the recording it belongs to', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, intro_until, duration_seconds');

    expect(error).toBeNull();
    for (const row of data ?? []) {
      if (row.intro_until === null) continue;
      expect(row.intro_until, `${row.id} marks an intro at or before zero`).toBeGreaterThan(0);
      expect(row.intro_until, `${row.id} marks an intro past its own end`)
        .toBeLessThan(row.duration_seconds);
    }
  });

  /* The two delivered exercises differ, and the difference is the feature: the
     Klangreise spends ninety-five seconds arriving, the Bodyscan starts
     talking immediately. A Bodyscan cut that grew a mark would put a control
     on a sheet with nothing to skip. */
  it('gives the Klangreise a mark and the Bodyscan none', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, exercise_id, intro_until');

    expect(error).toBeNull();
    const marked = (data ?? []).filter((row) => row.intro_until !== null);
    const unmarked = (data ?? []).filter((row) => row.intro_until === null);

    expect(marked.map((row) => row.exercise_id).every((id) => id === 'sound-journey')).toBe(true);
    expect(marked.length, 'no Klangreise cut carries an intro mark').toBeGreaterThan(0);
    expect(unmarked.some((row) => row.exercise_id === 'body-scan-soundwalk')).toBe(true);
  });

  /* The credit is the music INSIDE the mix, and `tracks` is about a piece we
     hold a file for — the unducked original that /discovered-music hands back.
     That export is still to come, so a cut may credit nothing; what it
     must never do is credit a piece whose own file is missing, because that is
     a discovery of nothing. */
  it('credits only pieces that have a file of their own', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, tracks(id, src)')
      .not('track_id', 'is', null);

    expect(error).toBeNull();
    for (const row of data ?? []) {
      const embed = row.tracks as unknown;
      const piece = (Array.isArray(embed) ? embed[0] : embed) as { id: string; src: string | null } | null;
      expect(piece?.src, `${row.id} credits ${piece?.id}, which has no recording`)
        .not.toBeNull();
    }
  });

  /* NOT A FAILURE, AND WORTH PRINTING. Both delivered exercises credit nothing
     yet, so nothing of them reaches /discovered-music. The day the unducked
     originals land, this number goes to zero and the listing fills in. */
  it('reports how many cuts still have no credit', async () => {
    const { data, error } = await service
      .from('exercise_cuts')
      .select('id, track_id');

    expect(error).toBeNull();
    const uncredited = (data ?? []).filter((row) => row.track_id === null).map((row) => row.id);
    if (uncredited.length > 0) {
      console.info(
        `[musie] ${uncredited.length} cut(s) credit no piece yet — `
        + `nothing of them reaches /discovered-music: ${uncredited.join(', ')}`,
      );
    }
    /* The assertion is that the question is answerable, not what the answer
       is: a content gap is not a broken database. */
    expect(Array.isArray(uncredited)).toBe(true);
  });
});

describe('the card flow is untouched by any of this', () => {
  /* THE REGRESSION TEST FOR THE WHOLE SHAPE. The listening type was built so
     that `tracks` and `exercise_tracks` would not move; if a cut ever
     starts writing a pairing row, or a listening exercise acquires one, this
     is what says so. */
  it('leaves exercise_tracks to the deck — eighteen rows, all with a card', async () => {
    const { data, error } = await service
      .from('exercise_tracks')
      .select('exercise_id, card_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(18);
    expect((data ?? []).filter((row) => row.card_id === null)).toEqual([]);
  });

  it('gives no listening exercise a pairing row', async () => {
    const { data, error } = await service
      .from('exercise_tracks')
      .select('exercise_id, exercises(kind)');

    expect(error).toBeNull();
    for (const row of data ?? []) {
      const embed = row.exercises as unknown;
      const exercise = (Array.isArray(embed) ? embed[0] : embed) as { kind: string } | null;
      expect(exercise?.kind, `${row.exercise_id} is paired AND listening_only`)
        .not.toBe('listening_only');
    }
  });
});

describe('missing_cuts — the recording schedule', () => {
  it('reports every combination the library has not produced yet', async () => {
    const { data: listening, error: kindError } = await service
      .from('exercises')
      .select('id')
      .eq('kind', 'listening_only');

    expect(kindError).toBeNull();

    const { data, error } = await service
      .from('missing_cuts')
      .select('exercise_id, locale, posture, ending');

    expect(error).toBeNull();

    /* ── DERIVED WITH THE WILDCARD RULE, NOT BY SUBTRACTING A COUNT ─────
       This read `wanted − cuts.length` until 2026-10-12 and was wrong by
       five: a cut with a null posture and a null ending covers FOUR
       combinations, not one. Counting rows only works when every row is
       exactly as specific as the question, which is the shape the delivered
       audio does not have.

       So the expectation is computed the way the view computes it, and the
       two are compared as SETS rather than as lengths — a count can be right
       while naming the wrong eight. */
    const covered = (exercise: string, locale: string, posture: string, ending: string) =>
      expected.exercise_cuts.some((cut) => cut.exercise_id === exercise
        && cut.locale === locale
        && (cut.posture === null || cut.posture === posture)
        && (cut.ending === null || cut.ending === ending));

    const holes: string[] = [];
    for (const exercise of listening ?? []) {
      for (const locale of ['de', 'en']) {
        for (const posture of ['sitting', 'lying']) {
          for (const ending of ['day', 'sleep']) {
            if (!covered(exercise.id, locale, posture, ending)) {
              holes.push([exercise.id, locale, posture, ending].join('·'));
            }
          }
        }
      }
    }

    const reported = (data ?? [])
      .map((row) => [row.exercise_id, row.locale, row.posture, row.ending].join('·'));

    expect(reported.sort()).toEqual(holes.sort());
  });

  it('is refused to a listener, because it is a production schedule', async () => {
    /* The positive control is above, with the service role. Here the point is
       the absence of a grant: `missing_cuts` is revoked from
       `authenticated`, the same reasoning that took `licence_ref` off the
       client. */
    const { anonClient } = await import('./db.support');
    const { error } = await anonClient().from('missing_cuts').select('*').limit(1);
    expect(error).not.toBeNull();
  });
});
