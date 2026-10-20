/**
 * The consent card, and the only place PostHog is ever started.
 *
 * ── THE THREE STATES, AND WHY THE THIRD IS THE POINT ──────────────────────
 *   null      the card has not been answered. **Nothing is initialised**: no
 *             key written, no event sent, not a pageview. This is the state
 *             the app has to get right, and it is why `analytics_consent` is
 *             three-valued rather than a boolean.
 *   'granted' PostHog in full: cookie and localStorage, an identified person,
 *             session replay — masked as lib/posthog.ts requires.
 *   'refused' PostHog in `cookieless_mode: 'always'`: nothing on the device,
 *             a rotating server-side hash for identity, and no replay. Counts
 *             still land, which is why a refusal is an answer rather than an
 *             off switch. Ben's call, 2026-10-20 — LEGAL-PAGES.md §4.4.
 *
 * ── WHY IT SITS HERE AND NOT IN AuthProvider ──────────────────────────────
 * Because the consent lives on the PROFILE, and the profile is read one
 * provider lower. The generated integration identified from `AuthProvider`,
 * which resolves a session before anybody knows whether this person has agreed
 * to anything — so PostHog was running, with their email address attached,
 * before the question had been asked (§4.5.1). Mounting the init where the
 * answer is known makes that mistake unavailable rather than forbidden.
 *
 * It is INSIDE `SessionGate`, so it never renders over the sign-in form, and
 * inside `DesignSystemLocale`, so the card's own labels and the design
 * system's defaults are both in the app's language (rule 7).
 *
 * ── FIVE RULES THE CARD OBEYS, BECAUSE A CONSENT THAT BREAKS ONE IS NOT ONE ─
 *   1. Refuse is as easy and as prominent as accept — one press each, the same
 *      variant, nothing pre-selected. Closing the card without choosing is a
 *      REFUSAL, not a postponement, which is the only reading that cannot be
 *      used to wear somebody down.
 *   2. Nothing is captured before the answer. See above.
 *   3. It is withdrawable as easily as it was given (Art. 7(3)) — the switch
 *      in the drawer, beside dark mode and language.
 *   4. It is recorded: who, when, and which version of the policy was showing
 *      (`consentPatch`).
 *   5. It is not bundled with anything required to use the app. Refusing costs
 *      the person nothing, and there is no second ask.
 *
 * ── AND IT NEVER APPEARS OVER A RUNNING SESSION ───────────────────────────
 * The path is snapshotted ONCE, at mount: a cold load straight into
 * /session/:id/:step holds the question for that page load rather than putting
 * a dialog over somebody's exercise. It costs nothing to wait — nothing is
 * being captured in the meantime — and the next screen asks.
 *
 * This provider cannot use `useLocation`: it is mounted above the router, for
 * the same reason the init is here at all.
 */
import * as React from 'react';
import { CtaButton, Lightbox } from '@musie/design-system';
import { NO_CONSENT_YET, asConsent, bothConsentsPatch, needsAsking } from '../lib/consents';
import type { ConsentAnswers } from '../lib/consents';
import { useAuth } from '../lib/authContext';
import { initAnalytics } from '../lib/posthog';
import { useProfile } from '../lib/profileContext';
import { useT } from '../i18n/localeContext';
import { ConsentToggles } from './ConsentToggles';
import { LegalLinks } from './LegalLinks';

/** A cold load into a running exercise is not the moment to ask. */
function inSession(pathname: string): boolean {
  return pathname.startsWith('/session/');
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const { profile, status, update } = useProfile();

  /* Snapshotted, not read on every render: the question is held for THIS page
     load, and a navigation out of the session should not make a dialog appear
     under somebody's thumb either. */
  const openedInSession = React.useRef(inSession(window.location.pathname));

  const consent = asConsent(profile?.analytics_consent);
  const unanswered = needsAsking(consent, profile?.analytics_consent_version)
    /* EITHER permission being unanswered brings the card back, because it asks
       for both at once. In practice that is the testers who signed up before
       the toggles existed: their analytics answer may be on record and their
       research answer cannot be. */
    || needsAsking(asConsent(profile?.research_consent), profile?.research_consent_version);

  React.useEffect(() => {
    /* 'error' and 'pending' both mean the consent is UNKNOWN, and unknown is
       treated exactly like unanswered: a profile that could not be read is not
       permission. */
    if (status !== 'ready' || userId === null) return;
    if (consent === null || unanswered) return;
    initAnalytics(consent, userId);
  }, [consent, status, unanswered, userId]);

  function answer(answers: ConsentAnswers) {
    /* `update` writes the row and sets the local copy first, so the card
       closes on the press rather than on the round trip, and the effect above
       initialises from the new value. A FAILED write logs and leaves the
       database saying null — which means the card returns on the next load,
       which is the right failure: better to ask twice than to record a consent
       that was never stored. */
    update(bothConsentsPatch(answers));
  }

  const open = status === 'ready' && userId !== null && unanswered
    && !openedInSession.current;

  return (
    <>
      {children}
      {open && <ConsentCard onAnswer={answer} />}
    </>
  );
}

function ConsentCard({ onAnswer }: { onAnswer: (answers: ConsentAnswers) => void }) {
  const t = useT();

  /* Both off, and nothing may default them on — see ConsentToggles. */
  const [answers, setAnswers] = React.useState<ConsentAnswers>(NO_CONSENT_YET);

  return (
    <Lightbox
      open
      /* CLOSING WITHOUT SAVING IS A REFUSAL OF BOTH, including anything
         ticked on the way out: a tick that was never confirmed is not an
         answer, and reading it as one would turn "I changed my mind and shut
         the box" into a consent. Nothing is captured either way, and the two
         switches on /about-you are how somebody changes their mind later. */
      onOpenChange={(next) => {
        if (!next) onAnswer(NO_CONSENT_YET);
      }}
      title={t('consent.card.title')}
      closeLabel={t('consent.card.closeLabel')}
      surface="panel"
    >
      {/* Why this is appearing at all, for the handful of testers whose
          accounts are older than the question. */}
      <p className="musie-note">{t('consent.card.body')}</p>

      <ConsentToggles value={answers} onChange={setAnswers} />

      {/* ONE BUTTON, NOT TWO. The old card asked a single yes/no and so took
          a pair of equally weighted alternatives; two switches already carry
          the choice, and a second button beside Save could only mean "save
          something other than what the switches say". */}
      <CtaButton variant="primary" block wrap onClick={() => onAnswer(answers)}>
        {t('consent.card.save')}
      </CtaButton>

      {/* INFORMED is part of the definition, so the policy is one press away
          from the question. It leaves the app — these pages are not routes —
          and the card returns on the way back, because nothing was answered. */}
      <LegalLinks />
    </Lightbox>
  );
}
