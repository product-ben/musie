/**
 * Where the app header is — as a function, with nothing mounted.
 *
 * ── IT MOVES WITH THE PAGE · Ben, 2026-11-17 ──────────────────────────────
 * „Wenn ich scrolle, sollte das Nav element direkt und ohne lag mit
 * scrollen." Until that day the header waited for 56px of travel and then
 * SLID away on a timer, and came back the same way — so on the way down it
 * stood still while the page moved, and then moved while the page stood still.
 * That is the lag. Now it is carried by the page, one pixel for one pixel, in
 * both directions:
 *
 *   down  — it leaves with the content, as if it were the first line of it,
 *           and stops just above the window once it is gone;
 *   up    — it comes back with the content from just above the window, and
 *           once it is all the way in it is HELD at the top while the reader
 *           goes on up.
 *
 * ── NOT MOVED BY SCRIPT, PLACED BY IT ─────────────────────────────────────
 * The obvious build — read `scrollY` every frame, write a transform — is the
 * one that lags. On a phone the page is scrolled by the compositor, off the
 * main thread, and a header positioned from a scroll EVENT is a frame or more
 * behind the content it is meant to be stuck to: it swims. So no position is
 * ever written per frame. The header is `position: sticky` in the flow of the
 * page (shell.css), and the browser moves it, exactly as it moves the text.
 * What this reducer decides is only WHERE IN THE DOCUMENT the header sits —
 * `at`, its natural place, written as a margin — and whether it is `held` by
 * `top: 0` instead of free to leave. Both change only at a TURN, so a long
 * scroll in one direction writes nothing at all.
 *
 *   free   `top: -reach`. Drawn at `at - scrollY`, but never higher than
 *          `-reach` — just above the window, out of sight, ready.
 *   held   `top: 0`, `at: 0`. Drawn at the top of the window, always.
 *
 * At a turn down from held, `at` becomes the turning point, so the page takes
 * the header with it from exactly there. At a turn up from gone, `at` becomes
 * the turning point less `reach`, so the page brings it back from exactly
 * just above the window. Every frame between turns is the browser's.
 *
 * ── WHY THE DECISION IS HERE AND NOT IN THE HOOK ──────────────────────────
 * The `unit` project runs in `environment: 'node'` with no jsdom
 * (apps/web/vitest.config.ts says why, and the reason is good), so a hook that
 * listens to `window` cannot be tested at all. What can be wrong here is the
 * JUDGEMENT — where to place it at a turn, when to hold it, what an iOS bounce
 * means — so that is a reducer over (state, reading), and the hook is left
 * holding one `addEventListener` and two style writes.
 *
 * ── WHAT WENT WITH THE SLIDE ──────────────────────────────────────────────
 * The thresholds (56 down, 14 up), the top band and the floor on short pages.
 * All four existed to stop a TIMED slide from firing on jitter; a header that
 * moves exactly as far as the page has nothing to fire. A momentum scroll
 * settling back and forth by two pixels moves it two pixels, and a page that
 * scrolls 30px takes it 30px — which is what the first line of that page does.
 */

/**
 * What the reducer has to remember between two scroll events.
 *
 * `at` is the header's natural place in the document, in px from its top —
 * where the page would draw it if it were not sticky. `held` is sticky
 * `top: 0` rather than `top: -reach`. `last` is the previous position and
 * exists only to tell which way we are now going, and where a turn happened.
 */
export type RevealState = {
  at: number;
  held: boolean;
  last: number;
};

/** The top of a page, the header in its own place — where every screen starts. */
export const AT_REST: RevealState = { at: 0, held: false, last: 0 };

/**
 * Showing, from wherever the page is NOW — what the hook resets to when focus
 * brings the header back, or a screen stops pinning it: held at the top.
 *
 * ── FROM HERE, NOT FROM THE TOP · 2026-11-17 ─────────────────────────────
 * Tab to the menu button while the header is gone, and focus brings it back —
 * and then the BROWSER may scroll, to bring the control it just focused into
 * view. Read against a state whose `last` is 0, that scroll was a long run
 * down and took the header away again with focus inside it (WCAG 2.4.11).
 * Anchored at the real position, a jump either way starts from where the page
 * actually was. Clamped like every reading, for the same iOS reason.
 */
export function shownAt(scrollY: number): RevealState {
  const y = Math.max(scrollY, 0);
  return y === 0 ? AT_REST : { at: 0, held: true, last: y };
}

/**
 * One reading of the page, taken at a scroll event.
 *
 * `reach` is how far above the window the header waits when it is gone: its
 * own MEASURED height (a large text size makes it taller) plus the clearance
 * its shadow needs, so not even the shadow's tail shows along the top edge.
 * `maxScrollY` is the document as it is right now, for the clamp.
 */
export type ScrollReading = {
  scrollY: number;
  maxScrollY: number;
  reach: number;
};

/**
 * Where the header is drawn, relative to the window's top edge — 0 is all the
 * way in, `-reach` is gone. What the browser will draw for this state; the
 * tests use it to say "one pixel for one pixel" in numbers.
 */
export function drawnAt(state: RevealState, scrollY: number, reach: number): number {
  if (state.held) return 0;
  return Math.max(state.at - scrollY, -reach);
}

/** The state, one reading later. Pure: same inputs, same answer, no `window`. */
export function nextReveal(state: RevealState, reading: ScrollReading): RevealState {
  /* CLAMPED, because iOS reports a scrollY below 0 at the top and above the
     maximum at the bottom while the page is bouncing. Clamped, a bounce is no
     movement at all, so it is never a turn. */
  const max = Math.max(reading.maxScrollY, 0);
  const y = Math.min(Math.max(reading.scrollY, 0), max);

  /* The top of the page. The header is simply in its own place there, and
     free, so the first pixel down takes it with the page without waiting for
     a turn to be noticed. */
  if (y === 0) return AT_REST;

  /* A reading identical to the last one — `scrollend`, a resize — is no
     movement, and decides nothing. */
  if (y === state.last) return state;

  const down = y > state.last;

  if (state.held) {
    /* Held, and the reader turns down: let go where it is. Its natural place
       becomes the TURNING POINT, where it was drawn at the top of the window,
       so the page takes it away from exactly there — including the few pixels
       this event already covered. Going on up, it stays held. */
    return down
      ? { at: state.last, held: false, last: y }
      : { ...state, last: y };
  }

  /* Free and going down: the page is carrying it away, or it is already gone
     and waiting above the window. Either way, nothing to decide. */
  if (down) return { ...state, last: y };

  /* Free and going up. Where would the page draw it now? */
  const drawn = state.at - y;

  if (drawn < -reading.reach) {
    /* Gone, and the reader turns up: place it just above the window AT THE
       TURNING POINT, so the page brings it back from there — and the pixels
       this event already covered count, as if it had been there all along. */
    const at = Math.max(state.last - reading.reach, 0);
    return at - y >= 0
      ? { at: 0, held: true, last: y }   // a jump bigger than `reach`: all the way in
      : { at, held: false, last: y };
  }

  /* All the way in (a jump can overshoot it): hold it at the top, so going on
     up does not carry it down into the page. */
  if (drawn >= 0) return { at: 0, held: true, last: y };

  /* On its way back in. The page is doing it. */
  return { ...state, last: y };
}
