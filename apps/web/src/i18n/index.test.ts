/**
 * `translate()` — interpolation, and what happens to a slot nobody filled.
 *
 * ── WHY THESE TESTS DO NOT QUOTE THE COPY ──────────────────────────────────
 * The catalogue is copy, and copy gets rewritten. A test that asserts
 * `'5–10 minutes'` fails the day someone writes `'5 to 10 minutes'` — and
 * that failure says nothing about whether interpolation works. So every
 * assertion here is structural: the template is read from the catalogue, and
 * the result is checked for the VALUE that was passed in and for the absence
 * (or presence) of the literal slot token. Rewrite the sentence around the
 * slots and these still pass, which is the point.
 *
 * English is used throughout because it is the source of truth `de.ts` is
 * typed against; the behaviour under test is in `translate()`, not in either
 * catalogue.
 */
import { describe, expect, it } from 'vitest';
import { translate } from './index';
import { en } from './en';

/* Keys that carry slots today. If a rewrite removes the slots from one of
   these, the guard assertions below fail LOUDLY rather than letting the test
   quietly assert nothing. */
/* It was `exercises.timeframe` until that key went with the exercise detail
   (2026-09-24). Its replacement is the fact chip that states the same range on
   the card itself, and it carries the same two slots. */
const TWO_SLOT_KEY = 'exercises.fact.time';
const ONE_SLOT_KEY = 'route.session.title';

describe('translate', () => {
  it('substitutes every slot it is given a value for', () => {
    expect(en[TWO_SLOT_KEY]).toContain('{min}');
    expect(en[TWO_SLOT_KEY]).toContain('{max}');

    const result = translate('en', TWO_SLOT_KEY, { min: '5', max: '10' });

    expect(result).toContain('5');
    expect(result).toContain('10');
    expect(result).not.toContain('{min}');
    expect(result).not.toContain('{max}');
  });

  it('leaves a slot verbatim when params carry no value for it', () => {
    expect(en[ONE_SLOT_KEY]).toContain('{step}');

    /* A missing value must SHOW, not render as an empty gap — an untranslated
       "{step}" on screen is a bug report; a sentence with a hole in it is not. */
    const empty = translate('en', ONE_SLOT_KEY, {});
    const unrelated = translate('en', ONE_SLOT_KEY, { somethingElse: '2' });
    const explicitlyUndefined = translate('en', ONE_SLOT_KEY, { step: undefined });

    expect(empty).toContain('{step}');
    expect(unrelated).toContain('{step}');
    expect(explicitlyUndefined).toContain('{step}');
  });

  it('fills only the missing slot, leaving the filled one substituted', () => {
    const result = translate('en', TWO_SLOT_KEY, { min: '5' });

    expect(result).toContain('5');
    expect(result).not.toContain('{min}');
    expect(result).toContain('{max}');
  });
});
