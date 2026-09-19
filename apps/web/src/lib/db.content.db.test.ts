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
      service.from('situation_i18n').select('situation_id, label').like('label', '[[]DE] %'),
      service.from('user_type_i18n').select('user_type_id, label').like('label', '[[]DE] %'),
    ]);

    for (const check of checks) {
      expect(check.error).toBeNull();
      expect(check.data).toEqual([]);
    }
  });
});
