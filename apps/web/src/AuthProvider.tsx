/**
 * Signs in on boot and publishes the result.
 *
 * Mounted above the router, because it needs no routing; the GATE — deciding
 * what renders for each state — lives further down, where the layout and the
 * locale are. See main.tsx's SessionGate for why the sign-in screen cannot
 * render from here.
 */
import * as React from 'react';
import { accountEmail, ensureSession } from './lib/auth';
import { getSupabase } from './lib/supabase';
import { AuthContext, INITIAL_AUTH_STATE } from './lib/authContext';
import type { AuthState } from './lib/authContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(INITIAL_AUTH_STATE);

  React.useEffect(() => {
    let cancelled = false;

    /**
     * SUBSCRIBED BEFORE `ensureSession()` RESOLVES, and that ordering is the
     * whole of how the gate opens.
     *
     * It used to be subscribed afterwards, inside the success branch, because
     * the only thing it had to catch was a refresh of a session that already
     * existed. With the gate there is a second job: when somebody signs in at
     * the form, SIGNED_IN is the event that says so, and it fires while this
     * provider is sitting on `{ kind: 'gate' }`. Subscribing only after a
     * session resolved would mean nothing was listening at the one moment it
     * matters, and the form would succeed to no visible effect.
     *
     * Reloading the page after sign-in would also have worked. This does not,
     * because a reload discards the keystrokes-to-paint the person just spent
     * and shows them a white flash to tell them it worked.
     */
    const { data: subscription } = getSupabase().auth.onAuthStateChange((_event, next) => {
      if (cancelled) return;

      if (next === null) {
        /* Signing out reloads the tab (lib/signIn.ts), so this is reached by a
           token that expired or was revoked elsewhere rather than by the
           sign-out control. Publishing 'signedOut' means the gate returns
           instead of the app sitting on an id it can no longer read with. */
        setState({ status: 'signedOut', userId: null, email: null, error: null });
        return;
      }

      setState((prev) =>
        prev.status === 'ready' && prev.userId === next.user.id
          ? prev
          : {
              status: 'ready',
              userId: next.user.id,
              /* `''` for an anonymous user, which `?? null` does not catch.
                 See accountEmail's docblock — this was a real bug. */
              email: accountEmail(next.user.email),
              error: null,
            },
      );
    });

    ensureSession()
      .then((outcome) => {
        if (cancelled) return;

        if (outcome.kind === 'gate') {
          /* Printed, because a gate looks identical to a bug from the outside
             and the flag that caused it is invisible on screen. */
          console.info('[musie] no session, and VITE_REQUIRE_ACCOUNT is on: showing sign-in.');
          setState({ status: 'signedOut', userId: null, email: null, error: null });
          return;
        }

        /* Printed deliberately: reload the page and this id stays the same,
           which is the whole of done-when #1. The suffix says which happened,
           so a fresh id after a reload is obvious rather than something you
           have to compare by eye. */
        console.info(
          `[musie] user id: ${outcome.session.user.id} ` +
          `(${outcome.created ? 'NEW anonymous user created' : 'restored from localStorage'})`,
        );

        setState({
          status: 'ready',
          userId: outcome.session.user.id,
          email: accountEmail(outcome.session.user.email),
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const wrapped = error instanceof Error ? error : new Error(String(error));
        /* Loud, because there is no UI for this and a blank main area on its
           own says nothing about why. */
        console.error('[musie] sign-in failed:', wrapped.message);
        setState({ status: 'error', userId: null, email: null, error: wrapped });
      });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
