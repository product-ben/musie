/**
 * HOW LONG A RUN IS, when the person decides — Ben, 2026-11-26.
 *
 * User testing: some people found an exercise too long, some too short. So a
 * card exercise and an instrument exercise ask, as the LAST setting on
 * Einsteigen, how long this run should be, and the answer is the time the
 * step's clock counts down before „Weiter" opens — the listen step's minimum
 * for a card exercise, the play step's timer for an instrument. What happens
 * when it is up is what happened before: the way on opens, and the music or
 * the instrument goes on until the person goes on (Ben: „wie heute").
 *
 * ── STATIC BOUNDS, AND WHY ───────────────────────────────────────────────
 * 1:00 to 10:00 for both kinds. The first idea was "up to the length of the
 * track", and it does not survive the data: a card exercise's piece is
 * chosen by the CARD, which is drawn after Einsteigen, and the pieces run
 * 1:40–3:11, so the range would have been one or two steps wide — and an
 * instrument has no track at all. Ben, 2026-11-26: „Dann statisch: Max 10
 * min", and the same day „Min length ist 1 min überall". The listen step
 * repeats the piece until the length is reached (`SessionListen`, `useMix`'s
 * laps).
 *
 * ── THE START IS 2:00, FOR EVERY ONE ─────────────────────────────────────
 * Ben, 2026-11-26: „default ist 2 min". It replaced „1:30 wie heute" — the
 * exercises' own `listen_gate_seconds` — the same day, so the start no longer
 * comes from the exercise at all; that column goes on serving the kinds that
 * do not ask.
 *
 * PURE: no React, no Supabase, no i18n. The words a screen reader hears are
 * chosen here as catalogue KEYS, and the screen looks them up.
 */
import type { ExerciseKind } from './exerciseKind';
import type { MessageKey } from '../i18n';

/** The shortest run: 1:00. */
export const LENGTH_MIN_SECONDS = 60;
/** The longest run: 10:00. */
export const LENGTH_MAX_SECONDS = 600;
/** The slider settles on half minutes. */
export const LENGTH_STEP_SECONDS = 30;
/** Where the slider starts when the run has no length yet: 2:00. */
export const LENGTH_DEFAULT_SECONDS = 120;

/** The two kinds whose length the person sets. */
const VARIABLE: ReadonlySet<ExerciseKind> = new Set<ExerciseKind>(['card_based', 'instruments']);

/** Does this kind ask how long the run should be? */
export function hasVariableLength(kind: ExerciseKind): boolean {
  return VARIABLE.has(kind);
}

/**
 * A length as the slider can hold it: inside the bounds and on a step,
 * counted from the minimum. Anything else that reaches here — a row written
 * before the bounds moved, an exercise whose minimum is off the grid — is
 * drawn as the nearest length the slider could have chosen.
 */
export function clampLength(seconds: number): number {
  if (!Number.isFinite(seconds)) return LENGTH_MIN_SECONDS;
  const inside = Math.min(LENGTH_MAX_SECONDS, Math.max(LENGTH_MIN_SECONDS, seconds));
  const steps = Math.round((inside - LENGTH_MIN_SECONDS) / LENGTH_STEP_SECONDS);
  return Math.min(LENGTH_MAX_SECONDS, LENGTH_MIN_SECONDS + steps * LENGTH_STEP_SECONDS);
}

/**
 * Where the slider starts: the length stored for this run when it has one
 * (a resumed run keeps its answer), 2:00 otherwise.
 */
export function initialLength(stored: number | null): number {
  return clampLength(stored ?? LENGTH_DEFAULT_SECONDS);
}

/** M:SS, the minutes unpadded — "1:00", "10:00". How a length is written. */
export function lengthClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * How a length is SAID — `aria-valuetext`, because "1:30" is announced as a
 * time of day. The catalogue key and its parameters; one/other by hand, as
 * everywhere in this catalogue. A single second cannot occur on half-minute
 * steps, so seconds are always plural.
 */
export function spokenLength(seconds: number): { key: MessageKey; params: Record<string, string> } {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const params = { minutes: String(minutes), seconds: String(rest) };
  if (rest === 0) {
    return { key: minutes === 1 ? 'session.intro.length.oneMinute' : 'session.intro.length.minutes', params };
  }
  return {
    key: minutes === 1 ? 'session.intro.length.oneMinuteSeconds' : 'session.intro.length.minutesSeconds',
    params,
  };
}
