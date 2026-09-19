/**
 * Anonymous sign-in, exactly once per page load.
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
 */
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export interface ResolvedSession {
  session: Session;
  /** True when this call created the user; false when it was restored. */
  created: boolean;
}

let pending: Promise<ResolvedSession> | null = null;

async function resolveSession(): Promise<ResolvedSession> {
  const supabase = getSupabase();

  /* supabase-js has already read localStorage by this point, so a returning
     visitor is resolved here and never signs in again. */
  const existing = await supabase.auth.getSession();
  if (existing.error !== null) throw existing.error;
  if (existing.data.session !== null) {
    return { session: existing.data.session, created: false };
  }

  const created = await supabase.auth.signInAnonymously();
  if (created.error !== null) throw created.error;
  if (created.data.session === null) {
    throw new Error(
      'Anonymous sign-in returned no session. Is enable_anonymous_sign_ins set? ' +
      'For the local stack that lives in supabase/config.toml, not the dashboard.',
    );
  }

  return { session: created.data.session, created: true };
}

export function ensureSession(): Promise<ResolvedSession> {
  pending ??= resolveSession().catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}
