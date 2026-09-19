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

import { pickTranslation } from './content';

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
