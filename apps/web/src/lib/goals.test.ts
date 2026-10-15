import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOAL_STORAGE_KEY, cacheGoal, defaultGoal, filterByGoal, goalLabel, goalPurpose,
  readCachedGoal, startable,
} from './goals';
import type { Exercise, Goal } from './content';

/* IN `sort` ORDER, because `defaultGoal` reads the first element and
   `getGoals` is what guarantees that order. A fixture shuffled for variety
   would be testing a list this function never receives. */
const GOALS: Goal[] = [
  {
    id: 'get-to-know-musie', sort: 1,
    label: 'Einen Weg Musie kennenzulernen', purpose: 'Musie kennenlernen', why: null,
  },
  { id: 'relax', sort: 2, label: 'Entspannung', purpose: 'Entspannen', why: null },
  { id: 'wake-up', sort: 3, label: 'Energie', purpose: 'Aktivieren', why: null },
  {
    id: 'mindfulness', sort: 4,
    label: 'Achtsamkeit', purpose: 'Achtsamer werden',
    why: 'Achtsamkeit wächst mit jeder Übung.',
  },
];

/** Only the fields these functions read; the rest of an Exercise is irrelevant. */
function exercise(id: string, goalIds: string[], implemented = true): Exercise {
  return { id, goalIds, implemented } as Exercise;
}

const DECK = [
  exercise('mindfulness-cards', ['mindfulness']),
  exercise('free-rein', ['mindfulness', 'get-to-know-musie']),
  exercise('breathing-score', ['get-to-know-musie'], false),
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
  /* The one window `null` still means anything in: the goals are in flight.
     The screen draws nothing during it, so this is about the function staying
     total rather than about a state anybody sees. */
  it('offers every exercise while the goals are still in flight', () => {
    expect(filterByGoal(DECK, null)).toHaveLength(3);
  });

  it('offers only the exercises mapped to the chosen goal', () => {
    expect(filterByGoal(DECK, 'get-to-know-musie').map((e) => e.id))
      .toEqual(['free-rein', 'breathing-score']);
  });

  /* THERE IS NO SHOW-EVERYTHING CHOICE ANY MORE. `NO_GOAL` used to return the
     whole deck including an exercise mapped to nothing; every choice is now a
     real id, so an unmapped exercise is reachable from no goal at all. That is
     why `db.content.db.test.ts` asserts every exercise has at least one. */
  it('cannot reach an exercise that is mapped to no goal', () => {
    const orphan = [exercise('orphan', [])];
    expect(filterByGoal(orphan, 'relax')).toEqual([]);
  });

  it('returns nothing for a goal no exercise serves', () => {
    expect(filterByGoal(DECK, 'wake-up')).toEqual([]);
  });
});

describe('defaultGoal', () => {
  /* The contract is "the first one offered", not "get-to-know-musie". Written
     this way on purpose: the day Ben reorders the sheet, this test should
     follow the fixture rather than need editing. */
  it('is the first goal in the order the sheet shows them', () => {
    expect(defaultGoal(GOALS)).toBe('get-to-know-musie');
    expect(defaultGoal([GOALS[1], GOALS[0]])).toBe('relax');
  });

  it('is null when the catalogue failed to load', () => {
    expect(defaultGoal([])).toBeNull();
  });
});

describe('readCachedGoal', () => {
  it('reads back a goal that still exists', () => {
    withStorage({ [GOAL_STORAGE_KEY]: 'relax' });
    expect(readCachedGoal(GOALS)).toBe('relax');
  });

  it('reports nothing when nothing was ever stored', () => {
    withStorage({});
    expect(readCachedGoal(GOALS)).toBeNull();
  });

  /* THE ONE THIS FUNCTION EXISTS FOR. A goal retired from the content leaves
     a stale id in a returning visitor's browser; trusting it would filter the
     deck by something the sheet cannot even show as checked. */
  it('reports nothing when the stored goal has been retired', () => {
    withStorage({ [GOAL_STORAGE_KEY]: 'feel-feelings' });
    expect(readCachedGoal(GOALS)).toBeNull();
  });

  /* THE UPGRADE PATH, AND IT COSTS NOTHING. Every browser that used this
     screen before 2026-10-15 holds the old sentinel. No row can spell it, so
     it takes the retired-goal branch and the screen opens on the default. */
  it('treats a stored __none__ from before the sentinel went as never-chosen', () => {
    withStorage({ [GOAL_STORAGE_KEY]: '__none__' });
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

  /* Losing the cache costs the next visit its filter. It must not cost the
     choice that was just made. */
  it('survives blocked site data', () => {
    withStorage(null);
    expect(() => cacheGoal('relax')).not.toThrow();
  });
});

describe('startable', () => {
  /* The headline's count and the shuffle's candidate set are this one
     expression — PRD §7 and §9. The pile is deliberately NOT filtered by it,
     which is why the deck still deals two where this returns one. */
  it('drops the exercises that are not built yet', () => {
    expect(startable(filterByGoal(DECK, 'get-to-know-musie')).map((e) => e.id))
      .toEqual(['free-rein']);
  });

  it('keeps every built one', () => {
    expect(startable(DECK)).toHaveLength(2);
  });

  it('is empty rather than throwing for a goal that offers nothing built', () => {
    expect(startable([exercise('breathing-score', ['relax'], false)])).toEqual([]);
  });
});

describe('goalLabel and goalPurpose', () => {
  /* THE TWO ARE NOT INTERCHANGEABLE, which is the whole reason the second
     column exists — the card is headed "Entspannung" and the headline reads
     "zum Entspannen". */
  it('name a goal two different ways', () => {
    expect(goalLabel(GOALS, 'relax')).toBe('Entspannung');
    expect(goalPurpose(GOALS, 'relax')).toBe('Entspannen');
  });

  it('have nothing for a goal the catalogue has not loaded', () => {
    expect(goalLabel([], 'relax')).toBeNull();
    expect(goalPurpose([], 'relax')).toBeNull();
  });
});
