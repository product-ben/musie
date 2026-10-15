/**
 * Content parity, and the second half of the track protection.
 *
 * The opaque track ids are where this file earns its place. Everything else
 * here restates a rule that is written down somewhere; the id rule is one that
 * looks like a naming preference and is not, so it is the one most likely to
 * be undone by someone being helpful.
 */
import { describe, expect, it } from 'vitest';

import { anonymousUser, serviceClient } from './db.support';

describe('missing_translations', () => {
  it('reports no holes', async () => {
    const { client } = await anonymousUser();
    const { data, error } = await client.from('missing_translations').select('*');

    expect(error).toBeNull();
    /* Printed in full on failure: the view names the entity, the record, the
       locale and the column, so a red test here is already the bug report. */
    expect(data).toEqual([]);
  }, 30_000);
});

describe('tracks · the ids are opaque, and that is the security model', () => {
  /**
   * WHY THIS TEST EXISTS.
   *
   * `exercise_tracks.track_id` IS granted to the client — it holds only ids,
   * so it needs no column grant. That is only safe while `tracks.id` says
   * nothing. Seed a recording as `morgenlicht` instead of `trk-01` and the
   * client can read the title straight off the join, through a table the
   * column grant does not cover and was never meant to.
   *
   * So the grant and the id scheme are two halves of one mechanism, and the
   * half that has no constraint behind it is this one. Read with the SERVICE
   * ROLE precisely because the client cannot see `title` — the test needs the
   * answer in order to prove the id does not leak it.
   */
  it('keeps every id to the opaque trk-NN form', async () => {
    const { data, error } = await serviceClient().from('tracks').select('id');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);

    const wrong = (data ?? [])
      .map((row) => row.id as string)
      .filter((id) => !/^trk-\d+$/.test(id));

    expect(wrong).toEqual([]);
  });

  it('shares no word between an id and its own title or artist', async () => {
    const { data, error } = await serviceClient()
      .from('tracks')
      .select('id, title, artist');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);

    /* Words of three or more letters, lowercased and stripped of punctuation.
       Two letters would flag 'am' and 'er' inside unrelated ids. */
    const leaks = (data ?? []).flatMap((row) => {
      const id = (row.id as string).toLowerCase();
      const words = `${row.title as string} ${row.artist as string}`
        .toLowerCase()
        .split(/[^\p{L}]+/u)
        .filter((word) => word.length >= 3);

      return words
        .filter((word) => id.includes(word))
        .map((word) => `${row.id as string} contains "${word}"`);
    });

    expect(leaks).toEqual([]);
  });

  it('carries no [DE] prefix in any content row', async () => {
    const service = serviceClient();

    const checks = await Promise.all([
      service.from('card_i18n').select('card_id, feeling').like('feeling', '[[]DE] %'),
      service.from('exercise_i18n').select('exercise_id, name').like('name', '[[]DE] %'),
      service.from('goal_i18n').select('goal_id, label').like('label', '[[]DE] %'),
      service.from('user_type_i18n').select('user_type_id, label').like('label', '[[]DE] %'),
    ]);

    for (const check of checks) {
      expect(check.error).toBeNull();
      expect(check.data).toEqual([]);
    }
  });
});

/**
 * `listen_gate_seconds` — the one number in `exercises` that a person tunes.
 *
 * WORTH ASSERTING because it is silently destructive in both directions. Set
 * above a track's length and the reflection is unreachable — the listen step
 * caps it, but only if it is reading the column at all. Set to something
 * absurd and nobody notices until a user is sitting there.
 */
/**
 * `asks_posture` — 20261013140000, and it is a THREE-state column.
 *
 * *Asks*, *does not ask*, and *the question does not arise*. The third is what
 * a boolean would have lost: a card exercise reaching neither listening
 * question would have had to claim one answer or the other, and false-for-the-
 * wrong-reason reads exactly like false-for-the-right-one.
 */
describe('exercises · who asks how you are listening', () => {
  it('carries an answer exactly where the question is asked', async () => {
    const { client } = await anonymousUser();
    const { data, error } = await client
      .from('exercises')
      .select('id, kind, asks_posture');

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    for (const row of data ?? []) {
      /* `exercises_asks_posture_applies` said in the other direction: the
         constraint refuses a write, this notices a row that got in before it. */
      expect(row.asks_posture === null, `${row.id} (${row.kind})`)
        .toBe(row.kind !== 'listening_only');
    }
  });

  /* The difference between the two listening exercises IS the decision, and it
     is the reason this is a column rather than a `kind`. Ben, 2026-10-13: the
     Klangreise changes nothing by being heard sitting or lying; the Bodyscan's
     guidance addresses a posture out loud. */
  it('asks on the Bodyscan and not on the Klangreise', async () => {
    const { client } = await anonymousUser();
    const { data, error } = await client
      .from('exercises')
      .select('id, asks_posture')
      .in('id', ['body-scan-soundwalk', 'sound-journey']);

    expect(error).toBeNull();
    const byId = new Map((data ?? []).map((row) => [row.id, row.asks_posture]));
    expect(byId.get('body-scan-soundwalk')).toBe(true);
    expect(byId.get('sound-journey')).toBe(false);
  });
});

describe('exercises · the listen gate', () => {
  it('is positive and present for every exercise', async () => {
    const { client } = await anonymousUser();
    const { data, error } = await client
      .from('exercises')
      .select('id, listen_gate_seconds, timeframe_min');

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    for (const row of data ?? []) {
      expect(typeof row.listen_gate_seconds).toBe('number');
      expect(row.listen_gate_seconds).toBeGreaterThanOrEqual(0);
    }
  });

  it('never asks for more listening than the exercise claims to take', async () => {
    /* `timeframe_min` is the whole exercise in MINUTES — intro, scan, listen
       and reflect. A gate that exceeded it would be asking somebody to listen
       for longer than the card says the entire thing lasts, which is a
       promise broken before the track starts. */
    const { client } = await anonymousUser();
    const { data } = await client
      .from('exercises')
      .select('id, listen_gate_seconds, timeframe_min');

    for (const row of data ?? []) {
      expect(row.listen_gate_seconds).toBeLessThan(row.timeframe_min * 60);
    }
  });

  it('is shorter than every track it gates, so the step is always reachable', async () => {
    /* The app caps the gate at the track's duration, so this cannot lock a
       user out today. It asserts the SEED is coherent without that safety
       net — if this goes red, somebody has set a gate that only the cap is
       saving, and the cap is a fallback rather than the design. */
    const { client } = await anonymousUser();
    const { data: pairs } = await client
      .from('exercise_tracks')
      .select('exercise_id, track_id, exercises(listen_gate_seconds), tracks(duration_seconds)');

    expect(pairs?.length).toBeGreaterThan(0);
    for (const pair of pairs ?? []) {
      /* PostgREST returns an OBJECT for a to-one embed and supabase-js infers
         an ARRAY from the generated relationship — the same mismatch
         `diary.ts` documents at `Embedded<T>`. Collapsed through `unknown`,
         because the two shapes genuinely do not overlap. */
      const one = <T,>(embed: unknown): T | null => {
        if (embed === null || embed === undefined) return null;
        return (Array.isArray(embed) ? embed[0] ?? null : embed) as T | null;
      };
      const gate = one<{ listen_gate_seconds: number }>(pair.exercises);
      const track = one<{ duration_seconds: number }>(pair.tracks);
      expect(gate).not.toBeNull();
      expect(track).not.toBeNull();
      expect(gate!.listen_gate_seconds).toBeLessThan(track!.duration_seconds);
    }
  });
});

describe('the tracks bucket · private, readable signed, and honest about absence', () => {
  /**
   * THE BUCKET MUST NOT BE PUBLIC, AND THIS IS THE ONLY THING THAT SAYS SO.
   *
   * A public bucket serves every object at a permanent, unauthenticated,
   * guessable URL — which is the state E.4 exists to avoid, and flipping it
   * is one toggle in the dashboard with no diff and no review. Nothing else in
   * the repository would notice: signed URLs keep working, the app keeps
   * playing, and the licensed masters are simply on the open internet.
   */
  it('keeps the bucket private', async () => {
    /* Through the storage API, not PostgREST: `buckets` lives in the
       `storage` schema, which is not exposed to REST — asking for
       `.from('buckets')` gets PGRST205 and a test that looks like a missing
       bucket when it is a missing schema. */
    const { data, error } = await serviceClient().storage.getBucket('tracks');

    expect(error, 'the tracks bucket does not exist').toBeNull();
    expect(data?.public, 'the tracks bucket is PUBLIC — every master is on the open internet').toBe(false);
  }, 30_000);

  /**
   * A signed-in listener can mint a URL for a recording that exists. This is
   * the policy `tracks_objects_select` — without it every card falls back to
   * the simulated clock and the app looks like it did before E.4.
   */
  it('lets a signed-in listener sign a real object', async () => {
    const { client } = await anonymousUser();

    const { data: track, error: read } = await client
      .from('tracks')
      .select('id, src')
      .not('src', 'is', null)
      .limit(1)
      .maybeSingle();

    expect(read).toBeNull();
    expect(track, 'no track has a src — E.4 has not been applied').not.toBeNull();

    const { data, error } = await client
      .storage.from('tracks')
      .createSignedUrl(track!.src as string, 60);

    expect(error, 'a signed-in listener cannot sign a track object').toBeNull();
    expect(data?.signedUrl).toContain(track!.src as string);
  }, 30_000);

  /**
   * A RECORDING EITHER HAS A FILE OR SAYS SO WITH NULL — never with a path to
   * something that was never uploaded.
   *
   * The distinction is the point of the nullable column: a null is absence,
   * and a src that will not resolve is a fault.
   *
   * ── THE ROLL-CALL CAME OUT, 2026-10-15 ──────────────────────────────────
   * This read `expect(withFile).toEqual(['trk-01', 'trk-02', 'trk-04',
   * 'trk-05'])` — the four cleared recordings as of September. Against hosted
   * it found fifteen, because eleven pieces were uploaded at `/maintenance`,
   * which is what that screen is for. The list was a census, not a rule.
   *
   * And it was hiding a second failure one line down, which is the better
   * reason to have looked rather than just bumped the number: the spelling
   * assertion was `${row.id}.mp3`, and a key minted by the UI is
   * `${id}-${eight hex}.${extension}` (`mintKey`, content-admin/index.ts) —
   * `trk-10-b0224a84.mp3`. Every upload through the real door would have
   * failed it. `music-upload.mjs` wrote the bare `trk-01.mp3` form, so both
   * spellings are live and both are correct.
   *
   * What the assertion is FOR survives either way, and it is a security
   * property rather than a naming preference: the key names the opaque id and
   * nothing else. `mc-01-joy.mp3` would carry the card and the feeling into
   * the filename — the exact leak the opaque ids exist to prevent. A random
   * suffix carries nothing, so the pattern below admits it and still refuses
   * anything that names the content.
   */
  it('gives a recording either a src that names only its id, or null', async () => {
    const { data, error } = await serviceClient()
      .from('tracks')
      .select('id, src')
      .order('id');

    expect(error).toBeNull();
    expect((data ?? []).length, 'no recordings at all').toBeGreaterThan(0);

    for (const row of data ?? []) {
      if (row.src === null) continue;
      expect(row.src, `${row.id} names something other than its id`).toMatch(
        new RegExp(`^${row.id}(-[0-9a-f]{8})?\\.[a-z0-9]+$`),
      );
    }
  }, 30_000);
});
