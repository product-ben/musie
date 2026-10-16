/**
 * Which greeting the headline opens with — morning, day or evening.
 *
 * Ben, 2026-10-15: *nach deutscher Zeit von 04 bis 11:30 "Guten Morgen", von
 * 11:31 bis 16:30 "Guten Tag", dann ab 16:31 "Guten Abend".*
 *
 * ── GERMAN TIME, NOT THE DEVICE'S, AND THAT IS THE WHOLE REASON THIS EXISTS ─
 * `new Date().getHours()` would have been one line and wrong. It reads the
 * clock of whatever machine the browser is on, so a tester in Lisbon at 08:30
 * would be wished good morning an hour before Germany was having one, and the
 * same session replayed from a laptop set to UTC would greet differently from
 * the phone beside it.
 *
 * Musie is one practice in one country. The greeting is a statement about the
 * time where the product lives, not about where the reader happens to be
 * standing — which is Ben's instruction read literally, and also the only
 * version of it that two people in two places can agree about.
 *
 * `Intl.DateTimeFormat` with a `timeZone` is what makes that free: it carries
 * the full tz database, so CET and CEST are handled without this file knowing
 * that Germany moves its clocks. The tests pin both sides of that.
 *
 * `hourCycle: 'h23'` RATHER THAN `hour12: false`, which is not a style
 * preference: with `hour12: false` several engines render midnight as **24**
 * rather than 00, and 24 × 60 lands outside every band below and falls to the
 * evening by accident rather than by rule. `h23` is the one that promises
 * 00–23.
 *
 * ── THE BANDS COVER THE WHOLE DAY, INCLUDING THE SMALL HOURS ──────────────
 * The brief names three starts and no end for the last one, so the evening
 * runs until the morning does: 16:31 through 03:59, the night included.
 * Somebody opening Musie at 02:00 is having an evening by this product's
 * reckoning, which is a kinder reading than a fourth band naming the hour
 * back at them.
 *
 *   04:00 – 11:30   morning
 *   11:31 – 16:30   day
 *   16:31 – 03:59   evening
 *
 * ── IT TAKES A DATE SO IT CAN BE TESTED WITHOUT A CLOCK ───────────────────
 * The parameter defaults to now; every test passes an instant. The same
 * bargain `sessionMachine.ts` and `exerciseKind.ts` make — no mocked globals,
 * no fake timers, and a boundary can be asserted exactly rather than
 * approached.
 */

/** The three bands. Also the suffix of the message key each one draws. */
export type TimeOfDay = 'morning' | 'day' | 'evening';

/** The clock the product keeps, whatever clock the reader is on. */
const ZONE = 'Europe/Berlin';

const MORNING_FROM = 4 * 60;        /* 04:00 */
const DAY_FROM = 11 * 60 + 31;      /* 11:31 */
const EVENING_FROM = 16 * 60 + 31;  /* 16:31 */

/**
 * Minutes since midnight in Berlin.
 *
 * `formatToParts` rather than parsing a formatted string: the parts are
 * labelled, so this cannot be broken by a locale that writes the hour second
 * or inserts a character between the two numbers.
 */
function berlinMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);

  const read = (type: 'hour' | 'minute') =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return read('hour') * 60 + read('minute');
}

/**
 * The band `at` falls in. Defaults to now.
 *
 * Total: every minute of the day is in exactly one band, so there is no
 * fallback branch and no way to get `undefined` out of this.
 */
export function timeOfDay(at: Date = new Date()): TimeOfDay {
  const minutes = berlinMinutes(at);
  if (minutes >= EVENING_FROM) return 'evening';
  if (minutes >= DAY_FROM) return 'day';
  if (minutes >= MORNING_FROM) return 'morning';
  /* Before 04:00, which is the tail of the previous evening rather than a
     band of its own — see the header. */
  return 'evening';
}
