import { describe, expect, it } from 'vitest';
import { timeOfDay } from './greeting';

/**
 * Every instant below is written in UTC and asserted against the BERLIN band
 * it falls in, which is the only way these tests say anything: an assertion
 * written in local time would pass on a German laptop and fail in CI.
 *
 * Winter is CET (UTC+1), summer is CEST (UTC+2), and both appear throughout
 * so the offset is never the thing being assumed.
 */
const utc = (iso: string) => new Date(iso);

describe('timeOfDay · the three bands', () => {
  it('greets the morning from 04:00', () => {
    expect(timeOfDay(utc('2026-01-15T03:00:00Z'))).toBe('morning'); // 04:00 CET
    expect(timeOfDay(utc('2026-01-15T07:00:00Z'))).toBe('morning'); // 08:00 CET
  });

  it('greets the day from 11:31', () => {
    expect(timeOfDay(utc('2026-01-15T10:31:00Z'))).toBe('day');     // 11:31 CET
    expect(timeOfDay(utc('2026-01-15T14:00:00Z'))).toBe('day');     // 15:00 CET
  });

  it('greets the evening from 16:31', () => {
    expect(timeOfDay(utc('2026-01-15T15:31:00Z'))).toBe('evening'); // 16:31 CET
    expect(timeOfDay(utc('2026-01-15T21:00:00Z'))).toBe('evening'); // 22:00 CET
  });

  /* THE SMALL HOURS BELONG TO THE EVENING. The brief gives the last band no
     end, so it runs until the morning does — 02:00 is an evening by this
     product's reckoning rather than a fourth band naming the hour back. */
  it('keeps the night in the evening, right up to 03:59', () => {
    expect(timeOfDay(utc('2026-01-15T01:00:00Z'))).toBe('evening'); // 02:00 CET
    expect(timeOfDay(utc('2026-01-14T23:00:00Z'))).toBe('evening'); // 00:00 CET
    expect(timeOfDay(utc('2026-01-15T02:59:00Z'))).toBe('evening'); // 03:59 CET
  });
});

describe('timeOfDay · the boundaries, to the minute', () => {
  /* Ben named the minutes, so they are asserted as minutes. An off-by-one
     here is the kind of thing nobody notices for a year and then notices at
     11:30 exactly. */
  it.each([
    ['03:59 CET', '2026-01-15T02:59:00Z', 'evening'],
    ['04:00 CET', '2026-01-15T03:00:00Z', 'morning'],
    ['11:30 CET', '2026-01-15T10:30:00Z', 'morning'],
    ['11:31 CET', '2026-01-15T10:31:00Z', 'day'],
    ['16:30 CET', '2026-01-15T15:30:00Z', 'day'],
    ['16:31 CET', '2026-01-15T15:31:00Z', 'evening'],
  ])('%s is %s', (_label, iso, band) => {
    expect(timeOfDay(utc(iso))).toBe(band);
  });
});

describe('timeOfDay · it is German time and not the machine\'s', () => {
  /**
   * THE TEST THIS FILE EXISTS FOR. Each instant below is in a DIFFERENT band
   * in UTC than it is in Berlin, so a `getHours()` implementation — or one
   * that forgot the `timeZone` — fails here and passes everything above.
   */
  it('reads Berlin, not UTC', () => {
    /* 03:45Z is the small hours in UTC and 04:45 in Berlin: morning. */
    expect(timeOfDay(utc('2026-01-15T03:45:00Z'))).toBe('morning');
    /* 15:45Z is the afternoon in UTC and 16:45 in Berlin: evening. */
    expect(timeOfDay(utc('2026-01-15T15:45:00Z'))).toBe('evening');
  });

  /**
   * AND IT FOLLOWS THE CLOCKS. The same wall time in Berlin sits an hour
   * apart in UTC either side of the change, so a hardcoded +1 passes the
   * winter row and fails the summer one.
   */
  it('handles CET and CEST without being told which', () => {
    expect(timeOfDay(utc('2026-01-15T03:00:00Z'))).toBe('morning'); // 04:00 CET  (+1)
    expect(timeOfDay(utc('2026-07-15T02:00:00Z'))).toBe('morning'); // 04:00 CEST (+2)

    /* The hour that proves it: 02:30Z is 03:30 in winter (evening, before
       the 04:00 start) and 04:30 in summer (morning). */
    expect(timeOfDay(utc('2026-01-15T02:30:00Z'))).toBe('evening');
    expect(timeOfDay(utc('2026-07-15T02:30:00Z'))).toBe('morning');
  });
});
