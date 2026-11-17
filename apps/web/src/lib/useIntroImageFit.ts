/**
 * Keeps `--musie-intro-image-inline` on the Einsteigen head in step with the
 * height of the copy beside the picture. The rule is `introImageWidth` in
 * `lib/introImage.ts`; this is the browser half, and `shell.css` is the only
 * reader — it uses the property between 480 and 1023px and ignores it
 * everywhere else, so this hook needs to know no breakpoint.
 *
 * ── ONE FRAME LATER, ON PURPOSE ───────────────────────────────────────────
 * Writing the property re-flows the copy that is being observed. Written
 * inside the observer's callback, that change lands in the same delivery and
 * the browser reports „ResizeObserver loop completed with undelivered
 * notifications" as a window error. Written on the next animation frame, it
 * is simply the next observation, and the loop settles in a step or two (see
 * `introImage.ts` for why it must).
 */
import * as React from 'react';
import { introImageWidth } from './introImage';

const PROPERTY = '--musie-intro-image-inline';

export function useIntroImageFit<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const head = ref.current;
    if (head === null) return undefined;
    /* jsdom has neither, and a unit test rendering the step should not have
       to stub them to mount it. Without them the stylesheet's fallback (a
       third of the row) stands. */
    if (typeof ResizeObserver === 'undefined' || typeof requestAnimationFrame === 'undefined') return undefined;
    const copy = head.querySelector<HTMLElement>(':scope > .musie-md');
    if (copy === null || head.querySelector(':scope > .musie-intro__image') === null) return undefined;

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = introImageWidth(copy.getBoundingClientRect().height, head.clientWidth);
        const next = width === null ? '' : `${width}px`;
        if (head.style.getPropertyValue(PROPERTY) !== next) {
          if (next === '') head.style.removeProperty(PROPERTY);
          else head.style.setProperty(PROPERTY, next);
        }
      });
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(head);
    observer.observe(copy);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  return ref;
}
