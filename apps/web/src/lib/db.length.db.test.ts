/**
 * How long a run is, as the database holds it — 2026-11-26
 * (`20261126100000_session_length.sql`).
 *
 * Two promises, each held here against Postgres:
 *
 *   1. A session remembers the length chosen on Einsteigen, only its owner
 *      can write it, and a length is a length (positive).
 *   2. The five exercises that ask for a length quote it in their intro
 *      sentence through `{minutes}`, in both languages — the fixed „2" and
 *      „3 Minuten" that stood above the slider are gone.
 *
 * Every refusal is paired with a positive control, as in db.security.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { serviceClient, testUser } from './db.support';

const CHECK_VIOLATION = '23514';

let alice: SupabaseClient;
let aliceId: string;
let bob: SupabaseClient;
let bobId: string;

beforeAll(async () => {
  ({ client: alice, userId: aliceId } = await testUser());
  ({ client: bob, userId: bobId } = await testUser());
}, 30_000);

afterAll(async () => {
  const { error } = await serviceClient().from('sessions').delete().in('user_id', [aliceId, bobId]);
  expect(error, 'cleanup was refused — later failures in this file are not their own').toBeNull();
});

async function start(client: SupabaseClient, userId: string, exerciseId: string) {
  return client
    .from('sessions')
    .insert({ user_id: userId, exercise_id: exerciseId, goal_id: 'relax', status: 'started', step: 'intro' })
    .select('id, length_seconds')
    .single();
}

describe('length · a session remembers how long it is', () => {
  it('starts with no length and stores the chosen one — the positive control', async () => {
    const created = await start(alice, aliceId, 'free-rein');
    expect(created.error).toBeNull();
    expect(created.data?.length_seconds).toBeNull();
    const id = created.data?.id as string;

    const chosen = await alice.from('sessions').update({ length_seconds: 330 }).eq('id', id).select('length_seconds');
    expect(chosen.error).toBeNull();
    expect(chosen.data).toEqual([{ length_seconds: 330 }]);

    await alice.from('sessions').update({ status: 'abandoned', ended_at: new Date().toISOString() }).eq('id', id);
  });

  it('refuses a length of zero or less', async () => {
    const created = await start(alice, aliceId, 'harp');
    expect(created.error).toBeNull();
    const id = created.data?.id as string;

    const zero = await alice.from('sessions').update({ length_seconds: 0 }).eq('id', id);
    expect(zero.error?.code).toBe(CHECK_VIOLATION);
    const negative = await alice.from('sessions').update({ length_seconds: -30 }).eq('id', id);
    expect(negative.error?.code).toBe(CHECK_VIOLATION);

    await alice.from('sessions').update({ status: 'abandoned', ended_at: new Date().toISOString() }).eq('id', id);
  });

  it('lets nobody else write another person’s length', async () => {
    const created = await start(alice, aliceId, 'mindfulness-cards');
    expect(created.error).toBeNull();
    const id = created.data?.id as string;

    /* RLS filters: Bob's update reaches no row, and Alice's row is unchanged. */
    const theirs = await bob.from('sessions').update({ length_seconds: 600 }).eq('id', id).select('id');
    expect(theirs.error).toBeNull();
    expect(theirs.data).toEqual([]);
    const mine = await alice.from('sessions').select('length_seconds').eq('id', id).single();
    expect(mine.data).toEqual({ length_seconds: null });

    await alice.from('sessions').update({ status: 'abandoned', ended_at: new Date().toISOString() }).eq('id', id);
  });
});

describe('length · the intro sentence quotes it', () => {
  it('reads {minutes} in every card and instrument intro, in both languages', async () => {
    const { data: exercises, error: kindsError } = await alice
      .from('exercises')
      .select('id')
      .in('kind', ['card_based', 'instruments']);
    expect(kindsError).toBeNull();
    const ids = (exercises ?? []).map((row) => row.id).sort();
    expect(ids).toEqual(['free-rein', 'harp', 'kalimba', 'marimba', 'mindfulness-cards']);

    const { data, error } = await alice
      .from('exercise_i18n')
      .select('exercise_id, locale, intro_md')
      .in('exercise_id', ids);
    expect(error).toBeNull();
    expect(data).toHaveLength(ids.length * 2);
    for (const row of data ?? []) {
      const where = `${row.exercise_id}/${row.locale}`;
      expect(row.intro_md, where).toContain(row.locale === 'de' ? 'die nächsten {minutes} Minuten' : 'the next {minutes} minutes');
      expect(row.intro_md, where).not.toMatch(/nächsten [0-9]+ Minuten|next [0-9]+ minutes/);
    }
  });
});
