/**
 * The header moving with the page, driven by scroll positions rather than a
 * thumb.
 *
 * Every case here is one a phone reaches and no test in this repository can:
 * the `unit` project is `environment: 'node'`, so there is no window to
 * scroll and no sticky box to watch. What is asserted instead is where the
 * header is DRAWN for each state — `drawnAt`, which is what the browser does
 * with the two values the reducer places — so "one pixel for one pixel" can be
 * said in numbers.
 *
 * `scroll` is a sequence, not an event, so most of these are a sequence too:
 * `run` feeds positions through the reducer the way a browser feeds scroll
 * events through the hook.
 */
import { describe, expect, it } from 'vitest';

import { AT_REST, drawnAt, nextReveal, shownAt } from './headerReveal';
import type { RevealState } from './headerReveal';

/** The real shell on a phone: the band (16 + 56 + 16, `--sticky-block`) plus
 *  the shadow clearance (--sp-2) — how far above the window "gone" is. */
const REACH = 88 + 8;
const LONG_PAGE = 4000;

function run(positions: number[], from: RevealState = AT_REST, page = LONG_PAGE): RevealState {
  return positions.reduce(
    (state, scrollY) => nextReveal(state, { scrollY, maxScrollY: page, reach: REACH }),
    from,
  );
}

/** Where the header is drawn after scrolling through `positions`. */
function drawnAfter(positions: number[], from: RevealState = AT_REST): number {
  const state = run(positions, from);
  const y = Math.max(0, Math.min(positions[positions.length - 1] ?? 0, LONG_PAGE));
  return drawnAt(state, y, REACH);
}

describe('going down, it leaves with the page', () => {
  it('moves exactly as far as the page has, from the very first pixel', () => {
    expect(drawnAfter([1])).toBe(-1);
    expect(drawnAfter([10, 30])).toBe(-30);
    expect(drawnAfter([10, 30, 60])).toBe(-60);
  });

  it('stops just above the window once it is gone, and waits there', () => {
    expect(drawnAfter([50, 500])).toBe(-REACH);
    expect(drawnAfter([50, 500, 2000])).toBe(-REACH);
  });

  it('places nothing on the way down: no turn, no write', () => {
    const state = run([50, 500, 2000]);
    expect(state.at).toBe(0);
    expect(state.held).toBe(false);
  });
});

describe('going up, it comes back with the page', () => {
  const gone = run([100, 2000]);

  it('starts back from the turning point, one pixel for one pixel', () => {
    /* Turned at 2000. 1990 is ten pixels of the way back. */
    expect(drawnAfter([1990], gone)).toBe(-REACH + 10);
    expect(drawnAfter([1990, 1960], gone)).toBe(-REACH + 40);
  });

  it('is placed once, at the turn, and then left to the page', () => {
    const turned = run([1990], gone);
    expect(run([1980, 1970, 1960], turned).at).toBe(turned.at);
  });

  it('is held at the top once it is all the way in', () => {
    const back = run([1990, 1960, 2000 - REACH], gone);
    expect(back.held).toBe(true);
    expect(drawnAt(back, 2000 - REACH, REACH)).toBe(0);
  });

  it('stays at the top while the reader goes on up', () => {
    const back = run([1990, 2000 - REACH], gone);
    expect(drawnAfter([1500, 900, 300], back)).toBe(0);
  });

  it('is in its own place again at the top of the page', () => {
    expect(run([1990, 1000, 0], gone)).toEqual(AT_REST);
  });
});

describe('turning down again', () => {
  it('lets go from the top of the window, where it was drawn', () => {
    const held = run([100, 2000, 1500]);
    expect(held.held).toBe(true);
    /* Turned at 1500; 1520 is twenty pixels of the page taking it away. */
    expect(drawnAfter([1520], held)).toBe(-20);
    expect(drawnAfter([1520, 1550], held)).toBe(-50);
  });

  it('leaves from wherever it was, half way back in', () => {
    const halfway = run([100, 2000, 1960]);
    expect(drawnAt(halfway, 1960, REACH)).toBe(-REACH + 40);
    expect(drawnAfter([1970], halfway)).toBe(-REACH + 30);
  });
});

describe('the jitter a real scroll is made of', () => {
  it('moves two pixels for two pixels, and nothing more', () => {
    const held = run([100, 2000, 1500]);
    expect(drawnAfter([1502], held)).toBe(-2);
    expect(drawnAfter([1502, 1500], held)).toBe(0);
    expect(drawnAfter([1502, 1500, 1501, 1500], held)).toBe(0);
  });

  it('decides nothing on a reading that did not move', () => {
    const state = run([100, 2000]);
    expect(run([2000, 2000], state)).toBe(state);
  });
});

describe('jumps — a flick, a scrollTo, the browser bringing focus into view', () => {
  it('comes all the way in on a jump up longer than its reach', () => {
    const gone = run([100, 2000]);
    expect(run([1500], gone).held).toBe(true);
  });

  it('is gone after a jump down longer than its reach', () => {
    const held = run([100, 2000, 1500]);
    expect(drawnAfter([1900], held)).toBe(-REACH);
  });
});

describe('the bounce at either end', () => {
  it('reads iOS overscroll above the top as the top', () => {
    expect(run([-80, -40, -10, 0])).toEqual(AT_REST);
  });

  it('reads overscroll past the end as the end, which is no movement', () => {
    const bottom = run([100, LONG_PAGE]);
    expect(drawnAt(bottom, LONG_PAGE, REACH)).toBe(-REACH);
    const bounced = run([LONG_PAGE + 90, LONG_PAGE + 40, LONG_PAGE], bottom);
    expect(drawnAt(bounced, LONG_PAGE, REACH)).toBe(-REACH);
  });
});

describe('shown by focus, then scrolled by the browser', () => {
  it('is held at the top from wherever the page is', () => {
    expect(shownAt(884)).toEqual({ at: 0, held: true, last: 884 });
  });

  it('stays shown through the scroll the focus causes', () => {
    /* Focus brings it back at 884; the browser then scrolls up to 382. */
    expect(drawnAfter([382], shownAt(884))).toBe(0);
  });

  it('is simply at rest when the page is at the top, or bouncing above it', () => {
    expect(shownAt(0)).toEqual(AT_REST);
    expect(shownAt(-40)).toEqual(AT_REST);
  });
});
