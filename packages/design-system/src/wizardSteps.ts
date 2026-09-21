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

/**
 * disabled → active → selected → completed. A progression, not a palette.
 *
 * Plus one that is not on that line at all. **skipped** is a step that is not
 * part of THIS run — D14, answered 2026-09-19. It is deliberately not a rung:
 * `disabled` reads as *not yet*, and a skipped step is never opening, however
 * many steps get completed. Neither of the two states that were available
 * before could say it — `completed` draws a check mark for something nobody
 * did, which in a rail above a diary is a small lie with a long life.
 */
export type WizardStepState = 'disabled' | 'active' | 'selected' | 'completed' | 'skipped';

function has(
  ids: readonly string[] | ReadonlySet<string>,
  step: string,
): boolean {
  return ids instanceof Set
    ? (ids as ReadonlySet<string>).has(step)
    : (ids as readonly string[]).includes(step);
}

/**
 * Which of the five states a step is in.
 *
 * `steps` is the ordered run of step ids. A step that is not in it is
 * 'disabled': an id nobody declared cannot have had its predecessors finished.
 *
 * `skipped` is checked FIRST, before `current` and before `completed`. A
 * skipped step cannot legitimately be either, and if a caller manages to put
 * one in both lists the honest answer is still that it is not in the run —
 * reporting 'selected' would hand the screen a step it has nothing to draw for.
 *
 * SKIPPED STEPS ARE TRANSPARENT TO THE PREDECESSOR TEST. "Every earlier step is
 * completed" would otherwise lock every step after a skipped one forever, which
 * is exactly the bug D14 was found by: `scan` never completes for a cardless
 * exercise, so `listen` was permanently unreachable and the run could not be
 * finished.
 */
export function wizardStepState(
  steps: readonly string[],
  step: string,
  current: string,
  completed: readonly string[] | ReadonlySet<string> = [],
  skipped: readonly string[] | ReadonlySet<string> = [],
): WizardStepState {
  if (has(skipped, step)) return 'skipped';
  if (step === current) return 'selected';
  if (has(completed, step)) return 'completed';
  const index = steps.indexOf(step);
  if (index < 0) return 'disabled';
  return steps
    .slice(0, index)
    .filter((earlier) => !has(skipped, earlier))
    .every((earlier) => has(completed, earlier))
    ? 'active'
    : 'disabled';
}

/**
 * The predicate, derived from the state so the two can never disagree:
 * everything except 'disabled' and 'skipped' is reachable.
 */
export function isWizardStepReachable(
  steps: readonly string[],
  step: string,
  current: string,
  completed: readonly string[] | ReadonlySet<string> = [],
  skipped: readonly string[] | ReadonlySet<string> = [],
): boolean {
  const state = wizardStepState(steps, step, current, completed, skipped);
  return state !== 'disabled' && state !== 'skipped';
}
