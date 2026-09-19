/**
 * Signs in on boot and publishes the result.
 *
 * Mounted above the router, because it needs no routing; the GATE — deciding
 * what renders while this is pending — lives in AppShell, where the layout is.
 */
import * as React from 'react';
import { ensureSession } from './lib/auth';
import { getSupabase } from './lib/supabase';
import { AuthContext, INITIAL_AUTH_STATE } from './lib/authContext';
import type { AuthState } from './lib/authContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(INITIAL_AUTH_STATE);

  React.useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    ensureSession()
      .then(({ session, created }) => {
        if (cancelled) return;

        /* Printed deliberately: reload the page and this id stays the same,
           which is the whole of done-when #1. The suffix says which happened,
           so a fresh id after a reload is obvious rather than something you
           have to compare by eye. */
        console.info(
          `[musie] anonymous user id: ${session.user.id} ` +
          `(${created ? 'NEW user created' : 'restored from localStorage'})`,
        );

        setState({ status: 'ready', userId: session.user.id, error: null });

        /* Keep the id honest if the session is refreshed or replaced. */
        const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
          if (next === null) return;
          setState((prev) =>
            prev.userId === next.user.id
              ? prev
              : { status: 'ready', userId: next.user.id, error: null },
          );
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const wrapped = error instanceof Error ? error : new Error(String(error));
        /* Loud, because there is no UI for this and a blank main area on its
           own says nothing about why. */
        console.error('[musie] sign-in failed:', wrapped.message);
        setState({ status: 'error', userId: null, error: wrapped });
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
