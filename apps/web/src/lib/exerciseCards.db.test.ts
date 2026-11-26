/**
 * Exercise cards — `20261123100000_exercise_cards.sql` (PRD „Übungskarten mit
 * QR-Code"). The printed code, the scan step's sentence, and the two
 * leftovers the migration dropped.
 *
 * Read as a signed-in player where the app reads (the code is looked up from
 * `/s/:code`), with the service role only for the catalogue checks.
 */
import { describe, expect, it } from 'vitest';
import { serviceClient, testUser } from './db.support';
import { EXERCISE_CODE } from './scanCode';

describe('exercises.code — the code printed on an exercise card', () => {
  it('names every implemented exercise once, in the printed shape', async () => {
    const { data, error } = await serviceClient()
      .from('exercises').select('id, code, implemented').order('sort');
    expect(error).toBeNull();
    const codes = (data ?? []).map((row) => row.code as string | null);
    for (const row of data ?? []) {
      if (row.implemented) expect(row.code, `${row.id as string} has no code`).not.toBeNull();
      if (row.code !== null) expect(EXERCISE_CODE.test(row.code as string)).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  /* The cards are printed with these; a code that moved would send a printed
     card to another exercise. */
  it('keeps the codes the cards were printed with', async () => {
    const { data } = await serviceClient().from('exercises').select('id, code');
    const byId = Object.fromEntries((data ?? []).map((row) => [row.id as string, row.code as string]));
    expect(byId).toMatchObject({
      'mindfulness-cards': 'EX-01',
      'free-rein': 'EX-02',
      'breathing-score': 'EX-03',
      'sound-journey': 'EX-04',
      'body-scan-soundwalk': 'EX-05',
      kalimba: 'EX-06',
      marimba: 'EX-07',
      harp: 'EX-08',
    });
  });

  it('refuses a code in any other shape', async () => {
    const { error } = await serviceClient().from('exercises').update({ code: 'EX-1' }).eq('id', 'harp');
    expect(error?.code).toBe('23514');
  });

  it('is readable by a player, which is how a scanned code is looked up', async () => {
    const { client } = await testUser();
    const { data, error } = await client.from('exercises').select('id').eq('code', 'EX-02').single();
    expect(error).toBeNull();
    expect(data?.id).toBe('free-rein');
  });
});

describe('the scan step names the in-app scanner only (A9)', () => {
  it('mentions no camera app, in either language', async () => {
    const { data, error } = await serviceClient()
      .from('exercise_i18n').select('exercise_id, locale, scan_md')
      .in('exercise_id', ['mindfulness-cards', 'free-rein']);
    expect(error).toBeNull();
    expect(data).toHaveLength(4);
    for (const row of data ?? []) {
      expect(row.scan_md as string, `${row.exercise_id as string} (${row.locale as string})`)
        .not.toMatch(/Kamera-App|camera app/i);
      expect(row.scan_md as string).toMatch(/hier in Musie|here in Musie/);
    }
  });
});

describe('the two leftovers are gone (V5)', () => {
  it('has no exercise_tracks any more', async () => {
    const { error } = await serviceClient().from('exercise_tracks').select('*').limit(1);
    expect(error?.code).toBe('PGRST205');
  });

  it('has no exercises.needs_cards any more', async () => {
    const { error } = await serviceClient().from('exercises').select('needs_cards').limit(1);
    expect(error?.code).toBe('42703');
  });
});
