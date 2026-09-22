/**
 * useViewportFill — Layer 2 helper
 *
 * Sizes an element to "from wherever I start, down to the bottom of what the
 * reader can actually see".
 *
 * ── WHY A HOOK AND NOT A TOKEN ────────────────────────────────────────────
 * Layer 1 already has the two subtractions a screen usually needs:
 *
 *   --view-block           the measured window, less the app shell's sticky
 *                          header AND `<main>`'s insets — for a view you LAND
 *                          on, at the top of the page
 *   --view-block-scrolled  the measured window, less the sticky header only —
 *                          for a view you SCROLL TO, where the insets are
 *                          already behind you
 *
 * Both are constants, and both are right until something is nested. An element
 * inside a panel, under a heading and a step rail, does not start where the
 * page starts — and how much is above it depends on copy: a long German
 * exercise name wraps to two lines and moves everything below it by a line's
 * height. No token can hold that number, because it is not a design decision.
 * It is a measurement of the page as rendered, in this language, at this size.
 *
 * So the element measures itself.
 *
 * ── WHAT IT SETS, AND WHAT THE STYLESHEET DOES WITH IT ────────────────────
 * It writes `--musy-fill-offset` — how far the element's top sits from the
 * top of the document — onto the element. One declaration consumes it:
 *
 *   min-block-size: calc(var(--viewport-block) - var(--musy-fill-offset, 0px));
 *
 * `min-block-size`, never `block-size`: content that outgrows the window —
 * German at 393px, or a large text size — has to be allowed to push past it
 * rather than scroll inside a fixed box.
 *
 * The fallback is the caller's to choose. A screen inside the app shell wants
 * `var(--chrome-block)`, which is what the offset would be if the element were
 * the first thing in `<main>`; a full-bleed one wants `0px`.
 *
 * ── WHAT IT OBSERVES, AND WHY IT IS NOT `resize` ──────────────────────────
 * The window resizing is the least of it, and `--viewport-block` already
 * tracks that on its own. What moves this number is the page above the element
 * changing height: a wrapped heading, a font that loaded late, a text-size
 * preference, an error message appearing. None of those is a resize event.
 * A `ResizeObserver` on the document body sees all of them.
 *
 * Document offset rather than viewport offset — `getBoundingClientRect().top`
 * plus the current scroll — because the answer must not change as the reader
 * scrolls through the element it describes.
 */
import * as React from 'react';

/**
 * Attach the returned ref to the element that should fill the viewport, and
 * give it `min-block-size: calc(var(--viewport-block) - var(--musy-fill-offset, …))`.
 */
export function useViewportFill<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = Math.round(element.getBoundingClientRect().top + window.scrollY);
      element.style.setProperty('--musy-fill-offset', `${Math.max(0, top)}px`);
    };

    /* Coalesced into a frame: a ResizeObserver on the body fires in bursts
       while a font swaps or a panel opens, and writing a custom property
       invalidates layout every time. */
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
