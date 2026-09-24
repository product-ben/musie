/**
 * The header's hide-and-return, driven by scroll positions rather than a
 * thumb.
 *
 * Every case here is one a phone reaches and no test in this repository can:
 * the `unit` project is `environment: 'node'`, so there is no window to
 * scroll and no listener to fire. What is asserted instead is the JUDGEMENT —
 * given where the reader was and where they are now, is the header on screen.
 *
 * `scroll` is a sequence, not an event, so most of these tests are a sequence
 * too: `run` feeds positions through the reducer the way a browser would feed
 * frames through it.
 */
import { describe, expect, it } from 'vitest';

import { AT_REST, HIDE_AFTER, REVEAL_AFTER, nextReveal } from './headerReveal';
import type { RevealState } from './headerReveal';

/** The real shell: 44 + 12 + 12 + 1, and a page several windows long. */
const HEADER = 69;
const LONG_PAGE = 4000;

function run(positions: number[], page = LONG_PAGE, from: RevealState = AT_REST): RevealState {
  return positions.reduce(
    (state, scrollY) => nextReveal(state, { scrollY, maxScrollY: page, headerBlock: HEADER }),
    from,
  );
}

/** Just past the top band, so the band rule is not what is under test. */
const BELOW_BAND = HEADER + 1;

describe('reading down the page', () => {
  it('keeps the header while the reader is still near the top', () => {
    expect(run([10, 30, 60]).hidden).toBe(false);
  });

  /* Both of these count from HEADER rather than from BELOW_BAND: downward
     travel is measured from the edge of the band, which is where the run that
     takes the header away begins. See the anchor in headerReveal.ts. */
  it('holds it for a nudge past the band that is short of the threshold', () => {
    expect(run([BELOW_BAND, HEADER + HIDE_AFTER - 1]).hidden).toBe(false);
  });

  it('takes it away once the run down is deliberate', () => {
    expect(run([BELOW_BAND, HEADER + HIDE_AFTER]).hidden).toBe(true);
  });

  it('keeps it away for the rest of the way down', () => {
    expect(run([100, 400, 900, 1600, 2500]).hidden).toBe(true);
  });
});

describe('coming back up', () => {
  const gone = run([100, 900]);

  it('is still hidden after a twitch upwards', () => {
    expect(gone.hidden).toBe(true);
    expect(run([900 - REVEAL_AFTER + 1], LONG_PAGE, gone).hidden).toBe(true);
  });

  it('returns as soon as the reader means it', () => {
    expect(run([900 - REVEAL_AFTER], LONG_PAGE, gone).hidden).toBe(false);
  });

  it('measures the way back from the turning point, not from where it hid', () => {
    /* Down to 900, on to 2000, then back up a hand's width. The reader has
       travelled far below the point the header went; what decides is the
       turn, and the turn was at 2000. */
    expect(run([100, 900, 2000, 2000 - REVEAL_AFTER]).hidden).toBe(false);
  });
});

describe('the jitter a real scroll is made of', () => {
  it('survives a momentum scroll settling in both directions', () => {
    /* A flick down that overshoots and rocks back and forth by a few pixels,
       the way an iOS deceleration does. None of those reversals is a gesture
       and none of them may bring the header back. */
    const settling = [600, 604, 602, 605, 603, 606, 604, 605];
    expect(run([100, 600, ...settling]).hidden).toBe(true);
  });

  it('does not hide on the same jitter while the header is showing', () => {
    expect(run([BELOW_BAND, BELOW_BAND + 4, BELOW_BAND + 2, BELOW_BAND + 6]).hidden).toBe(false);
  });

  it('keeps its direction when a frame reports no movement at all', () => {
    const moving = run([100, 300]);
    expect(nextReveal(moving, { scrollY: 300, maxScrollY: LONG_PAGE, headerBlock: HEADER }))
      .toMatchObject({ direction: moving.direction, hidden: moving.hidden });
  });
});

describe('the top band', () => {
  it('shows the header again by the time the reader is back at the top', () => {
    expect(run([100, 2000, 1000, 0]).hidden).toBe(false);
  });

  it('shows it anywhere inside one header of the top', () => {
    expect(run([100, 2000, HEADER]).hidden).toBe(false);
  });

  it('starts the next run down from the edge of the band, not from further up', () => {
    /* Left the band at 69 and went down HIDE_AFTER. That is a run of exactly
       the threshold and it counts — the band must not be a place where
       downward travel is quietly forgiven. */
    expect(run([0, HEADER, HEADER + HIDE_AFTER]).hidden).toBe(true);
  });
});

describe('pages with nothing to give back', () => {
  it('never hides the header on a page that barely scrolls', () => {
    /* The stage screens: one centred decision, a few pixels of overflow.
       Losing the way out of the screen to reclaim less than a header's height
       is a bad trade at any threshold. */
    expect(run([0, 40, 90, 120], HEADER + HIDE_AFTER).hidden).toBe(false);
  });

  it('hides on a page one pixel past the floor', () => {
    const page = HEADER + HIDE_AFTER + 1;
    expect(run([BELOW_BAND, page], page).hidden).toBe(true);
  });
});

describe('the bounce at either end', () => {
  it('reads iOS overscroll above the top as the top', () => {
    /* Pull the page down past its start and let go: scrollY goes negative and
       comes back. Unclamped, the return trip is a long scroll DOWN. */
    expect(run([-80, -40, -10, 0]).hidden).toBe(false);
  });

  it('reads overscroll past the end as the end', () => {
    /* At the bottom, hidden, the reader pulls further and the page springs
       back. The spring is upward travel the reader did not make, and it must
       not hand the header back. */
    const bottom = run([100, LONG_PAGE]);
    expect(bottom.hidden).toBe(true);
    expect(run([LONG_PAGE + 90, LONG_PAGE + 40, LONG_PAGE], LONG_PAGE, bottom).hidden).toBe(true);
  });
});
