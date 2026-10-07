/**
 * The security model, tested against the running database.
 *
 * NOT a test of this repository's TypeScript. Every assertion here is about
 * what Postgres and PostgREST do, because that is where the rules actually
 * live — and because a migration written in session thirty can silently undo a
 * policy written in session eight. Reading diffs does not catch that; this
 * does.
 *
 * Runs under `pnpm test:db`, never under `pnpm check`: CI has no Supabase, and
 * a suite that skips itself when the stack is down would report green for the
 * exact reason it should report nothing at all.
 *
 * Every "must fail" test is paired with a POSITIVE CONTROL. Without one, a
 * dropped table, a renamed column or a typo in a table name produces the same
 * error the test is looking for, and the suite passes while protecting
 * nothing.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { INSUFFICIENT_PRIVILEGE, anonClient, anonymousUser } from './db.support';

let alice: SupabaseClient;
let bob: SupabaseClient;
let aliceId: string;
let bobId: string;

beforeAll(async () => {
  ({ client: alice, userId: aliceId } = await anonymousUser());
  ({ client: bob, userId: bobId } = await anonymousUser());
  expect(aliceId).not.toBe(bobId);
}, 30_000);

describe('profiles · row level isolation between two anonymous users', () => {
  it('gives each user a profiles row, created by the trigger', async () => {
    /* The positive control for everything below: if this is empty, the reads
       that "correctly" return nothing are returning nothing for the wrong
       reason. */
    const { data, error } = await alice.from('profiles').select('user_id');
    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: aliceId }]);
  });

  it('shows one user nothing of the other, even when asked by id', async () => {
    const { data, error } = await alice
      .from('profiles')
      .select('user_id, language, theme')
      .eq('user_id', bobId);

    /* RLS FILTERS, it does not error: the correct result is an empty set. A
       test asserting an error here would pass today and break the first time
       someone reads the policy correctly. */
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('lets a user update their own row', async () => {
    const { data, error } = await alice
      .from('profiles')
      .update({ language: 'de' })
      .eq('user_id', aliceId)
      .select('user_id, language');

    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: aliceId, language: 'de' }]);
  });

  it('refuses a write to the other user, and changes nothing', async () => {
    const { data, error } = await bob
      .from('profiles')
      .update({ language: 'de' })
      .eq('user_id', aliceId)
      .select('user_id');

    expect(error).toBeNull();
    expect(data).toEqual([]);

    /* And prove it from the owner's side rather than trusting the empty
       return: Alice set 'de' above, so an accidental success would be
       invisible. Bob's own row is what must be unchanged. */
    const { data: bobsOwn } = await bob
      .from('profiles')
      .select('user_id, language')
      .eq('user_id', bobId);
    expect(bobsOwn).toEqual([{ user_id: bobId, language: null }]);
  });

  it('gives the anon role, holding no JWT, nothing at all', async () => {
    const { data, error } = await anonClient().from('profiles').select('user_id');
    /* anon has been revoked everything, so this is a privilege error rather
       than an empty set. */
    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe('tracks · the column grant keeps title and artist off the client', () => {
  it('reads the three granted columns — the positive control', async () => {
    const { data, error } = await alice
      .from('tracks')
      .select('id, src, duration_seconds')
      .limit(1);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(Object.keys(data?.[0] ?? {}).sort()).toEqual([
      'duration_seconds',
      'id',
      'src',
    ]);
  });

  /**
   * `licence_ref` WAS GRANTED, AND IT CARRIED THE ANSWER.
   *
   * It was null on every row until E.4 filled it in with the only stable
   * identifier an Epidemic Sound download offers — the track name and the
   * artist. So a column that was harmless while empty became a second door
   * onto exactly what `title` and `artist` are withheld to protect, opened by
   * the migration that made the recordings real.
   *
   * Nothing on screen changed and every test above still passed: they assert
   * that title and artist are unreachable BY NAME, not that no other column
   * contains them. E.5's network-watching walk is what found it.
   *
   * This is the assertion that stops it coming back, and it is deliberately
   * about the GRANT rather than about the value — a rule that said "licence_ref
   * must not contain the title" would be a rule nobody could enforce at write
   * time.
   */
  it('refuses licence_ref, which is an operator record and not a listener one', async () => {
    const { data, error } = await alice.from('tracks').select('licence_ref').limit(1);

    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  /* Four routes to the same answer. PostgREST respects column privileges, so
     each one is refused by Postgres before RLS is consulted — but they are
     four separate code paths in PostgREST and only asserting the obvious one
     would leave three doors open. */
  const forbidden: [string, () => PromiseLike<unknown>][] = [
    ['selecting it by name', () => alice.from('tracks').select('title')],
    ['selecting everything', () => alice.from('tracks').select('*')],
    ['filtering by it', () => alice.from('tracks').select('id').eq('title', 'Morgenlicht')],
    ['aliasing it', () => alice.from('tracks').select('t:title')],
  ];

  it.each(forbidden)('refuses %s', async (_name, run) => {
    const { data, error } = (await run()) as {
      data: unknown;
      error: { code?: string } | null;
    };
    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('grants exercise_tracks whole, because it holds only ids', async () => {
    const { data, error } = await alice.from('exercise_tracks').select('*').limit(1);
    expect(error).toBeNull();
    expect(Object.keys(data?.[0] ?? {}).sort()).toEqual([
      'card_id',
      'exercise_id',
      'id',
      'track_id',
    ]);
  });
});

describe('content tables · readable, never writable', () => {
  const tables = ['exercises', 'cards', 'goals', 'user_types', 'tracks'] as const;

  it.each(tables)('lets a signed-in user READ %s', async (table) => {
    const { error } = await alice.from(table).select('id').limit(1);
    expect(error).toBeNull();
  });

  it.each(tables)('refuses an INSERT into %s', async (table) => {
    const { error } = await alice.from(table).insert({ id: 'injected-by-a-test' });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it.each(tables)('refuses a DELETE from %s', async (table) => {
    const { error } = await alice.from(table).delete().eq('id', 'mc-01');
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses an UPDATE to content', async () => {
    const { error } = await alice
      .from('exercise_i18n')
      .update({ name: 'rewritten by a test' })
      .eq('exercise_id', 'mindfulness-cards');
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

/**
 * The three tables that were `situations`, `situation_i18n` and
 * `exercise_situations` until 2026-10-07.
 *
 * ── A RENAME IS EXACTLY THE CHANGE THIS FILE EXISTS TO CATCH ──────────────
 * Privileges and policies hang off a table's OID, so they are SUPPOSED to
 * survive `alter table … rename`. That is a claim about Postgres, and the
 * migration asserts it in a comment. This is where it stops being a claim.
 *
 * The failure it guards against is silent and total: had the grants not
 * followed, every signed-in user would get `42501` on the goal picker and the
 * screen would show no goals — which reads as "the content is empty", not as
 * "the security model moved".
 */
describe('goals · the renamed content tables keep the access they had', () => {
  const renamed = ['goals', 'goal_i18n', 'exercise_goals'] as const;

  it.each(renamed)('lets a signed-in user READ %s', async (table) => {
    const { data, error } = await alice.from(table).select('*').limit(1);
    expect(error).toBeNull();
    /* The positive control is the ROW, not the absence of an error: an empty
       table would also return `error: null`, and a rename that lost its data
       would pass a test that only checked the error. */
    expect(data?.length).toBe(1);
  });

  it.each(renamed)('gives the anon role nothing of %s', async (table) => {
    const { data, error } = await anonClient().from(table).select('*').limit(1);
    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses an INSERT into exercise_goals', async () => {
    const { error } = await alice
      .from('exercise_goals')
      .insert({ exercise_id: 'free-rein', goal_id: 'relax' });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses an INSERT into goal_i18n', async () => {
    const { error } = await alice
      .from('goal_i18n')
      .insert({ goal_id: 'relax', locale: 'de', label: 'injected by a test' });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  /* THE OLD NAMES ARE GONE, which is the other half of a rename and the half
     a `create table` would have left undone. Were `situations` still there,
     `exercise_goals` could be reading a second, stale copy of the mapping and
     nothing above would notice. */
  it('no longer answers to the old names', async () => {
    const { error } = await alice.from('situations' as never).select('*').limit(1);
    expect(error).not.toBeNull();
  });
});
