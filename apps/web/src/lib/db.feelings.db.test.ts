/**
 * `session_feelings`, tested against the running database.
 *
 * Same standard as db.sessions.db.test.ts and for the same reason: every rule
 * worth testing here lives in Postgres — three policies, a check constraint, a
 * unique index with NULLS NOT DISTINCT, a cascade and the grants — and not one
 * of them is visible in the TypeScript written on top.
 *
 * ── WHY THE GRANTS ARE TESTED AND NOT ASSUMED ─────────────────────────────
 * CLAUDE.md rule 2 exists because this was missed once: the local stack ships
 * `alter default privileges … grant all on tables`, so a new table arrives
 * ALREADY fully granted to `anon` and `authenticated`, and a policy then looks
 * like the access model while the real one is "everything". On the hosted
 * project the same switch is off, which leaves `service_role` with nothing
 * despite BYPASSRLS — 23 tests in three files failed for that one cause on
 * 2026-09-21.
 *
 * So the revoke and both grants are asserted, on both sides: what `anon`
 * cannot do, and what `service_role` can.
 *
 * Every "must fail" test is paired with a POSITIVE CONTROL. Without one, a
 * renamed table produces the same error the test is looking for and the suite
 * passes while protecting nothing.
 *
 * ── TWO KINDS OF REFUSAL, AND THEY DO NOT LOOK ALIKE ──────────────────────
 * RLS FILTERS: `error` is null and `data` is []. A PRIVILEGE OR CONSTRAINT
 * VIOLATION ERRORS: `data` is null and `error.code` is set. Each test says
 * which it expects.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { INSUFFICIENT_PRIVILEGE, anonClient, anonymousUser, serviceClient } from './db.support';

/** Postgres unique violation — what a refused duplicate path looks like. */
const UNIQUE_VIOLATION = '23505';
/** Postgres check violation — what a refused invariant looks like. */
const CHECK_VIOLATION = '23514';

let alice: SupabaseClient;
let bob: SupabaseClient;
let aliceId: string;
let bobId: string;

beforeAll(async () => {
  ({ client: alice, userId: aliceId } = await anonymousUser());
  ({ client: bob, userId: bobId } = await anonymousUser());
  expect(aliceId).not.toBe(bobId);
}, 30_000);

afterEach(async () => {
  /* The feelings go with their session through the cascade, which the cascade
     test below relies on and itself asserts. Checked, because a cleanup that
     fails quietly is how one missing grant became nineteen failures in
     another file. */
  const { error } = await serviceClient().from('sessions').delete().in('user_id', [aliceId, bobId]);
  expect(error, 'cleanup was refused — later failures in this file are not their own').toBeNull();
});

function startedSession(userId: string) {
  return {
    user_id: userId,
    exercise_id: 'mindfulness-cards',
    card_id: 'mc-03',
    goal_id: 'mindfulness',
    track_id: 'trk-03',
    status: 'started',
    step: 'reflect',
  };
}

async function sessionFor(client: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client
    .from('sessions').insert(startedSession(userId)).select('id').single();
  expect(error).toBeNull();
  return data!.id as string;
}

describe('session_feelings · the three shapes a path can have', () => {
  it('holds a feeling that stopped at level 1 — the stop row', async () => {
    const id = await sessionFor(alice, aliceId);
    const { data, error } = await alice
      .from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null })
      .select('emotion_id, detailed_id, specific_i');

    expect(error).toBeNull();
    expect(data?.[0]).toEqual({ emotion_id: 'happy', detailed_id: null, specific_i: null });
  });

  it('holds one that stopped at level 2, and one that went all the way', async () => {
    const id = await sessionFor(alice, aliceId);
    const { error } = await alice.from('session_feelings').insert([
      { session_id: id, emotion_id: 'happy', detailed_id: 'optimistic', specific_i: null },
      { session_id: id, emotion_id: 'happy', detailed_id: 'optimistic', specific_i: 0 },
    ]);
    expect(error).toBeNull();

    const { data } = await alice
      .from('session_feelings').select('specific_i').eq('session_id', id);
    expect(data?.length).toBe(2);
  });

  /* A LEVEL-3 INDEX UNDER NO LEVEL-2 ID IS NOT A ROUTE ANYTHING COULD WALK.
     `resolveFeeling` would fall back to the level above and silently show a
     different word than was chosen, so the database refuses the shape. */
  it('refuses a path with a hole in it', async () => {
    const id = await sessionFor(alice, aliceId);
    const { data, error } = await alice
      .from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: 3 })
      .select('id');

    expect(data).toBeNull();
    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});

describe('session_feelings · the dedupe, and the null case that is easy to miss', () => {
  it('refuses the same full path twice', async () => {
    const id = await sessionFor(alice, aliceId);
    const row = { session_id: id, emotion_id: 'happy', detailed_id: 'optimistic', specific_i: 0 };

    expect((await alice.from('session_feelings').insert(row)).error).toBeNull();

    const { data, error } = await alice.from('session_feelings').insert(row).select('id');
    expect(data).toBeNull();
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  /* ── THE WHOLE REASON FOR `NULLS NOT DISTINCT` ──────────────────────────
     Under the SQL default, two rows of ('happy', null, null) do not conflict:
     nulls are distinct from each other. That would make the level-1 stop the
     one feeling in the entire wheel you could hold twice — and the × on
     /reflect would then have two identical rows to choose between. */
  it('refuses the LEVEL-1 STOP twice, although two of its columns are null', async () => {
    const id = await sessionFor(alice, aliceId);
    const row = { session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null };

    expect((await alice.from('session_feelings').insert(row)).error).toBeNull();

    const { data, error } = await alice.from('session_feelings').insert(row).select('id');
    expect(data).toBeNull();
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  /* THE POSITIVE CONTROL for both above: the constraint is per SESSION, so
     the same feeling in a different session is a different fact. Without
     this, a constraint accidentally written without `session_id` would pass
     every test above. */
  it('allows the same feeling in a different session', async () => {
    const first = await sessionFor(alice, aliceId);
    const row = { emotion_id: 'happy', detailed_id: 'optimistic', specific_i: 0 };
    expect((await alice.from('session_feelings').insert({ session_id: first, ...row })).error)
      .toBeNull();

    await alice.from('sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() }).eq('id', first);
    const second = await sessionFor(alice, aliceId);

    const { error } = await alice.from('session_feelings').insert({ session_id: second, ...row });
    expect(error).toBeNull();
  });
});

describe('session_feelings · whose they are', () => {
  it('lets the owner add, read and remove — the positive control', async () => {
    const id = await sessionFor(alice, aliceId);
    const added = await alice
      .from('session_feelings')
      .insert({ session_id: id, emotion_id: 'sad', detailed_id: null, specific_i: null })
      .select('id').single();
    expect(added.error).toBeNull();

    const read = await alice.from('session_feelings').select('id').eq('session_id', id);
    expect(read.error).toBeNull();
    expect(read.data?.length).toBe(1);

    const removed = await alice.from('session_feelings').delete().eq('id', added.data!.id);
    expect(removed.error).toBeNull();

    const after = await alice.from('session_feelings').select('id').eq('session_id', id);
    expect(after.data?.length).toBe(0);
  });

  /* RLS FILTERS, so this is an empty set and not an error. Bob is signed in
     and holds the grant; what he does not hold is the row. */
  it('hides one person’s feelings from another', async () => {
    const id = await sessionFor(alice, aliceId);
    await alice.from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null });

    const { data, error } = await bob.from('session_feelings').select('id').eq('session_id', id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  /* AND HE CANNOT DELETE IT EITHER — the half that a select-only test would
     miss. A delete filtered by RLS removes nothing and reports no error, so
     the assertion is on what survives. */
  it('refuses one person’s delete of another’s feeling', async () => {
    const id = await sessionFor(alice, aliceId);
    const added = await alice.from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null })
      .select('id').single();

    await bob.from('session_feelings').delete().eq('id', added.data!.id);

    const { data } = await alice.from('session_feelings').select('id').eq('session_id', id);
    expect(data?.length, 'bob deleted alice’s feeling').toBe(1);
  });

  /* ── NO UPDATE POLICY, AND THAT IS THE FEATURE ──────────────────────────
     Editing a confirmed feeling is out of scope: the two verbs are add and
     remove. No update policy and no update grant, so even the owner's own row
     refuses — which is the schema saying it rather than a component promising
     it. A privilege error, not an empty set: the grant is what is missing. */
  it('refuses an update even from the owner', async () => {
    const id = await sessionFor(alice, aliceId);
    const added = await alice.from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null })
      .select('id').single();

    const { error } = await alice.from('session_feelings')
      .update({ emotion_id: 'sad' }).eq('id', added.data!.id);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('takes the feelings with the session — the cascade', async () => {
    const id = await sessionFor(alice, aliceId);
    await alice.from('session_feelings')
      .insert({ session_id: id, emotion_id: 'happy', detailed_id: null, specific_i: null });

    expect((await alice.from('sessions').delete().eq('id', id)).error).toBeNull();

    const { data } = await serviceClient()
      .from('session_feelings').select('id').eq('session_id', id);
    expect(data).toEqual([]);
  });
});

describe('session_feelings · rule 2, both halves of it', () => {
  /* THE REVOKE. `anon` has no policy, so a filtered read would be an empty
     set — but the grant is gone too, so this is a PRIVILEGE error. Asserting
     the code and not just "no rows" is what distinguishes "revoked" from
     "merely unreachable". */
  it('refuses anon entirely', async () => {
    const anon = anonClient();

    const read = await anon.from('session_feelings').select('id');
    expect(read.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const write = await anon.from('session_feelings')
      .insert({ session_id: crypto.randomUUID(), emotion_id: 'happy' });
    expect(write.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  /* THE HALF THAT WAS MISSED IN 2026-09. `service_role` has BYPASSRLS, which
     is exactly why it is easy to assume the grants cannot matter to it —
     Postgres checks table privileges first, for every role. On the hosted
     project the default grant is off, so without the explicit grant in the
     migration this read returns 42501 there and passes here. */
  it('lets service_role read and write', async () => {
    const id = await sessionFor(alice, aliceId);
    const service = serviceClient();

    const written = await service.from('session_feelings')
      .insert({ session_id: id, emotion_id: 'angry', detailed_id: null, specific_i: null })
      .select('id');
    expect(written.error).toBeNull();

    const read = await service.from('session_feelings').select('id').eq('session_id', id);
    expect(read.error).toBeNull();
    expect(read.data?.length).toBe(1);

    const removed = await service.from('session_feelings').delete().eq('session_id', id);
    expect(removed.error).toBeNull();
  });
});
