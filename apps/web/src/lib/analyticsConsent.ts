/**
 * The analytics consent, as a value — 'granted', 'refused', or not asked yet.
 *
 * ── WHY THIS IS ITS OWN MODULE AND NOT A BOOLEAN ON THE PROFILE ───────────
 * There are THREE states and the third one is the one that matters. `null`
 * means the card has not been answered, and while it holds nothing analytics-
 * related is initialised at all: no key written, no event sent, not a
 * pageview. A boolean would collapse that into `false` — indistinguishable
 * from a refusal — and the app would never know whether to ask.
 *
 * 'refused' is an ANSWER rather than an off switch: PostHog is still started,
 * in `cookieless_mode: 'always'`, which writes nothing to the device and
 * records no replay. See lib/posthog.ts, and LEGAL-PAGES.md §4.4 for why that
 * is the shape Ben chose.
 *
 * ── THE VERSION IS PART OF THE CONSENT ────────────────────────────────────
 * Art. 7(1) wants a consent that can be DEMONSTRATED: who, when, and to what.
 * `PRIVACY_VERSION` is the "to what" — it is written beside the answer,
 * so a later rewrite of /privacy that adds a processor cannot quietly inherit
 * an older yes. Bump it when the policy changes in a way a person would want
 * to be asked about again; the card then reappears for everybody whose
 * recorded version is older.
 */
import type { ProfilePatch } from './profile';

export type AnalyticsConsent = 'granted' | 'refused';

/**
 * The version of /privacy the card is asking about lives in `lib/legal.ts`,
 * which already owned it, and is imported rather than restated. Sign-up records
 * which privacy wording was on screen when somebody joined; this card records
 * which wording they agreed to analytics under. Same document, so a second
 * constant could only ever be the same date or a bug — and the bug is silent:
 * two rows claiming different versions of one text that changed once.
 *
 * It is a DATE rather than a number because the thing it identifies is a
 * document that changes on a day, and it is the same string the privacy page
 * prints at its head, so a person can compare what they agreed to with what
 * they are reading.
 */
import { PRIVACY_VERSION } from './legal';

/**
 * The column, narrowed.
 *
 * `profiles.analytics_consent` is `text` with a check constraint, so the
 * database already refuses a third value — but the generated type is
 * `string | null`, and the app should not take the database's word for it at
 * the one boundary where being wrong means asking somebody again or never.
 */
export function asConsent(value: string | null | undefined): AnalyticsConsent | null {
  return value === 'granted' || value === 'refused' ? value : null;
}

/**
 * Has this person answered the version of the policy we are showing?
 *
 * An older version reads as UNANSWERED, which is what makes bumping
 * `PRIVACY_VERSION` a real re-ask rather than a comment. A row with an
 * answer and no version is from before this column existed and counts as
 * answered — there is exactly one such case, which is anybody who answered
 * between this migration and a later policy change, and treating it as
 * unanswered would re-ask every one of them for nothing.
 */
export function needsAsking(
  consent: AnalyticsConsent | null,
  version: string | null | undefined,
): boolean {
  if (consent === null) return true;
  return version !== null && version !== undefined && version !== PRIVACY_VERSION;
}

/**
 * What to write when somebody answers.
 *
 * The moment comes from the CLIENT, which is worth saying out loud: a
 * `default now()` on the column would be the server's clock and therefore
 * better, but it would also mean the app could not record an answer and its
 * moment in one statement without a second read. The difference is a few
 * milliseconds of clock skew on a record whose purpose is "this person
 * answered, on this day, to this text".
 */
export function consentPatch(answer: AnalyticsConsent): ProfilePatch {
  return {
    analytics_consent: answer,
    analytics_consent_at: new Date().toISOString(),
    analytics_consent_version: PRIVACY_VERSION,
  };
}
