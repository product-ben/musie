/**
 * The header moving with the page — the wiring half. `headerReveal.ts` holds
 * every decision and says why; what is left here is one scroll listener, one
 * measurement, two style writes, and the one screen allowed to hold it still.
 *
 * ── NOTHING HERE MOVES THE HEADER ─────────────────────────────────────────
 * The browser does, because the header is sticky and in the flow of the page
 * (shell.css). This hook only PLACES it: `--musie-header-at` (its natural
 * place in the document, written as a margin) and `data-held` (sticky
 * `top: 0` instead of `top: -reach`). Both change only at a turn of
 * direction, and only when they differ from what is already written, so a long
 * scroll one way writes nothing at all — and no React state is touched, ever,
 * so a scroll never renders anything either.
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
 * large text-size preference makes the real one taller. `offsetHeight` leaves
 * the margins out, so it is the band and nothing else. A ResizeObserver keeps
 * it in step and writes it as `--musie-header-block`, which is what the
 * sticky `top: -reach` in shell.css is made of — so the CSS and the reducer
 * always agree on how far "gone" is. The clearance for the shadow is the
 * CSS's own `--musie-header-clearance`, read back here rather than repeated.
 *
 * ── ARRIVING SOMEWHERE NEW STARTS AT REST ─────────────────────────────────
 * `resetKey` is the page's path. AppShell scrolls a new route to its top
 * before this runs, so arrival is the header in its own place. It is the path
 * of the page BENEATH an overlay, not the location — so opening the drawer
 * over a scrolled page is not an arrival.
 *
 * ── AND FOCUS BRINGS IT BACK ──────────────────────────────────────────────
 * Gone is above the window, not `display: none`, so the menu button is still
 * in the tab order. A keyboard user tabbing into a control they cannot see is
 * WCAG 2.4.11 failing in the most literal way available, so `focusin` holds
 * the header at the top — from where the page IS (`shownAt` says why that
 * matters).
 */
import * as React from 'react';
import { AT_REST, nextReveal, shownAt } from './headerReveal';
import type { RevealState } from './headerReveal';

export function useHeaderReveal(
  header: React.RefObject<HTMLElement | null>,
  pinned: boolean,
  resetKey: string,
): void {
  const state = React.useRef<RevealState>(AT_REST);
  /* What is on the element right now, so a write happens only on a change. */
  const written = React.useRef<{ at: number; held: boolean } | null>(null);

  const place = React.useCallback((next: RevealState) => {
    state.current = next;
    const element = header.current;
    if (element === null) return;
    const was = written.current;
    if (was === null || was.at !== next.at) {
      element.style.setProperty('--musie-header-at', `${next.at}px`);
    }
    if (was === null || was.held !== next.held) {
      element.dataset.held = next.held ? 'true' : 'false';
    }
    written.current = { at: next.at, held: next.held };
  }, [header]);

  /* Arrival, focus and un-pinning are all "showing, from here". On an arrival
     the page is already at 0, where that is simply the rest position. A
     pinned screen is held for as long as it is mounted. */
  const show = React.useCallback(() => {
    place(pinned ? { at: 0, held: true, last: window.scrollY } : shownAt(window.scrollY));
  }, [place, pinned]);

  React.useEffect(() => { show(); }, [resetKey, show]);

  React.useEffect(() => {
    /* A pinned screen adds no listener at all. The screen that pins is the
       one doing its own scrolling, and it is held at the top throughout. */
    if (pinned) return undefined;

    const element = header.current;
    if (element === null) return undefined;

    let reach = 0;
    const measure = () => {
      const block = element.offsetHeight;
      element.style.setProperty('--musie-header-block', `${block}px`);
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
  }, [header, pinned, place, show]);
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
