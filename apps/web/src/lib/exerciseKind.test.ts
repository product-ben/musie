/**
 * The step set per RUN — the one rule this feature adds to a session.
 *
 * Tested here rather than through the screen, for `sessionMachine.test.ts`'s
 * reason: these are pure functions over two tiny arrays, and going through
 * `Session.tsx` would need a router, a reducer and a database to prove
 * something that has no I/O in it at all.
 *
 * The invariants worth having a test for are the ones a future edit could
 * break without noticing: that `skippedForRun` stays the exact complement of
 * `stepsForRun` (two lists that must not drift), that a listening run is
 * finishable — the shape of the D14 bug, where `scan` never completed and
 * `listen` was unreachable forever — and, since 2026-10-14, that **a card run
 * is four steps long whatever the mode**, which is Ben's own rule for the rail
 * and the thing a third digital shape would quietly break.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ENDING, DEFAULT_POSTURE, ENDINGS, EXERCISE_KINDS, POSTURES,
  isEnding, isExerciseKind, isPosture, skippedForRun, stepsForRun,
} from './exerciseKind';
import type { RunShape } from './exerciseKind';
import { STEP_IDS } from '../routeHandle';
import { activeSteps, nextStep } from './sessionMachine';

/** The deck on the table. */
const PAPER: RunShape = { digital: false, cardsDealt: 5 };
/** Five dealt digitally — the step after Einsteigen is `select`. */
const FIVE: RunShape = { digital: true, cardsDealt: 5 };
/** One dealt digitally — the step after Einsteigen is `view`. */
const ONE: RunShape = { digital: true, cardsDealt: 1 };
/** An exercise that draws no cards at all. */
const NONE: RunShape = { digital: false, cardsDealt: null };

describe('stepsForRun', () => {
  it('walks all four steps for a card exercise on paper', () => {
    expect(stepsForRun('card_based', PAPER)).toEqual(['intro', 'scan', 'listen', 'reflect']);
  });

  it('substitutes select where five cards were dealt digitally', () => {
    expect(stepsForRun('card_based', FIVE)).toEqual(['intro', 'select', 'listen', 'reflect']);
  });

  it('substitutes view where one card was dealt digitally', () => {
    expect(stepsForRun('card_based', ONE)).toEqual(['intro', 'view', 'listen', 'reflect']);
  });

  /* BEN'S RULE FOR THE RAIL, 2026-10-14: it must not change length when the
     switch is flipped. A substitution cannot change it; a second list could,
     and would, the first time somebody edited one of them. */
  it('is four steps long for a card run in every mode', () => {
    for (const shape of [PAPER, FIVE, ONE]) {
      expect(stepsForRun('card_based', shape)).toHaveLength(4);
    }
  });

  /* No run holds two of the three second steps — which is also why their
     order inside STEP_IDS is unobservable. */
  it('never gives a run two of scan, view and select', () => {
    for (const shape of [PAPER, FIVE, ONE, NONE]) {
      for (const kind of EXERCISE_KINDS) {
        const steps = stepsForRun(kind, shape);
        const seconds = steps.filter((step) => step === 'scan' || step === 'view' || step === 'select');
        expect(seconds.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('leaves the second step out of a listening run — three stages, not four with a gap', () => {
    expect(stepsForRun('listening_only', NONE)).toEqual(['intro', 'listen', 'reflect']);
    expect(stepsForRun('listening_only', NONE)).not.toContain('scan');
  });

  /* The mode is a card fact. A listening run has no cards to be without, so
     asking it to go digital must change nothing. */
  it('ignores the mode for a kind that draws no cards', () => {
    expect(stepsForRun('listening_only', FIVE)).toEqual(stepsForRun('listening_only', NONE));
    expect(stepsForRun('digital_interactive', ONE)).toEqual(stepsForRun('digital_interactive', NONE));
  });

  /* The breathing screens are not designed; the row exists so the exercise is
     not MISTYPED as a listening one. If it ever gains its own steps this test
     is the one that should fail first. */
  it('gives digital_interactive the listening run for now', () => {
    expect(stepsForRun('digital_interactive', NONE)).toEqual(stepsForRun('listening_only', NONE));
  });

  it('keeps every run in STEP_IDS order, so the rail never reorders itself', () => {
    for (const kind of EXERCISE_KINDS) {
      for (const shape of [PAPER, FIVE, ONE, NONE]) {
        const steps = stepsForRun(kind, shape);
        const ordered = STEP_IDS.filter((step) => steps.includes(step));
        expect(steps).toEqual(ordered);
      }
    }
  });

  it('starts every run at intro', () => {
    for (const kind of EXERCISE_KINDS) {
      expect(stepsForRun(kind, NONE)[0]).toBe('intro');
    }
  });
});

describe('skippedForRun', () => {
  /* IT STOPPED BEING EMPTY ON 2026-10-14. A paper card run skips the two
     digital second steps, and a digital one skips `scan` and whichever of the
     other two it did not take — so every card run skips exactly two of the
     three. The design system's fifth wizard state draws a skipped step as a
     visible gap and nothing wants that here, which is why the rail is handed
     `stepsForRun` rather than all six. */
  it('skips the two second steps this run did not take', () => {
    expect(skippedForRun('card_based', PAPER)).toEqual(['view', 'select']);
    expect(skippedForRun('card_based', FIVE)).toEqual(['scan', 'view']);
    expect(skippedForRun('card_based', ONE)).toEqual(['scan', 'select']);
  });

  it('skips all three second steps for a listening exercise', () => {
    expect(skippedForRun('listening_only', NONE)).toEqual(['scan', 'view', 'select']);
  });

  /* THE TWO LISTS MUST NOT DRIFT. `skippedFor` is derived from
     `stepsForKind`, and this is the assertion that keeps it derived: together
     they are STEP_IDS, with nothing counted twice and nothing dropped. */
  it('is the exact complement of the run, for every kind', () => {
    for (const kind of EXERCISE_KINDS) {
      const steps = stepsForRun(kind, NONE);
      const skipped = skippedForRun(kind, NONE);
      expect([...steps, ...skipped].sort()).toEqual([...STEP_IDS].sort());
      expect(steps.filter((step) => skipped.includes(step))).toEqual([]);
    }
  });

  /* The design system's reachability rule is given `skipped` and treats those
     steps as transparent. This is the D14 shape: if `scan` were in the run of
     a cardless exercise, `listen` would want it completed, nothing would ever
     complete it, and the run could not be finished. */
  it('leaves a listening run finishable — reflect is reachable from intro', () => {
    const skipped = skippedForRun('listening_only', NONE);
    expect(activeSteps(skipped)).toEqual(['intro', 'listen', 'reflect']);
    expect(nextStep('intro', skipped)).toBe('listen');
    expect(nextStep('listen', skipped)).toBe('reflect');
    expect(nextStep('reflect', skipped)).toBeNull();
  });
});

describe('the narrowing guards', () => {
  it('accepts the three kinds the check constraint allows', () => {
    expect(EXERCISE_KINDS.every((kind) => isExerciseKind(kind))).toBe(true);
  });

  it('refuses anything else, including null and the old boolean spelling', () => {
    expect(isExerciseKind('cards')).toBe(false);
    expect(isExerciseKind('card-based')).toBe(false);
    expect(isExerciseKind('')).toBe(false);
    expect(isExerciseKind(null)).toBe(false);
    expect(isExerciseKind(undefined)).toBe(false);
  });

  it('narrows the two listening answers against their own constraints', () => {
    expect(POSTURES.every((posture) => isPosture(posture))).toBe(true);
    expect(ENDINGS.every((ending) => isEnding(ending))).toBe(true);
    expect(isPosture('laying')).toBe(false);   // the English is `lying`
    expect(isEnding('relax')).toBe(false);     // the question is about the ENDING
    expect(isEnding(null)).toBe(false);
  });

  it('preselects both answers, and preselects values the database accepts', () => {
    expect(isPosture(DEFAULT_POSTURE)).toBe(true);
    expect(isEnding(DEFAULT_ENDING)).toBe(true);
    expect(DEFAULT_POSTURE).toBe('sitting');
    expect(DEFAULT_ENDING).toBe('day');
  });
});
