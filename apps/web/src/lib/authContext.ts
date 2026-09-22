/**
 * The auth gate's state, shared through context.
 *
 * Separate from AuthProvider.tsx so that file exports a component and nothing
 * else, which is what Fast Refresh needs to replace it cleanly.
 */
import { createContext, useContext } from 'react';

/**
 * 'signedOut' is H.0b's addition, and it is NOT a kind of error.
 *
 * It means: there is no session, `VITE_REQUIRE_ACCOUNT` is on, and this build
 * will not invent one — so the sign-in gate is what renders. 'error' keeps its
 * documented meaning of "the reason is on the console and there is no UI for
 * this", which is the opposite of a screen somebody is meant to read and act
 * on. Folding the two together would have put the one state that HAS a screen
 * into the one branch that says there is not one.
 */
export type AuthStatus = 'pending' | 'ready' | 'signedOut' | 'error';

export interface AuthState {
  status: AuthStatus;
  /** The signed-in user, or null until `status` is 'ready'. */
  userId: string | null;
  /**
   * The signed-in user's email address, or null when there is none.
   *
   * ── IT IS ALSO HOW THE APP ASKS "IS THIS A REAL ACCOUNT?" ────────────────
   * An anonymous user has no address, so `email === null` is exactly the
   * distinction the UI needs — and it is the address itself that the UI needs
   * anyway, to answer "which of us is signed in on this phone?" on a device
   * that gets passed around a workshop.
   *
   * DELIBERATELY NOT `is_anonymous`. BUILD-PLAN records, as a thing checked
   * rather than assumed, that the flag appears nowhere in `supabase/`,
   * `apps/web/src` or the design system, and that nothing distinguishes the two
   * kinds of user. Reading it here to decide whether to draw a control would
   * make that false, and would answer a narrower question than the one being
   * asked, with a value the screen cannot display.
   */
  email: string | null;
  /** Set only when `status` is 'error'. */
  error: Error | null;
}

export const INITIAL_AUTH_STATE: AuthState = {
  status: 'pending',
  userId: null,
  email: null,
  error: null,
};

export const AuthContext = createContext<AuthState>(INITIAL_AUTH_STATE);

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
