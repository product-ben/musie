/**
 * Recovering from a token that names a user the database no longer has.
 *
 * ── THE STATE THIS EXISTS FOR, AND HOW IT IS REACHED ──────────────────────
 * `supabase.auth.getSession()` reads the stored token out of localStorage and
 * does NOT ask the server whether the user behind it still exists. So a signed
 * JWT whose `sub` has been deleted looks exactly like a healthy session: the
 * app boots, the gate opens, every screen renders, and nothing is wrong until
 * a write touches a foreign key.
 *
 * MEASURED, 2026-10-07, after `supabase db reset` — which is the documented way
 * to verify a migration (CLAUDE.md 4) and which empties `auth.users` with
 * everything else. The browser that was open through it walked the whole flow
 * and then failed on the one press that matters:
 *
 *   HTTP 409 /rest/v1/sessions
 *   23503: insert or update on table "sessions" violates foreign key
 *   constraint "sessions_user_id_fkey" — Key is not present in table
 *   "profiles".
 *
 * On screen that is `exercises.startFailed` — "Die Session konnte nicht
 * gestartet werden" — which is true and says nothing about why, and the only
 * cure anybody found was clearing site data by hand. It is not a local-stack
 * curiosity either: deleting one beta tester does the same thing to whatever
 * tab they had open.
 *
 * ── THE SIGNAL IS THE PROFILE ROW, NOT THE FAILED WRITE ───────────────────
 * `profiles` is created by a trigger on `auth.users` insert and cascades on
 * delete, so for a live user the row always exists and is always readable by
 * its own RLS policy. Zero rows for `auth.uid()` therefore means the identity
 * is gone — and the profile is read ON BOOT, long before anything is pressed.
 * Catching it there turns a write that fails deep in a flow into a reload
 * nobody has to understand.
 *
 * ── WHY A CLAIM AND NOT A FLAG ────────────────────────────────────────────
 * The recovery is `signOut()`, which reloads the tab. If the fresh identity
 * ALSO could not read a profile, the obvious implementation reloads again, and
 * again: an infinite reload loop that creates a new anonymous user every time
 * — a worse failure than the one being fixed, and one that writes rows.
 *
 * So recovery is CLAIMED rather than decided. The claim is recorded before the
 * sign-out and survives the reload, so the second boot cannot take it; it is
 * released only by a profile that actually reads. One recovery per tab, per
 * cause.
 *
 * `sessionStorage` rather than `localStorage`: the claim is about this tab's
 * current attempt and should not outlive the tab. A second tab opened later
 * gets its own attempt, which is right — by then the cause may be fixed.
 */

/**
 * The two methods this needs of a `Storage`, so the policy can be tested
 * without a DOM — both vitest projects are `environment: 'node'`.
 */
export interface RecoveryStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Namespaced like every other key this app keeps in web storage. */
export const IDENTITY_RECOVERY_KEY = 'musie-identity-recovery';

/**
 * `sessionStorage`, or null where it cannot be reached.
 *
 * Private modes, blocked site data and server rendering all make the accessor
 * itself throw rather than return null, which is why this is a try/catch and
 * not a `typeof` check — the same shape `cacheLocale` uses for localStorage.
 */
export function recoveryStore(): RecoveryStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Take the one recovery this tab is allowed, if it is still going.
 *
 * TRUE AT MOST ONCE. The claim is written before the caller acts on it, so the
 * boot that follows the reload finds it taken and falls through to reporting
 * the problem instead of reloading again.
 *
 * NO STORE MEANS NO RECOVERY, deliberately. Without somewhere to record the
 * claim there is no way to stop at one, and a reload loop is worse than the
 * error it would be papering over.
 */
export function claimIdentityRecovery(store: RecoveryStore | null): boolean {
  if (store === null) return false;
  try {
    if (store.getItem(IDENTITY_RECOVERY_KEY) !== null) return false;
    store.setItem(IDENTITY_RECOVERY_KEY, 'claimed');
    return true;
  } catch {
    /* Quota, or a store that reads but will not write. Same answer as no store
       at all: do not start something that cannot be stopped. */
    return false;
  }
}

/**
 * Give the claim back, once a profile has actually been read.
 *
 * Without this the recovery would be once per TAB rather than once per cause:
 * a browser left open across two resets would fix itself the first time and
 * then sit on the generic error the second.
 */
export function releaseIdentityRecovery(store: RecoveryStore | null): void {
  if (store === null) return;
  try {
    store.removeItem(IDENTITY_RECOVERY_KEY);
  } catch {
    /* Nothing to do, and nothing worth saying: the claim expires with the tab. */
  }
}
