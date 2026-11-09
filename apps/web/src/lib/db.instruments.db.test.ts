/**
 * The instruments, as the database holds them — 2026-11-09.
 *
 * Three promises from the brief, each held here against Postgres:
 *
 *   1. Kalimba, Marimba and Harfe exist as exercises of kind `instruments`,
 *      appended (sort 6–8), under `relax`, with every text in both languages.
 *   2. Their sound and their samples in the database are EXACTLY the files
 *      `sources.test.ts` holds against the experiments — so the database
 *      cannot drift from the experiment without one of the two suites going
 *      red.
 *   3. A session of one remembers the play mode and the play time, and only
 *      its owner can write them.
 *
 * Every refusal is paired with a positive control, as in db.security.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { INSUFFICIENT_PRIVILEGE, anonClient, serviceClient, testUser } from './db.support';

const CONTENT = join(__dirname, '..', '..', '..', '..', 'supabase', 'content', 'instruments');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON files
const file = (name: string): any => JSON.parse(readFileSync(join(CONTENT, name), 'utf8'));

const IDS = ['kalimba', 'marimba', 'harp'] as const;
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

describe('instruments · the three exercises', () => {
  it('are of kind instruments, appended after the five, in the brief’s order', async () => {
    const { data, error } = await alice
      .from('exercises')
      .select('id, kind, sort, implemented, needs_cards, listen_gate_seconds')
      .order('sort');
    expect(error).toBeNull();
    const last = (data ?? []).slice(-3);
    expect(last.map((row) => [row.id, row.kind, row.sort])).toEqual([
      ['kalimba', 'instruments', 6], ['marimba', 'instruments', 7], ['harp', 'instruments', 8],
    ]);
    for (const row of last) {
      expect(row.implemented).toBe(true);
      expect(row.needs_cards).toBe(false);
      /* The timer, 1:30 (Ben's brief). */
      expect(row.listen_gate_seconds).toBe(90);
    }
  });

  it('appear under Entspannen and nowhere else', async () => {
    const { data, error } = await alice
      .from('exercise_goals')
      .select('exercise_id, goal_id')
      .in('exercise_id', [...IDS]);
    expect(error).toBeNull();
    expect((data ?? []).map((row) => `${row.exercise_id}:${row.goal_id}`).sort())
      .toEqual(['harp:relax', 'kalimba:relax', 'marimba:relax']);
  });

  it('start in „mit Musie“ with vibration on, each on its own instrument', async () => {
    const { data, error } = await alice
      .from('exercise_instruments')
      .select('exercise_id, instrument_id, default_mode, vibration_default')
      .order('exercise_id');
    expect(error).toBeNull();
    expect(data).toEqual([
      { exercise_id: 'harp', instrument_id: 'harp', default_mode: 'with_musie', vibration_default: true },
      { exercise_id: 'kalimba', instrument_id: 'kalimba', default_mode: 'with_musie', vibration_default: true },
      { exercise_id: 'marimba', instrument_id: 'marimba', default_mode: 'with_musie', vibration_default: true },
    ]);
  });

  it('have every text in German and English — missing_translations says nothing about them', async () => {
    const { data, error } = await alice
      .from('missing_translations')
      .select('entity, record_id, locale, issue, column_name')
      .in('record_id', [...IDS]);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    /* The positive control: the rows are there, and so is the copy the play
       step cannot do without. */
    const copy = await alice
      .from('exercise_i18n')
      .select('exercise_id, locale, name, play_md, play_touch_md, play_pointer_md, focus_headline, play_cta, mode_solo_label, mode_solo_md, mode_musie_label, mode_musie_md, motion_md, motion_label')
      .in('exercise_id', [...IDS]);
    expect(copy.error).toBeNull();
    expect(copy.data).toHaveLength(6);
    for (const row of copy.data ?? []) {
      for (const column of ['name', 'play_md', 'play_touch_md', 'play_pointer_md', 'focus_headline', 'play_cta', 'mode_solo_label', 'mode_solo_md', 'mode_musie_label', 'mode_musie_md'] as const) {
        expect(row[column], `${row.exercise_id}/${row.locale}/${column}`).toBeTruthy();
      }
      /* The harp uses no sensor and has no switch for it. */
      expect(row.motion_md === null, `${row.exercise_id}/${row.locale}/motion_md`).toBe(row.exercise_id === 'harp');
      expect(row.motion_label === null, `${row.exercise_id}/${row.locale}/motion_label`).toBe(row.exercise_id === 'harp');
    }
  });

  it('say „Duett mit Musie“ first, and the harp keeps its sheet headline (Ben, 2026-11-09)', async () => {
    const { data } = await alice.from('exercise_i18n')
      .select('locale, mode_musie_label, mode_solo_label, focus_headline').eq('exercise_id', 'harp').order('locale');
    expect(data?.[0]).toEqual({
      locale: 'de', mode_musie_label: 'Duett mit Musie', mode_solo_label: 'Alleine',
      focus_headline: 'Atme tief ein und aus. Spiele dabei Musies Harfe im Rhythmus deines Atems.',
    });
  });

  it('say „Zur Harfe“ and „To the harp“ on the button', async () => {
    const { data } = await alice.from('exercise_i18n').select('locale, play_cta').eq('exercise_id', 'harp').order('locale');
    expect(data).toEqual([{ locale: 'de', play_cta: 'Zur Harfe' }, { locale: 'en', play_cta: 'To the harp' }]);
  });
});

describe('instruments · the sound is the experiments’', () => {
  it('holds each instrument’s family and source', async () => {
    const { data, error } = await alice.from('instruments').select('id, family, source_experiment, source_commit').order('id');
    expect(error).toBeNull();
    expect(data).toEqual(['harp', 'kalimba', 'marimba'].map((id) => {
      const config = file(`${id}.json`);
      return { id, family: config.family, source_experiment: config.source.experiment, source_commit: config.source.commit };
    }));
  });

  it.each(['harp', 'kalimba', 'marimba'])('%s: sound, answer and demo equal the locked files', async (id) => {
    const { data, error } = await alice.from('instrument_sounds').select('sound, answer, demo').eq('instrument_id', id).single();
    expect(error).toBeNull();
    const config = file(`${id}.json`);
    const shared = file('answer.json');
    delete shared.$comment;
    expect(data?.sound).toEqual(config.sound);
    expect(data?.answer).toEqual({ ...shared, ...config.answer });
    expect(data?.demo).toEqual(config.demo);
  });

  it('indexes exactly the 32 sample files, by path, size and hash', async () => {
    const { data, error } = await alice
      .from('instrument_samples')
      .select('instrument_id, file, path, midi, layer, bytes, sha256')
      .order('path');
    expect(error).toBeNull();
    const manifest = file('samples.json').samples as Record<string, unknown>[];
    expect(data).toEqual(manifest.map(({ instrument, file: name, path, midi, layer, bytes, sha256 }) => ({
      instrument_id: instrument, file: name, path, midi, layer, bytes, sha256,
    })));
  });
});

describe('instruments · nobody but a migration writes them', () => {
  it('shows anon nothing', async () => {
    for (const table of ['instruments', 'instrument_sounds', 'instrument_samples', 'exercise_instruments'] as const) {
      const { data, error } = await anonClient().from(table).select('*');
      /* Revoked from anon: a privilege error, or — where PostgREST answers
         before the grant is consulted — an empty set. Never a row. */
      expect(data ?? [], table).toEqual([]);
      if (error !== null) expect(error.code, table).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  it('refuses a signed-in write, which the service role may make', async () => {
    const refused = await alice.from('instrument_sounds').update({ demo: { string: 0 } }).eq('instrument_id', 'harp').select('instrument_id');
    expect(refused.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    /* The positive control: the same write as service_role reaches the row —
       and is put straight back. */
    const before = await serviceClient().from('instrument_sounds').select('demo').eq('instrument_id', 'harp').single();
    expect(before.error).toBeNull();
    const allowed = await serviceClient().from('instrument_sounds').update({ demo: before.data?.demo }).eq('instrument_id', 'harp').select('instrument_id');
    expect(allowed.error).toBeNull();
    expect(allowed.data).toEqual([{ instrument_id: 'harp' }]);
  });
});

describe('instruments · a session remembers how it was played', () => {
  async function start(client: SupabaseClient, userId: string) {
    return client
      .from('sessions')
      .insert({ user_id: userId, exercise_id: 'harp', goal_id: 'relax', status: 'started', step: 'intro' })
      .select('id')
      .single();
  }

  it('walks intro → play and stores mode and seconds — the positive control', async () => {
    const created = await start(alice, aliceId);
    expect(created.error).toBeNull();
    const id = created.data?.id as string;

    const played = await alice
      .from('sessions')
      .update({ step: 'play', play_mode: 'with_musie', play_seconds: 97 })
      .eq('id', id)
      .select('step, play_mode, play_seconds');
    expect(played.error).toBeNull();
    expect(played.data).toEqual([{ step: 'play', play_mode: 'with_musie', play_seconds: 97 }]);

    const solo = await alice.from('sessions').update({ play_mode: 'solo' }).eq('id', id).select('play_mode');
    expect(solo.data).toEqual([{ play_mode: 'solo' }]);

    const done = await alice
      .from('sessions')
      .update({ status: 'finished', step: 'reflect', ended_at: new Date().toISOString() })
      .eq('id', id);
    expect(done.error).toBeNull();
  });

  it('refuses a mode that is not one of the two, and negative seconds', async () => {
    const created = await start(alice, aliceId);
    expect(created.error).toBeNull();
    const id = created.data?.id as string;

    const mode = await alice.from('sessions').update({ play_mode: 'duet' }).eq('id', id);
    expect(mode.error?.code).toBe(CHECK_VIOLATION);
    const seconds = await alice.from('sessions').update({ play_seconds: -1 }).eq('id', id);
    expect(seconds.error?.code).toBe(CHECK_VIOLATION);

    await alice.from('sessions').update({ status: 'abandoned', ended_at: new Date().toISOString() }).eq('id', id);
  });

  it('lets nobody else write another person’s play time', async () => {
    const created = await start(alice, aliceId);
    expect(created.error).toBeNull();
    const id = created.data?.id as string;

    /* RLS filters: Bob's update reaches no row, and Alice's row is unchanged. */
    const theirs = await bob.from('sessions').update({ play_seconds: 1 }).eq('id', id).select('id');
    expect(theirs.error).toBeNull();
    expect(theirs.data).toEqual([]);
    const mine = await alice.from('sessions').select('play_seconds').eq('id', id).single();
    expect(mine.data).toEqual({ play_seconds: null });

    await alice.from('sessions').update({ status: 'abandoned', ended_at: new Date().toISOString() }).eq('id', id);
  });
});
