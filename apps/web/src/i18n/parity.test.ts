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
});
