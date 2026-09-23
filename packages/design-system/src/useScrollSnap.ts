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
 */
import * as React from 'react';

/** The mode, on `<html>`. The stylesheet selects on exactly this. */
const ATTRIBUTE = 'data-musy-scroll-snap';
const AXIS = 'y';

/** How many mounted consumers currently want it. See the header. */
let consumers = 0;

/**
 * Call from a screen whose children are `.musy-snap-view` sections in document
 * flow. Pass `false` to hold it off — a step that has not reached its
 * scrolling views yet — rather than calling the hook conditionally.
 */
export function useScrollSnap(enabled = true): void {
  React.useEffect(() => {
    if (!enabled) return undefined;

    consumers += 1;
    document.documentElement.setAttribute(ATTRIBUTE, AXIS);

    return () => {
      consumers -= 1;
      if (consumers <= 0) {
        consumers = 0;
        document.documentElement.removeAttribute(ATTRIBUTE);
      }
    };
  }, [enabled]);
}
