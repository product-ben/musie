/**
 * How a run began, carried by the intro's address, and the goal a printed
 * card starts it under — PRD „Übungskarten mit QR-Code" (V3, D10, D12).
 */
import { describe, expect, it } from 'vitest';
import type { Goal } from './content';
import { goalForPrintedStart, goalsOffered, introPath, readStartedVia } from './startedVia';

const goal = (id: string, sort: number): Goal => ({ id, sort, label: id, purpose: id, why: null });
/* `getGoals()`'s order: by `goals.sort`. */
const GOALS = [goal('relax', 1), goal('wake-up', 2), goal('mindfulness', 3)];

describe('introPath', () => {
  it('adds nothing for a run from the library', () => {
    expect(introPath('abc', 'library')).toBe('/session/abc/intro');
  });

  it('names an exercise card', () => {
    expect(introPath('abc', 'exercise-card')).toBe('/session/abc/intro?via=exercise-card');
  });

  it('carries the deck card, which is written only on „Weiter“', () => {
    expect(introPath('abc', 'deck-card', 'MC-04')).toBe('/session/abc/intro?via=deck-card&card=MC-04');
  });
});

describe('readStartedVia', () => {
  it('reads back what introPath wrote', () => {
    for (const [via, card] of [['exercise-card', undefined], ['deck-card', 'MC-04']] as const) {
      const search = introPath('abc', via, card).split('?')[1] ?? '';
      expect(readStartedVia(new URLSearchParams(search))).toEqual({ via, cardCode: card ?? null });
    }
  });

  it('reads anything else as the library', () => {
    expect(readStartedVia(new URLSearchParams(''))).toEqual({ via: 'library', cardCode: null });
    expect(readStartedVia(new URLSearchParams('via=somewhere'))).toEqual({ via: 'library', cardCode: null });
  });

  it('upper-cases a hand-typed card code and ignores an empty one', () => {
    expect(readStartedVia(new URLSearchParams('via=deck-card&card=mc-04')).cardCode).toBe('MC-04');
    expect(readStartedVia(new URLSearchParams('via=deck-card&card=')).cardCode).toBeNull();
  });
});

describe('goalForPrintedStart', () => {
  const freeRein = { goalIds: ['mindfulness', 'relax', 'wake-up'] };

  it('keeps the goal chosen last in the library when the exercise serves it', () => {
    expect(goalForPrintedStart(freeRein, GOALS, 'wake-up')).toBe('wake-up');
  });

  it('falls back to the first goal in the sheet’s order, not the mapping’s', () => {
    expect(goalForPrintedStart(freeRein, GOALS, null)).toBe('relax');
    expect(goalForPrintedStart({ goalIds: ['mindfulness', 'wake-up'] }, GOALS, 'relax')).toBe('wake-up');
  });

  it('ignores a cached goal that is no longer offered', () => {
    expect(goalForPrintedStart(freeRein, GOALS, 'get-to-know-musie')).toBe('relax');
  });

  it('is null for an exercise that serves no offered goal', () => {
    expect(goalForPrintedStart({ goalIds: [] }, GOALS, 'relax')).toBeNull();
  });
});

describe('goalsOffered', () => {
  it('lists the exercise’s goals in the sheet’s order', () => {
    expect(goalsOffered({ goalIds: ['mindfulness', 'relax'] }, GOALS).map((g) => g.id)).toEqual(['relax', 'mindfulness']);
  });
});
