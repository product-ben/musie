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
  DAY_SCALE_DAYS, DIARY_FILTERS, GRAPH_STACK_CAP, GRAPH_WEEK_DAYS, answerParagraphs,
  dayAnchorId, durationMinutes, filterByStatus, groupByPeriod, isDiaryFilter,
  reflectQuestionOf, sessionPath, stackOf, weeksFrom,
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

/**
 * ── THE ANSWER, IN THE PIECES IT WAS GIVEN IN ──────────────────────────────
 * The card used to hand `reflection.body` to one `<p>`, so a spoken answer
 * arrived as four sentences glued with spaces. This is the function that
 * decides what a paragraph is, and both of its sources are worth pinning: the
 * statements are the units the person edited, and a typed body's line breaks
 * are the only thing a typed answer has to say about its own shape.
 */
describe('answerParagraphs', () => {
  it('prefers the statements, exactly as they arrived', () => {
    const reflection = {
      mode: 'voice',
      body: 'Erst eng. Dann weiter.',
      statements: ['Erst eng.', 'Dann weiter.'],
    };

    /* NOT the body re-split on full stops. "Dr. Müller" would become two
       statements, and the pauses somebody actually took are already recorded. */
    expect(answerParagraphs(reflection)).toEqual(['Erst eng.', 'Dann weiter.']);
  });

  it('falls back to the body, split on the line breaks the person pressed', () => {
    const reflection = {
      mode: 'text',
      body: 'Quieter than when I sat down.\n\nAnd then tired.',
      statements: [],
    };

    expect(answerParagraphs(reflection))
      .toEqual(['Quieter than when I sat down.', 'And then tired.']);
  });

  it('keeps a typed answer with no line breaks as one paragraph', () => {
    expect(answerParagraphs({ mode: 'text', body: 'One sentence.', statements: [] }))
      .toEqual(['One sentence.']);
  });

  it('drops blank runs rather than drawing empty paragraphs', () => {
    /* A trailing Enter, a Windows line ending, and a line of spaces — three
       ways to reach a `<p>` with nothing in it. */
    const reflection = { mode: 'text', body: '  First.  \r\n \n\nSecond.\n\n', statements: [] };

    expect(answerParagraphs(reflection)).toEqual(['First.', 'Second.']);
  });

  it('comes back empty for a body that is nothing but whitespace', () => {
    /* Unreachable through the database — `body` is `not null` and the writes
       refuse an empty answer — and the card tests this rather than the
       reflection being null, so the two cases need no branch of their own. */
    expect(answerParagraphs({ mode: 'text', body: '\n  \n', statements: [] })).toEqual([]);
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


/* ══ THE GRAPH ═════════════════════════════════════════════════════════════
   `weeksFrom` builds a CALENDAR and files entries into it, which is the
   opposite of what `groupByPeriod` does — so the cases that matter are the
   empty days, the week boundary and the DST day, none of which a grouping
   function can get wrong because it never invents a day that has no entries.

   Every fixture is built in LOCAL time, for the reason the header gives. */

describe('weeksFrom · the calendar it builds', () => {
  it('is one week of seven days for an empty diary', () => {
    const weeks = weeksFrom([], NOW);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].days).toHaveLength(GRAPH_WEEK_DAYS);
    /* Every day empty, and every day PRESENT — the gaps are the point. */
    expect(weeks[0].days.every((day) => day.entries.length === 0)).toBe(true);
  });

  it('ends on today, whatever weekday that is', () => {
    const weeks = weeksFrom([], NOW);
    const days = weeks[weeks.length - 1].days;

    /* The LAST column is today. Not a Sunday, not a Monday: a week here is
       "the seven days ending today", which is what keeps the plus control at
       the right-hand edge instead of stranded mid-row on a Wednesday. */
    expect(days[days.length - 1].dayOffset).toBe(0);
    expect(days[0].dayOffset).toBe(GRAPH_WEEK_DAYS - 1);
  });

  it('files an entry onto its own local day', () => {
    const weeks = weeksFrom([at(2026, 8, 18, 9, 0)], NOW);
    const days = weeks[weeks.length - 1].days;

    const filled = days.filter((day) => day.entries.length > 0);
    expect(filled).toHaveLength(1);
    /* 18 September, standing on the 20th, is two days back. */
    expect(filled[0].dayOffset).toBe(2);
  });

  it('files a session just after local midnight onto that day, not the one before', () => {
    /* The bug a UTC day key would produce: 00:30 in Berlin is the PREVIOUS
       day in UTC, and a graph that drew it in yesterday's column would be
       wrong about the one thing a diary is for. */
    const weeks = weeksFrom([at(2026, 8, 20, 0, 30)], NOW);
    const days = weeks[weeks.length - 1].days;
    const today = days[days.length - 1];

    expect(today.dayOffset).toBe(0);
    expect(today.entries).toHaveLength(1);
  });

  it('reaches back to the oldest entry and no further', () => {
    /* Eight days back is one day past the current week, so the run is two
       weeks: the boundary case, where an off-by-one shows. */
    const weeks = weeksFrom([at(2026, 8, 12, 9, 0)], NOW);

    expect(weeks).toHaveLength(2);
    /* OLDEST FIRST, so the scroller's natural end is the current week. */
    expect(weeks[0].days[0].dayOffset).toBeGreaterThan(weeks[1].days[0].dayOffset);
    expect(weeks[weeks.length - 1].days[GRAPH_WEEK_DAYS - 1].dayOffset).toBe(0);
  });

  it('keeps exactly one week while the oldest entry is inside it', () => {
    /* Six days back is still this week; seven is the first day of the next
       one back. Both sides of the boundary, because `Math.floor(span / 7) + 1`
       is the line that decides and it is easy to write as `Math.ceil`. */
    expect(weeksFrom([at(2026, 8, 14, 9, 0)], NOW)).toHaveLength(1);
    expect(weeksFrom([at(2026, 8, 13, 9, 0)], NOW)).toHaveLength(2);
  });

  it('builds seven distinct days across a DST change', () => {
    /* Europe/Berlin springs forward on 29 March 2026. Stepping days by
       subtracting 86_400_000ms lands an hour either side of midnight and
       produces the same day twice; `setDate` arithmetic does not. The
       assertion is deliberately about DISTINCTNESS rather than about any one
       date, so it holds in a runner on UTC too — where there is no DST and
       seven distinct days is simply still true. */
    const weeks = weeksFrom([], new Date(2026, 2, 30, 10, 0));
    const keys = weeks[0].days.map((day) => day.key);

    expect(new Set(keys).size).toBe(GRAPH_WEEK_DAYS);
  });

  it('ignores an unparseable timestamp rather than building a NaN week', () => {
    const weeks = weeksFrom([{ startedAt: 'not a date' }], NOW);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].days.every((day) => day.entries.length === 0)).toBe(true);
  });

  it('does not build a negative run for a session dated in the future', () => {
    /* A device clock set wrong. `Math.max(0, …)` is what absorbs it; without
       it the loop count goes negative and the graph renders nothing at all. */
    const weeks = weeksFrom([at(2026, 8, 25, 9, 0)], NOW);

    expect(weeks).toHaveLength(1);
  });
});

describe('stackOf', () => {
  it('shows everything and counts nothing below the cap', () => {
    const { shown, overflow } = stackOf([1, 2, 3]);

    expect(overflow).toBe(0);
    expect(shown).toHaveLength(3);
  });

  it('keeps the most recent and counts the rest', () => {
    /* Newest first in, as the query orders them. Six sessions, cap of four:
       the two OLDEST become the count, because a day is read from its most
       recent session backwards. */
    const newestFirst = ['f', 'e', 'd', 'c', 'b', 'a'];
    const { shown, overflow } = stackOf(newestFirst);

    expect(overflow).toBe(6 - GRAPH_STACK_CAP);
    expect(shown).toHaveLength(GRAPH_STACK_CAP);
    expect(shown).not.toContain('a');
    expect(shown).not.toContain('b');
  });

  it('keeps the query order, because the column is drawn top to bottom', () => {
    /* Newest first in, newest first out — which the caller renders as newest
       at the TOP of the column and the day's earliest at the bottom, resting
       on the axis. A stack that grows upward.

       This asserted the opposite until 2026-09-28, and was green the whole
       time: `stackOf` reversed, and the comment above it claimed the reverse
       was what put the first session at the bottom. Reversing a newest-first
       list gives oldest-first, which renders oldest at the top — so the day
       read upside down and a passing test said it did not. A unit test cannot
       see which way up a column is; this one is now written to the order the
       caller consumes rather than to a picture it cannot check. */
    const newestFirst = ['c', 'b', 'a'];
    const { shown } = stackOf(newestFirst);

    expect(shown).toEqual(['c', 'b', 'a']);
  });

  it('is empty and counts nothing for a day with no sessions', () => {
    expect(stackOf([])).toEqual({ shown: [], overflow: 0 });
  });
});

describe('dayAnchorId', () => {
  it('is built from the same day key the timeline groups by', () => {
    /* The graph's overflow chip links to this id and `groupByPeriod` puts it
       on the group. One function, two call sites — which is why it lives in
       this module and not in either component. */
    const [period] = groupByPeriod([at(2026, 8, 19, 9, 0)], NOW);

    expect(dayAnchorId(period.key)).toBe('diary-day-2026-09-19');
  });
});

describe('reflectQuestionOf', () => {
  it('takes the first heading, without its hashes', () => {
    const md = [
      '## Worüber hast du nachgedacht?',
      '',
      'Wenn du magst, beantworte diese Fragen:',
      '',
      '- Was ist dabei passiert?',
    ].join('\n');

    expect(reflectQuestionOf(md)).toBe('Worüber hast du nachgedacht?');
  });

  it('drops the invitation and the prompts', () => {
    /* The reflect step renders all of it, because somebody about to answer
       needs the whole block. Somebody re-reading needs the question; the
       invitation is an instruction to a person who is no longer there. */
    const md = '## What were you thinking about?\n\nIf you like, answer these questions:';

    expect(reflectQuestionOf(md)).toBe('What were you thinking about?');
  });

  it('flattens emphasis rather than rendering it', () => {
    /* It lands in `ContentBox.text`, which is a string — markup in it would
       be printed rather than rendered. */
    expect(reflectQuestionOf('## What **really** happened?')).toBe('What really happened?');
  });

  it('is null for a block with no heading', () => {
    expect(reflectQuestionOf('Just a paragraph, no heading at all.')).toBeNull();
  });

  it('is null for an exercise whose copy is not written yet', () => {
    /* `reflect_md` is nullable and genuinely null for some exercises. The
       card draws no line at all rather than inventing a question. */
    expect(reflectQuestionOf(null)).toBeNull();
  });

  it('is null for a heading that is only whitespace', () => {
    expect(reflectQuestionOf('##   ')).toBeNull();
  });
});
