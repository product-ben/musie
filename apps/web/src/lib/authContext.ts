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
 * It means: there is no session, and since 2026-10-20 there is nothing this
 * build could invent in its place — so the sign-in gate is what renders. 'error' keeps its
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
   * ── NULL IS NOW ONLY A TIMING STATE ──────────────────────────────────────
   * It used to carry a second meaning: an anonymous user had no address, so
   * `email === null` was how the UI asked "is this a real account?". With
   * anonymous accounts gone every user has one, and null means only that the
   * session has not resolved yet.
   *
   * The address is still what the UI wants, for the question it was always
   * really asking: "which of us is signed in on this phone?", on a device that
   * gets passed around a workshop.
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
