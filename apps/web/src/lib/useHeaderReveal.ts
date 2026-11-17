/**
 * The header moving with the page — the wiring half. `headerReveal.ts` holds
 * every decision and says why; what is left here is one scroll listener, one
 * measurement and two style writes.
 *
 * ── NOTHING HERE MOVES THE HEADER ─────────────────────────────────────────
 * The browser does, because while it moves the header is ordinary page
 * content — `position: absolute` at a place in the document (shell.css). This
 * hook only PLACES it: `--musie-header-at` (that place) and `data-mode` —
 * `free` in the page, `gone` fixed above the window, `held` fixed at its top.
 * They change only at a turn of direction or as a leaving header passes out
 * of sight, and are written only when they differ from what is already
 * there, so a long scroll one way writes once at most — and no React state is
 * touched, ever, so a scroll never renders anything either.
 *
 * NO FRAME COALESCING, on purpose. Browsers dispatch `scroll` once per frame
 * now, in the same update that paints it, and a placement deferred to the
 * next animation frame is a frame late at exactly the moment — a turn — when
 * the reader is watching the header.
 *
 * `passive: true` because this listener never calls `preventDefault`, and a
 * non-passive scroll listener makes the browser wait for it before it may
 * scroll at all.
 *
 * ── THE HEADER MEASURES ITSELF ────────────────────────────────────────────
 * Not `--sticky-block`: that token is the header's DESIGNED height, and a
 * large text-size preference makes the real one taller. A ResizeObserver keeps
 * `offsetHeight` in step and writes it as `--musie-header-block` on the APP
 * ROOT, the header's parent, which pads its top by it — out of the flow, the
 * header no longer reserves its own space, so the root does it for it. The
 * same height plus the CSS's own `--musie-header-clearance` (read back here
 * rather than repeated) is `reach`, how far above the window a returning
 * header is placed.
 *
 * ── ARRIVING SOMEWHERE NEW STARTS AT REST ─────────────────────────────────
 * `resetKey` is the page's path. AppShell scrolls a new route to its top
 * before this runs, so arrival is the header in its own place. It is the path
 * of the page BENEATH an overlay, not the location — so opening the drawer
 * over a scrolled page is not an arrival.
 *
 * ── AND FOCUS BRINGS IT BACK ──────────────────────────────────────────────
 * Gone is fixed above the window, not `display: none`, so the menu button is
 * still in the tab order — and being fixed, it gives the browser no place in
 * the page to scroll back to when it is focused. A keyboard user tabbing into a control they cannot see is
 * WCAG 2.4.11 failing in the most literal way available, so `focusin` holds
 * the header at the top — from where the page IS (`shownAt` says why that
 * matters).
 */
import * as React from 'react';
import { AT_REST, nextReveal, shownAt } from './headerReveal';
import type { RevealState } from './headerReveal';

export function useHeaderReveal(
  header: React.RefObject<HTMLElement | null>,
  resetKey: string,
): void {
  const state = React.useRef<RevealState>(AT_REST);
  /* What is on the element right now, so a write happens only on a change. */
  const written = React.useRef<{ at: number; mode: RevealState['mode'] } | null>(null);

  const place = React.useCallback((next: RevealState) => {
    state.current = next;
    const element = header.current;
    if (element === null) return;
    const was = written.current;
    if (was === null || was.at !== next.at) {
      element.style.setProperty('--musie-header-at', `${next.at}px`);
    }
    if (was === null || was.mode !== next.mode) {
      element.dataset.mode = next.mode;
    }
    written.current = { at: next.at, mode: next.mode };
  }, [header]);

  /* Arrival and focus are both "showing, from here". On an arrival the page
     is already at 0, where that is simply the rest position. */
  const show = React.useCallback(() => {
    place(shownAt(window.scrollY));
  }, [place]);

  React.useEffect(() => { show(); }, [resetKey, show]);

  React.useEffect(() => {
    const element = header.current;
    if (element === null) return undefined;

    let reach = 0;
    const measure = () => {
      const block = element.offsetHeight;
      element.parentElement?.style.setProperty('--musie-header-block', `${block}px`);
      /* A custom property's computed value has its var() resolved, so this
         is the clearance in px — whatever token shell.css names. */
      const clearance =
        Number.parseFloat(getComputedStyle(element).getPropertyValue('--musie-header-clearance')) || 0;
      reach = block + clearance;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    const onScroll = () => {
      place(nextReveal(state.current, {
        scrollY: window.scrollY,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        reach,
      }));
    };

    /* One reading now, before any gesture: the page may already be scrolled —
       a reload restores the position, and so does going Back. */
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('focusin', show);

    return () => {
      window.removeEventListener('scroll', onScroll);
      element.removeEventListener('focusin', show);
      observer.disconnect();
    };
  }, [header, place, show]);
}
