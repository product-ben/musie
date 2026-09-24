/**
 * `accountEmail` — and it exists because the obvious version was wrong.
 *
 * An anonymous Supabase user's `email` is the EMPTY STRING, not null and not
 * undefined, so `user.email ?? null` passes it straight through. The account
 * section — in the menu drawer since 2026-09-24, the settings sheet before it —
 * asks "is there an email address?" to decide whether to offer 'Sign out', and
 * for an anonymous user that button strands their whole diary on an
 * id nobody can sign in as again. It rendered 'Signed in as ' with nothing
 * after it and was found by walking the flag-off path in a browser — not by
 * `tsc`, which is satisfied because `string` is what the type says.
 *
 * The empty-string case is therefore the whole point of this file, and it is
 * first.
 */
import { describe, expect, it } from 'vitest';

import { accountEmail } from './auth';

describe('accountEmail · the case that was a bug', () => {
  it('treats the empty string as no address, which is what an anonymous user has', () => {
    expect(accountEmail('')).toBeNull();
  });

  it('treats a whitespace-only value as no address', () => {
    /* Not hypothetical for the SENTENCE it feeds: 'Signed in as    ' promises
       to name somebody and then does not. */
    expect(accountEmail('   ')).toBeNull();
    expect(accountEmail('\t\n')).toBeNull();
  });
});

describe('accountEmail · the absences that were already handled', () => {
  it('is null for null and for undefined', () => {
    expect(accountEmail(null)).toBeNull();
    expect(accountEmail(undefined)).toBeNull();
  });
});

describe('accountEmail · a real address survives', () => {
  it('returns the address', () => {
    expect(accountEmail('tester@musie.test')).toBe('tester@musie.test');
  });

  it('trims it, so the rendered sentence has no stray gap', () => {
    expect(accountEmail('  tester@musie.test  ')).toBe('tester@musie.test');
  });

  it('does not otherwise touch it — casing is part of an address as displayed', () => {
    /* Deliberately NOT lower-cased. This value is shown to a person so they can
       recognise which account they are on, and silently re-casing what they
       were handed is the opposite of that. GoTrue does its own normalising for
       matching; this is for reading. */
    expect(accountEmail('Tester@Musie.test')).toBe('Tester@Musie.test');
  });
});
