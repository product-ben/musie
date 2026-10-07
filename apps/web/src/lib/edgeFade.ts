/**
 * Which ends of a scroller have content past them.
 *
 * ── WHY THIS IS NOT A PLAIN CSS MASK ──────────────────────────────────────
 * A gradient on both ends, always on, fades the first control before anything
 * has been scrolled — so the row opens looking like its leading item is half
 * out of the window when it is in fact flush against the edge. The fade has to
 * know where the scroller actually is.
 *
 * The scroll-driven alternative (`animation-timeline: scroll(self inline)`) is
 * the right shape and is not available: Safari does not implement it, and this
 * row is at its most useful on a phone.
 *
 * ── PURE, SO THE RULE CAN BE TESTED WITHOUT A BROWSER ─────────────────────
 * Both vitest projects are `environment: 'node'`, and the arithmetic here is
 * the only part worth testing — a listener calling `scrollLeft` is not. So the
 * decision is a function of three numbers and the hook below is the three
 * lines that feed it.
 */

/** Which ends to fade. `none` is a row that fits and never scrolls. */
export type FadeEdges = 'none' | 'start' | 'end' | 'both';

/**
 * A pixel of slack before an end counts as reached.
 *
 * Sub-pixel layout, a trackpad's fractional deltas and a zoomed page all leave
 * `scrollLeft` a fraction short of `scrollWidth - clientWidth`, and without
 * this the trailing fade never quite switches off — a permanent soft edge on a
 * row that has been scrolled all the way, which is exactly the thing the fade
 * is supposed to mean has stopped being true.
 */
const SLACK = 1;

/**
 * `scrollLeft` IS NEGATIVE IN RTL in every current engine, and is measured
 * from the leading edge in both — so the arithmetic is done on its distance
 * from the leading edge and the two directions need no separate branch.
 */
export function fadeEdges(scrollLeft: number, scrollWidth: number, clientWidth: number): FadeEdges {
  const travel = scrollWidth - clientWidth;
  if (travel <= SLACK) return 'none';

  const from = Math.abs(scrollLeft);
  const atStart = from <= SLACK;
  const atEnd = from >= travel - SLACK;

  if (atStart && atEnd) return 'none';
  if (atStart) return 'end';
  if (atEnd) return 'start';
  return 'both';
}
