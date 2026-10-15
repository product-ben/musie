/**
 * The goal: what a person is after when they start a session.
 *
 * Four facts live here, and nothing else does. The query is in `content.ts`,
 * the hook is in `useContent.ts`, the sheet is a component, and the screen
 * decides what to draw — this file owns only what a CHOICE is, where it is
 * remembered, what it filters, and which of the filtered exercises can
 * actually be started.
 *
 * ── THE SENTINEL IS GONE, AND THAT IS THE CHANGE (2026-10-15) ─────────────
 * There used to be a `NO_GOAL` here, and a long argument for it: "Musie
 * entdecken" meant *show me everything*, and it was modelled as the ABSENCE
 * of a goal rather than as a row, because a row mapped to every exercise
 * falls out of step the first time somebody adds an exercise and forgets to
 * map it. Absence cannot.
 *
 * That argument was right and it no longer applies. Ben's mapping of
 * 2026-10-15 gives *Musie kennenlernen* three NAMED exercises — Achtsam
 * Atmen, Bodyscan, Freie Bahn — so it promises something specific rather
 * than everything, and there is nothing left for absence to express. It is a
 * row (`get-to-know-musie`), it is the first of four, and `goalIdFor()` went
 * with the sentinel: a choice is now always a real goal id, and
 * `sessions.goal_id` is never null again.
 *
 * ── TWO STATES NOW, NOT THREE ─────────────────────────────────────────────
 *
 *   null    not known yet → the goals are still in flight, nothing drawn
 *   an id   this goal → the exercises mapped to it
 *
 * `null` keeps exactly one job, the one it has had since 2026-10-07: the
 * window before the goals have landed, which the screen waits out rather
 * than draws. What it does NOT mean, and never means again, is "nobody has
 * chosen" — `defaultGoal()` answers that.
 *
 * ── A STORED `__none__` IS A STALE VALUE AND FALLS BACK FOR FREE ──────────
 * Every browser that used this screen before today holds `__none__` in
 * `musie-goal`. `readCachedGoal` validates the stored id against the goals
 * that actually exist, and no row can spell it — ids are English slugs
 * constrained to `[a-z][a-z0-9-]*` by this content's own convention — so it
 * reads as never-chosen and the screen opens on the default. No migration,
 * no special case, and it is asserted in `goals.test.ts` rather than assumed.
 */
import type { Exercise, Goal } from './content';

/** Beside `musie-locale`, and read by nothing else. */
export const GOAL_STORAGE_KEY = 'musie-goal';

/** A goal id. Never a sentinel, and never null — null is "not known yet". */
export type GoalChoice = string;

/**
 * What was chosen last, or null if nothing was.
 *
 * VALIDATED AGAINST THE GOALS THAT ACTUALLY EXIST, which is the whole reason
 * this takes an argument. A goal removed from the content leaves a stale id
 * in a returning visitor's browser, and trusting it would filter the deck by
 * something that is no longer offered — an empty screen under a headline
 * naming a goal the sheet cannot show as checked. An unknown value reads as
 * "never chosen", which the screen turns into `defaultGoal()` and a full
 * pile. Same discipline `isLocale` applies to a stored locale.
 *
 * Call it only once `goals` has loaded; before that there is nothing to
 * validate against and the answer would be a false null.
 */
export function readCachedGoal(goals: Goal[]): GoalChoice | null {
  try {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    if (stored === null) return null;
    return goals.some((goal) => goal.id === stored) ? stored : null;
  } catch {
    /* Private mode, blocked site data. */
    return null;
  }
}

export function cacheGoal(choice: GoalChoice): void {
  try {
    localStorage.setItem(GOAL_STORAGE_KEY, choice);
  } catch {
    /* Losing it costs the next visit its filter — it opens on the default
       goal rather than the chosen one — not correctness. */
  }
}

/**
 * The goal a browser opens on: THE FIRST ONE OFFERED.
 *
 * `goals[0]` looks like an accident and is not. `getGoals` orders by `sort`,
 * and the goal sheet renders that same array in that same order — so "the
 * default goal" and "the first card in the sheet" are ONE fact rather than
 * two that can disagree. Ben's default is *Einen Weg Musie kennenzulernen*
 * and it is `sort = 1`; changing which goal is default is then a migration
 * rather than a migration plus a constant in here that somebody has to
 * remember to move with it.
 *
 * A hardcoded `'get-to-know-musie'` was the obvious alternative and is worse
 * in the one way that matters: it can be true in this file and false in the
 * table, and nothing would notice.
 *
 * Null for an empty list, which is a catalogue that failed to load. The
 * screen already has an answer for that and it is not a goal.
 */
export function defaultGoal(goals: Goal[]): GoalChoice | null {
  return goals[0]?.id ?? null;
}

/**
 * The exercises this choice offers.
 *
 * Client-side, over five rows already in hand, rather than a second query per
 * goal: the whole catalogue is one round trip and re-asking the server to
 * filter it would make switching goals a network round trip for an answer
 * that is already on the page.
 *
 * `null` returns everything — the screen is what decides whether to DRAW
 * anything before a choice is known, which keeps this function total and
 * testable.
 */
export function filterByGoal(exercises: Exercise[], choice: GoalChoice | null): Exercise[] {
  if (choice === null) return exercises;
  return exercises.filter((exercise) => exercise.goalIds.includes(choice));
}

/**
 * The ones a press would actually start.
 *
 * ── ONE LINE, AND IT EXISTS SO THAT TWO THINGS CANNOT DISAGREE ────────────
 * /exercises counts these in its headline AND draws from them for *Such mir
 * eine Übung aus*. Both were `filter((e) => e.implemented)` written out at
 * the call site; one expression makes "a headline promising two exercises
 * beside a shuffle that can reach a third" inexpressible rather than merely
 * untrue today.
 *
 * ── THE PILE IS NOT FILTERED BY THIS, AND THAT IS DELIBERATE ──────────────
 * The deck deals every mapped exercise, built or not, and refuses the unbuilt
 * ones through `NotImplementedLightbox` — filtering them out "would quietly
 * show two exercises where the product has five", which is the rule
 * `Exercises.tsx` has carried since the deck shipped.
 *
 * So the headline says 2 over a pile of 3 while `breathing-score` is unbuilt,
 * and that is the honest pair rather than an oversight: the headline promises
 * what you can START, the pile shows what EXISTS. The two converge the day
 * Achtsam Atmen ships, with no content change and no code change.
 */
export function startable(exercises: Exercise[]): Exercise[] {
  return exercises.filter((exercise) => exercise.implemented);
}

/** The goal's name — its card headline — or null while the catalogue has not landed. */
export function goalLabel(goals: Goal[], choice: GoalChoice): string | null {
  return goals.find((goal) => goal.id === choice)?.label ?? null;
}

/**
 * The goal as a purpose phrase, for the headline's `{goal}` slot.
 *
 * A SECOND LOOKUP RATHER THAN A SECOND USE OF `goalLabel`, because the two
 * strings are not interchangeable: the headline reads "3 Übungen zum
 * *Entspannen*" and the card in the sheet is headed "*Entspannung*". German
 * grammar makes the difference obvious; English hides it well enough
 * ("relax" against "Relaxation") that one column would have looked
 * sufficient for a while and then been wrong in the harder language.
 */
export function goalPurpose(goals: Goal[], choice: GoalChoice): string | null {
  return goals.find((goal) => goal.id === choice)?.purpose ?? null;
}
