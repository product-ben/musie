/**
 * EN/DE parity — the things the type system cannot check.
 *
 * `de.ts` is typed as `Messages`, which is `Record<keyof typeof en, string>`,
 * so a MISSING or EXTRA key is already a typecheck error. That is not what
 * these tests are for. They cover the three ways the catalogues can agree on
 * their keys and still be wrong at runtime:
 *
 *   1. a key present but empty, which renders as a blank label;
 *   2. a German string that lost an interpolation slot, so `{min}` never gets
 *      filled and the number silently disappears;
 *   3. a German string that INVENTED a slot English does not have, so the UI
 *      renders a literal `{foo}` because no caller passes it.
 *
 * (2) is the one that has actually happened in projects like this: the slot is
 * easy to drop while rewriting a sentence, and nothing complains until someone
 * reads a German screen.
 */
import { describe, expect, it } from 'vitest';

import { de } from './de';
import { en } from './en';

/** Every `{slot}` in a template, in the order they appear. */
function slotsOf(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const KEYS = Object.keys(en) as (keyof typeof en)[];

describe('catalogue parity', () => {
  it('has the same keys in both locales', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it('has a non-empty string for every key in both locales', () => {
    const empty = KEYS.filter(
      (key) => en[key].trim().length === 0 || de[key].trim().length === 0,
    );
    expect(empty).toEqual([]);
  });

  it('carries exactly the same interpolation slots in both locales', () => {
    const mismatched = KEYS.filter(
      (key) => slotsOf(en[key]).join() !== slotsOf(de[key]).join(),
    ).map((key) => `${key}: en=[${slotsOf(en[key])}] de=[${slotsOf(de[key])}]`);

    expect(mismatched).toEqual([]);
  });

  /* ── THE ONE SLOT THAT IS NEVER FILLED ───────────────────────────────────
     `{goal}` in /exercises' headline marks where a CONTROL goes, not where a
     string goes: `splitSlot` cuts the rendered sentence at it and the screen
     puts an `InlineLink` in the gap. The test above cannot protect it — a
     locale that dropped `{goal}` from BOTH forms would still have matching
     slots, and the headline would quietly render with no goal in it and no
     way to change one.

     This is what makes `splitSlot`'s null branch insurance rather than a path
     anybody takes. */
  const HEADLINES = [
    'exercises.headline.none',
    'exercises.headline.one',
    'exercises.headline.other',
  ] as const;

  it('keeps the {goal} slot in every headline form, in both locales', () => {
    const missing = HEADLINES.flatMap((key) => [
      ...(en[key].includes('{goal}') ? [] : [`en ${key}`]),
      ...(de[key].includes('{goal}') ? [] : [`de ${key}`]),
    ]);

    expect(missing).toEqual([]);
  });

  /* The count is interpolated in exactly one of the three. `none` and `one`
     write the number as a word or leave it out, which is the whole reason
     they are separate keys — a `{count}` in them would print a digit beside
     the word that already says it. */
  it('interpolates the count in the plural form and nowhere else', () => {
    expect(slotsOf(en['exercises.headline.other'])).toContain('count');
    expect(slotsOf(de['exercises.headline.other'])).toContain('count');
    for (const key of ['exercises.headline.none', 'exercises.headline.one'] as const) {
      expect(slotsOf(en[key])).not.toContain('count');
      expect(slotsOf(de[key])).not.toContain('count');
    }
  });
});
