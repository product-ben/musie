/**
 * The diary read's contract, against the real database.
 *
 * ── WHY THIS IS SEPARATE FROM db.sessions.db.test.ts ──────────────────────
 * That file tests the SCHEMA — the policies, the constraints, the cascade. This
 * one tests what `lib/diary.ts` depends on the schema *doing*: the filter, the
 * order, and one shape that no type can be trusted about. A policy test going
 * green tells you the table is safe; it does not tell you the Diary shows the
 * right sessions in the right order.
 *
 * ── THE ONE THAT EARNS ITS PLACE: THE EMBED IS AN OBJECT ──────────────────
 * `reflections(mode, body)` comes back as a JSON OBJECT, not a one-element
 * array — because `reflections_one_per_session` makes the relationship
 * one-to-one and PostgREST collapses it. supabase-js's GENERATED TYPES infer an
 * array for the same select. So the types and the wire disagree, and the types
 * are the ones that are wrong.
 *
 * `lib/diary.ts` absorbs that with `one()`, which accepts either shape. Nothing
 * else in the repo would notice if somebody replaced it with `rows[0]` — the
 * code would typecheck, and every diary entry would silently lose its answer.
 * This test is the thing that would go red.
 *
 * It also means the shape is not ours to rely on forever: drop the
 * `unique (session_id)` to scale to one-per-mode (D2) and PostgREST starts
 * returning an array for this exact select. `one()` already handles that, and
 * the assertion below says which shape is live today rather than which one is
 * correct in principle.
 */
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { anonymousUser, serviceClient } from './db.support';

/**
 * What lib/diary.ts asks for on the entry screen, verbatim — and kept verbatim.
 *
 * It now carries `tracks(id, src, duration_seconds, licence_ref)`, which is
 * FOUR COLUMNS AND NOT ONE MORE: `public.tracks` grants the client exactly
 * those, so naming `title` or `artist` here fails the whole request with
 * insufficient privilege rather than returning null. Running this select as a
 * real `authenticated` user is what proves the grant covers what the diary
 * asks for — a type cannot say that, because the generated types describe the
 * table and not the grant.
 */
// prettier-ignore
const DETAIL_SELECT = 'id, status, step, started_at, ended_at, exercises(id, exercise_i18n(locale, name, description)), cards(id, card_i18n(locale, feeling)), reflections(mode, body), tracks(id, src, duration_seconds, licence_ref)';

let client: SupabaseClient;
let userId: string;

beforeAll(async () => {
  ({ client, userId } = await anonymousUser());
}, 30_000);

/* A leftover row would make the next test read two sessions where it expects
   one, and the failure would name the wrong cause. */
afterEach(async () => {
  await serviceClient().from('sessions').delete().eq('user_id', userId);
});

/** Minutes ago, so a fixture can control the order it is asserted in. */
function agoISO(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function insertSession(fields: Record<string, unknown>): Promise<string> {
  const { data, error } = await client
    .from('sessions')
    .insert({ user_id: userId, exercise_id: 'mindfulness-cards', ...fields })
    .select('id')
    .single();

  expect(error).toBeNull();
  return (data as { id: string }).id;
}

describe('the diary read · which sessions, in which order', () => {
  it('shows the sessions that are over and hides the one that is running', async () => {
    const finished = await insertSession({
      status: 'finished', step: 'reflect', started_at: agoISO(30), ended_at: agoISO(17),
    });
    const abandoned = await insertSession({
      status: 'abandoned', step: 'listen', started_at: agoISO(90), ended_at: agoISO(85),
    });
    /* The positive control's mirror image: a RUNNING session, which must be
       absent from the diary while being perfectly readable through the same
       policy. Its absence is a filter, not a permission. */
    const running = await insertSession({ status: 'started', step: 'intro' });

    const { data, error } = await client
      .from('sessions')
      .select('id, status')
      .neq('status', 'started')
      .order('started_at', { ascending: false });

    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => (row as { id: string }).id);
    expect(ids).toEqual([finished, abandoned]);
    expect(ids).not.toContain(running);
  }, 30_000);

  it('keeps a walked-out-of session apart from a completed one', async () => {
    await insertSession({
      status: 'abandoned', step: 'listen', started_at: agoISO(20), ended_at: agoISO(18),
    });

    const { data } = await client.from('sessions').select('status, step').neq('status', 'started');

    /* The whole reason D7 has an answer: the Diary can say "unfinished, at the
       listen step" rather than showing it as one you completed. */
    expect(data).toEqual([{ status: 'abandoned', step: 'listen' }]);
  }, 30_000);
});

describe('the diary read · the one-to-one embed is an OBJECT, not an array', () => {
  it('returns the reflection as a bare object, which is what one() exists for', async () => {
    const id = await insertSession({
      status: 'finished', step: 'reflect', card_id: 'mc-03',
      started_at: agoISO(15), ended_at: agoISO(2),
    });
    const { error: written } = await client
      .from('reflections')
      .insert({ session_id: id, mode: 'text', body: 'Quieter than when I sat down.' });
    expect(written).toBeNull();

    const { data, error } = await client
      .from('sessions')
      .select(DETAIL_SELECT)
      .eq('id', id)
      .maybeSingle();

    expect(error).toBeNull();
    const row = data as { reflections: unknown };

    /* THE ASSERTION THIS FILE IS FOR. If this ever flips to an array, `one()`
       still copes — but anybody who replaced it with a bare property access
       finds out here instead of in the Diary. */
    expect(Array.isArray(row.reflections)).toBe(false);
    expect(row.reflections).toEqual({ mode: 'text', body: 'Quieter than when I sat down.' });
  }, 30_000);

  it('returns null for a session nobody answered, rather than an empty object', async () => {
    const id = await insertSession({
      status: 'abandoned', step: 'scan', started_at: agoISO(10), ended_at: agoISO(9),
    });

    const { data } = await client
      .from('sessions')
      .select(DETAIL_SELECT)
      .eq('id', id)
      .maybeSingle();

    /* An abandoned session usually has no reflection, so this is the common
       case rather than an edge one — and `one(null)` is null, which is what the
       entry screen branches on to decide whether to show an answer at all. */
    expect((data as { reflections: unknown }).reflections).toBeNull();
  }, 30_000);
});
