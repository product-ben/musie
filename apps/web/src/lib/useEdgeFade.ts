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
 * ── AND IT IS RETURNED AS WELL AS WRITTEN (2026-10-07) ────────────────────
 * The fade was the only consumer until the row grew a pair of scroll buttons,
 * and a button cannot read a `data-` attribute: it has to know whether there
 * is anything that way to BE disabled, and whether there is anything either
 * way to be drawn at all. Same answer, two readers — so it is React state as
 * well as an attribute rather than a second measurement that could disagree
 * with the first.
 *
 * `setEdges` WITH AN UNCHANGED VALUE IS FREE: React bails out before
 * re-rendering, so a scroll that does not cross an end costs nothing beyond
 * the comparison.
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
import type { FadeEdges } from './edgeFade';

export interface EdgeFade<T extends HTMLElement> {
  /** Put this on the scroller. */
  ref: React.RefObject<T | null>;
  /** Which ends have more past them. `none` is a row that fits. */
  edges: FadeEdges;
}

export function useEdgeFade<T extends HTMLElement>(): EdgeFade<T> {
  const ref = React.useRef<T>(null);
  const [edges, setEdges] = React.useState<FadeEdges>('none');

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;

    const apply = () => {
      const next = fadeEdges(
        element.scrollLeft, element.scrollWidth, element.clientWidth,
      );
      element.dataset.fade = next;
      setEdges(next);
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

  return { ref, edges };
}
