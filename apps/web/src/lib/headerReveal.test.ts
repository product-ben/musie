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

import { AT_REST, drawnAt, handedOver, nextReveal, shownAt } from './headerReveal';
import type { BarGeometry, RevealState } from './headerReveal';

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

  it('stays where the page put it while it is still in sight', () => {
    expect(run([10, 60])).toEqual({ mode: 'free', form: 'pill', at: 0, last: 60 });
  });

  it('is gone — fixed above the window — once it is out of sight', () => {
    expect(run([50, REACH + 1]).mode).toBe('gone');
    expect(run([50, 500, 2000]).mode).toBe('gone');
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
    expect(back.mode).toBe('held');
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
    expect(held.mode).toBe('held');
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
    expect(run([1500], gone).mode).toBe('held');
  });

  it('is gone after a jump down longer than its reach', () => {
    const held = run([100, 2000, 1500]);
    expect(run([1900], held).mode).toBe('gone');
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
    expect(shownAt(884)).toEqual({ mode: 'held', form: 'pill', at: 0, last: 884 });
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

/* ═══ THE BAR · Ben, 2026-11-18 ══════════════════════════════════════════════
   Everything above runs with no bar — the header over 1440px — and is
   exactly what it was. Below, the phone's numbers: the bar is the pill's
   56px with the band's --sp-4 and the clearance below it; the pill's own
   place is --sp-4 down; the window is 852 tall. */
const BAR: BarGeometry = { reach: 56 + 16 + 8, handover: 16, near: 852 };

function runBar(positions: number[], from: RevealState = AT_REST, bar: BarGeometry = BAR): RevealState {
  return positions.reduce(
    (state, scrollY) => nextReveal(state, { scrollY, maxScrollY: LONG_PAGE, reach: REACH, bar }),
    from,
  );
}

describe('on the way back it is a bar', () => {
  const gone = runBar([100, 2000]);

  it('leaves as the pill, and waits out of sight as the pill', () => {
    expect(runBar([10, 60])).toEqual({ mode: 'free', form: 'pill', at: 0, last: 60 });
    expect(gone).toEqual({ mode: 'gone', form: 'pill', at: 0, last: 2000 });
  });

  it('comes back as the bar, from just above the window, pixel for pixel', () => {
    const turned = runBar([1990], gone);
    expect(turned.form).toBe('bar');
    expect(turned.mode).toBe('free');
    expect(drawnAt(turned, 1990, BAR.reach)).toBe(-BAR.reach + 10);
    expect(drawnAt(runBar([1960], turned), 1960, BAR.reach)).toBe(-BAR.reach + 40);
  });

  it('is held at the top as the bar once it is all the way in', () => {
    const held = runBar([1990, 2000 - BAR.reach], gone);
    expect(held).toEqual({ mode: 'held', form: 'bar', at: 0, last: 2000 - BAR.reach });
    expect(runBar([1500, 900, 300], held)).toEqual({ mode: 'held', form: 'bar', at: 0, last: 300 });
  });

  it('leaves with the page as the bar when the reader turns down', () => {
    const held = runBar([1500], gone);
    const leaving = runBar([1520], held);
    expect(leaving).toEqual({ mode: 'free', form: 'bar', at: 1500, last: 1520 });
    expect(drawnAt(leaving, 1520, BAR.reach)).toBe(-20);
  });

  it('is the pill again as soon as it is out of sight again', () => {
    const held = runBar([1500], gone);
    expect(runBar([1500 + BAR.reach + 1], held)).toEqual({
      mode: 'gone', form: 'pill', at: 0, last: 1500 + BAR.reach + 1,
    });
  });
});

describe('a short scroll brings the pill back, not the bar', () => {
  it('comes back with the page in its own place while it never left the screen', () => {
    expect(runBar([30, 10])).toEqual({ mode: 'free', form: 'pill', at: 0, last: 10 });
    expect(runBar([30, 10, 0])).toEqual(AT_REST);
  });

  it('is still the pill from as far down as it can go without being gone', () => {
    expect(runBar([REACH - 1, 50])).toEqual({ mode: 'free', form: 'pill', at: 0, last: 50 });
  });
});

describe('within a screen of the top, no bar', () => {
  it('stays gone on a turn up within the window’s height of the top', () => {
    const gone = runBar([100, 600]);
    expect(gone.mode).toBe('gone');
    expect(runBar([590], gone)).toEqual({ mode: 'gone', form: 'pill', at: 0, last: 590 });
    expect(runBar([590, 300, REACH + 1], gone).mode).toBe('gone');
  });

  it('lets the page bring the pill in once its own place is within reach', () => {
    const coming = runBar([590, 300, REACH], runBar([100, 600]));
    expect(coming).toEqual({ mode: 'free', form: 'pill', at: 0, last: REACH });
    expect(drawnAt(coming, REACH, REACH)).toBe(-REACH);
    expect(drawnAfterBar([590, 300, REACH, 40], runBar([100, 600]))).toBe(-40);
    expect(runBar([590, 300, REACH, 0], runBar([100, 600]))).toEqual(AT_REST);
  });

  it('never cross-fades, because there is no bar to fade', () => {
    const gone = runBar([100, 600]);
    const states = [590, 300, 90, 40, 0].reduce<RevealState[]>(
      (all, y) => [...all, runBar([y], all[all.length - 1] ?? gone)], [],
    );
    expect(states.some((state) => state.form === 'bar')).toBe(false);
  });

  it('brings the bar on a turn up from further down than that', () => {
    expect(runBar([853], runBar([100, 854]))).toMatchObject({ form: 'bar' });
    expect(runBar([851], runBar([100, 852]))).toMatchObject({ form: 'pill', mode: 'gone' });
  });

  it('is the old behaviour where there is no bar', () => {
    expect(run([590], run([100, 600]))).toMatchObject({ mode: 'free', form: 'pill' });
  });
});

describe('the handover, where the pill’s own place reaches the window', () => {
  const held = runBar([100, 2000, 1500]);

  it('is still the bar one pixel short of it', () => {
    expect(runBar([200, 17], held)).toMatchObject({ mode: 'held', form: 'bar' });
  });

  it('is the pill at rest from there, drawn exactly where the bar was', () => {
    const handed = runBar([200, 17, 16], held);
    expect(handed).toEqual({ mode: 'free', form: 'pill', at: 0, last: 16 });
    /* The band's top is drawn at -16; the pill sits 16 into the band. */
    expect(drawnAt(handed, 16, REACH) + BAR.handover).toBe(0);
  });

  it('is carried by the page the last pixels into its place', () => {
    expect(drawnAfterBar([200, 17, 16, 8], held)).toBe(-8);
    expect(runBar([200, 17, 16, 8, 0], held)).toEqual(AT_REST);
  });

  it('is found in its place after a jump past it', () => {
    expect(runBar([5], held)).toEqual({ mode: 'free', form: 'pill', at: 0, last: 5 });
    expect(runBar([10], runBar([100, 2000]))).toEqual({ mode: 'free', form: 'pill', at: 0, last: 10 });
  });

  it('leaves with the page as the pill if the reader turns down after it', () => {
    expect(runBar([200, 16, 30], held)).toEqual({ mode: 'free', form: 'pill', at: 0, last: 30 });
  });
});

function drawnAfterBar(positions: number[], from: RevealState): number {
  const state = runBar(positions, from);
  return drawnAt(state, positions[positions.length - 1] ?? 0, REACH);
}

describe('the handover is the one change that is cross-faded', () => {
  const held = runBar([100, 2000, 1500, 17]);

  it('is the held bar becoming the pill in its place', () => {
    expect(handedOver(held, runBar([16], held))).toBe(true);
  });

  it('is a jump to the top of the page from the bar, too', () => {
    expect(handedOver(held, runBar([0], held))).toBe(true);
    const comingIn = runBar([1990], runBar([100, 2000]));
    expect(comingIn).toMatchObject({ mode: 'free', form: 'bar' });
    expect(handedOver(comingIn, runBar([5], comingIn))).toBe(true);
  });

  it('is not the bar leaving out of sight, which nobody sees', () => {
    const away = runBar([1500 + BAR.reach + 1], runBar([100, 2000, 1500]));
    expect(away.mode).toBe('gone');
    expect(handedOver(runBar([100, 2000, 1500]), away)).toBe(false);
  });

  it('is not the window growing past 1440 under a held bar', () => {
    const bar = runBar([100, 2000, 1500]);
    const pill = nextReveal(bar, { scrollY: 1500, maxScrollY: LONG_PAGE, reach: REACH, bar: null });
    expect(handedOver(bar, pill)).toBe(false);
  });

  it('is not anything the pill does', () => {
    expect(handedOver(AT_REST, runBar([30]))).toBe(false);
    expect(handedOver(runBar([30]), runBar([30, 10]))).toBe(false);
  });
});

describe('the bar and focus, and the window growing past 1440', () => {
  it('is shown as the bar by focus mid-page, and as the pill near the top', () => {
    expect(shownAt(884, BAR)).toEqual({ mode: 'held', form: 'bar', at: 0, last: 884 });
    expect(shownAt(10, BAR)).toEqual({ mode: 'free', form: 'pill', at: 0, last: 10 });
    expect(shownAt(0, BAR)).toEqual(AT_REST);
  });

  it('is the pill wherever it is once there is no bar any more', () => {
    const held = runBar([100, 2000, 1500]);
    expect(nextReveal(held, { scrollY: 1500, maxScrollY: LONG_PAGE, reach: REACH, bar: null }))
      .toEqual({ mode: 'held', form: 'pill', at: 0, last: 1500 });
  });
});
