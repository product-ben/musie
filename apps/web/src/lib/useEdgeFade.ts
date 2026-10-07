/**
 * Keeps `data-fade` on a scroller in step with where it has been scrolled to.
 *
 * The rule is `fadeEdges` in `lib/edgeFade.ts`; this is the browser half —
 * when to ask it, and where to put the answer.
 *
 * ── THE ATTRIBUTE, NOT A CLASS AND NOT A STYLE ────────────────────────────
 * The stylesheet owns the mask and this owns the state, which is the same
 * split `.musie-listen__rail` and `.musie-immersive__time` already use. A hook
 * writing `mask-image` would put a gradient's geometry into TypeScript.
 *
 * ── THREE THINGS CHANGE THE ANSWER, AND ONLY ONE OF THEM IS A SCROLL ──────
 * Scrolling, obviously. But also the row RESIZING — a rotated phone, a goal
 * whose label is twice as long — and its CONTENTS changing, which on this row
 * happens every time the goal is re-picked. A scroll listener alone leaves the
 * fade correct until the first of those, and then quietly wrong. `ResizeObserver`
 * on the element and on its contents covers both, which is why it observes the
 * children too: the row's own box does not change when a chip inside it grows.
 */
import * as React from 'react';
import { fadeEdges } from './edgeFade';

export function useEdgeFade<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;

    const apply = () => {
      element.dataset.fade = fadeEdges(
        element.scrollLeft, element.scrollWidth, element.clientWidth,
      );
    };

    apply();
    element.addEventListener('scroll', apply, { passive: true });

    /* Guarded: jsdom has no ResizeObserver, and a unit test rendering this
       should not have to stub one to mount a screen. */
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(element);
    for (const child of Array.from(element.children)) observer?.observe(child);

    return () => {
      element.removeEventListener('scroll', apply);
      observer?.disconnect();
    };
  });

  return ref;
}
