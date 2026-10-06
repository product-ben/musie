/**
 * The beta form's validation — the part of `betaSignup.ts` a unit test can
 * reach.
 *
 * Everything else in that file needs a Supabase client, and this repo mocks
 * one nowhere: a hand-built `from().insert()` chain is a fake to maintain
 * forever and would prove nothing about the grant or the constraints it is
 * talking to. So the round trip is tested against the real stack in
 * `betaSignup.db.test.ts`, and the rules are tested here.
 *
 * These assertions name MESSAGE KEYS, never the sentences behind them. The
 * copy gets rewritten; which field is wrong does not.
 */
import { describe, expect, it } from 'vitest';

import { BETA_REASONS } from './betaReasons';
import {
  EMAIL_MAX, FIRST_NAME_MAX, betaSignupProblems, hasProblem,
} from './betaSignup';
import type { BetaSignupFields } from './betaSignup';

/** A set that passes, so each test can break exactly one thing. */
const GOOD: BetaSignupFields = {
  firstName: 'Ben',
  email: 'ben@example.com',
  reasonCode: BETA_REASONS[0].code,
};

const NO_PROBLEMS = { firstName: null, email: null, reasonCode: null };

describe('betaSignupProblems', () => {
  it('finds nothing wrong with a filled-in form', () => {
    /* The positive control for every test below: if this fails, each "it
       reports X" passes for the wrong reason. */
    expect(betaSignupProblems(GOOD)).toEqual(NO_PROBLEMS);
    expect(hasProblem(betaSignupProblems(GOOD))).toBe(false);
  });

  describe('the first name', () => {
    it('is required', () => {
      expect(betaSignupProblems({ ...GOOD, firstName: '' }).firstName)
        .toBe('beta.error.firstName');
    });

    it('is required after trimming, so spaces are not a name', () => {
      expect(betaSignupProblems({ ...GOOD, firstName: '   ' }).firstName)
        .toBe('beta.error.firstName');
    });

    it('survives the spaces a phone keyboard adds', () => {
      /* Trimmed rather than refused: ' Ben ' is a name with two accidents
         around it, and `submitBetaSignup` writes the trimmed form. */
      expect(betaSignupProblems({ ...GOOD, firstName: ' Ben ' }).firstName).toBeNull();
    });

    it('accepts the longest name the column takes', () => {
      expect(betaSignupProblems({ ...GOOD, firstName: 'n'.repeat(FIRST_NAME_MAX) }).firstName)
        .toBeNull();
    });

    it('refuses one character more than the column takes', () => {
      /* The boundary in both directions, because the cap exists to agree with
         `beta_signups_first_name_shape` — a name this accepts and Postgres
         refuses is a 23514 the person cannot act on. */
      expect(betaSignupProblems({ ...GOOD, firstName: 'n'.repeat(FIRST_NAME_MAX + 1) }).firstName)
        .toBe('beta.error.firstName');
    });
  });

  describe('the email address', () => {
    it('is required', () => {
      expect(betaSignupProblems({ ...GOOD, email: '' }).email).toBe('beta.error.email');
    });

    it('needs an @', () => {
      expect(betaSignupProblems({ ...GOOD, email: 'ben.example.com' }).email)
        .toBe('beta.error.email');
    });

    it('needs a dot after the @', () => {
      expect(betaSignupProblems({ ...GOOD, email: 'ben@example' }).email)
        .toBe('beta.error.email');
    });

    it('refuses a second @', () => {
      expect(betaSignupProblems({ ...GOOD, email: 'ben@@example.com' }).email)
        .toBe('beta.error.email');
    });

    it('refuses an address with a space in it', () => {
      expect(betaSignupProblems({ ...GOOD, email: 'ben smith@example.com' }).email)
        .toBe('beta.error.email');
    });

    it('accepts a pasted address with a trailing space', () => {
      /* The commonest way an address arrives, and the reason both this and the
         insert trim before they look. */
      expect(betaSignupProblems({ ...GOOD, email: 'ben@example.com ' }).email).toBeNull();
    });

    it('accepts the shapes a weak check is meant to let through', () => {
      /* Deliberately NOT a strict RFC 5322 implementation — the column's
         comment says why. These are ordinary addresses that over-clever
         patterns reject, and all four belong to somebody. */
      for (const email of [
        'ben+musie@example.com',
        'ben.lipinski@sub.example.co.uk',
        "o'brien@example.com",
        'ben@exämple.de',
      ]) {
        expect(betaSignupProblems({ ...GOOD, email }).email).toBeNull();
      }
    });

    it('refuses an address longer than SMTP carries', () => {
      const long = `${'n'.repeat(EMAIL_MAX)}@example.com`;
      expect(betaSignupProblems({ ...GOOD, email: long }).email).toBe('beta.error.email');
    });
  });

  describe('the reason', () => {
    it('accepts every code the list offers', () => {
      for (const reason of BETA_REASONS) {
        expect(betaSignupProblems({ ...GOOD, reasonCode: reason.code }).reasonCode).toBeNull();
      }
    });

    it('is required — nothing pressed is not an answer', () => {
      expect(betaSignupProblems({ ...GOOD, reasonCode: '' }).reasonCode)
        .toBe('beta.error.reason');
    });

    it('refuses a code this build does not offer', () => {
      /* What a tab that was open across a deploy can send. */
      expect(betaSignupProblems({ ...GOOD, reasonCode: 'retired' }).reasonCode)
        .toBe('beta.error.reason');
    });
  });

  it('reports every wrong field at once, not just the first', () => {
    /* Each message is drawn against its own control, so all three have to
       arrive together — one at a time would mean three submits to find out
       three things. */
    expect(betaSignupProblems({ firstName: '', email: 'nope', reasonCode: '' })).toEqual({
      firstName: 'beta.error.firstName',
      email: 'beta.error.email',
      reasonCode: 'beta.error.reason',
    });
  });
});

describe('hasProblem', () => {
  it('is false only when every field is fine', () => {
    expect(hasProblem(NO_PROBLEMS)).toBe(false);
  });

  it('is true when any single field is wrong', () => {
    expect(hasProblem({ ...NO_PROBLEMS, firstName: 'beta.error.firstName' })).toBe(true);
    expect(hasProblem({ ...NO_PROBLEMS, email: 'beta.error.email' })).toBe(true);
    expect(hasProblem({ ...NO_PROBLEMS, reasonCode: 'beta.error.reason' })).toBe(true);
  });
});
