/**
 * The header's hide-on-the-way-down, show-on-the-way-up behaviour — the
 * wiring half. `headerReveal.ts` holds every decision it makes and says why;
 * what is left here is one scroll listener, one measurement, and the one
 * screen that is allowed to switch the whole thing off.
 *
 * ── ONE LISTENER, ONE FRAME, ONE STATE UPDATE ─────────────────────────────
 * `scroll` fires far faster than the screen refreshes, so the reading is
 * coalesced into a frame — the same shape `useViewportFill` uses in the design
 * system, and for the same reason: every reading here ends in a React state
 * update, and one per event would be one render per pixel.
 *
 * `passive: true` because this listener never calls `preventDefault`, and a
 * non-passive scroll listener makes the browser wait for it before it may
 * scroll at all. On a touch screen that is the difference between a gesture
 * that tracks the thumb and one that lags behind it — which is precisely the
 * jumpiness this whole pattern is supposed to remove.
 *
 * ── THE HEADER MEASURES ITSELF ────────────────────────────────────────────
 * Not `--sticky-block` read off the computed style: that token is the header's
 * DESIGNED height, and what the rules need is its REAL one, which a wrapped
 * label or a large text-size preference can change. `offsetHeight` is
 * unaffected by the transform that hides it, so the number stays honest while
 * the header is off screen. A ResizeObserver keeps it in step rather than a
 * read per frame, which would force layout on every scroll.
 *
 * ── ARRIVING SOMEWHERE NEW SHOWS THE HEADER ───────────────────────────────
 * `resetKey` is the page's path. AppShell already scrolls a new route to its
 * top, and that scroll alone would usually reveal the header — but "usually"
 * is not good enough: a route that is already at the top fires no scroll event
 * at all, and would then be entered with the previous screen's chrome still
 * hidden and no gesture available to bring it back except scrolling a page
 * that may not scroll. Resetting on the key makes arrival unconditional.
 *
 * It is the path of the page BENEATH an overlay, not the location — so opening
 * the drawer over a page you had scrolled does not count as arriving
 * somewhere, and closing it puts you back exactly as you were.
 *
 * ── AND FOCUS BRINGS IT BACK ──────────────────────────────────────────────
 * Hidden is a transform, not `display: none`, so the menu button is still in
 * the tab order while it is off screen. A keyboard user tabbing into a control
 * they cannot see is WCAG 2.4.11 (Focus Not Obscured) failing in the most
 * literal way available, so `focusin` on the header reveals it. Nothing else
 * needs to know: the next scroll reads the current position and carries on.
 */
import * as React from 'react';
import { AT_REST, nextReveal } from './headerReveal';
import type { RevealState } from './headerReveal';

export function useHeaderReveal(
  header: React.RefObject<HTMLElement | null>,
  pinned: boolean,
  resetKey: string,
): boolean {
  const [hidden, setHidden] = React.useState(false);
  const state = React.useRef<RevealState>(AT_REST);

  const show = React.useCallback(() => {
    state.current = AT_REST;
    setHidden(false);
  }, []);

  /* Arrival, and un-pinning — both are "start again, showing". */
  React.useEffect(() => { show(); }, [resetKey, pinned, show]);

  React.useEffect(() => {
    /* A pinned screen adds no listener at all, rather than adding one that
       answers `false` every time. The screen that pins is the one doing its
       own scrolling, and the cheapest listener is the one not attached. */
    if (pinned) return undefined;

    const element = header.current;
    if (element === null) return undefined;

    let block = element.offsetHeight;
    const observer = new ResizeObserver(() => {
      block = element.offsetHeight;
    });
    observer.observe(element);

    let frame = 0;
    const settle = () => {
      frame = 0;
      const next = nextReveal(state.current, {
        scrollY: window.scrollY,
        /* The document as it is RIGHT NOW. It grows when data lands and
           shrinks when a section collapses, and the floor rule is only worth
           anything if it is asked of the current page. */
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        headerBlock: block,
      });
      state.current = next;
      setHidden(next.hidden);
    };

    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(settle);
    };

    /* One reading now, before any gesture: the page may already be scrolled —
       a reload restores the position, and so does going Back. */
    settle();

    window.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('focusin', show);

    return () => {
      window.removeEventListener('scroll', onScroll);
      element.removeEventListener('focusin', show);
      observer.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [header, pinned, show]);

  return pinned ? false : hidden;
}

/**
 * A screen saying "not on me".
 *
 * ── WHY ANY SCREEN GETS TO SAY THAT ───────────────────────────────────────
 * The listen step is a run of full-viewport sections that snap, and each one
 * is sized `--view-block-scrolled` — the window LESS the sticky header —
 * and lands `--sticky-block` down from the top of the window, because that is
 * where the header ends. Every one of those numbers is the header's height. A
 * header that comes and goes makes all of them wrong at once: the view snaps
 * into place and a header's worth of the PREVIOUS view shows above it, in a
 * band the reader cannot scroll away because the snap holds them there.
 *
 * It cannot be detected instead of declared. `data-musy-scroll-snap` looks
 * like the signal, but `useScrollSnap` takes that attribute off for the
 * duration of a programmatic jump — so a *Show details* button would scroll
 * you down a whole view with snapping off, the header would take that as a
 * long run downwards and hide, and the attribute would come back with the
 * header already gone. So the step says so itself, for as long as it is
 * mounted, and there is nothing to infer.
 *
 * ── COUNTED, NOT A FLAG ───────────────────────────────────────────────────
 * The same reason `useScrollSnap` counts: two screens overlap for a frame
 * during a route transition, and the one leaving must not un-pin the header
 * underneath the one arriving. StrictMode's mount / unmount / mount is the
 * same shape and is handled by the same counter.
 */
export type PinHeader = () => () => void;

export const HeaderPinContext = React.createContext<PinHeader>(() => () => {});

export function usePinnedHeader(): void {
  const pin = React.useContext(HeaderPinContext);
  React.useEffect(() => pin(), [pin]);
}
