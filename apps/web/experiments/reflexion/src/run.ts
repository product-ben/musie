/**
 * Which link this page was opened as, decided once at module load.
 *
 * Read by App.tsx and by the shims (the in-memory session row needs the
 * exercise id before React renders). One page load = one run = one session id.
 */
import { EXERCISES, type ExperimentExercise, type Slug } from './config';

function slugFromPath(pathname: string): Slug | null {
  const parts = pathname.split('/').filter(Boolean);
  for (const part of parts.reverse()) {
    if (part in EXERCISES) return part as Slug;
  }
  return null;
}

const slug = typeof window === 'undefined' ? null : slugFromPath(window.location.pathname);

/**
 * A TEST RUN — Ben's and Lucy's, so the dashboard and the answers table can
 * leave them out (Ben, 2026-11-18).
 *
 * `?internal=1` marks THIS DEVICE, not just this visit: the browser keeps the
 * participant (name and id) across visits, so a once-only flag let the next
 * plain visit count the same tester as a participant, under their name.
 * `?internal=0` clears the mark. Every local dev run is internal too: the dev
 * server sends to the REAL PostHog project.
 *
 * The parameter is then taken OUT of the address bar, so a link copied from
 * a tester's browser and sent to a friend does not hide the friend. The
 * header shows a „Testmodus“ badge while the mark is on (Header.tsx), so a
 * phone handed to somebody else is not silently a test device.
 */
const INTERNAL_KEY = 'reflexion-internal';

function readInternal(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const param = url.searchParams.get('internal');
  let internal = param === '1';
  try {
    if (param === '1') localStorage.setItem(INTERNAL_KEY, '1');
    else if (param === '0') localStorage.removeItem(INTERNAL_KEY);
    internal = localStorage.getItem(INTERNAL_KEY) === '1';
  } catch {
    /* Storage blocked (a private window): this visit only, from the URL. */
  }
  if (param !== null) {
    url.searchParams.delete('internal');
    window.history.replaceState(window.history.state, '', url);
  }
  return internal;
}

export const RUN: {
  slug: Slug | null;
  exercise: ExperimentExercise | null;
  sessionId: string;
  /** `performance.now()` at module load — the start of the run's wall clock. */
  loadedAt: number;
  internal: boolean;
} = {
  slug,
  exercise: slug === null ? null : EXERCISES[slug],
  sessionId: typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}`,
  loadedAt: typeof performance === 'undefined' ? 0 : performance.now(),
  /* A test device (`?internal=1`, remembered) or a local dev run. */
  internal: readInternal(),
};
