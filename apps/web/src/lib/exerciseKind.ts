/**
 * What kind of exercise this is, and therefore which steps a run has.
 *
 * ── THE STEP SET IS CODE, NOT DATA ─────────────────────────────────────────
 * `exercises.kind` is one column with three legal values
 * (`20261011100000_exercise_kinds.sql`). What each kind's run actually CONSISTS
 * OF is the `STEPS` record below, in this file, and deliberately not in the
 * database: a step is a React screen, so a step list in a content table could
 * promise a screen that does not exist, and a content edit could empty a run.
 *
 * The database says which kind; this module says which screens a kind runs.
 *
 * ── A `Record`, SO A FOURTH KIND FAILS THE TYPECHECK ───────────────────────
 * Rather than a lookup with a fallback. A fourth kind added to the check
 * constraint and to `EXERCISE_KINDS` is then a compile error here, where the
 * answer has to be written, instead of a run that silently draws four steps
 * because that is what the `??` said.
 *
 * ── THIS FILE IS PURE ──────────────────────────────────────────────────────
 * No supabase, no React, no i18n. `StepId` comes from `routeHandle`, which is
 * types and one array. So every rule in here is testable without a database,
 * which is the same bargain `sessionMachine.ts` makes.
 */
import { STEP_IDS } from '../routeHandle';
import type { StepId } from '../routeHandle';

/**
 * The database's own identifiers, verbatim — `exercises_kind_known`.
 *
 * Snake case because that is what the column holds. Translating these into
 * camelCase at the boundary was considered and rejected: unlike `needs_cards`
 * → `needsCards`, the VALUE would move too, so a grep for `listening_only`
 * would find the schema or the app but never both.
 */
export const EXERCISE_KINDS = ['card_based', 'digital_interactive', 'listening_only'] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export function isExerciseKind(value: string | null | undefined): value is ExerciseKind {
  return EXERCISE_KINDS.includes(value as ExerciseKind);
}

/**
 * THE RUN, PER KIND, in `STEP_IDS` order.
 *
 *   card_based           intro · scan · listen · reflect
 *   listening_only       intro · listen · reflect
 *   digital_interactive  intro · listen · reflect
 *
 * ── WHY LISTENING LOSES A MARKER RATHER THAN SHOWING A GAP ────────────────
 * D14 settled that a CARDLESS run draws four markers with `scan` visibly
 * skipped, and that was right while "cardless" was an accident of which
 * exercises happened to have recordings. It stops being right once the kind
 * says the stage does not exist for this exercise: a crossed-out *Scannen*
 * then teaches a step that will never apply, on every run, to everyone who
 * runs it. Ben, 2026-10-11.
 *
 * The mechanism is untouched — `skippedFor` still hands the wizard and the
 * reducer a list of steps that are not in the run, which is D.0's fifth wizard
 * state. What changed is only that the SCREEN draws three markers instead of
 * four, by being given three steps.
 *
 * ── digital_interactive IS A PLACEHOLDER AND SAYS SO ──────────────────────
 * Atementspannung needs sound and draws no card, so it borrows the listening
 * run — and it is `implemented = false`, so nobody can start it and nothing
 * here is reachable. The breathing screens are not designed; when they are,
 * this row is where the answer goes.
 */
const STEPS: Record<ExerciseKind, readonly StepId[]> = {
  card_based: ['intro', 'scan', 'listen', 'reflect'],
  listening_only: ['intro', 'listen', 'reflect'],
  digital_interactive: ['intro', 'listen', 'reflect'],
};

/** The steps this kind's run consists of, in order. */
export function stepsForKind(kind: ExerciseKind): readonly StepId[] {
  return STEPS[kind];
}

/**
 * The steps that are NOT in this kind's run — what `sessionMachine` and
 * `InteractiveWizard` both call `skipped`.
 *
 * Derived from `stepsForKind`, so the rail and the reducer cannot disagree
 * about a run: there is one list, and this is its complement. Deriving it the
 * other way round — listing the skipped steps per kind and subtracting — would
 * be the same data entered twice.
 */
export function skippedFor(kind: ExerciseKind): StepId[] {
  const steps = stepsForKind(kind);
  return STEP_IDS.filter((step) => !steps.includes(step));
}

/* ── The two answers a listening run asks for ──────────────────────────────
 *
 * Both are `sessions` columns with check constraints of their own, and both
 * are the database's spelling for the same reason `EXERCISE_KINDS` is.
 */

/** How the person is listening. `sessions_posture_known`. */
export const POSTURES = ['sitting', 'lying'] as const;
export type Posture = (typeof POSTURES)[number];

/**
 * Where the piece leaves them. `sessions_ending_known`.
 *
 * `day` and `sleep`, not `relax` and `fall_asleep`: the question asked on
 * screen is *Wie soll es enden?* — back into the day, or into sleep — and it is
 * named after the ending because the alternative collides with the GOAL called
 * *Entspannen*, which the session already records in `goal_id`. Ben,
 * 2026-10-11: the fall-asleep cut "has a very soothing ending while the
 * other one is bringing the person back into the now".
 */
export const ENDINGS = ['day', 'sleep'] as const;
export type Ending = (typeof ENDINGS)[number];

export function isPosture(value: string | null | undefined): value is Posture {
  return POSTURES.includes(value as Posture);
}

export function isEnding(value: string | null | undefined): value is Ending {
  return ENDINGS.includes(value as Ending);
}

/**
 * PRESELECTED, BOTH OF THEM — Ben, 2026-10-11.
 *
 * The first screen of an exercise must not block on an unanswered question,
 * and these two are what most sessions want: sitting, and back into the day.
 * Changing either is one tap, and the session records what was asked rather
 * than what was defaulted — the row carries the answer either way.
 */
export const DEFAULT_POSTURE: Posture = 'sitting';
export const DEFAULT_ENDING: Ending = 'day';
