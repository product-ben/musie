/**
 * The diary's pure functions — the day grouping, the duration, and the two
 * URLs the screens navigate and fetch by.
 *
 * Tested DIRECTLY, for the reason content.test.ts already gives: going through
 * `readDiary()` would mean maintaining a fake `from().select().in().neq()
 * .order()` chain forever to exercise arithmetic that never touches the
 * network. Both functions are exported for exactly this.
 *
 * ── EVERY TIMESTAMP IS BUILT IN LOCAL TIME ─────────────────────────────────
 * `new Date(2026, 8, 19, 9, 0)` is a LOCAL 09:00 on 19 September, whatever
 * TZ the runner is in, and `.toISOString()` only re-spells that instant. So
 * the assertions below hold in Berlin, in UTC and in CI — where a literal
 * '2026-09-19T09:00:00Z' would group onto a different local day depending on
 * the machine, and the suite would pass at home and fail on the runner.
 * Grouping by the LOCAL day is the behaviour under test, so the fixtures have
 * to be built the same way.
 */
import { describe, expect, it } from 'vitest';

import { durationMinutes, groupByDay, sessionPath, trackUrl } from './diary';

/** An entry, reduced to the one field `groupByDay` reads. */
function at(...local: [number, number, number, number, number]) {
  const [year, month, day, hour, minute] = local;
  return { startedAt: new Date(year, month, day, hour, minute).toISOString() };
}

describe('groupByDay', () => {
  it('puts two entries from the same local day in one group', () => {
    const late = at(2026, 8, 19, 23, 30);
    const early = at(2026, 8, 19, 0, 30);

    const days = groupByDay([late, early]);

    expect(days).toHaveLength(1);
    expect(days[0].entries).toEqual([late, early]);
  });

  it('splits entries from different days, keeping the order they arrived in', () => {
    /* Newest first, as the query returns them. */
    const today = at(2026, 8, 19, 9, 0);
    const yesterdayEvening = at(2026, 8, 18, 21, 0);
    const yesterdayMorning = at(2026, 8, 18, 7, 0);

    const days = groupByDay([today, yesterdayEvening, yesterdayMorning]);

    expect(days.map((day) => day.entries)).toEqual([
      [today],
      [yesterdayEvening, yesterdayMorning],
    ]);
    /* The heading's timestamp is the group's first entry — the newest one. */
    expect(days[1].date).toBe(yesterdayEvening.startedAt);
  });

  it('DOES NOT SORT: rows arrive ordered and grouping must not re-order them', () => {
    const older = at(2026, 8, 18, 9, 0);
    const newer = at(2026, 8, 19, 9, 0);

    /* Oldest first — a wrong order that this function must pass through
       rather than quietly repair, because repairing it here would hide the
       day the query loses its `order by`. */
    const days = groupByDay([older, newer]);

    expect(days.map((day) => day.entries[0])).toEqual([older, newer]);
  });

  it('gives every group a distinct key, and none to no entries', () => {
    const days = groupByDay([at(2026, 8, 19, 9, 0), at(2026, 8, 18, 9, 0)]);

    expect(new Set(days.map((day) => day.key)).size).toBe(2);
    expect(groupByDay([])).toEqual([]);
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

describe('trackUrl', () => {
  it('resolves the seed\'s repo-relative src from the site root', () => {
    /* Document-relative, this would resolve against /diary/ on the entry
       page — and an SPA answers /diary/assets/... with index.html and a 200,
       so the failure would be HTML decoded as audio rather than a 404. */
    expect(trackUrl('assets/audio/mc-01-joy.mp3')).toBe('/assets/audio/mc-01-joy.mp3');
  });

  it('leaves an already-absolute src alone', () => {
    /* The day the audio moves to a bucket, this function does not have to be
       found again. */
    expect(trackUrl('/assets/audio/mc-01-joy.mp3')).toBe('/assets/audio/mc-01-joy.mp3');
    expect(trackUrl('https://cdn.example/mc-01.mp3')).toBe('https://cdn.example/mc-01.mp3');
    expect(trackUrl('//cdn.example/mc-01.mp3')).toBe('//cdn.example/mc-01.mp3');
  });
});
