import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOAL_STORAGE_KEY, NO_GOAL, cacheGoal, filterByGoal, goalIdFor, goalLabel, readCachedGoal,
} from './goals';
import type { Exercise, Goal } from './content';

const GOALS: Goal[] = [
  { id: 'mindfulness', sort: 1, label: 'Achtsamkeit stärken' },
  { id: 'relax', sort: 2, label: 'Entspannen' },
  { id: 'wake-up', sort: 3, label: 'Aufwachen' },
];

/** Only the fields `filterByGoal` reads; the rest of an Exercise is irrelevant. */
function exercise(id: string, goalIds: string[]): Exercise {
  return { id, goalIds } as Exercise;
}

const DECK = [
  exercise('mindfulness-cards', ['mindfulness', 'relax']),
  exercise('free-rein', ['mindfulness']),
  exercise('breathing-score', []),
];

/* localStorage exists in this environment only because vitest's node project
   has no DOM — so it is stubbed per test rather than assumed. */
function withStorage(store: Record<string, string> | null): void {
  vi.stubGlobal('localStorage', store === null
    ? { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }
    : {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('filterByGoal', () => {
  it('offers every exercise when nothing has been chosen', () => {
    expect(filterByGoal(DECK, null)).toHaveLength(3);
  });

  /* "Musie entdecken" is the option that promises everything, and it keeps
     that promise by filtering nothing — including the exercise mapped to no
     goal at all, which no other choice can reach. */
  it('offers every exercise for NO_GOAL, including one mapped to nothing', () => {
    expect(filterByGoal(DECK, NO_GOAL).map((e) => e.id))
      .toEqual(['mindfulness-cards', 'free-rein', 'breathing-score']);
  });

  it('offers only the exercises mapped to the chosen goal', () => {
    expect(filterByGoal(DECK, 'mindfulness').map((e) => e.id))
      .toEqual(['mindfulness-cards', 'free-rein']);
  });

  /* The live case on the day this shipped: every exercise is mapped to
     `mindfulness` alone, so two of the three goals offer nothing. The screen
     has a sentence for it; this proves the filter produces the state rather
     than throwing. */
  it('returns nothing for a goal no exercise serves', () => {
    expect(filterByGoal(DECK, 'wake-up')).toEqual([]);
  });
});

describe('goalIdFor', () => {
  it('writes a chosen goal through', () => {
    expect(goalIdFor('relax')).toBe('relax');
  });

  /* The sentinel must never reach the column — this is the only place it can
     be stopped, so it is the only place worth testing it. */
  it('turns NO_GOAL into null', () => {
    expect(goalIdFor(NO_GOAL)).toBeNull();
  });

  it('turns an unanswered question into null', () => {
    expect(goalIdFor(null)).toBeNull();
  });
});

describe('readCachedGoal', () => {
  it('reads back a goal that still exists', () => {
    withStorage({ [GOAL_STORAGE_KEY]: 'relax' });
    expect(readCachedGoal(GOALS)).toBe('relax');
  });

  it('reads back NO_GOAL without consulting the catalogue', () => {
    withStorage({ [GOAL_STORAGE_KEY]: NO_GOAL });
    expect(readCachedGoal([])).toBe(NO_GOAL);
  });

  it('reports nothing when nothing was ever stored', () => {
    withStorage({});
    expect(readCachedGoal(GOALS)).toBeNull();
  });

  /* THE ONE THIS FUNCTION EXISTS FOR. A goal retired from the content leaves
     a stale id in a returning visitor's browser; trusting it would filter the
     deck by something the picker cannot even show as checked. */
  it('reports nothing when the stored goal has been retired', () => {
    withStorage({ [GOAL_STORAGE_KEY]: 'feel-feelings' });
    expect(readCachedGoal(GOALS)).toBeNull();
  });

  it('reports nothing when site data is blocked rather than throwing', () => {
    withStorage(null);
    expect(readCachedGoal(GOALS)).toBeNull();
  });
});

describe('cacheGoal', () => {
  it('stores the choice under the key the locale sits beside', () => {
    const store: Record<string, string> = {};
    withStorage(store);
    cacheGoal('wake-up');
    expect(store[GOAL_STORAGE_KEY]).toBe('wake-up');
  });

  /* Losing the cache costs one extra question on the next visit. It must not
     cost the choice that was just made. */
  it('survives blocked site data', () => {
    withStorage(null);
    expect(() => cacheGoal('relax')).not.toThrow();
  });
});

describe('goalLabel', () => {
  it('names a chosen goal', () => {
    expect(goalLabel(GOALS, 'relax')).toBe('Entspannen');
  });

  /* NO_GOAL has no row, so it has no label here — the catalogue supplies
     "Musie entdecken" and the picker falls back to it. */
  it('has no label for NO_GOAL', () => {
    expect(goalLabel(GOALS, NO_GOAL)).toBeNull();
  });

  it('has no label for a goal the catalogue has not loaded', () => {
    expect(goalLabel([], 'relax')).toBeNull();
  });
});
