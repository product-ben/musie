/**
 * The beta reason list — the properties the type system cannot state.
 *
 * `labelKey` is already `MessageKey`, so a label that is not in the catalogue
 * is a typecheck error and needs no test. What is NOT checked anywhere else is
 * the thing this list is for: the codes go into a column with a shape check,
 * and the list is meant to be extended by hand.
 *
 * ── WHY NO ASSERTION NAMES A REASON ────────────────────────────────────────
 * 'Via Ben' and 'Via Lucy' are product configuration, and the whole point of
 * the file under test is that somebody edits it without asking a test for
 * permission. A test asserting that `lucy` is in the list fails the day Lucy
 * stops handing out the link, and that failure would say nothing about whether
 * anything works. Same argument `i18n/index.test.ts` makes for not quoting
 * copy.
 */
import { describe, expect, it } from 'vitest';

import { BETA_REASONS, CODE_SHAPE, isBetaReasonCode } from './betaReasons';

describe('BETA_REASONS', () => {
  it('has codes the database will accept', () => {
    /* CODE_SHAPE is a copy of `beta_signups_reason_code_shape` in
       20261006120000_beta_signups.sql. A code that fails here is a row
       Postgres would refuse — a 23514 in production, from a radio button
       somebody added in good faith. */
    const refused = BETA_REASONS.filter((reason) => !CODE_SHAPE.test(reason.code));
    expect(refused.map((reason) => reason.code)).toEqual([]);
  });

  it('uses each code once', () => {
    /* Two rows with one code would render two radios with the same value: the
       second is unpressable, because pressing it checks the first. */
    const codes = BETA_REASONS.map((reason) => reason.code);
    expect(codes).toEqual([...new Set(codes)]);
  });

  it('uses each label once', () => {
    /* And two codes with one label would be two radios reading the same
       words, which is the same defect seen from the other side. */
    const keys = BETA_REASONS.map((reason) => reason.labelKey);
    expect(keys).toEqual([...new Set(keys)]);
  });

  it('keeps the catch-all last', () => {
    /* The list is ordered as it is drawn, and a catch-all above a real answer
       invites people to take it — see the comment on BETA_REASONS. This is the
       one ordering rule the file states, so it is the one worth holding. */
    expect(BETA_REASONS.at(-1)?.code).toBe('other');
    expect(BETA_REASONS.filter((reason) => reason.code === 'other')).toHaveLength(1);
  });

  it('offers something to press at all', () => {
    /* The positive control for every "it refuses" test below and in
       betaSignup.test.ts: with an empty list, `isBetaReasonCode` refuses
       everything and those tests pass while the form cannot be submitted. */
    expect(BETA_REASONS.length).toBeGreaterThan(1);
  });
});

describe('isBetaReasonCode', () => {
  it('accepts every code the list offers', () => {
    for (const reason of BETA_REASONS) {
      expect(isBetaReasonCode(reason.code)).toBe(true);
    }
  });

  it('refuses the empty string, which is what nothing-pressed looks like', () => {
    expect(isBetaReasonCode('')).toBe(false);
  });

  it('refuses a code that is not offered, including a retired one', () => {
    /* A tab that was open when a reason was removed still holds its radio. */
    expect(isBetaReasonCode('conference-2019')).toBe(false);
  });

  it('does not match on a prefix or by case', () => {
    expect(isBetaReasonCode('be')).toBe(false);
    expect(isBetaReasonCode('BEN')).toBe(false);
  });
});
