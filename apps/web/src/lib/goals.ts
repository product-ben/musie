/**
 * The goal: what a person is after when they start a session.
 *
 * Three facts live here, and nothing else does. The query is in `content.ts`,
 * the hook is in `useContent.ts`, the picker is a component, and the screen
 * decides what to draw — this file owns only what a CHOICE is, where it is
 * remembered, and what it filters.
 *
 * ── "MUSIE ENTDECKEN" IS NOT A GOAL, IT IS THE ABSENCE OF ONE ─────────────
 * Four options are offered and three of them are rows. The fourth means "show
 * me everything", and it is modelled as the lack of a goal rather than as a
 * row mapped to every exercise — because a row would have to be re-mapped
 * every time an exercise is added, and the day somebody forgot, the one
 * option that promises everything would quietly stop delivering it. Absence
 * cannot fall out of step with the catalogue.
 *
 * It needs a value on screen regardless, because `RadioGroupText` identifies
 * an option by a string. `NO_GOAL` is that value and it never reaches the
 * database: `goalIdFor()` is the one place it turns back into null.
 *
 * ── THREE STATES, NOT TWO ─────────────────────────────────────────────────
 * `null` and `NO_GOAL` are different answers and the screen draws them
 * differently:
 *
 *   null      nobody has chosen yet → the question is the screen, no cards
 *   NO_GOAL   chose "Musie entdecken" → every exercise, pile dealt
 *   an id     chose a goal → the exercises mapped to it
 *
 * Collapsing the first two would deal the deck before the question had been
 * asked, which is the one thing the design is built to avoid.
 */
import type { Exercise, Goal } from './content';

/**
 * The option value for "Musie entdecken".
 *
 * Double-underscored so it cannot collide with a goal id: ids are English
 * slugs constrained to `[a-z][a-z0-9-]*` by the content's own convention, so
 * no row can ever spell this.
 */
export const NO_GOAL = '__none__';

/** Beside `musie-locale`, and read by nothing else. */
export const GOAL_STORAGE_KEY = 'musie-goal';

/** A goal id, or `NO_GOAL`. Never null — null is the ABSENCE of a choice. */
export type GoalChoice = string;

/**
 * What was chosen last, or null if nothing was.
 *
 * VALIDATED AGAINST THE GOALS THAT ACTUALLY EXIST, which is the whole reason
 * this takes an argument. A goal removed from the content leaves a stale id
 * in a returning visitor's browser, and trusting it would filter the deck by
 * something that is no longer offered — an empty screen with a pill naming a
 * goal the picker cannot show as checked. An unknown value reads as "never
 * chosen", so the question is asked again. Same discipline `isLocale` applies
 * to a stored locale.
 *
 * Call it only once `goals` has loaded; before that there is nothing to
 * validate against and the answer would be a false null.
 */
export function readCachedGoal(goals: Goal[]): GoalChoice | null {
  try {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    if (stored === null) return null;
    if (stored === NO_GOAL) return NO_GOAL;
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
    /* Losing it costs one extra question on the next visit, not correctness. */
  }
}

/**
 * What goes in `sessions.goal_id`.
 *
 * The ONE place `NO_GOAL` turns back into null, so the sentinel cannot reach
 * the database through some other path.
 */
export function goalIdFor(choice: GoalChoice | null): string | null {
  return choice === null || choice === NO_GOAL ? null : choice;
}

/**
 * The exercises this choice offers.
 *
 * Client-side, over five rows already in hand, rather than a second query per
 * goal: the whole catalogue is one round trip and re-asking the server to
 * filter it would make switching goals a network round trip for an answer
 * that is already on the page.
 *
 * `null` and `NO_GOAL` both return everything — the screen is what decides
 * whether to DRAW anything before a choice is made, which keeps this function
 * total and testable.
 */
export function filterByGoal(exercises: Exercise[], choice: GoalChoice | null): Exercise[] {
  if (choice === null || choice === NO_GOAL) return exercises;
  return exercises.filter((exercise) => exercise.goalIds.includes(choice));
}

/** The label for the pill, or null while the catalogue has not landed. */
export function goalLabel(goals: Goal[], choice: GoalChoice): string | null {
  if (choice === NO_GOAL) return null;
  return goals.find((goal) => goal.id === choice)?.label ?? null;
}
