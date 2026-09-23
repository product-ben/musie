/**
 * The session state machine — the four steps, and nothing else.
 *
 * ── WHY A REDUCER AND NOT A DRAWER FULL OF useState ────────────────────────
 * The step on screen, the completed-steps list, the back stack and the status
 * are FOUR FACTS THAT ONLY EVER CHANGE TOGETHER. Advancing a step appends to
 * `completed`, replaces `step` and pushes onto `history`; cancelling writes a
 * status and a timestamp and touches neither of the first two. Held in
 * separate `useState` calls, every one of those is a chance to update three
 * of four and ship a session that is reachable but not completed, or
 * completed twice. One reducer makes each of them a single, named, testable
 * transition — which is also why this module is where the rules live and the
 * screen is where they are merely rendered.
 *
 * ── THIS FILE IS PURE, DELIBERATELY ────────────────────────────────────────
 * No supabase, no react-router, no i18n catalogue, no `Date.now()`. A
 * timestamp is an INPUT (`FINISH`/`CANCEL` carry `at`), because a reducer that
 * reads the clock cannot be tested twice with the same answer, and because
 * `sessions.ended_at` is a fact about the world rather than about the state
 * machine. It holds no React STATE either: a later step calls `useReducer`
 * with `sessionReducer` and `startSession()` or `resumeSession()`, and this
 * module never learns that it happened.
 *
 * One import is not pure-by-inspection and is worth naming: the reachability
 * rule comes from `@musie/design-system`. That is the package barrel, so React
 * arrives transitively — but `wizardSteps` itself has no imports at all, and
 * the alternative is keeping a second copy of a rule the wizard also enforces.
 * One shared rule beats a shorter import graph.
 *
 * ── REFUSAL IS RETURNING THE SAME OBJECT ───────────────────────────────────
 * Every guard below returns `state` itself, not a copy. A refused transition
 * is then referentially identical, so `useReducer` skips the re-render and a
 * test can assert `toBe(state)` — a stronger claim than `toEqual`, and one
 * that a "helpfully" spread return value would quietly break.
 */
import { isWizardStepReachable } from '@musie/design-system';
import { STEP_IDS, type StepId } from '../routeHandle';

/**
 * The database's own identifiers, verbatim (DOMAIN-MODEL.md `sessions.status`).
 * English in the column, German through the i18n catalogue — translating these
 * would put the schema's vocabulary in two languages and make every query a
 * lookup.
 */
export type SessionStatus = 'started' | 'finished' | 'abandoned';

/**
 * What survives a closed tab — the `sessions` row's own columns, which is why
 * it is exactly `step`, `status` and `completed` and not the back stack.
 *
 * The back stack is deliberately NOT here. It is where this browsing session
 * has been, not what the session IS: persisting it would promise a coming-back
 * user a Back button that walks through a history they no longer remember.
 */
export interface PersistedSession {
  step: StepId;
  status: SessionStatus;
  completed: readonly StepId[];
  /** `sessions.ended_at`. Absent for a running session. */
  endedAt?: string | null;
}

export interface SessionState extends PersistedSession {
  /**
   * The steps this run does NOT include — D14.
   *
   * Three of the five exercises draw no cards (`exercises.needs_cards` is
   * false for Mindful Breathing, Sound Journey and Body Scan), so there is
   * nothing to scan. Without this the run is unfinishable: the reachability
   * rule wants every earlier step completed, `scan` never completes, and
   * `listen` stays locked forever. That bug cannot fire today only because
   * both implemented exercises draw cards.
   *
   * DERIVED, NOT STORED. It follows from the exercise, so `sessions` has no
   * column for it — the screen computes it from `needs_cards` and hands it in
   * at `startSession` or `resumeSession`. A column would be a second source
   * of truth for something the catalogue already knows, and the two could
   * disagree after a content edit.
   *
   * THE DESIGNER'S CHOICE is that the rail still shows FOUR markers with scan
   * visibly skipped, rather than three markers. That is the rail's business,
   * not this module's: here a skipped step is simply not part of the run, and
   * the rail renders the difference.
   */
  skipped: readonly StepId[];
  /**
   * The back stack: the steps actually visited, oldest first. `BACK` pops it,
   * so it returns where the user CAME FROM rather than to step n−1 — the two
   * differ the moment the wizard is used to jump to a completed step.
   */
  history: readonly StepId[];
  endedAt: string | null;
}

export type SessionAction =
  /** Complete the current step and move to the next one in `STEP_IDS`. */
  | { type: 'NEXT' }
  /** Jump to a reachable step — what the wizard's `onStepChange` gives us. */
  | { type: 'GO_TO'; step: StepId }
  | { type: 'BACK' }
  | { type: 'FINISH'; at: string }
  | { type: 'CANCEL'; at: string }
  /** Rehydrate wholesale from a persisted row. Not a transition — see below. */
  | { type: 'RESUME'; session: PersistedSession };

/** A session that has ended accepts no further transitions. */
export function isTerminal(status: SessionStatus): boolean {
  return status === 'finished' || status === 'abandoned';
}

/**
 * THE SAME REACHABILITY RULE `InteractiveWizard` ENFORCES — and now literally
 * the same function, skipping included.
 *
 * It was written out here a second time, because the rule lived in a private
 * closure inside the component and the app could not ask about it. The
 * component disabled the buttons, this refused the transitions, and the two
 * agreed only because tests on either side said so. C.10 extracted it to
 * `@musie/design-system`'s `wizardSteps` module, so there is one
 * implementation and no way for the rail and the reducer to drift apart.
 *
 * D.0 FINISHED THAT JOB. This function used to hold two lines of skip logic of
 * its own — an early return for a skipped step, and `activeSteps()` filtering
 * the list it handed over — because the design system had no idea skipping
 * existed. It does now (D14's fifth wizard state), so both lines are gone and
 * the full step list goes across with the skipped ids beside it. That matters
 * beyond tidiness: the RAIL has to draw a skipped step, so it needs the full
 * list anyway, and a rule that only worked on a pre-filtered list would have
 * been a second implementation again by another name.
 *
 * This wrapper stays because it is the app's vocabulary: the component's
 * signature takes loose id arrays, and a screen holds a `SessionState`.
 */
export function isStepReachable(state: SessionState, step: StepId): boolean {
  return isWizardStepReachable(STEP_IDS, step, state.step, state.completed, state.skipped);
}

/**
 * The steps actually in this run, in order.
 *
 * Filtering `STEP_IDS` rather than teaching the reachability rule about
 * skipping: `isWizardStepReachable` is the design system's, shared with the
 * wizard rail, and "every earlier step is completed" is exactly right once
 * the steps that are not in the run are not in the list.
 */
export function activeSteps(skipped: readonly StepId[] = []): readonly StepId[] {
  return STEP_IDS.filter((step) => !skipped.includes(step));
}

/** The step after this one, or null at the end of the run. Skips the skipped. */
export function nextStep(step: StepId, skipped: readonly StepId[] = []): StepId | null {
  const steps = activeSteps(skipped);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function canGoBack(state: SessionState): boolean {
  return !isTerminal(state.status) && state.history.length > 0;
}

/**
 * WHICH TRANSITION GETS A SCREEN FROM `state.step` TO `target`.
 *
 * ── WHY THIS EXISTS, AND THE BUG THAT PUT IT HERE ──────────────────────────
 * D.4 drives the wizard from the URL: every control navigates, and one effect
 * reconciles the new `:step` into the reducer. The first version of that effect
 * dispatched `GO_TO` for every change — and the flow did not work at all.
 *
 * `GO_TO` is a JUMP. It moves `step` and pushes history and deliberately does
 * NOT complete anything, because jumping to a step you already finished must
 * not claim you finished the one you left. So pressing Continue on `intro`
 * asked to jump to `scan`, `scan` was unreachable (its predecessor was not
 * complete), the jump was refused, and the run could never leave the first
 * step. Every step after intro was permanently locked — the same shape as the
 * D14 bug, and just as invisible to the typechecker.
 *
 * MOVING FORWARD ONE STEP IS `NEXT`, and `NEXT` is what completes the step you
 * are leaving. The distinction is the whole of this function.
 *
 *   'next'    — the target is the step immediately after this one, in the run.
 *   'jump'    — somewhere else that is reachable: a completed step, or the rail.
 *   'refuse'  — not reachable. The caller sends the person back to `state.step`.
 *   'stay'    — already there.
 *
 * Pure, and separate from the effect that acts on it, because the effect needs
 * a browser and this needs a test.
 */
export type StepTransition = 'stay' | 'next' | 'jump' | 'refuse';

export function stepTransition(state: SessionState, target: StepId): StepTransition {
  if (target === state.step) return 'stay';
  if (target === nextStep(state.step, state.skipped)) return 'next';
  return isStepReachable(state, target) ? 'jump' : 'refuse';
}

/**
 * A session begins at the first step IN THE RUN with nothing behind it.
 *
 * `activeSteps(...)[0]` rather than `STEP_IDS[0]`: intro is never skipped in
 * practice, but a start step that is not in the run would be unreachable by
 * its own rule from the first render.
 */
export function startSession(skipped: readonly StepId[] = []): SessionState {
  return {
    step: activeSteps(skipped)[0],
    status: 'started',
    completed: [],
    history: [],
    endedAt: null,
    skipped,
  };
}

/**
 * Rehydrate from a persisted row. The back stack starts empty, so the first
 * `BACK` after a resume is refused rather than inventing a step to return to.
 */
export function resumeSession(
  session: PersistedSession,
  skipped: readonly StepId[] = [],
): SessionState {
  return {
    step: session.step,
    status: session.status,
    completed: [...session.completed],
    history: [],
    endedAt: session.endedAt ?? null,
    /* Recomputed from the exercise on resume, not read back from the row —
       which is the point of not storing it. A content edit that turned an
       exercise cardless between two visits is then reflected, rather than the
       session carrying a stale answer forever. */
    skipped,
  };
}

/** Append without duplicating — `completed` is a set that keeps its order. */
function withCompleted(completed: readonly StepId[], step: StepId): readonly StepId[] {
  return completed.includes(step) ? completed : [...completed, step];
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  /* RESUME is exempt: it REPLACES the state rather than extending it, and the
     row it replaces it with may itself be terminal (the Diary reads finished
     and abandoned sessions). The guard exists to stop a session growing new
     history after it ended, not to stop us reading one back. */
  if (action.type === 'RESUME') return resumeSession(action.session, state.skipped);

  if (isTerminal(state.status)) return state;

  switch (action.type) {
    case 'NEXT': {
      const target = nextStep(state.step, state.skipped);
      /* No next step at `reflect`. The way out of the last step is FINISH, and
         silently treating NEXT as a finish would end sessions by accident. */
      if (target === null) return state;
      return {
        ...state,
        step: target,
        completed: withCompleted(state.completed, state.step),
        history: [...state.history, state.step],
      };
    }

    case 'GO_TO': {
      /* Tapping the step you are already on is not a visit; pushing it would
         make BACK return to itself. */
      if (action.step === state.step) return state;
      if (!isStepReachable(state, action.step)) return state;
      return {
        ...state,
        step: action.step,
        history: [...state.history, state.step],
      };
    }

    case 'BACK': {
      const previous = state.history[state.history.length - 1];
      if (previous === undefined) return state;
      /* Completion is NOT undone. Going back to re-read a step you finished
         must not lock the steps after it — that is the wizard's rule, and it
         is also the only thing that makes going back safe. */
      return { ...state, step: previous, history: state.history.slice(0, -1) };
    }

    case 'FINISH':
      /* FINISHED MEANS REFLECTED. DOMAIN-MODEL.md's state diagram reads
         `started --> finished : completes the reflection`, and that is a
         constraint rather than a description: a session finished from the
         listen step would sit in the Diary claiming a reflection that never
         happened, and no database constraint would catch it. Leaving from any
         earlier step is what CANCEL is for — the two terminal statuses exist
         precisely to keep those apart. The screen offers Finish only on the
         last step anyway, but the rule lives here, with the other rules. */
      if (nextStep(state.step, state.skipped) !== null) return state;
      /* The step you finish on is finished. Marking the whole run complete
         instead would claim steps that a jump may have skipped. */
      return {
        ...state,
        status: 'finished',
        completed: withCompleted(state.completed, state.step),
        endedAt: action.at,
      };

    case 'CANCEL':
      /* `completed` is left alone: you abandoned the step you were on, so it
         is precisely the one that is not done. */
      return { ...state, status: 'abandoned', endedAt: action.at };
  }
}
