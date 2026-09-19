/**
 * The wizard's reachability rule — Layer 2 · C.10
 *
 * A step is reachable when it is the current one, when it is completed, or
 * when every step before it is completed.
 *
 * WHY IT IS ITS OWN MODULE. The rule used to live in a private closure inside
 * InteractiveWizard, where the component could enforce it but nothing else
 * could ask about it. So apps/web/src/lib/sessionMachine.ts wrote the same
 * rule a second time — the component disables the buttons, the reducer refuses
 * the transitions, and the two agreed only because tests on either side said
 * so. Two implementations of one rule is a defect waiting for one of them to
 * be edited.
 *
 * Now there is one implementation. InteractiveWizard consumes it (see
 * `stateOf`), and the app can import it rather than restate it.
 *
 * NO REACT, NO DOM, NO IMPORTS. It is a pure function over ids, so it can be
 * called from a reducer, a loader or a test with nothing mounted.
 */

/** disabled → active → selected → completed. A progression, not a palette. */
export type WizardStepState = 'disabled' | 'active' | 'selected' | 'completed';

function isDone(
  completed: readonly string[] | ReadonlySet<string>,
  step: string,
): boolean {
  return completed instanceof Set
    ? (completed as ReadonlySet<string>).has(step)
    : (completed as readonly string[]).includes(step);
}

/**
 * Which of the four states a step is in.
 *
 * `steps` is the ordered run of step ids. A step that is not in it is
 * 'disabled': an id nobody declared cannot have had its predecessors finished.
 */
export function wizardStepState(
  steps: readonly string[],
  step: string,
  current: string,
  completed: readonly string[] | ReadonlySet<string> = [],
): WizardStepState {
  if (step === current) return 'selected';
  if (isDone(completed, step)) return 'completed';
  const index = steps.indexOf(step);
  if (index < 0) return 'disabled';
  return steps.slice(0, index).every((earlier) => isDone(completed, earlier))
    ? 'active'
    : 'disabled';
}

/**
 * The predicate, derived from the state so the two can never disagree:
 * everything except 'disabled' is reachable.
 */
export function isWizardStepReachable(
  steps: readonly string[],
  step: string,
  current: string,
  completed: readonly string[] | ReadonlySet<string> = [],
): boolean {
  return wizardStepState(steps, step, current, completed) !== 'disabled';
}
