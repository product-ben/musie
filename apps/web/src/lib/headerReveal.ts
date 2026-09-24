/**
 * Whether the app header is on screen — as a function, with nothing mounted.
 *
 * The header is sticky, and on a phone it costs 69px of every screen for as
 * long as you are reading one. The pattern that gives that back is the
 * familiar one: it slides out of the way while you read DOWN the page, and
 * comes back the moment you scroll UP, because scrolling up is what someone
 * does when they are looking for the way out of a screen.
 *
 * ── WHY THE DECISION IS HERE AND NOT IN THE HOOK ──────────────────────────
 * The `unit` project runs in `environment: 'node'` with no jsdom
 * (apps/web/vitest.config.ts says why, and the reason is good), so a hook that
 * listens to `window` cannot be tested at all. What can be wrong here is not
 * the listener — it is the JUDGEMENT: does a 3px twitch hide the header, does
 * a rubber-band overscroll on iOS read as a scroll up, does a page with
 * nothing to scroll hide its own chrome. So the judgement is a reducer over
 * (state, reading) and the hook is left holding one `addEventListener`.
 *
 * ── THE WHOLE POINT IS THAT IT IS NOT JUMPY ───────────────────────────────
 * A naive version — `hidden = scrollingDown` — flickers, and on a touch
 * screen it flickers constantly: momentum scrolling reverses by a pixel or
 * two dozens of times as it settles, and each reversal would start a 220ms
 * slide. Four things stop that, and each is a separate rule below:
 *
 *   1. TRAVEL, NOT DIRECTION. Nothing happens on a direction change alone.
 *      The state remembers where the current run of scrolling STARTED (the
 *      anchor, reset at every turn), and only distance from there decides.
 *   2. TWO THRESHOLDS, NOT ONE. Hiding asks for HIDE_AFTER of downward
 *      travel, revealing for a quarter of that. They are not symmetric on
 *      purpose: hiding chrome the reader did not ask to lose should take a
 *      deliberate gesture, and getting it back should feel instant.
 *   3. A TOP BAND. Within one header's height of the top, the header is
 *      always shown — that is where it belongs, and it is also what makes
 *      "scroll back to the top" end with the chrome in place rather than one
 *      threshold short of it.
 *   4. A FLOOR ON THE DOCUMENT. A page that cannot scroll by more than its
 *      own header plus the threshold never hides it. Otherwise the stage
 *      screens — one centred decision, a handful of pixels of overflow —
 *      would throw their header away for nothing, and iOS's overscroll bounce
 *      would do it on a page that does not scroll at all.
 */

/**
 * What the reducer has to remember between two scroll events.
 *
 * `anchor` is the position the current RUN of scrolling started from, not the
 * previous position: that is the whole of rule 1. `last` is the previous
 * position and exists only to tell which way we are now going.
 */
export type RevealState = {
  hidden: boolean;
  last: number;
  anchor: number;
  direction: 'down' | 'up';
};

/** The top of a page, header showing — where every screen starts. */
export const AT_REST: RevealState = { hidden: false, last: 0, anchor: 0, direction: 'up' };

/**
 * One reading of the page, taken in a frame.
 *
 * `maxScrollY` and `headerBlock` are measured rather than assumed — the header
 * is `--target-primary` plus `--sp-3` twice plus a hairline today, and the day
 * that changes this must not be carrying the old number.
 */
export type ScrollReading = {
  scrollY: number;
  maxScrollY: number;
  headerBlock: number;
};

/**
 * How far down the reader must travel before the header goes, and how far back
 * up before it returns.
 *
 * NOT TOKENS, and not a token gap either: these are neither a spacing step nor
 * a distance anything is drawn at. They are how much gesture counts as intent,
 * which is a behaviour constant like a long-press duration. --motion-travel-lg
 * (32px) is the nearest token and it means "how far a thing moves", which is
 * a different measurement that happens to be in the same unit.
 *
 * 56 is roughly a thumb's flick and comfortably past the jitter of a settling
 * momentum scroll; 14 is small enough that the header is already arriving by
 * the time the reader has decided they want it.
 */
export const HIDE_AFTER = 56;
export const REVEAL_AFTER = 14;

/** The state, one reading later. Pure: same inputs, same answer, no `window`. */
export function nextReveal(state: RevealState, reading: ScrollReading): RevealState {
  /* CLAMPED, because iOS reports a scrollY below 0 at the top and above the
     maximum at the bottom while the page is bouncing. Unclamped, the bounce
     back from -80 to 0 is 80px of "scrolling down" and the header would hide
     itself at the top of a page nobody scrolled. */
  const max = Math.max(reading.maxScrollY, 0);
  const y = Math.min(Math.max(reading.scrollY, 0), max);

  /* Rule 4, and it is checked first: on a page that cannot scroll this far,
     none of the rest of this has an opinion worth having. */
  if (max <= reading.headerBlock + HIDE_AFTER) {
    return { hidden: false, last: y, anchor: y, direction: 'up' };
  }

  /* Rule 3. The anchor is re-laid here too, so leaving the band downward
     starts its run from the band's edge rather than from wherever the reader
     last turned around above it. */
  if (y <= reading.headerBlock) {
    return { hidden: false, last: y, anchor: y, direction: 'up' };
  }

  /* A reading identical to the last one — `scrollend`, a resize, a frame that
     coalesced two events — keeps the direction rather than inventing one. */
  const direction = y > state.last ? 'down' : y < state.last ? 'up' : state.direction;

  /* Rule 1: the anchor moves only at a turn, and it moves to the TURNING
     POINT — `state.last`, the far end of the run that just ended, not `y`,
     which is already a step back from it.

     NEVER ABOVE THE BAND, and the tests are what found this. One scroll event
     can cover more ground than one frame of gesture — a flick, a `scrollTo`,
     a restored position — so the first reading below the band can arrive with
     an anchor still sitting at 0. Measured from there, leaving the band AT
     ALL is already HIDE_AFTER of travel, and the header would go at 70px on a
     page the reader has barely entered. Travel downwards is therefore counted
     from the band's edge at the earliest: the band is where the header lives,
     so the run that takes it away starts where the band ends. An upward run
     is unaffected — its anchor is below it and both are past the band
     already, or rule 3 would have answered instead. */
  const turn = direction === state.direction ? state.anchor : state.last;
  const anchor = Math.max(turn, reading.headerBlock);
  const travel = Math.abs(y - anchor);

  /* Rule 2. Written as two half-sentences rather than one `if` each way so
     that the state can only ever be: still hidden, newly hidden, still shown,
     newly shown. */
  const hidden = direction === 'down'
    ? state.hidden || travel >= HIDE_AFTER
    : state.hidden && travel < REVEAL_AFTER;

  return { hidden, last: y, anchor, direction };
}
