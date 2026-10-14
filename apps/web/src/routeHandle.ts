/**
 * What the shell needs to know about whichever route is showing.
 *
 * This rides on React Router's own `handle`, which exists for exactly this —
 * static, per-route data a parent layout can read through `useMatches()`. The
 * alternative is the shell matching on pathnames, which puts the route table
 * in two places and lets them drift.
 *
 * It lives in its own module so `router.tsx` and `AppShell.tsx` can both use
 * it without importing each other.
 */
import type { ReactNode } from 'react';
import type { MessageKey } from './i18n';

/**
 * The wizard's step names. The ONLY valid values for `:step`.
 *
 * ── SIX NAMES, AND A RUN USES FOUR OF THEM ────────────────────────────────
 * The second step of a card run is `scan`, `view` or `select` and never two of
 * them: the deck on the table is scanned, one card dealt digitally is looked
 * at, five dealt digitally are chosen between. `lib/exerciseKind.ts` is where
 * a run's own list comes from, and the rail is four markers long for every
 * card exercise either way — Ben, 2026-10-14.
 *
 * ── THE ORDER IS THE CANONICAL ONE, AND IT IS LOAD-BEARING ────────────────
 * `completedBefore` and the wizard's reachability rule both read position in
 * THIS list. No run holds two of the middle three, so their order relative to
 * each other is unobservable — which is why `scan` keeps its historical place
 * rather than being moved for tidiness: the paper run's four stay exactly
 * where every existing test expects them.
 */
export const STEP_IDS = ['intro', 'scan', 'view', 'select', 'listen', 'reflect'] as const;

export type StepId = (typeof STEP_IDS)[number];

export function isStepId(value: string | undefined): value is StepId {
  return STEP_IDS.includes(value as StepId);
}

/**
 * ── EVERY STEP'S DISPLAY NAME, ONCE ───────────────────────────────────────
 *
 * A fixed relation between two vocabularies that are deliberately NOT the same
 * one: `sessions.step` holds English slugs under a check constraint, and the
 * catalogue holds their display names per locale.
 *
 * IT LIVED IN THREE PLACES UNTIL 2026-10-14 — `lib/diary.ts`,
 * `routes/Exercises.tsx` and `routes/Session.tsx` each kept their own copy,
 * identical and separately maintained. Widening `STEP_IDS` by two names
 * produced three compile errors in three files, which is the `Record` doing
 * its job and also the clearest possible argument that it is one fact. It now
 * lives beside the ids it names, which is the only file all three already
 * import.
 *
 * THE RECORD IS THE GUARANTEE. A seventh step added above is a compile error
 * here, where the answer has to be written, rather than a raw slug rendered at
 * somebody in the diary.
 */
const STEP_MESSAGE_KEY: Record<StepId, MessageKey> = {
  intro: 'session.step.intro',
  scan: 'session.step.scan',
  view: 'session.step.view',
  select: 'session.step.select',
  listen: 'session.step.listen',
  reflect: 'session.step.reflect',
};

export function stepMessageKey(step: StepId): MessageKey {
  return STEP_MESSAGE_KEY[step];
}

export interface RouteHandle {
  /** Names the route, in the h1 and the document title. */
  titleKey: MessageKey;
  /**
   * Widen the main column to 980px. The prototype does this for the exercises,
   * session and end screens and keeps every other screen at `--bp-md`.
   */
  wide?: boolean;
  /**
   * Presents over the page instead of replacing it — a route whose element is
   * a sheet or a lightbox. The shell keeps the previous page mounted beneath
   * it.
   */
  overlay?: boolean;
  /**
   * The page to draw beneath THIS overlay when the shell has none to keep —
   * a cold deep-link, where the overlay is the first entry in the history and
   * no page was ever rendered to hold on to. Shape mirrors AppShell's
   * `beneath` ref, because it fills exactly that ref's job.
   *
   * Only an overlay that BELONGS to one page can answer this. /menu covers
   * whatever page you were on and belongs to none, so it omits this and a cold
   * deep-link to it keeps its current behaviour: an empty main behind the
   * drawer. /diary/:id is one entry OF the diary, so pasting its URL opens the
   * entry over the list rather than over nothing.
   *
   * `path` is what `usePagePath` reports, so the nav drawer marks the right
   * row current; `wide` matches the page's own handle so the column does not
   * change width when the overlay closes onto it.
   */
  beneath?: { element: ReactNode; path: string; wide?: boolean };
}
