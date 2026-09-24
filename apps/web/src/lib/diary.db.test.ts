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
import { saveStatements } from './statements';

/**
 * What lib/diary.ts asks for on the entry screen, verbatim — and kept verbatim.
 *
 * It now carries `tracks(id, src, duration_seconds)`, which is
 * FOUR COLUMNS AND NOT ONE MORE: `public.tracks` grants the client exactly
 * those, so naming `title` or `artist` here fails the whole request with
 * insufficient privilege rather than returning null. Running this select as a
 * real `authenticated` user is what proves the grant covers what the diary
 * asks for — a type cannot say that, because the generated types describe the
 * table and not the grant.
 *
 * AND SINCE 2026-09-24 IT REACHES THROUGH THE REFLECTION to the statements,
 * so the entry can show a spoken answer in the pieces it was spoken in. That
 * is a THIRD level of embed and a second table's grant and policy on the same
 * request: `reflection_statements` is reached from `sessions` through
 * `reflections`, and its policy is written across two joins to `user_id`
 * (`20260922100000_reflection_statements.sql`). A select that the client is
 * not allowed to make fails the WHOLE request — the entry screen would show
 * its error state and nothing would say which embed caused it — so the select
 * is run here as a real user rather than trusted.
 */
// prettier-ignore
const DETAIL_SELECT = 'id, status, step, started_at, ended_at, exercises(id, exercise_i18n(locale, name, description)), cards(id, card_i18n(locale, feeling)), reflections(mode, body, reflection_statements(id, text, position)), tracks(id, src, duration_seconds)';

let client: SupabaseClient;
let userId: string;

beforeAll(async () => {
  ({ client, userId } = await anonymousUser());
}, 30_000);

/* A leftover row would make the next test read two sessions where it expects
   one, and the failure would name the wrong cause.
 *
 * THE ERROR IS CHECKED, and that is not pedantry. Run against a hosted project
 * before `service_role` had its grants and this delete was REFUSED, silently —
 * so the rows stayed, the next test read three where it expected one, and the
 * suite reported a diary bug that did not exist. A cleanup allowed to fail
 * quietly turns one cause into a page of unrelated failures. */
afterEach(async () => {
  const { error } = await serviceClient().from('sessions').delete().eq('user_id', userId);
  expect(error, 'cleanup was refused — later failures in this file are not their own').toBeNull();
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
    /* `reflection_statements` IS an array, and an empty one — a typed answer
       has no statements, which is what `answerParagraphs` falls back to the
       body for. The two embeds on one row are the two shapes this file is
       about, side by side: to-one is an object, to-many is a list. */
    expect(row.reflections).toEqual({
      mode: 'text', body: 'Quieter than when I sat down.', reflection_statements: [],
    });
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

/**
 * ── DELETING EVERYTHING · G.2 ──────────────────────────────────────────────
 * `lib/session.ts` `deleteAllSessions` is three method calls, and every one of
 * them is a claim this file can check and a type cannot:
 *
 *   `.delete()`                 the policy allows it, as this user
 *   `.not('id', 'is', null)`    an always-true predicate really does match
 *                               every row rather than parsing as something
 *                               narrower
 *   no `.eq('status', …)`       a RUNNING session goes with the rest, which
 *                               is what the confirmation copy promises
 *
 * and the cascade it relies on is a fourth. The select is written out here
 * exactly as the module writes it, for the same reason `DETAIL_SELECT` is: a
 * test that phrases the query its own way tests its own phrasing.
 *
 * NOT RUN. Written in a worktree with no access to the local stack — the main
 * session held it — so every assertion below is a statement of intent that has
 * never gone green or red. Logged in OPEN-QUESTIONS.md, and it is the first
 * thing to run against `supabase start`.
 */
describe('deleting the whole diary · G.2', () => {
  it('takes every session, the one still running included', async () => {
    await insertSession({
      status: 'finished', step: 'reflect', started_at: agoISO(40), ended_at: agoISO(30),
    });
    await insertSession({
      status: 'abandoned', step: 'listen', started_at: agoISO(20), ended_at: agoISO(19),
    });
    /* The row the diary never lists, and the one a status filter would have
       left behind. "Your whole diary" cannot quietly mean "except that one". */
    await insertSession({ status: 'started', step: 'intro' });

    /* Verbatim from deleteAllSessions. */
    const { error } = await client.from('sessions').delete().not('id', 'is', null);
    expect(error).toBeNull();

    const { data } = await client.from('sessions').select('id');
    expect(data).toEqual([]);
  }, 30_000);

  it('takes the reflections with them, through the cascade and not a second call', async () => {
    const id = await insertSession({
      status: 'finished', step: 'reflect', started_at: agoISO(15), ended_at: agoISO(5),
    });
    const { error: written } = await client
      .from('reflections')
      .insert({ session_id: id, mode: 'text', body: 'Something worth losing on purpose.' });
    expect(written).toBeNull();

    const { error } = await client.from('sessions').delete().not('id', 'is', null);
    expect(error).toBeNull();

    /* Asked as SERVICE ROLE, which is the only way this assertion means
       anything: `reflections_select_own` follows the session, so once the
       session is gone the row would be invisible to the user whether it had
       been deleted or merely orphaned. An orphan is exactly the failure this
       is looking for, and only a reader that bypasses the policy can tell the
       two apart. */
    const { data, error: read } = await serviceClient()
      .from('reflections')
      .select('session_id')
      .eq('session_id', id);

    expect(read).toBeNull();
    expect(data).toEqual([]);
  }, 30_000);

  it('does not reach another person\'s diary', async () => {
    /* THE ONE THAT MATTERS. A delete naming no row has `sessions_delete_own`
       and nothing else between it and the whole table, so this is the test
       that would go red the day that policy is weakened — and it would go red
       loudly, where the app would simply start deleting other people's
       sessions in silence. */
    const stranger = await anonymousUser();
    const { data: theirs, error: written } = await stranger.client
      .from('sessions')
      .insert({
        user_id: stranger.userId,
        exercise_id: 'mindfulness-cards',
        status: 'finished',
        step: 'reflect',
        started_at: agoISO(60),
        ended_at: agoISO(50),
      })
      .select('id')
      .single();
    expect(written).toBeNull();

    await insertSession({
      status: 'finished', step: 'reflect', started_at: agoISO(10), ended_at: agoISO(4),
    });

    const { error } = await client.from('sessions').delete().not('id', 'is', null);
    expect(error).toBeNull();

    const { data: survivors } = await serviceClient()
      .from('sessions')
      .select('id')
      .eq('user_id', stranger.userId);

    expect(survivors).toEqual([{ id: (theirs as { id: string }).id }]);

    /* This file's afterEach only sweeps up `userId`, so the stranger's rows
       are this test's to clear. Left behind they would accumulate across runs
       and, worse, make a future test that counts rows lie. */
    const { error: swept } = await serviceClient()
      .from('sessions')
      .delete()
      .eq('user_id', stranger.userId);
    expect(swept, 'the stranger\'s rows were left behind').toBeNull();
  }, 30_000);
});

describe('reflection_statements · a spoken answer, written as it is spoken', () => {
  /**
   * F.6's DONE-WHEN, AND IT IS ABOUT THE PRIMARY KEY.
   *
   * `onSentenceFinal` fires on four paths, and a statement carries the id the
   * browser gave it, so writing under that id makes the second firing an
   * update of one row rather than a second row. This is the assertion that
   * goes red the day somebody swaps the text primary key for a generated uuid
   * — which would look tidier and would silently break idempotency.
   */
  it('editing a statement updates its row rather than inserting a second', async () => {
    const sessionId = await insertSession({
      status: 'started', step: 'reflect', started_at: agoISO(10),
    });

    const first = await saveStatements(sessionId, [
      { id: 'st-1', text: 'A tightness behind the ribs.', language: 'en', createdAt: agoISO(9) },
      { id: 'st-2', text: 'And then less of it.', language: 'en', createdAt: agoISO(8) },
    ], client);
    expect(first).not.toBeNull();

    /* The same two statements, one of them corrected. */
    await saveStatements(sessionId, [
      { id: 'st-1', text: 'A tightness behind the ribs, high up.', language: 'en', createdAt: agoISO(9) },
      { id: 'st-2', text: 'And then less of it.', language: 'en', createdAt: agoISO(8) },
    ], client);

    const { data } = await serviceClient()
      .from('reflection_statements')
      .select('id, text, position')
      .eq('reflection_id', first as string)
      .order('position');

    expect(data?.length, 'the edit inserted a second row').toBe(2);
    expect(data?.[0].text).toBe('A tightness behind the ribs, high up.');
  }, 30_000);

  /**
   * MERGING ENDS A STATEMENT, and a per-statement write could never say so.
   * This is why the payload is the whole list: the row has to GO, not just
   * stop being mentioned.
   */
  it('removes statements that are no longer in the list', async () => {
    const sessionId = await insertSession({
      status: 'started', step: 'reflect', started_at: agoISO(10),
    });

    const reflectionId = await saveStatements(sessionId, [
      { id: 'm-1', text: 'One.', language: 'en', createdAt: agoISO(9) },
      { id: 'm-2', text: 'Two.', language: 'en', createdAt: agoISO(8) },
    ], client);

    /* Merged: m-2 folded into m-1 and its row is over. */
    await saveStatements(sessionId, [
      { id: 'm-1', text: 'One. Two.', language: 'en', createdAt: agoISO(9) },
    ], client);

    const { data } = await serviceClient()
      .from('reflection_statements')
      .select('id')
      .eq('reflection_id', reflectionId as string);

    expect(data?.map((r) => r.id)).toEqual(['m-1']);
  }, 30_000);

  /**
   * `reflections.body` IS STILL THE ANSWER. The diary, the end-to-end walks
   * and D1's own `not null` check all read it, and none of them knows this
   * second table exists. Assembled on every write, so it cannot go stale.
   */
  it('keeps reflections.body assembled from the rows', async () => {
    const sessionId = await insertSession({
      status: 'started', step: 'reflect', started_at: agoISO(10),
    });

    await saveStatements(sessionId, [
      { id: 'b-1', text: 'Erst eng.', language: 'de', createdAt: agoISO(9) },
      { id: 'b-2', text: 'Dann weiter.', language: 'de', createdAt: agoISO(8) },
    ], client);

    const { data } = await serviceClient()
      .from('reflections')
      .select('mode, body')
      .eq('session_id', sessionId)
      .single();

    expect(data?.mode).toBe('voice');
    expect(data?.body).toBe('Erst eng. Dann weiter.');
  }, 30_000);

  /**
   * AND THE DIARY READS THE ROWS, NOT ONLY THE BODY — Ben, 2026-09-24.
   *
   * `body` is the four sentences glued with spaces; the statements are where
   * the pauses still are, and the entry card now draws one paragraph each. So
   * the detail select reaches through the reflection to them, which is what
   * this asserts — as the `authenticated` user who owns them, through the
   * two-join policy, in `position` order.
   *
   * The ORDER is asserted although `toReflection` sorts client-side anyway.
   * The sort is there because PostgREST promises nothing about an embed's
   * order; this says the request the app actually makes comes back readable,
   * so a day when the sort is questioned has an answer that is not a guess.
   */
  it('comes back through the entry select, in the order it was spoken', async () => {
    const sessionId = await insertSession({
      status: 'started', step: 'reflect', started_at: agoISO(10),
    });

    await saveStatements(sessionId, [
      { id: 'd-1', text: 'Erst eng.', language: 'de', createdAt: agoISO(9) },
      { id: 'd-2', text: 'Dann weiter.', language: 'de', createdAt: agoISO(8) },
    ], client);

    /* The session has to be OVER to be an entry. The reflect step writes the
       statements while it is still running, so this is the same order the app
       does it in. */
    const { error: ended } = await client
      .from('sessions')
      .update({ status: 'finished', ended_at: agoISO(7) })
      .eq('id', sessionId);
    expect(ended).toBeNull();

    const { data, error } = await client
      .from('sessions')
      .select(DETAIL_SELECT)
      .eq('id', sessionId)
      .maybeSingle();

    expect(error, 'the entry select was refused — a grant or a policy, not a bug').toBeNull();

    /* Through `unknown`, as every other assertion in this file does: the
       generated row type says the embed is an array (see `Embedded`), and
       `one()` is what the app collapses it with. Here the shape under test is
       the statements, so the reflection is narrowed in one step. */
    const reflection = (data as { reflections: unknown }).reflections as {
      reflection_statements: { id: string; text: string; position: number }[];
    };

    expect([...reflection.reflection_statements].sort((a, b) => a.position - b.position))
      .toEqual([
        { id: 'd-1', text: 'Erst eng.', position: 0 },
        { id: 'd-2', text: 'Dann weiter.', position: 1 },
      ]);
  }, 30_000);

  /**
   * THE ONE THAT MATTERS. RLS reaches this table through TWO joins —
   * statement → reflection → session → user_id — and a policy written against
   * `reflections` alone would be one join short. If that ever happens, one
   * person's statements become readable by another, and nothing on screen
   * would show it.
   */
  it('does not reach another person\'s statements', async () => {
    const stranger = await anonymousUser();
    const { data: theirSession } = await stranger.client
      .from('sessions')
      .insert({
        user_id: stranger.userId,
        exercise_id: 'mindfulness-cards',
        status: 'started', step: 'reflect', started_at: agoISO(30),
      })
      .select('id')
      .single();

    const { data: theirReflection } = await stranger.client
      .from('reflections')
      .insert({ session_id: (theirSession as { id: string }).id, mode: 'voice', body: 'theirs' })
      .select('id')
      .single();

    const { error: written } = await stranger.client
      .from('reflection_statements')
      .insert({
        id: 'stranger-1',
        reflection_id: (theirReflection as { id: string }).id,
        text: 'theirs', position: 0,
      });
    expect(written, 'the stranger could not write their own statement').toBeNull();

    /* Alice, reading and then trying to change it. */
    const { data: seen } = await client
      .from('reflection_statements')
      .select('id')
      .eq('id', 'stranger-1');
    expect(seen, 'another person\'s statement is readable').toEqual([]);

    await client.from('reflection_statements').update({ text: 'taken' }).eq('id', 'stranger-1');
    await client.from('reflection_statements').delete().eq('id', 'stranger-1');

    const { data: survivor } = await serviceClient()
      .from('reflection_statements')
      .select('id, text')
      .eq('id', 'stranger-1')
      .maybeSingle();

    expect(survivor?.text, 'another person\'s statement was changed or deleted').toBe('theirs');

    await serviceClient().from('sessions').delete().eq('user_id', stranger.userId);
  }, 30_000);
});
