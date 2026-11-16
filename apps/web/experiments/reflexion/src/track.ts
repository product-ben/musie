/**
 * STUB — owned by the "Speichern & PostHog" agent. Signatures are the
 * contract other files code against; keep them, fill the bodies.
 *
 * The one rule (brief + CLAUDE.md rule 10): nothing reaches PostHog before the
 * visitor agrees, and agreeing is pressing the name modal's start button.
 * Never send a name or a reflection text; only lengths, counts, times. The
 * survey answers are the single exception.
 */
import type { Participant } from './context';
import type { RecommendChoice } from './config';

/** Link opened, modal visible. Before consent: must not send (see header). */
export function landingViewed(): void {}

/** Name submitted = consent given. Init PostHog, identify, register super properties. */
export function participantStarted(_participant: Participant, _returning: boolean): void {}

export function languageChanged(_from: string, _to: string, _stepKey: string): void {}

/** Generic event through the experiment's single entry point. */
export function track(_event: string, _properties?: Record<string, unknown>): void {}

/** Thank-you state is on screen. */
export function completed(): void {}

export function surveyShown(): void {}

export function surveySent(
  _answers: { recommend?: RecommendChoice; comment?: string },
  _submissionId: string,
): void {}
