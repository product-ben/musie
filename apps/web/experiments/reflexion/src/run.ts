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
  internal: typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('internal') === '1',
};
