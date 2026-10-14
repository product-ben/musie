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

/**
 * What a card run needs to know about ITSELF, beyond its kind — 2026-10-14.
 *
 * The kind alone stopped being enough the day the deck became optional: the
 * same `card_based` exercise runs four steps either way, but the SECOND of
 * them is `scan` with the deck on the table, `view` where one card was dealt
 * digitally, and `select` where five were.
 */
export interface RunShape {
  /** The cards are not on the table — `sessions.digital_cards`. */
  digital: boolean;
  /** `exercises.cards_dealt`: how many this exercise lays out, or null. */
  cardsDealt: number | null;
}

/**
 * The steps this RUN consists of, in order.
 *
 * ── THE DIGITAL RUN IS THE PAPER RUN WITH ITS SECOND STEP SUBSTITUTED ─────
 * Written as a substitution rather than as three lists, because that is the
 * product fact and it is the one Ben stated: *the rail stays four markers long
 * for every card exercise* (2026-10-14). A `map` cannot change the length; a
 * second list could, and would, the first time somebody edited one of them.
 *
 * So there is no run anywhere with both `scan` and `view`, or with `view` and
 * `select` — which is also why their order inside `STEP_IDS` is unobservable
 * and why `scan` was left in its historical place there.
 *
 * ── WHICH OF THE TWO IS ONE NUMBER ────────────────────────────────────────
 * `cards_dealt`, the same column that decides how many cards the hand holds.
 * More than one to look at is something to choose between; one is something to
 * look at. Null cannot happen for `card_based` — a check constraint holds the
 * two together — and falls to `view`, which is the shape that asks nothing of
 * a hand it may not have.
 */
export function stepsForRun(kind: ExerciseKind, shape: RunShape): readonly StepId[] {
  const steps = STEPS[kind];
  if (kind !== 'card_based' || !shape.digital) return steps;

  const second: StepId = (shape.cardsDealt ?? 1) > 1 ? 'select' : 'view';
  return steps.map((step) => (step === 'scan' ? second : step));
}

/**
 * The steps that are NOT in this kind's run — what `sessionMachine` and
 * `InteractiveWizard` both call `skipped`.
 *
 * Derived from `stepsForRun`, so the rail and the reducer cannot disagree
 * about a run: there is one list, and this is its complement. Deriving it the
 * other way round — listing the skipped steps per kind and subtracting — would
 * be the same data entered twice.
 *
 * IT IS NOW USUALLY THREE STEPS LONG FOR A CARD RUN rather than none: a paper
 * run skips `view` and `select`, a digital one skips `scan` and whichever of
 * the other two it did not take. The design system's fifth wizard state draws
 * a skipped step as a visible gap, and nothing wants that here — which is why
 * the rail is handed `stepsForRun` and not all six (`Session.tsx`, and
 * `stepsForRun`'s own note on the length).
 */
export function skippedForRun(kind: ExerciseKind, shape: RunShape): StepId[] {
  const steps = stepsForRun(kind, shape);
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

/* ── WHO ASKS ABOUT A POSTURE IS A COLUMN, NOT A LIST HERE ────────────────
   It was `NO_POSTURE_QUESTION`, an exercise id in this file, for about three
   hours on 2026-10-13 — with a docblock arguing that a two-row list is a
   column nobody has written yet. Ben's answer was that a second exercise will
   "absolutely" want it, so `exercises.asks_posture` was written
   (`20261013140000`) and the list deleted rather than left to grow.

   WHAT STAYS HERE is the part that is genuinely code: `STEPS` above, because a
   step is a screen and a content table must not be able to promise one that
   does not exist. Which QUESTIONS a run asks is not that — a question is a
   control the screen already has, and switching it off cannot break a route.
   `Exercise.asksPosture` carries it now. */
