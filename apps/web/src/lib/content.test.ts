/**
 * `pickTranslation()` — the "a missing translation is never silent" rule.
 *
 * Tested DIRECTLY rather than through `getExercises()`. Going through a query
 * would mean mocking `@supabase/supabase-js` — a fake `from().select().in()
 * .order()` chain, maintained forever — to exercise three lines of pure
 * logic that never touch the network. The function is exported for exactly
 * this reason.
 *
 * The console spies matter as much as the return values: falling back to
 * English WITHOUT warning is the failure this module exists to prevent, and a
 * test that only checked the returned row would pass with the warning
 * deleted.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pickCut, pickTranslation } from './content';

interface Row {
  locale: string;
  name: string;
}

const DE: Row = { locale: 'de', name: 'Deutsch' };
const EN: Row = { locale: 'en', name: 'English' };

/* Every spy is restored, so no test leaks a muted console — or its own call
   count — into the next one, and nothing that is NOT spied on prints. */
afterEach(() => {
  vi.restoreAllMocks();
});

describe('pickTranslation', () => {
  it('returns the exact locale when it exists, and says nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const picked = pickTranslation([EN, DE], 'de', 'exercise_i18n', 'ex-1');

    expect(picked).toBe(DE);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('falls back to English AND warns with the table, the id and the missing locale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const picked = pickTranslation([EN], 'de', 'exercise_i18n', 'ex-1');

    expect(picked).toBe(EN);
    expect(warn).toHaveBeenCalledTimes(1);

    /* Substance, not wording: whoever reads this warning has to be able to go
       straight to the row. The sentence around these three facts is free to
       change. */
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain('exercise_i18n');
    expect(message).toContain('ex-1');
    expect(message).toContain('de');
  });

  it('returns null and logs an error when there is no translation at all', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    /* All three shapes the signature admits. `null` and `undefined` are not
       hypothetical: a Supabase join filtered to a locale that matched nothing
       comes back empty, and the column can be absent entirely. */
    expect(pickTranslation<Row>([], 'de', 'card_i18n', 'card-3')).toBeNull();
    expect(pickTranslation<Row>(null, 'de', 'card_i18n', 'card-3')).toBeNull();
    expect(pickTranslation<Row>(undefined, 'de', 'card_i18n', 'card-3')).toBeNull();

    expect(error).toHaveBeenCalledTimes(3);
    const message = String(error.mock.calls[0][0]);
    expect(message).toContain('card_i18n');
    expect(message).toContain('card-3');
  });
});

/**
 * `pickCut()` — which recording answers the two questions.
 *
 * Tested directly for `pickTranslation`'s reason: it is pure, it decides what
 * a person actually hears, and going through `getListenAudio` would mean
 * mocking a supabase chain to exercise six lines that never touch the network.
 *
 * A NULL ON A ROW IS A WILDCARD — *this recording serves any answer* — which
 * is what the delivered audio looks like: one Bodyscan recording for every
 * combination, and two Klangreise ones that differ by ending and not by
 * posture. These are the rules that make that work, and the rules that let a
 * posture-specific cut take over later without anything being deleted.
 */
describe('pickCut', () => {
  const row = (
    id: string,
    posture: string | null,
    ending: string | null,
  ) => ({
    id,
    locale: 'de',
    posture,
    ending,
    mixed_src: `${id}-mixed.mp3`,
    voice_src: null,
    duration_seconds: 183,
    track_id: null,
  });

  it('takes the exact match when there is one', () => {
    const rows = [row('any', null, null), row('exact', 'lying', 'sleep')];
    expect(pickCut(rows, 'lying', 'sleep')?.id).toBe('exact');
  });

  /* Bodyscan: one recording, no answers named, and it has to answer all four
     combinations rather than none. */
  it('takes a catch-all when nothing is more specific', () => {
    const rows = [row('any', null, null)];
    for (const posture of ['sitting', 'lying']) {
      for (const ending of ['day', 'sleep']) {
        expect(pickCut(rows, posture, ending)?.id).toBe('any');
      }
    }
  });

  /* Klangreise: two recordings that name their ending and say nothing about
     posture. Both postures must reach the right ending. */
  it('matches on ending alone, for either posture', () => {
    const rows = [row('day', null, 'day'), row('sleep', null, 'sleep')];
    expect(pickCut(rows, 'sitting', 'sleep')?.id).toBe('sleep');
    expect(pickCut(rows, 'lying', 'sleep')?.id).toBe('sleep');
    expect(pickCut(rows, 'lying', 'day')?.id).toBe('day');
  });

  /* THE LADDER, and the order of it is the whole point: naming the posture
     beats naming the ending, and naming either beats naming neither. So the
     day a posture-specific cut is recorded it wins over the ending-specific
     one it replaces — without that row being deleted first. */
  it('prefers the more specific row, posture before ending', () => {
    const rows = [
      row('any', null, null),
      row('byEnding', null, 'sleep'),
      row('byPosture', 'lying', null),
      row('exact', 'lying', 'sleep'),
    ];
    expect(pickCut(rows, 'lying', 'sleep')?.id).toBe('exact');
    expect(pickCut(rows.slice(0, 3), 'lying', 'sleep')?.id).toBe('byPosture');
    expect(pickCut(rows.slice(0, 2), 'lying', 'sleep')?.id).toBe('byEnding');
    expect(pickCut(rows.slice(0, 1), 'lying', 'sleep')?.id).toBe('any');
  });

  it('refuses a row that names a different answer', () => {
    const rows = [row('sitting-only', 'sitting', null)];
    expect(pickCut(rows, 'lying', 'day')).toBeNull();
  });

  /* Nothing in this language yet, which `missing_cuts` lists and the
     listen step answers with its simulated clock. Not an error. */
  it('returns null when there is nothing at all', () => {
    expect(pickCut([], 'sitting', 'day')).toBeNull();
  });

  it('does not care what order the rows arrive in', () => {
    const rows = [row('exact', 'lying', 'sleep'), row('any', null, null)];
    expect(pickCut(rows, 'lying', 'sleep')?.id).toBe('exact');
    expect(pickCut([...rows].reverse(), 'lying', 'sleep')?.id).toBe('exact');
  });
});
