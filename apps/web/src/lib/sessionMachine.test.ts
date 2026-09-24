/**
 * The session state machine — every transition, and every refusal.
 *
 * ── WHAT THESE TESTS ARE FOR ───────────────────────────────────────────────
 * The reducer is pure, so this suite is the whole verification: there is no
 * screen to click through, and the step this file belongs to deliberately
 * ships no UI. The refusals matter at least as much as the moves — an
 * unreachable step accepted, or a transition landing on a session that ended,
 * is the class of bug a reducer exists to make impossible, and neither is
 * visible from a happy-path walk.
 *
 * Refusal is asserted with `toBe(state)`, not `toEqual`: the guards return the
 * state object itself so React skips the re-render, and a return value that
 * merely LOOKED the same would pass a deep-equality check while re-rendering
 * the session screen on every rejected tap.
 *
 * `STEP_IDS` is imported rather than retyped. A literal `['intro', 'scan',
 * 'listen', 'reflect']` here would be a third copy of the list — and would
 * keep passing on the day the run gains a fifth step.
 */
import { describe, expect, it } from 'vitest';

import { STEP_IDS, type StepId } from '../routeHandle';
import {
  activeSteps,
  canGoBack,
  isStepReachable,
  isTerminal,
  nextStep,
  resumeSession,
  sessionReducer,
  startSession,
  stepTransition,
  type SessionAction,
  type SessionState,
} from './sessionMachine';

const AT = '2026-09-19T10:00:00.000Z';

/** Walk forward `count` times from a fresh session. */
function advanced(count: number): SessionState {
  let state = startSession();
  for (let i = 0; i < count; i += 1) state = sessionReducer(state, { type: 'NEXT' });
  return state;
}

describe('startSession', () => {
  it('begins at the first step, running, with nothing behind it', () => {
    const state = startSession();

    expect(state.step).toBe(STEP_IDS[0]);
    expect(state.status).toBe('started');
    expect(state.completed).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.endedAt).toBeNull();
  });
});

describe('forward', () => {
  it('walks the four steps in order, completing each one as it leaves it', () => {
    let state = startSession();

    /* Asserted step by step rather than at the end, because "completed" must
       lag the current step by exactly one — the step on screen is not done. */
    STEP_IDS.forEach((step, i) => {
      expect(state.step).toBe(step);
      expect(state.completed).toEqual(STEP_IDS.slice(0, i));
      expect(state.history).toEqual(STEP_IDS.slice(0, i));
      state = sessionReducer(state, { type: 'NEXT' });
    });
  });

  it('refuses NEXT at the last step, because the way out of it is FINISH', () => {
    const atLast = advanced(STEP_IDS.length - 1);
    expect(atLast.step).toBe(STEP_IDS[STEP_IDS.length - 1]);

    expect(sessionReducer(atLast, { type: 'NEXT' })).toBe(atLast);
  });

  it('jumps to a step whose predecessors are all completed', () => {
    const atListen = advanced(2);
    /* Back to a completed step, then forward again by jump rather than NEXT:
       `reflect` is unreachable from here, `intro` and `scan` are not. */
    const atIntro = sessionReducer(atListen, { type: 'GO_TO', step: 'intro' });

    expect(atIntro.step).toBe('intro');

    const back = sessionReducer(atIntro, { type: 'GO_TO', step: 'listen' });
    expect(back.step).toBe('listen');
    /* A jump completes nothing. It moves the cursor; only NEXT and FINISH
       claim a step is done. */
    expect(back.completed).toEqual(['intro', 'scan']);
  });

  it.each(['listen', 'reflect'] as StepId[])(
    'refuses GO_TO %s from a fresh session, whose predecessors are unfinished',
    (step) => {
      const state = startSession();
      expect(isStepReachable(state, step)).toBe(false);
      expect(sessionReducer(state, { type: 'GO_TO', step })).toBe(state);
    },
  );

  it('treats GO_TO the current step as nothing at all', () => {
    const state = advanced(1);
    expect(sessionReducer(state, { type: 'GO_TO', step: state.step })).toBe(state);
  });
});

describe('back', () => {
  it('returns where the user came from, not to step n−1', () => {
    /* The distinction this test exists for: from `intro`, step n−1 does not
       exist, but the user arrived from `reflect` and that is where BACK goes. */
    const atReflect = advanced(3);
    const atIntro = sessionReducer(atReflect, { type: 'GO_TO', step: 'intro' });

    const back = sessionReducer(atIntro, { type: 'BACK' });

    expect(back.step).toBe('reflect');
    expect(back.history).toEqual(['intro', 'scan', 'listen']);
  });

  it('unwinds the whole stack, and leaves completion alone on the way', () => {
    let state = advanced(3);
    expect(state.completed).toEqual(['intro', 'scan', 'listen']);

    state = sessionReducer(state, { type: 'BACK' });
    expect(state.step).toBe('listen');
    state = sessionReducer(state, { type: 'BACK' });
    expect(state.step).toBe('scan');
    state = sessionReducer(state, { type: 'BACK' });
    expect(state.step).toBe('intro');

    /* Going back must not lock the steps ahead — otherwise re-reading the
       intro would strand a user who had already reached `reflect`. */
    expect(state.completed).toEqual(['intro', 'scan', 'listen']);
    expect(isStepReachable(state, 'reflect')).toBe(true);
  });

  it('refuses BACK at the first step, where the stack is empty', () => {
    const state = startSession();

    expect(canGoBack(state)).toBe(false);
    expect(sessionReducer(state, { type: 'BACK' })).toBe(state);
  });

  it('refuses BACK immediately after a resume, which restores no stack', () => {
    const state = resumeSession({ step: 'listen', status: 'started', completed: ['intro', 'scan'] });

    expect(canGoBack(state)).toBe(false);
    expect(sessionReducer(state, { type: 'BACK' })).toBe(state);
  });
});

describe('resume', () => {
  it.each(STEP_IDS)('comes back to %s, with its completed steps intact', (step) => {
    const completed = STEP_IDS.slice(0, STEP_IDS.indexOf(step));

    const state = resumeSession({ step, status: 'started', completed });

    expect(state.step).toBe(step);
    expect(state.status).toBe('started');
    expect(state.completed).toEqual(completed);
    expect(state.endedAt).toBeNull();
    /* And the resumed step carries on: reachability is rebuilt from the
       persisted list, not from having walked there in this tab. */
    expect(isStepReachable(state, step)).toBe(true);
  });

  it('copies the persisted list instead of aliasing it', () => {
    const completed: StepId[] = ['intro'];
    const state = resumeSession({ step: 'scan', status: 'started', completed });

    completed.push('scan');

    expect(state.completed).toEqual(['intro']);
  });

  it('rehydrates through the reducer too, replacing whatever was there', () => {
    const walked = advanced(3);

    const state = sessionReducer(walked, {
      type: 'RESUME',
      session: { step: 'scan', status: 'started', completed: ['intro'] },
    });

    expect(state.step).toBe('scan');
    expect(state.completed).toEqual(['intro']);
    expect(state.history).toEqual([]);
  });

  it('reads a session that already ended, which the Diary needs', () => {
    /* RESUME is the one action a terminal session accepts: it is a read, not
       a transition. */
    const state = resumeSession({
      step: 'reflect',
      status: 'finished',
      completed: [...STEP_IDS],
      endedAt: AT,
    });

    expect(state.status).toBe('finished');
    expect(state.endedAt).toBe(AT);
  });
});

describe('finish and cancel', () => {
  it('finishes on the last step, completing it and recording the timestamp', () => {
    const atReflect = advanced(3);

    const finished = sessionReducer(atReflect, { type: 'FINISH', at: AT });

    expect(finished.status).toBe('finished');
    expect(finished.completed).toEqual([...STEP_IDS]);
    expect(finished.endedAt).toBe(AT);
    expect(finished.step).toBe('reflect');
  });

  /* The pair of refusals that keeps the two terminal statuses meaning
     different things. Without the first one, a session left at the listen step
     could be recorded as FINISHED, and the Diary's whole reason for
     distinguishing them would be a lie. */
  it.each([0, 1, 2])('refuses FINISH before the last step (step index %i)', (index) => {
    const state = advanced(index);

    expect(sessionReducer(state, { type: 'FINISH', at: AT })).toBe(state);
  });

  it('cancels from wherever the user was, and claims no step is done', () => {
    const atListen = advanced(2);

    const cancelled = sessionReducer(atListen, { type: 'CANCEL', at: AT });

    expect(cancelled.status).toBe('abandoned');
    /* The step being abandoned is precisely the one that is NOT finished. */
    expect(cancelled.completed).toEqual(['intro', 'scan']);
    expect(cancelled.endedAt).toBe(AT);
    expect(cancelled.step).toBe('listen');
  });

  it('takes the timestamp as an input — the reducer never reads the clock', () => {
    const other = '2020-01-01T00:00:00.000Z';

    expect(sessionReducer(startSession(), { type: 'CANCEL', at: other }).endedAt).toBe(other);
  });
});

describe('the terminal guard', () => {
  const transitions: SessionAction[] = [
    { type: 'NEXT' },
    { type: 'GO_TO', step: 'intro' },
    { type: 'BACK' },
    { type: 'FINISH', at: AT },
    { type: 'CANCEL', at: AT },
  ];

  const ended: [string, SessionState][] = [
    ['finished', sessionReducer(advanced(3), { type: 'FINISH', at: AT })],
    ['abandoned', sessionReducer(advanced(2), { type: 'CANCEL', at: AT })],
  ];

  ended.forEach(([status, state]) => {
    it(`reports a ${status} session as terminal`, () => {
      expect(isTerminal(state.status)).toBe(true);
      expect(canGoBack(state)).toBe(false);
    });

    it.each(transitions)(`refuses %o on a ${status} session`, (action) => {
      expect(sessionReducer(state, action)).toBe(state);
    });
  });

  it('calls a running session anything but terminal', () => {
    expect(isTerminal('started')).toBe(false);
  });
});

describe('nextStep', () => {
  it.each(STEP_IDS.map((step, i) => [step, STEP_IDS[i + 1] ?? null]))(
    'follows %s with %s',
    (step, expected) => {
      expect(nextStep(step as StepId)).toBe(expected);
    },
  );
});

/**
 * D14 — a cardless exercise. THE REGRESSION SUITE FOR A BUG THAT COULD NOT FIRE
 * YET.
 *
 * `needs_cards` is false for Mindful Breathing, Sound Journey and Body Scan, so
 * there is nothing to scan. Before `skipped` existed, `listen` was permanently
 * unreachable for all three: the rule wants every earlier step completed, and
 * `scan` could never complete. Both implemented exercises draw cards, so
 * nothing in the app would have caught it — which is exactly why it is tested
 * here rather than waited for.
 *
 * The designer's decision is that the RAIL still shows four markers with scan
 * skipped. None of that is asserted here: the rail is D.4's, and this module
 * only knows that a skipped step is not in the run.
 */
describe('a cardless exercise · scan is skipped, and the run still finishes', () => {
  const CARDLESS = ['scan'] as const;

  it('leaves the other three steps in the run, in order', () => {
    expect(activeSteps(CARDLESS)).toEqual(['intro', 'listen', 'reflect']);
    /* The default is every step — the card-drawing case, and the one every
       other test in this file exercises. */
    expect(activeSteps()).toEqual([...STEP_IDS]);
  });

  it('walks intro → listen → reflect, stepping over scan', () => {
    let state = startSession(CARDLESS);
    expect(state.step).toBe('intro');

    state = sessionReducer(state, { type: 'NEXT' });
    /* THE ASSERTION THE BUG WOULD HAVE FAILED. */
    expect(state.step).toBe('listen');
    expect(state.completed).toEqual(['intro']);

    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.step).toBe('reflect');

    /* And it can actually END, which is the part that was impossible: FINISH
       is refused anywhere but the last step, and `reflect` is only the last
       step if `nextStep` knows scan is not coming. */
    state = sessionReducer(state, { type: 'FINISH', at: AT });
    expect(state.status).toBe('finished');
    expect(state.completed).toEqual(['intro', 'listen', 'reflect']);
  });

  it('never reports a skipped step as reachable, however much is completed', () => {
    let state = startSession(CARDLESS);
    state = sessionReducer(state, { type: 'NEXT' });
    state = sessionReducer(state, { type: 'NEXT' });

    /* Not "locked pending its predecessors" — not in the run at all, so no
       sequence of completions opens it. */
    expect(isStepReachable(state, 'scan')).toBe(false);
    expect(isStepReachable(state, 'listen')).toBe(true);
    expect(isStepReachable(state, 'reflect')).toBe(true);
  });

  it('refuses a jump to the skipped step', () => {
    const state = sessionReducer(startSession(CARDLESS), { type: 'NEXT' });

    expect(sessionReducer(state, { type: 'GO_TO', step: 'scan' })).toBe(state);
  });

  it('goes back over the gap, not into it', () => {
    let state = startSession(CARDLESS);
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.step).toBe('listen');

    state = sessionReducer(state, { type: 'BACK' });
    /* The back stack holds where the user WAS, and they were never on scan. */
    expect(state.step).toBe('intro');
  });

  it('keeps the skip across a resume, because it is recomputed not stored', () => {
    const state = sessionReducer(startSession(CARDLESS), {
      type: 'RESUME',
      session: { step: 'listen', status: 'started', completed: ['intro'] },
    });

    expect(state.skipped).toEqual(['scan']);
    expect(isStepReachable(state, 'scan')).toBe(false);
    /* The resumed run must still be finishable. */
    expect(nextStep(state.step, state.skipped)).toBe('reflect');
  });
});

/**
 * `stepTransition` — the rule that decides NEXT versus GO_TO.
 *
 * THESE EXIST BECAUSE THE FIRST VERSION OF D.4's RECONCILIATION WAS WRONG.
 * The effect dispatched `GO_TO` for every URL change, including a forward one.
 * `GO_TO` does not complete the step you leave, so `completed` stayed empty,
 * so `scan` was never reachable, so pressing Continue on `intro` did nothing
 * at all — and nothing in the typechecker or the other 41 tests noticed,
 * because every piece in isolation was correct.
 */
describe('stepTransition', () => {
  it('is `stay` for the step you are already on', () => {
    const state = startSession();
    expect(stepTransition(state, 'intro')).toBe('stay');
  });

  it('is `next` for the step immediately after — which is what completes one', () => {
    const state = startSession();
    expect(stepTransition(state, 'scan')).toBe('next');
  });

  it('is `refuse` for a step two ahead of an unfinished one', () => {
    const state = startSession();
    expect(stepTransition(state, 'listen')).toBe('refuse');
    expect(stepTransition(state, 'reflect')).toBe('refuse');
  });

  it('is `jump` for a step already completed', () => {
    /* Going back to re-read something must not undo it, which is why this is
       a jump rather than a NEXT run backwards. */
    const state = sessionReducer(sessionReducer(startSession(), { type: 'NEXT' }), { type: 'NEXT' });
    expect(state.step).toBe('listen');
    expect(stepTransition(state, 'intro')).toBe('jump');
    expect(stepTransition(state, 'scan')).toBe('jump');
  });

  it('skips the skipped step when deciding what `next` means', () => {
    /* A cardless exercise goes intro → listen. `scan` is not the next step,
       it is not in the run at all — so Continue from intro is a NEXT to
       `listen`, not a refused jump. */
    const state = startSession(['scan']);
    expect(stepTransition(state, 'listen')).toBe('next');
    expect(stepTransition(state, 'scan')).toBe('refuse');
  });

  it('walks a whole cardless run without ever refusing a forward move', () => {
    /* The regression this pair of rules exists to prevent, end to end. */
    let state = startSession(['scan']);
    for (const target of ['listen', 'reflect'] as const) {
      expect(stepTransition(state, target)).toBe('next');
      state = sessionReducer(state, { type: 'NEXT' });
      expect(state.step).toBe(target);
    }
    expect(state.completed).toEqual(['intro', 'listen']);
  });

  it('walks a whole four-step run the same way', () => {
    let state = startSession();
    for (const target of ['scan', 'listen', 'reflect'] as const) {
      expect(stepTransition(state, target)).toBe('next');
      state = sessionReducer(state, { type: 'NEXT' });
    }
    expect(state.step).toBe('reflect');
    expect(state.completed).toEqual(['intro', 'scan', 'listen']);
  });
});
