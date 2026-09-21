/**
 * Sessions and reflections, tested against the running database.
 *
 * Same standard as db.security.db.test.ts, for the same reason: these rules
 * live in Postgres — a partial unique index, three check constraints, a
 * cascade and eight policies — and none of them is visible in the TypeScript
 * that will be written on top of them. A state machine in the client can be
 * correct and the database still wrong, or the other way round, and only one
 * of those two is the thing a second client would also have to be told.
 *
 * Runs under `pnpm test:db`, never under `pnpm check`: CI has no Supabase, and
 * a suite that skips itself when the stack is down would report green for the
 * exact reason it should report nothing at all.
 *
 * Every "must fail" test is paired with a POSITIVE CONTROL. Without one, a
 * dropped table, a renamed column or a typo in a table name produces the same
 * error the test is looking for, and the suite passes while protecting
 * nothing.
 *
 * ── TWO KINDS OF REFUSAL, AND THEY DO NOT LOOK ALIKE ───────────────────────
 * RLS FILTERS: the read or write simply does not see the row, so `error` is
 * null and `data` is []. A PRIVILEGE OR CONSTRAINT VIOLATION ERRORS: `data` is
 * null and `error.code` is set. Asserting the wrong one of those passes today
 * and breaks the first time somebody reads the policy correctly, so each test
 * below says which it expects and why.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  INSUFFICIENT_PRIVILEGE,
  anonClient,
  anonymousUser,
  serviceClient,
} from './db.support';

/** Postgres unique violation — what a refused duplicate looks like. */
const UNIQUE_VIOLATION = '23505';
/** Postgres check violation — what a refused invariant looks like. */
const CHECK_VIOLATION = '23514';
/** Postgres foreign key violation — what `on delete restrict` looks like. */
const FOREIGN_KEY_VIOLATION = '23503';
/**
 * A row refused by a policy's `with check`. The SAME CODE as a missing
 * privilege — Postgres has no separate one — which is why every test that
 * expects it also proves the operation is granted, by doing it successfully
 * on a row the policy does allow.
 */
const POLICY_VIOLATION = INSUFFICIENT_PRIVILEGE;

let alice: SupabaseClient;
let bob: SupabaseClient;
let aliceId: string;
let bobId: string;

beforeAll(async () => {
  ({ client: alice, userId: aliceId } = await anonymousUser());
  ({ client: bob, userId: bobId } = await anonymousUser());
  expect(aliceId).not.toBe(bobId);
}, 30_000);

/**
 * Both users' sessions, removed with the SERVICE ROLE between tests.
 *
 * Necessary rather than tidy: `sessions_one_running_per_user` allows one
 * 'started' row per person, so a session left behind by one test is a failed
 * insert in the next — and the failure would be the right error code for the
 * wrong reason, which is the one thing this suite must not do. The reflections
 * go with them through the cascade, which the cascade test relies on and is
 * itself asserted below.
 */
afterEach(async () => {
  /* Checked, because a cleanup that can fail quietly is how one missing grant
     became nineteen failures in this file alone. See diary.db.test.ts. */
  const { error } = await serviceClient().from('sessions').delete().in('user_id', [aliceId, bobId]);
  expect(error, 'cleanup was refused — later failures in this file are not their own').toBeNull();
});

/** A complete, valid session for `userId`, ready to be spread and overridden. */
function startedSession(userId: string) {
  return {
    user_id: userId,
    exercise_id: 'mindfulness-cards',
    card_id: 'mc-03',
    situation_id: 'feel-feelings',
    track_id: 'trk-03',
    status: 'started',
    step: 'intro',
  };
}

describe('sessions · one running session per person, enforced by the database', () => {
  it('inserts the first started session — the positive control', async () => {
    const { data, error } = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id, status, step, ended_at');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].status).toBe('started');
    expect(data?.[0].ended_at).toBeNull();
  });

  it('refuses a SECOND started session for the same person', async () => {
    const first = await alice.from('sessions').insert(startedSession(aliceId));
    expect(first.error).toBeNull();

    /* A partial unique index, so this is a unique violation and not an empty
       set: the row is refused by Postgres, not filtered by RLS. */
    const { data, error } = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), step: 'scan' })
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it('allows a new session once the first has finished', async () => {
    const first = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    expect(first.error).toBeNull();

    const finish = await alice
      .from('sessions')
      .update({ status: 'finished', step: 'reflect', ended_at: new Date().toISOString() })
      .eq('id', first.data?.id as string);
    expect(finish.error).toBeNull();

    /* The index is PARTIAL — `where status = 'started'` — so a finished row
       must not occupy the slot. If this fails the predicate has been dropped
       and the constraint has become "one session ever". */
    const { error } = await alice.from('sessions').insert(startedSession(aliceId));
    expect(error).toBeNull();
  });

  it('does not let one person block another', async () => {
    const mine = await alice.from('sessions').insert(startedSession(aliceId));
    expect(mine.error).toBeNull();

    /* The index is on (user_id), so Bob's own started session is unaffected.
       A constraint written without the column would pass every test above and
       fail here. */
    const { error } = await bob.from('sessions').insert(startedSession(bobId));
    expect(error).toBeNull();
  });
});

describe('sessions · ended_at and status cannot disagree', () => {
  it('accepts started with no ended_at, and finished with one', async () => {
    const running = await alice.from('sessions').insert(startedSession(aliceId));
    expect(running.error).toBeNull();

    const ended = await alice.from('sessions').insert({
      ...startedSession(aliceId),
      status: 'abandoned',
      step: 'listen',
      ended_at: new Date().toISOString(),
    });
    /* The positive control for both directions of the equality: one row on
       each side of it, both valid, inserted by the same client. */
    expect(ended.error).toBeNull();
  });

  it('refuses finishing without an ended_at', async () => {
    const { data, error } = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), status: 'finished', step: 'reflect' })
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses a started session that carries an ended_at', async () => {
    const { data, error } = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), ended_at: new Date().toISOString() })
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses an UPDATE that would finish a session without ending it', async () => {
    const started = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    expect(started.error).toBeNull();

    /* The constraint is checked on update as well as insert. A client that
       writes status and ended_at in two statements has to fail on the first
       one, not leave a dated-nowhere row between them. */
    const { error } = await alice
      .from('sessions')
      .update({ status: 'finished' })
      .eq('id', started.data?.id as string);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses an unknown status and an unknown step', async () => {
    const status = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), status: 'paused' });
    expect(status.error?.code).toBe(CHECK_VIOLATION);

    const step = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), step: 'reveal' });
    expect(step.error?.code).toBe(CHECK_VIOLATION);
  });
});

describe('reflections · one per session, and they die with it', () => {
  it('stores a reflection against a session — the positive control', async () => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    expect(session.error).toBeNull();

    const { data, error } = await alice
      .from('reflections')
      .insert({
        session_id: session.data?.id as string,
        mode: 'text',
        body: 'The track slowed me down before I noticed I was rushing.',
      })
      .select('id, mode, body');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].mode).toBe('text');
  });

  it('refuses a SECOND reflection for the same session', async () => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    const sessionId = session.data?.id as string;

    const first = await alice
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'text', body: 'The first answer.' });
    expect(first.error).toBeNull();

    /* One per session is today's rule, so even a DIFFERENT mode is refused:
       reflections_one_per_session is narrower than the permanent
       (session_id, mode). When that line is dropped this test is the one that
       has to change, deliberately. */
    const { data, error } = await alice
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'voice', body: 'A transcript.' })
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  /**
   * `mode` says HOW THE TEXT WAS PRODUCED, not what file is attached — no file
   * is ever attached. All three modes end as words in `body`: typed,
   * transcribed from speech, or read off a photograph of handwriting (D13).
   *
   * The positive controls matter more than usual here, because two of the
   * three are DECIDED BUT UNBUILT. The constraint says what the product is,
   * and these three assertions are the only thing standing between that and
   * somebody narrowing it back to what this week's build happens to reach.
   */
  it.each(['text', 'voice', 'photo'])('accepts mode "%s" — all three end as text', async (mode) => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();

    const { error } = await alice.from('reflections').insert({
      session_id: session.data?.id as string,
      mode,
      body: 'Quieter than when I sat down.',
    });

    expect(error).toBeNull();
  });

  it('refuses a mode outside the three, and refuses an answer with no text', async () => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    const sessionId = session.data?.id as string;

    const { error: unknownMode } = await alice
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'video', body: 'anything' });
    expect(unknownMode?.code).toBe(CHECK_VIOLATION);

    /* The other half of D1, and the reason `body` is NOT NULL: a reflection
       with no words is not a reflection. If a bucket is ever added, this is
       the test that has to be deleted on purpose. */
    const { error: noText } = await alice
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'photo', body: null });
    expect(noText).not.toBeNull();
  });

  it('removes the reflection when the session is deleted, in ONE statement', async () => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    const sessionId = session.data?.id as string;

    const reflection = await alice
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'text', body: 'Gone with the session.' })
      .select('id')
      .single();
    expect(reflection.error).toBeNull();
    const reflectionId = reflection.data?.id as string;

    /* ONE statement, against sessions only, by the client. Nothing deletes the
       reflection explicitly — the cascade does, or nothing does. */
    const { error } = await alice.from('sessions').delete().eq('id', sessionId);
    expect(error).toBeNull();

    /* Read back with the SERVICE ROLE, not with Alice. Alice's own policy
        filters by the session that no longer exists, so her empty result
        cannot distinguish "deleted" from "invisible" — and absence is exactly
        what this test claims. */
    const service = serviceClient();
    const survivors = await service.from('reflections').select('id').eq('id', reflectionId);
    expect(survivors.error).toBeNull();
    expect(survivors.data).toEqual([]);

    const sessions = await service.from('sessions').select('id').eq('id', sessionId);
    expect(sessions.data).toEqual([]);
  });
});

describe('sessions · row level isolation between two people', () => {
  it('shows Alice nothing of Bob, even when asked by id', async () => {
    const bobs = await bob
      .from('sessions')
      .insert(startedSession(bobId))
      .select('id')
      .single();
    expect(bobs.error).toBeNull();
    const bobsSessionId = bobs.data?.id as string;

    await bob
      .from('reflections')
      .insert({ session_id: bobsSessionId, mode: 'text', body: "Bob's private answer." });

    /* Alice's own session is the positive control: the reads below must be
       empty because of the policy, not because the table is. */
    const mine = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), step: 'scan' })
      .select('id');
    expect(mine.error).toBeNull();
    expect(mine.data?.length).toBe(1);

    const visible = await alice.from('sessions').select('id, user_id');
    expect(visible.error).toBeNull();
    expect(visible.data).toEqual([{ id: mine.data?.[0].id, user_id: aliceId }]);

    /* RLS FILTERS, it does not error: the correct result is an empty set. */
    const byId = await alice.from('sessions').select('id').eq('id', bobsSessionId);
    expect(byId.error).toBeNull();
    expect(byId.data).toEqual([]);

    const theirReflections = await alice
      .from('reflections')
      .select('id, body')
      .eq('session_id', bobsSessionId);
    expect(theirReflections.error).toBeNull();
    expect(theirReflections.data).toEqual([]);
  });

  it('refuses a session carrying the other person’s user_id', async () => {
    /* The `with check` on sessions_insert_own. An insert refused by a policy
       is an error rather than an empty set: there is no row to filter, and
       PostgREST reports the policy violation. */
    const { data, error } = await alice
      .from('sessions')
      .insert(startedSession(bobId))
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(POLICY_VIOLATION);

    /* And prove it changed nothing, from outside the policy that just
       refused it. */
    const service = serviceClient();
    const bobsRows = await service.from('sessions').select('id').eq('user_id', bobId);
    expect(bobsRows.data).toEqual([]);
  });

  it('refuses a reflection against the other person’s session', async () => {
    const bobs = await bob
      .from('sessions')
      .insert(startedSession(bobId))
      .select('id')
      .single();
    const bobsSessionId = bobs.data?.id as string;

    const { error } = await alice.from('reflections').insert({
      session_id: bobsSessionId,
      mode: 'text',
      body: 'Written into somebody else’s diary.',
    });
    expect(error?.code).toBe(POLICY_VIOLATION);
  });

  it('refuses reassigning one’s own session to the other person', async () => {
    const mine = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    expect(mine.error).toBeNull();

    /* The `with check` on sessions_update_own, which is the half that is easy
       to leave out: `using` alone would let Alice read her row and hand it to
       Bob. */
    const { error } = await alice
      .from('sessions')
      .update({ user_id: bobId })
      .eq('id', mine.data?.id as string);
    expect(error?.code).toBe(POLICY_VIOLATION);
  });

  it('cannot delete the other person’s session', async () => {
    const bobs = await bob
      .from('sessions')
      .insert(startedSession(bobId))
      .select('id')
      .single();
    const bobsSessionId = bobs.data?.id as string;

    /* DELETE is granted, so this is a policy FILTER and not a privilege
       error: the statement succeeds and matches nothing. The proof is that
       the row is still there. */
    const { error } = await alice.from('sessions').delete().eq('id', bobsSessionId);
    expect(error).toBeNull();

    const survivors = await serviceClient()
      .from('sessions')
      .select('id')
      .eq('id', bobsSessionId);
    expect(survivors.data).toEqual([{ id: bobsSessionId }]);
  });
});

describe('sessions · the anon role can do nothing with either table', () => {
  const tables = ['sessions', 'reflections'] as const;

  it.each(tables)('refuses anon a SELECT on %s', async (table) => {
    /* anon has been revoked everything, so this is a privilege error rather
       than an empty set — a distinction worth asserting, because an empty set
       would also be the answer if the grant were there and the policy simply
       did not match. */
    const { data, error } = await anonClient().from(table).select('id');
    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses anon an INSERT into sessions, and a signed-in user can — the control', async () => {
    const refused = await anonClient().from('sessions').insert(startedSession(aliceId));
    expect(refused.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const allowed = await alice.from('sessions').insert(startedSession(aliceId));
    expect(allowed.error).toBeNull();
  });

  it('refuses anon an INSERT into reflections', async () => {
    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();

    const { error } = await anonClient().from('reflections').insert({
      session_id: session.data?.id as string,
      mode: 'text',
      body: 'Written by nobody.',
    });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it.each(tables)('refuses anon a DELETE from %s', async (table) => {
    const { error } = await anonClient()
      .from(table)
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000');
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe('sessions · the catalogue cannot be edited out from under a diary', () => {
  /**
   * WHY THIS TEST EXISTS.
   *
   * The `on delete` clauses on sessions are a DELIBERATE OVERRIDE of
   * DOMAIN-MODEL.md, which specifies cascade for exercise_id. Cascade there
   * means retiring one exercise silently deletes every session anybody ever
   * ran of it — a diary quietly losing entries — so the migration says
   * restrict instead, and a document and a schema now disagree in writing.
   * The half with no other record behind it is this one.
   *
   * Read and written with the SERVICE ROLE throughout: a client cannot touch
   * content at all (db.security.db.test.ts proves that), and RESTRICT is about
   * what the database permits, not about who asked.
   *
   * THE THROWAWAY CARD is not decoration either. The SET NULL half needs a
   * catalogue row that can actually be deleted, and deleting a SEEDED card
   * would leave the database one card short for every later run of this
   * suite — a test that erodes its own fixtures passes once.
   */
  const CARD = 'zz-test-retire-me';

  afterEach(async () => {
    /* Removed here as well as by the test, so a failure part-way through does
       not leave the row behind for the next run — and checked, so a refused
       delete says so instead of stranding the fixture for every later run. */
    const { error } = await serviceClient().from('cards').delete().eq('id', CARD);
    expect(error, 'fixture cleanup was refused — the throwaway card is stranded').toBeNull();
  });

  it('refuses retiring an exercise or a track a session refers to', async () => {
    const service = serviceClient();

    const session = await alice
      .from('sessions')
      .insert(startedSession(aliceId))
      .select('id')
      .single();
    expect(session.error).toBeNull();

    /* 23503: foreign key violation. Loud, which is the entire point — the
       person dealing with it is a human reading an error, not a diary
       silently losing a row. */
    const exercise = await service.from('exercises').delete().eq('id', 'mindfulness-cards');
    expect(exercise.error?.code).toBe(FOREIGN_KEY_VIOLATION);

    const track = await service.from('tracks').delete().eq('id', 'trk-03');
    expect(track.error?.code).toBe(FOREIGN_KEY_VIOLATION);

    /* And nothing moved: a RESTRICT that reported an error while deleting the
       row anyway is the failure worth ruling out. */
    const catalogue = await service
      .from('exercises')
      .select('id')
      .eq('id', 'mindfulness-cards');
    expect(catalogue.data).toEqual([{ id: 'mindfulness-cards' }]);
  });

  it('permits retiring a card, and keeps the entry it was part of', async () => {
    const service = serviceClient();

    /* Both locales, so a concurrent read of missing_translations does not see
       a hole that belongs to this test. */
    await service.from('cards').insert({ id: CARD, code: 'ZZ-99', sort: 99 });
    await service.from('card_i18n').insert([
      { card_id: CARD, locale: 'en', feeling: 'Test' },
      { card_id: CARD, locale: 'de', feeling: 'Test' },
    ]);

    const session = await alice
      .from('sessions')
      .insert({ ...startedSession(aliceId), card_id: CARD })
      .select('id')
      .single();
    expect(session.error).toBeNull();

    /* The POSITIVE CONTROL for the test above: the same client, the same kind
       of statement, through a SET NULL reference instead of a RESTRICT one —
       so a failure there cannot be "the service role cannot delete content". */
    const card = await service.from('cards').delete().eq('id', CARD);
    expect(card.error).toBeNull();

    const after = await service
      .from('sessions')
      .select('id, card_id, exercise_id')
      .eq('id', session.data?.id as string)
      .single();
    expect(after.error).toBeNull();
    /* The detail is gone; the entry is not. */
    expect(after.data?.card_id).toBeNull();
    expect(after.data?.exercise_id).toBe('mindfulness-cards');
  });
});
