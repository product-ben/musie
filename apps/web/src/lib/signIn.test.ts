/**
 * The GoTrue-code → copy-key table — H.0b.
 *
 * ── WHAT THIS CAN AND CANNOT PROVE ─────────────────────────────────────────
 * It proves the TABLE: that each code the app knows about resolves to the
 * intended sentence, and that an unknown one falls somewhere sensible rather
 * than off the end. It cannot prove that GoTrue emits these codes — a table
 * tested only against itself is a tautology, and the version of that mistake
 * worth avoiding here is matching a code Supabase never sends.
 *
 * `signIn.db.test.ts` is the other half: it drives the real stack and asserts
 * the code that really comes back for a wrong password. The two are deliberately
 * separate, because only one of them can run in `pnpm check`.
 *
 * ── THE ONE ASSERTION THAT IS NOT ABOUT A CODE ─────────────────────────────
 * The keys are checked to be REAL keys, by looking them up. `MessageKey` makes
 * a typo a typecheck error for a literal, and every key here is a literal — so
 * this guards the other direction: a key that is deleted from the catalogue
 * later while this file still names it.
 */
import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { signInMessageKey } from './signIn';

describe('signInMessageKey · a wrong credential is not a broken server', () => {
  it('maps invalid_credentials to the retype-both sentence', () => {
    expect(signInMessageKey('invalid_credentials')).toBe('auth.error.credentials');
  });

  it('maps email_not_confirmed to the ask-a-person sentence', () => {
    /* Unreachable while H.0's script passes `email_confirm: true`. Mapped
       anyway: on the day it is reachable there is no mail to fix it with, and
       'wrong password' would send somebody hunting for a typo that is not
       there. */
    expect(signInMessageKey('email_not_confirmed')).toBe('auth.error.notConfirmed');
  });

  it('maps both rate-limit codes to the wait-a-minute sentence', () => {
    expect(signInMessageKey('over_request_rate_limit')).toBe('auth.error.rateLimit');
    expect(signInMessageKey('over_email_send_rate_limit')).toBe('auth.error.rateLimit');
  });
});

describe('signInMessageKey · anything unrecognised still says something true', () => {
  it.each([undefined, '', 'user_banned', 'something_new_in_gotrue_2027'])(
    'falls back to the generic sentence for %s',
    (code) => {
      /* NOT `auth.error.credentials`. An unknown failure blamed on the
         password sends a tester to check a password that was right, and the
         generic sentence is the only honest thing to say about a cause the app
         does not recognise. */
      expect(signInMessageKey(code)).toBe('auth.error.unknown');
    },
  );
});

describe('every key this table names is in the catalogue', () => {
  it.each([
    'invalid_credentials',
    'email_not_confirmed',
    'over_request_rate_limit',
    'over_email_send_rate_limit',
    'anything-else',
  ])('%s resolves to a key with copy behind it', (code) => {
    const key = signInMessageKey(code);
    expect(Object.keys(en)).toContain(key);
    /* And the copy is a sentence, not an empty string somebody stubbed. */
    expect(en[key].length).toBeGreaterThan(10);
  });
});
