/**
 * useScrollSnap — Layer 2 helper
 *
 * Turns the DOCUMENT into a snapping scroller for as long as a screen needs
 * it, so a run of full-viewport views is moved through one at a time.
 *
 * ── THE OTHER HALF OF useViewportFill ─────────────────────────────────────
 * That hook answers "how tall is a view that fills what is left of the
 * window". This one answers "and what stops a thumb running past it". They
 * are the same pattern seen from two sides, which is why they sit beside each
 * other and why one declaration in the stylesheet joins them:
 *
 *   .musy-snap-view { scroll-margin-block-start: var(--musy-fill-offset, 0px); }
 *
 * A view that measured its own offset snaps to the top of whatever is ABOVE
 * it rather than to its own top — which is what you want for the first view in
 * a run, because it starts below a heading nobody wants scrolled off. A view
 * that did not measure resolves the variable to 0 and snaps to itself.
 *
 * ── WHY A HOOK AND NOT A COMPONENT ────────────────────────────────────────
 * It has no geometry and renders nothing. `scroll-snap-type` belongs to the
 * SCROLL CONTAINER, and for views in normal document flow that container is
 * the document — an element no component may own. So the hook sets a mode on
 * `<html>` and the stylesheet holds the rule, in the same section as the
 * geometry it goes with.
 *
 * An attribute rather than an inline style for exactly that reason: an inline
 * `scrollSnapType` would move the decision out of the stylesheet, where the
 * scroll padding, the alignment and the stop live together and can be read as
 * one thing.
 *
 * ── SCOPED, BECAUSE THE DOCUMENT IS SHARED ────────────────────────────────
 * A mode on `<html>` outlives the screen that wanted it unless someone takes
 * it away. Mounted while the screen is, gone when it unmounts — so every other
 * route scrolls normally and the snap cannot leak.
 *
 * REFERENCE-COUNTED, and that is not hypothetical tidiness: two screens can
 * overlap for a frame during a route transition, and a plain `delete` on the
 * first unmount would switch snapping off underneath the one still using it.
 * The count is module-level, because the thing being counted is a single
 * attribute on a single element.
 *
 * ── AND IT HANDS BACK A WAY TO JUMP WITHOUT BEING FOUGHT ──────────────────
 * `withoutSnapping` exists because a button that scrolls you somewhere and a
 * scroller that insists on a snap position are two things wanting the same
 * scroll, and on iOS the snap engine wins.
 *
 * Reported on a phone (Ben, 2026-09-24): on the listen step, *Details und
 * Player zeigen* "first snaps to the next section, but then scrolls back up".
 * It LANDS and then returns. So does the rail's *Nach oben*. The jump from
 * the FIRST view does not, and that asymmetry is the whole diagnosis: the
 * first view carries a `scroll-margin-block-start` from `useViewportFill`, so
 * its snap area is larger than the snapport and the spec gives it a resting
 * RANGE — a scroll leaving a range is not pulled back. The other views are
 * exactly one snapport, so each is a single exact snap position, and a
 * programmatic smooth scroll away from one of those is animated back to it.
 *
 * Nothing in the app scrolls back — there is no second `scrollIntoView`, no
 * `focus()`, and the view being scrolled to only ever grows DOWNWARD, so no
 * geometry above it moves. The scroller is doing it.
 *
 * So the jump turns snapping off for as long as it takes, and back on when
 * the scroll has settled. Restoring is free of flicker by construction: the
 * scroll has arrived at a snap position, so switching the mode back on has
 * nothing left to correct.
 *
 * `scrollend` where the engine has it, a timer everywhere else — Safari got
 * `scrollend` late, and this is a fix aimed at Safari, so the timer is the
 * path that has to work rather than the fallback nobody exercises.
 */
import * as React from 'react';

/** The mode, on `<html>`. The stylesheet selects on exactly this. */
const ATTRIBUTE = 'data-musy-scroll-snap';
const AXIS = 'y';

/** How many mounted consumers currently want it. See the header. */
let consumers = 0;

/** How many jumps are in flight. Snapping is on only when nothing is jumping. */
let suspensions = 0;

/** How long to wait for a smooth scroll where `scrollend` is not available. */
const SETTLE_MS = 700;

/**
 * The single place the attribute is written, so the two counts can never
 * disagree about what `<html>` should say.
 */
function apply(): void {
  const on = consumers > 0 && suspensions === 0;
  if (on) document.documentElement.setAttribute(ATTRIBUTE, AXIS);
  else document.documentElement.removeAttribute(ATTRIBUTE);
}

export interface ScrollSnapControls {
  /**
   * Run a programmatic scroll with snapping held off until it settles.
   *
   * Use it for every scroll a CONTROL causes — a button that moves the reader
   * to another view. A scroll the reader makes with a thumb wants snapping on,
   * which is the whole point of the mode.
   */
  withoutSnapping: (scroll: () => void) => void;
}

/**
 * Call from a screen whose children are `.musy-snap-view` sections in document
 * flow. Pass `false` to hold it off — a step that has not reached its
 * scrolling views yet — rather than calling the hook conditionally.
 */
export function useScrollSnap(enabled = true): ScrollSnapControls {
  React.useEffect(() => {
    if (!enabled) return undefined;

    consumers += 1;
    apply();

    return () => {
      consumers -= 1;
      if (consumers <= 0) consumers = 0;
      apply();
    };
  }, [enabled]);

  const withoutSnapping = React.useCallback((scroll: () => void) => {
    suspensions += 1;
    apply();

    /* RELEASED EXACTLY ONCE, however it finishes. Two jumps can overlap — a
       second tap before the first has settled — and each holds its own
       suspension, so the mode comes back only when the last one is done. */
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      window.clearTimeout(timer);
      window.removeEventListener('scrollend', release);
      suspensions -= 1;
      if (suspensions <= 0) suspensions = 0;
      apply();
    };

    const timer = window.setTimeout(release, SETTLE_MS);
    window.addEventListener('scrollend', release, { once: true });

    scroll();
  }, []);

  return { withoutSnapping };
}
