/**
 * Sign-in on boot, exactly once per page load.
 *
 * ── WHY A PROMISE SINGLETON, AND NOT JUST AN EFFECT ─────────────────────────
 * `signInAnonymously()` creates a NEW user every time it is called. React's
 * StrictMode mounts, unmounts and remounts every component in development, so
 * an effect that signs in would run twice and leave two anonymous users
 * behind — one of them orphaned, holding a profiles row nobody will ever read
 * again. The same race exists for any concurrent caller.
 *
 * Holding the in-flight promise at module scope means the second caller awaits
 * the first call's result instead of starting another. This is the same race
 * the profiles trigger avoids on the database side, one layer up.
 *
 * A rejection clears the singleton, so a transient network failure can be
 * retried by a remount rather than poisoning the module for the page's life.
 *
 * ── AND WHY THE SINGLETON NOW HAS TO BE RESETTABLE (H.0b) ──────────────────
 * It caches SUCCESS as well as failure, which was free while the only success
 * was "you have a session": that answer could not go stale within a page load.
 * `{ kind: 'gate' }` can. It means "there is no session and this build will not
 * invent one", and the very next thing that happens is somebody signing in —
 * after which every remount would still be served the cached gate and the app
 * would sit behind a form it had already passed.
 *
 * So a successful sign-in and a sign-out both call `resetSessionCache()`. It is
 * not a cache invalidation for tidiness: without it, signing in appears to do
 * nothing at all. The anonymous path never needed it, which is exactly why the
 * hazard arrives with this step rather than before it.
 */
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export interface ResolvedSession {
  session: Session;
  /**
   * Always false now, and kept rather than deleted.
   *
   * It meant "this call created the user", which only `signInAnonymously()`
   * could ever do — a session is restored from storage or it is not. With
   * anonymous accounts gone there is nothing left to create here, so the one
   * remaining producer passes `false`.
   *
   * It stays because `AuthProvider` logs it, and that log is how you tell a
   * session that survived a reload from a fresh one. Removing the field would
   * remove the distinction from the console at the same time.
   */
  created: boolean;
}

/**
 * What boot resolved to.
 *
 * A DISCRIMINATED UNION RATHER THAN A THROW, because a gate is a normal state
 * and not a failure. `AuthProvider` already maps a thrown error onto
 * `status: 'error'`, whose documented meaning is "the reason is on the console
 * and there is no UI for this" — the opposite of a screen the user is supposed
 * to read and act on. Throwing here would have put the one state with a screen
 * into the one branch that says there is not one.
 */
export type SessionOutcome =
  | ({ kind: 'session' } & ResolvedSession)
  /** No session. The sign-in screen is the only thing that follows. */
  | { kind: 'gate' };

/**
 * The account's email address, or null when there is not one.
 *
 * ── AN ANONYMOUS USER'S `email` IS `''`, NOT null AND NOT undefined ────────
 * MEASURED against the local stack on 2026-09-22, because the first version of
 * this code assumed otherwise and shipped `user.email ?? null`. `??` only
 * catches null and undefined, so an anonymous user's empty string went through
 * as an email address — and the account section, which decides whether to draw
 * 'Sign out' by asking whether there is one, drew it. (It was in the settings
 * sheet then; it is in the menu drawer now. The bug and the guard are the
 * same.) For an anonymous user
 * that button strands their entire diary on an id nobody can sign in as again,
 * which is the exact data-loss shape H.0 exists to keep away from testers.
 *
 * It read 'Signed in as ' with nothing after it, and it was found by walking
 * the flag-off path in a browser. Nothing else would have: `tsc` is satisfied
 * because `string` is what the type says, every test passed, and the anonymous
 * path is the one the gate's own tests never take.
 *
 * So ABSENCE IS NORMALISED ONCE, here, and `null` is the only spelling of it
 * that reaches the UI. Trimmed as well as emptiness-checked — a whitespace-only
 * address is not an address either, and it would render as a blank tail on a
 * sentence that promises to name somebody.
 */
export function accountEmail(email: string | null | undefined): string | null {
  if (email === null || email === undefined) return null;
  const trimmed = email.trim();
  return trimmed === '' ? null : trimmed;
}

let pending: Promise<SessionOutcome> | null = null;

async function resolveSession(): Promise<SessionOutcome> {
  const supabase = getSupabase();

  /* supabase-js has already read localStorage by this point, so a returning
     visitor is resolved here and never signs in again. This is also what makes
     "sign in before your first session" work with no code: a signed-in browser
     never reaches the branch below. */
  const existing = await supabase.auth.getSession();
  if (existing.error !== null) throw existing.error;
  if (existing.data.session !== null) {
    return { kind: 'session', session: existing.data.session, created: false };
  }

  /**
   * THE GATE, AND IT IS NO LONGER A CHOICE.
   *
   * There used to be a branch here: `VITE_REQUIRE_ACCOUNT` decided whether no
   * session meant the sign-in screen or `signInAnonymously()`. Anonymous
   * accounts were removed from the product on 2026-10-20 (Ben), so there is
   * one answer left and the flag that selected between them is gone with it.
   *
   * No session means the gate. Always, in every build, on every target.
   */
  return { kind: 'gate' };
}

export function ensureSession(): Promise<SessionOutcome> {
  pending ??= resolveSession().catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}

/**
 * Forget what boot resolved to, so the next `ensureSession()` asks again.
 *
 * Called by `signIn()` and `signOut()` in `lib/signIn.ts`. See the second
 * block of this file's header for why this is load-bearing rather than tidy.
 */
export function resetSessionCache(): void {
  pending = null;
}
