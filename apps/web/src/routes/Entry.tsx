/**
 * `/` — not a screen. The one decision about where opening Musie takes you.
 *
 * It paints nothing, ever: it waits for the profile and then redirects. The
 * rule it applies, and the reason it is here rather than inside the explainer,
 * is `lib/entry.ts`.
 *
 * ── THE LATCH, AND WHY IT SURVIVED THE MOVE ────────────────────────────────
 * `arrivedCold` is read ONCE, at mount, because it is a fact about how we got
 * here rather than a changing value. The destination is latched for the same
 * reason the explainer used to latch its skip: without it, a profile arriving
 * mid-render could change the answer under a `<Navigate>` that had already
 * been handed one.
 *
 * `status === 'error'` is deliberately NOT a third branch. A profile that
 * failed to load has no `user_type_id`, so `hasUserType` is false and the
 * reader gets the explainer — which is the right answer for somebody we cannot
 * identify, and is what the screen did before this file existed.
 */
import * as React from 'react';
import { Navigate, useLocation } from 'react-router';
import { entryDestination } from '../lib/entry';
import type { EntryDestination } from '../lib/entry';
import { useProfile } from '../lib/profileContext';

export function Entry() {
  const location = useLocation();
  const { profile, status } = useProfile();

  const arrivedCold = React.useRef(location.key === 'default');
  const destination = React.useRef<EntryDestination | undefined>(undefined);

  if (destination.current === undefined && status !== 'pending') {
    destination.current = entryDestination(arrivedCold.current, Boolean(profile?.user_type_id));
  }

  /* Nothing, and specifically not a spinner: the profile is already in flight
     when this mounts and the wait is a frame or two. A loading state here would
     flash on every cold open of the app. */
  if (destination.current === undefined) return null;

  return <Navigate to={destination.current} replace />;
}
