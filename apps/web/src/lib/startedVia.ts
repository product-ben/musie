/**
 * How a run began, and the goal a printed card starts it under — the pure
 * half of `startSession.ts`, kept free of analytics so it can be unit-tested
 * in node. 2026-11-23, PRD „Übungskarten mit QR-Code".
 *
 * ── TWO CALLERS, ONE SEQUENCE ─────────────────────────────────────────────
 * /exercises starts a run when a card in the pile is pressed; `/s/:code`
 * starts one when a QR code on paper is scanned. Both end the running session
 * first when the person chose that in the dialog, then create the new row,
 * then tell analytics — and the order is not reversible: creating first is
 * what the one-running-session index refuses. It lived inline in
 * `routes/Exercises.tsx` until the second caller arrived.
 *
 * ── HOW THE RUN WAS STARTED TRAVELS IN THE ADDRESS (V3) ───────────────────
 * The intro asks „Was brauchst du gerade?" only after a printed card (D6), so
 * it has to know how the run began — after a reload too. Ben chose the
 * address over a column on `sessions` (V3, 2026-11-23): `?via=exercise-card`,
 * or `?via=deck-card&card=MC-04`, on the intro and nowhere else. The deck
 * card's code rides along because the card is written only on „Weiter", once
 * the goal is final (D11), and until then this is where it is held — a
 * reload keeps it, which `sessionStorage`'s read-once hold did not.
 *
 * PostHog gets the same answer as `entry` on `session_started` (A3), which is
 * how the printed cards' use is counted — after consent only, like every
 * event, so the count is a floor.
 */
import type { Exercise, Goal } from './content';

/** How a run began. */
export type StartedVia = 'library' | 'exercise-card' | 'deck-card';

/** The query keys on the intro's address. */
export const VIA_PARAM = 'via';
export const CARD_PARAM = 'card';

/**
 * The intro's address for a new run: `/session/<id>/intro`, plus how it was
 * started when that was a printed card.
 */
export function introPath(sessionId: string, via: StartedVia, cardCode?: string): string {
  const base = `/session/${encodeURIComponent(sessionId)}/intro`;
  if (via === 'library') return base;
  const query = new URLSearchParams({ [VIA_PARAM]: via });
  if (via === 'deck-card' && cardCode !== undefined) query.set(CARD_PARAM, cardCode);
  return `${base}?${query.toString()}`;
}

/** What the intro's address says about how the run began. */
export function readStartedVia(params: URLSearchParams): { via: StartedVia; cardCode: string | null } {
  const via = params.get(VIA_PARAM);
  if (via === 'exercise-card') return { via, cardCode: null };
  if (via === 'deck-card') {
    const card = params.get(CARD_PARAM);
    return { via, cardCode: card === null || card === '' ? null : card.toUpperCase() };
  }
  return { via: 'library', cardCode: null };
}

/**
 * THE GOAL A PRINTED CARD STARTS A RUN UNDER — D10 and D12.
 *
 * The goal last chosen in the library, if this exercise serves it; otherwise
 * the first of the exercise's goals in the order the goal sheet shows them
 * (`goals.sort`). Whoever changes nothing gets what they chose last time, and
 * the intro holds nobody up. An exercise without the question (Klangreise per
 * QR) gets the same answer; it shows only in the diary.
 *
 * `goals` must be `getGoals()`'s list: retired goals are already out of it,
 * so a stale cached id falls through to the first offered one. Null when the
 * exercise serves no offered goal — the column takes null, and inventing one
 * would be worse diary data than none.
 */
export function goalForPrintedStart(
  exercise: Pick<Exercise, 'goalIds'>,
  goals: readonly Goal[],
  cached: string | null,
): string | null {
  const offered = goals.filter((goal) => exercise.goalIds.includes(goal.id));
  if (cached !== null && offered.some((goal) => goal.id === cached)) return cached;
  return offered[0]?.id ?? null;
}

/**
 * The goals the intro offers for this exercise, in the goal sheet's order.
 * Fewer than two means the question is not asked (D8).
 */
export function goalsOffered(exercise: Pick<Exercise, 'goalIds'>, goals: readonly Goal[]): Goal[] {
  return goals.filter((goal) => exercise.goalIds.includes(goal.id));
}
