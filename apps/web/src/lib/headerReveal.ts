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
 *           and once it is out of sight it waits just above the window;
 *   up    — it comes back with the content from just above the window, and
 *           once it is all the way in it is HELD at the top while the reader
 *           goes on up.
 *
 * ── NOT MOVED BY SCRIPT, PLACED BY IT ─────────────────────────────────────
 * The obvious build — read `scrollY` every frame, write a transform — is the
 * one that lags. On a phone the page is scrolled by the compositor, off the
 * main thread, and a header positioned from a scroll EVENT is a frame or more
 * behind the content it is meant to be stuck to: it swims. So no position is
 * ever written per frame. While it moves, the header is ordinary page content
 * — `position: absolute` at `at`, a place in the DOCUMENT (shell.css) — and
 * the browser scrolls it exactly as it scrolls the text. What this reducer
 * decides is which of three things the header is, and for the first, where:
 *
 *   free   `position: absolute`, top `at`. Drawn at `at - scrollY`: part of
 *          the page, carried with it.
 *   gone   `position: fixed`, top `-reach`. Out of sight, just above the
 *          window, whatever the page does.
 *   held   `position: fixed`, top 0. At the top of the window, whatever the
 *          page does.
 *
 * It changes only at a TURN, and at the one moment a leaving header passes
 * out of sight — so a long scroll in one direction writes once at most.
 *
 * At a turn down from held, `at` becomes the turning point, so the page takes
 * the header with it from exactly there. At a turn up from gone, `at` becomes
 * the turning point less `reach`, so the page brings it back from exactly
 * where it was waiting. Every frame between is the browser's.
 *
 * ── ABSOLUTE, NOT STICKY — Ben's iPhone, 2026-11-17 ───────────────────────
 * It was `position: sticky` with a negative `top`, which moves the same way;
 * but Safari never draws a fixed or sticky box in the area under the status
 * bar, so the pill was cut off at the bar's edge as if by a mask while the
 * page slid on beneath it. Absolute is page content, and page content is drawn
 * there. Fixed is fine for `held` (below the bar) and for `gone` (above
 * everything, drawn nowhere).
 *
 * WHY `gone` IS FIXED AND NOT LEFT IN THE PAGE: a header simply left behind in
 * the document is still in the tab order, and Tab onto it makes the browser
 * scroll the page all the way back to wherever it was left — the top of the
 * page, as often as not. A fixed box has no place in the page to scroll to.
 *
 * ── WHY THE DECISION IS HERE AND NOT IN THE HOOK ──────────────────────────
 * The `unit` project runs in `environment: 'node'` with no jsdom
 * (apps/web/vitest.config.ts says why, and the reason is good), so a hook that
 * listens to `window` cannot be tested at all. What can be wrong here is the
 * JUDGEMENT — where to place it at a turn, when to hold it, what an iOS bounce
 * means — so that is a reducer over (state, reading), and the hook is left
 * holding one `addEventListener` and the style writes.
 *
 * ── WHAT WENT WITH THE SLIDE ──────────────────────────────────────────────
 * The thresholds (56 down, 14 up), the top band and the floor on short pages.
 * All four existed to stop a TIMED slide from firing on jitter; a header that
 * moves exactly as far as the page has nothing to fire. A momentum scroll
 * settling back and forth by two pixels moves it two pixels, and a page that
 * scrolls 30px takes it 30px — which is what the first line of that page does.
 *
 * ── ON THE WAY BACK IT IS A BAR · Ben, 2026-11-18 ─────────────────────────
 * Figma *Navigation › Bodyscan · Hören · 393*, the frame `header`
 * (242:21976): scrolling up mid-page brings back not the pill but a bar
 * across the top of the window — flush with its top edge, --sp-2 wider than
 * the page's column each side, only its bottom corners round. At the top of
 * the page it is the pill
 * again. Up to 1440px; wider than that, the pill comes back as the pill.
 * What Ben settled, one by one:
 *
 *   ONLY ONCE THE PILL WAS OUT OF SIGHT. A short scroll that never took the
 *   pill off the screen brings the pill back with the page, in its own place.
 *   So the bar is a `gone` header coming back: it becomes the bar at the turn
 *   up from `gone`, while it is out of sight, and it is the pill again the
 *   moment it is out of sight once more (`gone` is always the pill, so a
 *   wide, opaque, fixed box never waits above the window).
 *
 *   NOT WITHIN A SCREEN OF THE TOP — the same day. Flicked up to the top, the
 *   bar came in for a moment only to dissolve into the pill. Ben asked for
 *   no bar when the top is reached within half a second; nothing can know
 *   that at the turn, so the rule is a distance standing in for the time:
 *   a turn up within one window's height of the top (`near`) brings no bar.
 *   The header stays gone, and the pill comes into sight with the page in
 *   its own place, as if it had never left — the short scroll's behaviour,
 *   from further down. Its cost, chosen knowingly: scrolled up slowly from
 *   there, the reader has no header until the top, and a page barely taller
 *   than the window never shows the bar at all. Focus still brings it.
 *
 *   HANDED OVER IN PLACE. Not at the very top but where the pill's own place
 *   reaches the top of the window — `handover`, the band's top padding (16 on
 *   a phone, 24 from 768px). The held bar becomes the pill at rest right
 *   there, and the page carries it the last few pixels into its place.
 *
 *   DISSOLVED, NOT MOVED — the same day. It was first a morph, tied to
 *   the scroll over the 24px before the handover: the bar narrowing to the
 *   pill and sliding to its place. Scrolled up fast, those 24px pass between
 *   two frames, so the whole change landed in one — „super abrupt", at 1440 a
 *   996px bar becoming a 166px pill 200px to the left. Now nothing changes
 *   shape: at the handover the bar fades out where it is while the pill fades
 *   in at its place, both on one clock (shell.css names it), so a flick gets
 *   the same gentle cross-fade as a slow scroll. `handedOver` says when; the
 *   hook runs the fade.
 */

export type RevealMode = 'free' | 'gone' | 'held';

/** Which of its two shapes the header has: the pill at rest, or the bar. */
export type RevealForm = 'pill' | 'bar';

/**
 * What the reducer has to remember between two scroll events.
 *
 * `at` is the header's place in the document, in px from its top — where the
 * page draws it while it is `free`; it means nothing in the other two modes.
 * `last` is the previous position and exists only to tell which way we are
 * now going, and where a turn happened.
 */
export type RevealState = {
  mode: RevealMode;
  form: RevealForm;
  at: number;
  last: number;
};

/** The top of a page, the header in its own place — where every screen starts. */
export const AT_REST: RevealState = { mode: 'free', form: 'pill', at: 0, last: 0 };

/**
 * The bar's numbers, measured by the hook. `null` in a reading means no bar
 * at this width (over 1440px), and the header behaves as it did before it.
 *
 * `reach` is how far above the window the bar is placed at a turn up, so the
 * page brings it in from there — its own height, plus as much again below it
 * as the pill's band has (--sp-4) and the same clearance, so its edge starts
 * exactly as far up as the pill's would. `handover` is where the pill's own
 * place meets the top of the window. `near` is the window's height: a turn up
 * closer to the top than that brings no bar.
 */
export type BarGeometry = {
  reach: number;
  handover: number;
  near: number;
};

/**
 * Showing, from wherever the page is NOW — what the hook resets to when focus
 * brings the header back: held at the top, as the bar where there is one.
 *
 * ── FROM HERE, NOT FROM THE TOP · 2026-11-17 ─────────────────────────────
 * Tab to the menu button while the header is gone, and focus brings it back —
 * and the browser may scroll as well, to bring the control it just focused
 * into view. Read against a state whose `last` is 0, that scroll was a long
 * run down and took the header away again with focus inside it (WCAG 2.4.11).
 * Anchored at the real position, a jump either way starts from where the page
 * actually was. Clamped like every reading, for the same iOS reason.
 *
 * Above the handover the pill's own place is in sight, so that is where it is.
 */
export function shownAt(scrollY: number, bar: BarGeometry | null = null): RevealState {
  const y = Math.max(scrollY, 0);
  if (y === 0) return AT_REST;
  if (bar === null) return { mode: 'held', form: 'pill', at: 0, last: y };
  if (y <= bar.handover) return { mode: 'free', form: 'pill', at: 0, last: y };
  return { mode: 'held', form: 'bar', at: 0, last: y };
}

/**
 * One reading of the page, taken at a scroll event.
 *
 * `reach` is how far above the window the PILL waits when it is gone: its
 * band's height — MEASURED, since a large text size makes it taller — plus the
 * clearance shell.css gives it, for its shadow everywhere, and on an iPhone
 * for the band under the status bar too, where Safari draws the page.
 * `maxScrollY` is the document as it is right now, for the clamp. `bar` is the
 * bar's own numbers, or `null` where there is no bar.
 */
export type ScrollReading = {
  scrollY: number;
  maxScrollY: number;
  reach: number;
  bar?: BarGeometry | null;
};

/**
 * Where the header is drawn, relative to the window's top edge — 0 is all the
 * way in, `-reach` is gone. What the browser will draw for this state; the
 * tests use it to say "one pixel for one pixel" in numbers. `reach` is the
 * pill's: gone is always the pill.
 */
export function drawnAt(state: RevealState, scrollY: number, reach: number): number {
  if (state.mode === 'held') return 0;
  if (state.mode === 'gone') return -reach;
  return state.at - scrollY;
}

/**
 * Whether this step was the HANDOVER — the bar, in sight, becoming the pill in
 * its own place — which is the one change the reader watches, and so the one
 * the hook cross-fades. The bar becoming the pill anywhere else does it out
 * of sight (leaving as `gone`) or because the window grew past 1440, and
 * neither is anything to look at.
 */
export function handedOver(previous: RevealState, next: RevealState): boolean {
  return previous.form === 'bar' && previous.mode !== 'gone'
    && next.form === 'pill' && next.mode === 'free' && next.at === 0;
}

/** The state, one reading later. Pure: same inputs, same answer, no `window`. */
export function nextReveal(state: RevealState, reading: ScrollReading): RevealState {
  const bar = reading.bar ?? null;
  const next = move(
    /* A bar where there is no bar any more — the window grew past 1440 — is
       simply the pill, wherever it is. */
    bar === null && state.form === 'bar' ? { ...state, form: 'pill' } : state,
    reading,
    bar,
  );

  /* THE HANDOVER. The bar, wherever this reading left it, at or above the
     pill's own place: that place is in the window now, so it is the pill
     there, at rest — at the top of the window, where the held bar is, which
     fades out over it as it fades in. A jump past the handover lands here
     too, and finds the pill in its place, a little further down. */
  if (bar !== null && next.form === 'bar' && next.last <= bar.handover) {
    return { mode: 'free', form: 'pill', at: 0, last: next.last };
  }
  return next;
}

function move(state: RevealState, reading: ScrollReading, bar: BarGeometry | null): RevealState {
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
  const reachOf = (form: RevealForm): number =>
    form === 'bar' && bar !== null ? bar.reach : reading.reach;
  /* What a header coming back from out of sight is: the bar, where there is
     one. */
  const returning: RevealForm = bar === null ? 'pill' : 'bar';

  /* Free and going down: out of sight is the one thing to watch for. The page
     has carried it past its reach, so it can wait fixed above the window from
     here — invisibly, since it is out of sight either way. Gone is always the
     pill: the bar, once out of sight, has no reason to stay one. */
  const leaving = (at: number, form: RevealForm): RevealState => (
    at - y < -reachOf(form)
      ? { mode: 'gone', form: 'pill', at: 0, last: y }
      : { mode: 'free', form, at, last: y }
  );

  /* Coming back from out of sight: placed in the page just above the window
     AT THE TURNING POINT, so the page brings it in from there — and the
     pixels this event already covered count, as if it had been there all
     along. A jump bigger than its reach brings it all the way in. */
  const returningFrom = (turn: number): RevealState => {
    const at = Math.max(turn - reachOf(returning), 0);
    return at - y >= 0
      ? { mode: 'held', form: returning, at: 0, last: y }
      : { mode: 'free', form: returning, at, last: y };
  };

  if (state.mode === 'held') {
    /* Held, and the reader turns down: let go where it is. Its place becomes
       the TURNING POINT, where it was drawn at the top of the window, so the
       page takes it away from exactly there — including the pixels this event
       already covered. Going on up, it stays held. */
    return down ? leaving(state.last, state.form) : { ...state, last: y };
  }

  if (state.mode === 'gone') {
    /* Gone, and still going down: it waits. Turning up: it comes back —
       except within a screen of the top, where it stays gone until the
       pill's own place, the top of the page, is within its reach, and from
       there the page brings the pill in. */
    if (down) return { ...state, last: y };
    if (bar !== null && state.last <= bar.near) {
      return y <= reading.reach ? { mode: 'free', form: 'pill', at: 0, last: y } : { ...state, last: y };
    }
    return returningFrom(state.last);
  }

  /* Free. */
  if (down) return leaving(state.at, state.form);

  /* Free and going up: on its way back in, which the page is doing — until it
     is all the way in (a jump can overshoot that), and then it is held at the
     top, so going on up does not carry it down into the page. A free header
     somehow above the window on the way up — never left as `gone` — comes
     back as `gone` does. */
  const drawn = state.at - y;
  if (drawn >= 0) return { mode: 'held', form: state.form, at: 0, last: y };
  if (drawn < -reachOf(state.form)) return returningFrom(state.last);
  return { ...state, last: y };
}
