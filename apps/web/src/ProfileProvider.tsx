/**
 * Reads the profiles row once and publishes it.
 *
 * Mounted below AuthProvider (the read needs a user) and above LocaleProvider,
 * which derives the active locale from `profile.language` rather than
 * fetching it again.
 */
import * as React from 'react';
import { claimIdentityRecovery, recoveryStore, releaseIdentityRecovery } from './lib/identity';
import { getProfile, updateProfile } from './lib/profile';
import type { ProfilePatch } from './lib/profile';
import { ProfileContext } from './lib/profileContext';
import type { ProfileState, ProfileStatus } from './lib/profileContext';
import { signOut } from './lib/signIn';
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
        const read = await getProfile(userId);
        if (cancelled) return;

        /**
         * ── THE TOKEN NAMES A USER THE DATABASE NO LONGER HAS ─────────────
         *
         * `profiles` is created by a trigger on `auth.users` insert and
         * cascades on delete, so zero rows for `auth.uid()` is not a row that
         * failed to load — it is the identity being gone. `getSession()` never
         * asks the server, so nothing before this point could have noticed.
         *
         * LEFT ALONE IT FAILS LATER AND SOMEWHERE ELSE. Measured on
         * 2026-10-07, after the `supabase db reset` that CLAUDE.md 4 asks for:
         * the app booted, the gate opened, every screen rendered, and the run
         * died on the one press that matters with a foreign-key violation on
         * `sessions.user_id` and "Die Session konnte nicht gestartet werden"
         * on screen. The only cure anybody found was clearing site data by
         * hand. Deleting one beta tester does the same to their open tab.
         *
         * So it is caught HERE, on boot, before anything has been pressed.
         *
         * THE RECOVERY IS `signOut()`, which already does exactly this job for
         * the sign-out control: clear the token, reset the session cache,
         * reload. The reload is what makes it correct rather than clever — the
         * tab starts again, `ensureSession()` finds no session, and either a
         * fresh anonymous user is created or the gate is the first paint,
         * whichever `VITE_REQUIRE_ACCOUNT` says. A deleted ACCOUNT should land
         * at the sign-in form, not be quietly replaced by an anonymous one.
         *
         * AND IT IS CLAIMED, NOT DECIDED. The recovery reloads, so a second
         * failure would reload again — forever, minting an anonymous user each
         * time. `claimIdentityRecovery` is true at most once per tab and
         * records itself before this acts on it, so the boot after the reload
         * finds it taken and reports the problem instead. See lib/identity.ts.
         *
         * NOTHING IS PUBLISHED on the way out: the status stays `pending` for
         * the moment it takes the navigation to happen, which is honest — the
         * answer is not an error, it is about to be a new page.
         */
        if (read.kind === 'missing') {
          if (claimIdentityRecovery(recoveryStore())) {
            console.warn(
              '[musie] signed in as a user this database does not have — '
              + 'signing out and starting again',
            );
            void signOut();
            return;
          }
          console.error(
            '[musie] no profiles row for the signed-in user, and this tab has '
            + 'already tried starting again once. Clear site data for this '
            + 'origin, or sign in again.',
          );
          setStatus('error');
          return;
        }

        /* A profile that actually read is what ends the attempt, so a browser
           left open across two resets recovers from both rather than from the
           first only. */
        releaseIdentityRecovery(recoveryStore());
        setProfile(read.profile);
        setStatus('ready');
      } catch (thrown: unknown) {
        /* A BLOCKED OR OFFLINE NETWORK THROWS rather than returning an error.
           NOT the missing-row case, which is handled above and is an ANSWER:
           this branch is "we could not ask", and signing somebody out because
           their train went into a tunnel is the bug that distinction prevents.
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
