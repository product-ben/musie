/**
 * The diary's pure functions — the period grouping, the status filter, the
 * duration, and the two URLs the screens navigate and fetch by.
 *
 * Tested DIRECTLY, for the reason content.test.ts already gives: going through
 * `readDiary()` would mean maintaining a fake `from().select().in().neq()
 * .order()` chain forever to exercise arithmetic that never touches the
 * network. Every function below is exported for exactly this.
 *
 * ── EVERY TIMESTAMP IS BUILT IN LOCAL TIME ─────────────────────────────────
 * `new Date(2026, 8, 19, 9, 0)` is a LOCAL 09:00 on 19 September, whatever
 * TZ the runner is in, and `.toISOString()` only re-spells that instant. So
 * the assertions below hold in Berlin, in UTC and in CI — where a literal
 * '2026-09-19T09:00:00Z' would group onto a different local day depending on
 * the machine, and the suite would pass at home and fail on the runner.
 * Grouping by the LOCAL day is the behaviour under test, so the fixtures have
 * to be built the same way.
 *
 * ── AND 'TODAY' IS A FIXTURE, NOT THE CLOCK ────────────────────────────────
 * `groupByPeriod` takes `now`, so every test below states which day it is
 * standing on. A suite that read the real clock would have a different set of
 * day and month groups depending on when it ran, and would go red for the
 * first week of every month.
 */
import { describe, expect, it } from 'vitest';

import {
  DAY_SCALE_DAYS, DIARY_FILTERS, durationMinutes, filterByStatus, groupByPeriod,
  isDiaryFilter, sessionPath,
} from './diary';

/** An entry, reduced to the one field `groupByPeriod` reads. */
function at(...local: [number, number, number, number, number]) {
  const [year, month, day, hour, minute] = local;
  return { startedAt: new Date(year, month, day, hour, minute).toISOString() };
}

/** The day every test below is standing on: 20 September 2026, mid-morning. */
const NOW = new Date(2026, 8, 20, 10, 0);

describe('groupByPeriod · the last week, by day', () => {
  it('puts two entries from the same local day in one group', () => {
    const late = at(2026, 8, 19, 23, 30);
    const early = at(2026, 8, 19, 0, 30);

    const periods = groupByPeriod([late, early], NOW);

    expect(periods).toHaveLength(1);
    expect(periods[0].kind).toBe('day');
    expect(periods[0].entries).toEqual([late, early]);
  });

  it('names today and yesterday, and nothing else', () => {
    const periods = groupByPeriod(
      [at(2026, 8, 20, 9, 0), at(2026, 8, 19, 9, 0), at(2026, 8, 18, 9, 0)],
      NOW,
    );

    /* The screen turns 0 and 1 into catalogue words and everything else into
       a formatted weekday, so `null` is the instruction "format this one". */
    expect(periods.map((period) => period.dayOffset)).toEqual([0, 1, null]);
  });

  it('counts CALENDAR days, not 24-hour blocks', () => {
    /* Two hours apart on the clock, one day apart on the wall — 23:00 last
       night and 01:00 this morning. A millisecond subtraction would call the
       first one "today". */
    const periods = groupByPeriod(
      [at(2026, 8, 20, 1, 0), at(2026, 8, 19, 23, 0)],
      NOW,
    );

    expect(periods.map((period) => period.dayOffset)).toEqual([0, 1]);
  });

  it('splits entries from different days, keeping the order they arrived in', () => {
    /* Newest first, as the query returns them. */
    const today = at(2026, 8, 20, 9, 0);
    const yesterdayEvening = at(2026, 8, 19, 21, 0);
    const yesterdayMorning = at(2026, 8, 19, 7, 0);

    const periods = groupByPeriod([today, yesterdayEvening, yesterdayMorning], NOW);

    expect(periods.map((period) => period.entries)).toEqual([
      [today],
      [yesterdayEvening, yesterdayMorning],
    ]);
    /* The heading's timestamp is the group's first entry — the newest one. */
    expect(periods[1].date).toBe(yesterdayEvening.startedAt);
  });

  it('DOES NOT SORT: rows arrive ordered and grouping must not re-order them', () => {
    const older = at(2026, 8, 19, 9, 0);
    const newer = at(2026, 8, 20, 9, 0);

    /* Oldest first — a wrong order that this function must pass through
       rather than quietly repair, because repairing it here would hide the
       day the query loses its `order by`. */
    const periods = groupByPeriod([older, newer], NOW);

    expect(periods.map((period) => period.entries[0])).toEqual([older, newer]);
  });

  it('gives a future timestamp day resolution rather than a month heading', () => {
    /* A device an hour ahead. It is still the newest thing in the diary, and
       filing it under a month it has not reached would be the one grouping
       nobody could explain. */
    const periods = groupByPeriod([at(2026, 8, 21, 9, 0)], NOW);

    expect(periods[0].kind).toBe('day');
    expect(periods[0].dayOffset).toBeNull();
  });

  it('gives every group a distinct key, and none to no entries', () => {
    const periods = groupByPeriod([at(2026, 8, 20, 9, 0), at(2026, 8, 19, 9, 0)], NOW);

    expect(new Set(periods.map((period) => period.key)).size).toBe(2);
    expect(groupByPeriod([], NOW)).toEqual([]);
  });
});

describe('groupByPeriod · everything older, by month', () => {
  it('collapses a month of entries into one heading', () => {
    /* The whole point of G.1: thirty sessions in August is one group, where
       the old day grouping made it up to thirty. */
    const august = [3, 7, 11, 19, 28].map((day) => at(2026, 7, day, 9, 0));

    const periods = groupByPeriod(august, NOW);

    expect(periods).toHaveLength(1);
    expect(periods[0].kind).toBe('month');
    expect(periods[0].key).toBe('2026-08');
    expect(periods[0].entries).toHaveLength(5);
    /* No named day on a month period, ever. */
    expect(periods[0].dayOffset).toBeNull();
  });

  it('switches resolution exactly at DAY_SCALE_DAYS', () => {
    const lastDay = at(2026, 8, 20 - (DAY_SCALE_DAYS - 1), 9, 0);
    const firstMonth = at(2026, 8, 20 - DAY_SCALE_DAYS, 9, 0);

    const periods = groupByPeriod([lastDay, firstMonth], NOW);

    expect(periods.map((period) => period.kind)).toEqual(['day', 'month']);
  });

  it('SPLITS THE CURRENT MONTH, which is the design and not a bug', () => {
    /* On the 20th, the 19th is a day of its own and the 3rd is under
       'September 2026' — the same month, two headings. The alternative is up
       to thirty-one day headings on the 31st, which is what G.1 exists to
       stop. */
    const periods = groupByPeriod([at(2026, 8, 19, 9, 0), at(2026, 8, 3, 9, 0)], NOW);

    expect(periods.map((period) => period.kind)).toEqual(['day', 'month']);
    expect(periods[1].key).toBe('2026-09');
  });

  it('keeps two different months apart', () => {
    const periods = groupByPeriod(
      [at(2026, 7, 28, 9, 0), at(2026, 6, 2, 9, 0)],
      NOW,
    );

    expect(periods.map((period) => period.key)).toEqual(['2026-08', '2026-07']);
  });

  it('keeps the same month in two different years apart', () => {
    /* The month key carries the year, so September 2025 and September 2026
       are never one group — the failure a bare month name would produce, and
       the reason `formatMonth` renders the year. */
    const periods = groupByPeriod(
      [at(2026, 5, 2, 9, 0), at(2025, 5, 2, 9, 0)],
      NOW,
    );

    expect(periods.map((period) => period.key)).toEqual(['2026-06', '2025-06']);
  });
});

/**
 * ── THE FILTER ─────────────────────────────────────────────────────────────
 * One line of `Array.filter` and a union, which is exactly the shape of thing
 * that is wrong for a week before anybody notices: a filter that quietly
 * returns everything looks like a filter nobody has pressed.
 */
describe('filterByStatus', () => {
  const finished = { status: 'finished' as const };
  const abandoned = { status: 'abandoned' as const };
  const entries = [finished, abandoned, finished];

  it('keeps everything under "all"', () => {
    expect(filterByStatus(entries, 'all')).toEqual(entries);
  });

  it('keeps only the status asked for', () => {
    expect(filterByStatus(entries, 'finished')).toEqual([finished, finished]);
    expect(filterByStatus(entries, 'abandoned')).toEqual([abandoned]);
  });

  it('returns a new array on every branch, "all" included', () => {
    /* Equal, never identical. A consumer that got the same array back on one
       branch and a copy on the other would have an identity check that is
       accidentally load bearing. */
    const all = filterByStatus(entries, 'all');
    expect(all).toEqual(entries);
    expect(all).not.toBe(entries);
  });

  it('can come back empty, which is a state the screen has copy for', () => {
    expect(filterByStatus([finished, finished], 'abandoned')).toEqual([]);
  });
});

describe('isDiaryFilter', () => {
  it('accepts the three the control offers and nothing else', () => {
    for (const filter of DIARY_FILTERS) expect(isDiaryFilter(filter)).toBe(true);
    /* 'started' is a real `sessions.status` value and is NOT a filter: the
       diary never lists a running session, so a segment for it would select
       nothing, always. */
    expect(isDiaryFilter('started')).toBe(false);
    expect(isDiaryFilter('')).toBe(false);
  });
});

describe('durationMinutes', () => {
  it('rounds to the nearest whole minute', () => {
    const start = '2026-09-19T09:00:00.000Z';

    expect(durationMinutes(start, '2026-09-19T09:12:00.000Z')).toBe(12);
    /* 12:20 rounds down, 12:40 rounds up — one function, one rule. */
    expect(durationMinutes(start, '2026-09-19T09:12:20.000Z')).toBe(12);
    expect(durationMinutes(start, '2026-09-19T09:12:40.000Z')).toBe(13);
  });

  it('never returns 0: a session that happened did not take no time', () => {
    const start = '2026-09-19T09:00:00.000Z';

    expect(durationMinutes(start, '2026-09-19T09:00:20.000Z')).toBe(1);
    expect(durationMinutes(start, start)).toBe(1);
  });

  it('returns null rather than a number it cannot stand behind', () => {
    const start = '2026-09-19T09:00:00.000Z';

    /* A running session — which the diary never shows — and two kinds of
       broken data. Null renders as nothing, which is the honest rendering of
       "we cannot say"; a negative or NaN minute count would be rendered. */
    expect(durationMinutes(start, null)).toBeNull();
    expect(durationMinutes(start, '2026-09-19T08:59:00.000Z')).toBeNull();
    expect(durationMinutes(start, 'not a timestamp')).toBeNull();
    expect(durationMinutes('not a timestamp', start)).toBeNull();
  });
});

/**
 * ── THE TWO URLs ───────────────────────────────────────────────────────────
 * Both are one line of string building, which is exactly why they are tested:
 * a concatenated path works until the day it is handed something with a slash
 * or a scheme in it, and neither failure shows up as anything but a broken
 * screen.
 */
describe('sessionPath', () => {
  it('points at the step the session is actually on', () => {
    expect(sessionPath({ id: 'a1b2', step: 'listen' })).toBe('/session/a1b2/listen');
    expect(sessionPath({ id: 'a1b2', step: 'intro' })).toBe('/session/a1b2/intro');
  });

  it('encodes the id, so a path can never be built by an id', () => {
    /* Not reachable from a uuid column. It is reachable from a URL somebody
       typed, and `/session/../../etc/intro` is a route this must not build. */
    expect(sessionPath({ id: '../../etc', step: 'scan' }))
      .toBe('/session/..%2F..%2Fetc/scan');
  });
});

