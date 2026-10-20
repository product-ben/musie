/**
 * The two permissions, as values — and the third state that matters most.
 *
 * ── TWO QUESTIONS, NOT ONE LOUDER ONE ─────────────────────────────────────
 *   analytics  may we watch WHAT YOU DO — screens, taps, a masked replay.
 *              Granted runs PostHog in full; refused runs it cookieless, with
 *              nothing on the device and no recording (lib/posthog.ts).
 *   research   may we read WHAT YOU WROTE — the reflections themselves,
 *              including the ones you spoke, since a transcript is stored as
 *              a reflection like any other. Nothing in the app reads this; it
 *              gates `public.research_reflections`, which is how an export
 *              gets at them.
 *
 * Somebody can want one and not the other in either direction, which is why
 * they are two columns and two toggles rather than a slider labelled "how much
 * do you trust us".
 *
 * ── null IS NOT false ─────────────────────────────────────────────────────
 * `null` means NOT ASKED YET, and for analytics it is load-bearing: while it
 * holds, nothing is initialised — no key written, no event sent, not a
 * pageview. A boolean would collapse that into "refused" and the app would
 * never know whether to ask. 'refused' is an ANSWER: PostHog still starts, in
 * cookieless mode.
 *
 * ── THE VERSION IS PART OF THE CONSENT ────────────────────────────────────
 * Art. 7(1) wants a consent that can be DEMONSTRATED: who, when, and to what.
 * `PRIVACY_VERSION` (lib/legal.ts) is the "to what" — written beside each
 * answer, so a later rewrite of /privacy cannot quietly inherit an old yes.
 * Bump it there and both cards ask again.
 */
import { PRIVACY_VERSION } from './legal';
import type { ProfilePatch } from './profile';

export type Consent = 'granted' | 'refused';

/** Which permission. The two are independent in both directions. */
export type ConsentKind = 'analytics' | 'research';

/** What the toggles hold while somebody is deciding. */
export interface ConsentAnswers {
  analytics: boolean;
  research: boolean;
}

/** Nothing is ever pre-ticked. A pre-ticked consent is not a consent. */
export const NO_CONSENT_YET: ConsentAnswers = { analytics: false, research: false };

/**
 * The column, narrowed.
 *
 * The database already refuses a third value with a check constraint — but the
 * generated type is `string | null`, and the app should not take the database's
 * word for it at the one boundary where being wrong means asking somebody again
 * or never.
 */
export function asConsent(value: string | null | undefined): Consent | null {
  return value === 'granted' || value === 'refused' ? value : null;
}

/**
 * Has this person answered the version of the policy we are showing?
 *
 * An older version reads as UNANSWERED, which is what makes bumping
 * `PRIVACY_VERSION` a real re-ask rather than a comment. A row with an answer
 * and no version is from before these columns existed and counts as answered —
 * treating it as unanswered would re-ask everybody for nothing.
 */
export function needsAsking(
  consent: Consent | null,
  version: string | null | undefined,
): boolean {
  if (consent === null) return true;
  return version !== null && version !== undefined && version !== PRIVACY_VERSION;
}

const COLUMNS = {
  analytics: {
    value: 'analytics_consent',
    at: 'analytics_consent_at',
    version: 'analytics_consent_version',
  },
  research: {
    value: 'research_consent',
    at: 'research_consent_at',
    version: 'research_consent_version',
  },
} as const satisfies Record<ConsentKind, { value: string; at: string; version: string }>;

/**
 * What to write when somebody answers one of them.
 *
 * The moment comes from the CLIENT, which is worth saying out loud: a
 * `default now()` would be the server's clock and therefore better, but it
 * would mean the app could not record an answer and its moment in one
 * statement. The difference is a few milliseconds of clock skew on a record
 * whose purpose is "this person answered, on this day, to this text".
 */
export function consentPatch(kind: ConsentKind, answer: Consent): ProfilePatch {
  const column = COLUMNS[kind];
  return {
    [column.value]: answer,
    [column.at]: new Date().toISOString(),
    [column.version]: PRIVACY_VERSION,
  };
}

/** Both at once — what the sign-up form and the first-run card write. */
export function bothConsentsPatch(answers: ConsentAnswers): ProfilePatch {
  return {
    ...consentPatch('analytics', answers.analytics ? 'granted' : 'refused'),
    ...consentPatch('research', answers.research ? 'granted' : 'refused'),
  };
}
