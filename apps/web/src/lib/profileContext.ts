/**
 * The signed-in user's profile, shared through context.
 *
 * Separate from ProfileProvider.tsx so that file exports a component and
 * nothing else, which is what Fast Refresh needs to replace it cleanly.
 */
import { createContext, useContext } from 'react';
import type { Profile, ProfilePatch } from './profile';

export type ProfileStatus = 'pending' | 'ready' | 'error';

export interface ProfileState {
  /** Null until `status` is 'ready'. Null forever if `status` is 'error'. */
  profile: Profile | null;
  status: ProfileStatus;
  /**
   * Merge a patch into the row: applied locally at once, then written.
   *
   * Optimistic on purpose. Every caller is a control the user just operated,
   * and a control that waits for a round trip before moving reads as broken.
   * A failed write is logged, not reverted — silently undoing what someone
   * just did is worse than a stale value they can change again.
   */
  update: (patch: ProfilePatch) => void;
}

export const INITIAL_PROFILE_STATE: ProfileState = {
  profile: null,
  status: 'pending',
  update: () => {},
};

export const ProfileContext = createContext<ProfileState>(INITIAL_PROFILE_STATE);

export function useProfile(): ProfileState {
  return useContext(ProfileContext);
}
