/**
 * The step set per kind — the one rule this feature adds to the run.
 *
 * Tested here rather than through the screen, for `sessionMachine.test.ts`'s
 * reason: these are pure functions over two tiny arrays, and going through
 * `Session.tsx` would need a router, a reducer and a database to prove
 * something that has no I/O in it at all.
 *
 * The invariants worth having a test for are the ones a future edit could
 * break without noticing: that `skippedFor` stays the exact complement of
 * `stepsForKind` (two lists that must not drift), and that a listening run is
 * finishable — which is the shape of the D14 bug, where `scan` never completed
 * and `listen` was unreachable forever.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ENDING, DEFAULT_POSTURE, ENDINGS, EXERCISE_KINDS, POSTURES,
  isEnding, isExerciseKind, isPosture, skippedFor, stepsForKind,
  asksPosture,
} from './exerciseKind';
import { STEP_IDS } from '../routeHandle';
import { activeSteps, nextStep } from './sessionMachine';

describe('stepsForKind', () => {
  it('walks all four steps for a card exercise', () => {
    expect(stepsForKind('card_based')).toEqual(['intro', 'scan', 'listen', 'reflect']);
  });

  it('leaves scan out of a listening run — three stages, not four with a gap', () => {
    expect(stepsForKind('listening_only')).toEqual(['intro', 'listen', 'reflect']);
    expect(stepsForKind('listening_only')).not.toContain('scan');
  });

  /* The breathing screens are not designed; the row exists so the exercise is
     not MISTYPED as a listening one. If it ever gains its own steps this test
     is the one that should fail first. */
  it('gives digital_interactive the listening run for now', () => {
    expect(stepsForKind('digital_interactive')).toEqual(stepsForKind('listening_only'));
  });

  it('keeps every kind in STEP_IDS order, so the rail never reorders itself', () => {
    for (const kind of EXERCISE_KINDS) {
      const steps = stepsForKind(kind);
      const ordered = STEP_IDS.filter((step) => steps.includes(step));
      expect(steps).toEqual(ordered);
    }
  });

  it('starts every kind at intro', () => {
    for (const kind of EXERCISE_KINDS) {
      expect(stepsForKind(kind)[0]).toBe('intro');
    }
  });
});

describe('skippedFor', () => {
  it('is empty for a card exercise', () => {
    expect(skippedFor('card_based')).toEqual([]);
  });

  it('is exactly [scan] for a listening exercise', () => {
    expect(skippedFor('listening_only')).toEqual(['scan']);
  });

  /* THE TWO LISTS MUST NOT DRIFT. `skippedFor` is derived from
     `stepsForKind`, and this is the assertion that keeps it derived: together
     they are STEP_IDS, with nothing counted twice and nothing dropped. */
  it('is the exact complement of the run, for every kind', () => {
    for (const kind of EXERCISE_KINDS) {
      const steps = stepsForKind(kind);
      const skipped = skippedFor(kind);
      expect([...steps, ...skipped].sort()).toEqual([...STEP_IDS].sort());
      expect(steps.filter((step) => skipped.includes(step))).toEqual([]);
    }
  });

  /* The design system's reachability rule is given `skipped` and treats those
     steps as transparent. This is the D14 shape: if `scan` were in the run of
     a cardless exercise, `listen` would want it completed, nothing would ever
     complete it, and the run could not be finished. */
  it('leaves a listening run finishable — reflect is reachable from intro', () => {
    const skipped = skippedFor('listening_only');
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

/**
 * The posture question is asked per EXERCISE, not per kind — Ben, 2026-10-13.
 *
 * Both listening exercises are `listening_only` and they differ here, which is
 * the whole reason this takes an id. The Klangreise changes nothing by being
 * heard sitting or lying; the Bodyscan addresses a posture out loud.
 */
describe('which exercises ask how you are listening', () => {
  it('does not ask on the Klangreise', () => {
    expect(asksPosture('sound-journey')).toBe(false);
  });

  it('still asks on the Bodyscan, which is the same kind', () => {
    expect(asksPosture('body-scan-soundwalk')).toBe(true);
  });

  /* The default is to ASK, so a listening exercise added tomorrow gets the
     question until somebody decides it should not — the safe direction, since
     a missing question is invisible and a redundant one is merely noise. */
  it('asks by default, including for an exercise nobody has ruled on', () => {
    expect(asksPosture('breathing-score')).toBe(true);
    expect(asksPosture('an-exercise-that-does-not-exist-yet')).toBe(true);
  });
});
