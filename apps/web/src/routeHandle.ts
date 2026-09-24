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

/** The wizard's four steps. The ONLY valid values for `:step`. */
export const STEP_IDS = ['intro', 'scan', 'listen', 'reflect'] as const;

export type StepId = (typeof STEP_IDS)[number];

export function isStepId(value: string | undefined): value is StepId {
  return STEP_IDS.includes(value as StepId);
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
