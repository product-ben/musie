/**
 * The one property that matters here is that recovery CANNOT LOOP.
 *
 * The recovery itself is a sign-out and a reload, so a policy that said yes
 * twice would reload forever and mint a new anonymous user on every pass —
 * writing rows, in a loop, to fix a problem that was only a stale token. Every
 * test below is a way of asking whether the second yes is possible.
 */
import { describe, expect, it } from 'vitest';
import {
  IDENTITY_RECOVERY_KEY, claimIdentityRecovery, releaseIdentityRecovery,
} from './identity';
import type { RecoveryStore } from './identity';

/** sessionStorage's two-and-a-half methods, over a Map. Both vitest projects
 *  are `environment: 'node'`, so there is no real one to borrow. */
function store(): RecoveryStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

/** A store that reads but refuses to write — a full quota, or a locked-down
 *  private mode. The claim must not be granted on the strength of a write that
 *  did not happen. */
function readOnlyStore(): RecoveryStore {
  const inner = store();
  return {
    getItem: inner.getItem,
    setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
    removeItem: inner.removeItem,
  };
}

describe('claimIdentityRecovery', () => {
  it('grants the first claim and records it before the caller acts', () => {
    const s = store();

    expect(claimIdentityRecovery(s)).toBe(true);
    expect(s.map.get(IDENTITY_RECOVERY_KEY)).toBeDefined();
  });

  /* THE WHOLE POINT. The second boot is the one after the reload. */
  it('refuses the second claim, which is what stops the reload loop', () => {
    const s = store();

    expect(claimIdentityRecovery(s)).toBe(true);
    expect(claimIdentityRecovery(s)).toBe(false);
    expect(claimIdentityRecovery(s)).toBe(false);
  });

  /* No store means no way to stop at one, so the answer is no rather than an
     optimistic yes. */
  it('refuses when there is nowhere to record the claim', () => {
    expect(claimIdentityRecovery(null)).toBe(false);
  });

  it('refuses when the store cannot be written to', () => {
    expect(claimIdentityRecovery(readOnlyStore())).toBe(false);
  });
});

describe('releaseIdentityRecovery', () => {
  /* Once per CAUSE, not once per tab: a browser left open across two resets
     should fix itself both times. */
  it('allows a later claim once a profile has actually been read', () => {
    const s = store();

    expect(claimIdentityRecovery(s)).toBe(true);
    expect(claimIdentityRecovery(s)).toBe(false);

    releaseIdentityRecovery(s);

    expect(claimIdentityRecovery(s)).toBe(true);
  });

  it('is safe with no store at all', () => {
    expect(() => { releaseIdentityRecovery(null); }).not.toThrow();
  });

  it('is safe on a store that throws', () => {
    const hostile: RecoveryStore = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { throw new Error('nope'); },
    };

    expect(() => { releaseIdentityRecovery(hostile); }).not.toThrow();
  });
});
