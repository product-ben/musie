/**
 * The auth gate's state, shared through context.
 *
 * Separate from AuthProvider.tsx so that file exports a component and nothing
 * else, which is what Fast Refresh needs to replace it cleanly.
 */
import { createContext, useContext } from 'react';

export type AuthStatus = 'pending' | 'ready' | 'error';

export interface AuthState {
  status: AuthStatus;
  /** The signed-in user, or null until `status` is 'ready'. */
  userId: string | null;
  /** Set only when `status` is 'error'. */
  error: Error | null;
}

export const INITIAL_AUTH_STATE: AuthState = {
  status: 'pending',
  userId: null,
  error: null,
};

export const AuthContext = createContext<AuthState>(INITIAL_AUTH_STATE);

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
