/**
 * The two permissions on /about-you — the page the sign-up copy points at.
 *
 * ── WHY THE DRAWER NO LONGER HAS A SWITCH ─────────────────────────────────
 * It had one for an afternoon. Then sign-up grew a pair of toggles and the
 * paragraph above them promised *you can change these any time on the About
 * you page* — so that page has to be where they live. One setting in two
 * places is two places to read a different answer from, and the one the copy
 * names has to win. Ben, 2026-10-20.
 *
 * Art. 7(3) is satisfied either way: /about-you is a row in the drawer, so
 * withdrawing is two taps from anywhere, against one tap to grant it at
 * sign-up. "As easy as" is not "identical to".
 *
 * ── IT WRITES DIRECTLY, AND WAITS ─────────────────────────────────────────
 * `useProfile().update` is fire-and-forget by design — the control moves
 * immediately and the request lands when it lands — which is right for a theme
 * and wrong for a permission: this one is followed by a reload, and a reload
 * one line after an un-awaited request cancels it. So the write is awaited,
 * and a failure puts the switch back rather than leaving the UI claiming
 * something the database never heard.
 *
 * ── AND IT RELOADS, BUT ONLY FOR THE ANALYTICS HALF ───────────────────────
 * `initAnalytics` runs once per page load and decides there whether PostHog is
 * cookieless, because that is an init-time shape rather than something to flip
 * under a live session. Turning analytics off therefore only becomes true on
 * the next load — and a reload is the only way to be sure OFF means off,
 * rather than a recorder still running somewhere in the tab.
 *
 * The research half changes nothing in the browser: it gates
 * `public.research_reflections`, which is read by an export and by nothing
 * here. So it writes and stays put, and the page does not blink for it.
 */
import * as React from 'react';
import { ContentBox } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { asConsent, consentPatch } from '../lib/consents';
import type { ConsentAnswers } from '../lib/consents';
import { useAuth } from '../lib/authContext';
import { updateProfile } from '../lib/profile';
import { useProfile } from '../lib/profileContext';
import { ConsentToggles } from './ConsentToggles';

export function ConsentSettings({ className }: { className?: string }) {
  const t = useT();
  const { userId } = useAuth();
  const { profile } = useProfile();

  const stored: ConsentAnswers = {
    analytics: asConsent(profile?.analytics_consent) === 'granted',
    research: asConsent(profile?.research_consent) === 'granted',
  };

  /* What the switches show while a write is in flight, so the control moves on
     the press rather than on the round trip. */
  const [pending, setPending] = React.useState<ConsentAnswers | null>(null);
  const shown = pending ?? stored;

  if (userId === null) return null;

  function change(next: ConsentAnswers) {
    if (userId === null || pending !== null) return;

    const analyticsChanged = next.analytics !== stored.analytics;
    setPending(next);

    void (async () => {
      try {
        await updateProfile(userId, {
          ...consentPatch('analytics', next.analytics ? 'granted' : 'refused'),
          ...consentPatch('research', next.research ? 'granted' : 'refused'),
        });
        if (analyticsChanged) {
          window.location.reload();
          return;
        }
        /* The profile in context is stale now; clearing `pending` would show
           the old value for a frame. The row is re-read on the next mount, and
           until then the switch keeps what the person chose — which is also
           what was written. */
      } catch (thrown: unknown) {
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        console.error('[musie] could not save the permissions:', message);
        setPending(null);
      }
    })();
  }

  return (
    <ContentBox
      className={className}
      headingLevel={2}
      headline={t('consent.settings.headline')}
      text={t('consent.settings.text')}
    >
      {/* No intro paragraph: its last sentence sends people to this page, and
          they are on it. */}
      <ConsentToggles value={shown} onChange={change} disabled={pending !== null} intro={false} />
    </ContentBox>
  );
}
