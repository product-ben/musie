/**
 * Reads the profiles row once and publishes it.
 *
 * Mounted below AuthProvider (the read needs a user) and above LocaleProvider,
 * which derives the active locale from `profile.language` rather than
 * fetching it again.
 */
import * as React from 'react';
import { getProfile, updateProfile } from './lib/profile';
import type { ProfilePatch } from './lib/profile';
import { ProfileContext } from './lib/profileContext';
import type { ProfileState, ProfileStatus } from './lib/profileContext';
import { useAuth } from './lib/authContext';

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, userId } = useAuth();

  const [profile, setProfile] = React.useState<ProfileState['profile']>(null);
  const [status, setStatus] = React.useState<ProfileStatus>('pending');

  React.useEffect(() => {
    if (authStatus !== 'ready' || userId === null) return undefined;

    let cancelled = false;

    void (async () => {
      try {
        const row = await getProfile(userId);
        if (cancelled) return;
        setProfile(row);
        setStatus('ready');
      } catch (thrown: unknown) {
        /* A BLOCKED OR OFFLINE NETWORK THROWS rather than returning an error.
           Resolving to 'error' instead of staying 'pending' is what keeps the
           locale gate from holding <main> empty forever — a profile lookup
           must never be the reason the app will not render. Caught in the wild
           by the 2.4 network-failure check. */
        if (cancelled) return;
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        console.error('[musie] profile unavailable:', message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, userId]);

  const update = React.useCallback(
    (patch: ProfilePatch) => {
      /* Local first, so the control moves immediately. */
      setProfile((previous) => (previous === null ? previous : { ...previous, ...patch }));

      if (userId === null) return;

      void (async () => {
        try {
          await updateProfile(userId, patch);
        } catch (thrown: unknown) {
          const message = thrown instanceof Error ? thrown.message : String(thrown);
          console.error('[musie] profile write failed:', message);
        }
      })();
    },
    [userId],
  );

  const value = React.useMemo(
    () => ({ profile, status, update }),
    [profile, status, update],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
