/**
 * The flag's parse — H.0b.
 *
 * ── WHY THIS IS WORTH A TEST AT ALL ────────────────────────────────────────
 * It is six lines and it decides whether the beta is closed. The two failure
 * directions are not symmetrical: a flag meant to be ON that parses as off
 * opens the app to anyone with the URL and NOTHING ON SCREEN SAYS SO, while the
 * reverse shows a form to somebody who cannot get past it and is noticed in
 * seconds. So the cases that matter most here are the truthy spellings and the
 * string 'false' — the latter because `Boolean('false')` is `true`, which is
 * the bug this function exists to not have.
 *
 * The console is asserted as well as the return value. The warning IS the
 * feature for an unrecognised value: returning `false` quietly is what the
 * whole docblock argues against.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseRequireAccount } from './requireAccount';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseRequireAccount · the spellings that mean yes', () => {
  it.each(['true', '1', 'on', 'yes'])('accepts %s', (raw) => {
    expect(parseRequireAccount(raw)).toBe(true);
  });

  it('ignores case, because that is a typo and not an intent', () => {
    expect(parseRequireAccount('True')).toBe(true);
    expect(parseRequireAccount('TRUE')).toBe(true);
    expect(parseRequireAccount('Yes')).toBe(true);
  });

  it('ignores surrounding whitespace, which a .env file carries easily', () => {
    expect(parseRequireAccount(' true ')).toBe(true);
    expect(parseRequireAccount('\ttrue\n')).toBe(true);
  });
});

describe('parseRequireAccount · the default is off, and silently so', () => {
  it('is off when unset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseRequireAccount(undefined)).toBe(false);
    /* Not a mistake: .env.example ships the key and an absent one is the
       documented default, so there is nothing to warn anybody about. */
    expect(warn).not.toHaveBeenCalled();
  });

  it('is off when empty or whitespace', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseRequireAccount('')).toBe(false);
    expect(parseRequireAccount('   ')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['false', '0', 'off', 'no', 'False'])('is off for %s, without warning', (raw) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    /* THE ONE THAT WOULD BE TRUE UNDER `Boolean(...)`. A non-empty string is
       truthy in JavaScript, so 'false' is the case a bare coercion gets
       backwards and the flag would be permanently on. */
    expect(parseRequireAccount(raw)).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('parseRequireAccount · an unrecognised value is off AND loud', () => {
  it.each(['tru', 'ja', 'enabled', '2', 'on-for-beta'])('warns about %s', (raw) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseRequireAccount(raw)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    /* The warning has to carry the offending value and say which way it was
       resolved, or it is a line nobody can act on. */
    const [message] = warn.mock.calls[0] as [string];
    expect(message).toContain(JSON.stringify(raw));
    expect(message).toContain('OFF');
  });
});
