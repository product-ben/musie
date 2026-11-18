/**
 * The header moving with the page — the wiring half. `headerReveal.ts` holds
 * every decision and says why; what is left here is one scroll listener, one
 * measurement and the style writes.
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
 * ── AND SHAPES IT · 2026-11-18 ────────────────────────────────────────────
 * `data-form` — `pill` or `bar` — and `--musie-header-morph`, how far the bar
 * has become the pill (0 to 1). The form changes where the mode does, out of
 * sight or at the handover. The morph is the one value written on consecutive
 * scroll events, and only inside the 24px run before the handover: there it
 * IS the scroll position, so it has to be. It is not a position — the bar is
 * held still at the top of the window while it narrows — so a frame of lag
 * would change a width a frame late, not make anything swim. Rounded to three
 * places and written only on a change; everywhere else it holds 0 or 1 and
 * writes nothing.
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
 * the PILL's size in step — the one box that is the same height in both
 * forms — and the band is that height plus the band's own padding, which
 * shell.css names and this reads back rather than repeats. The band goes on
 * the APP ROOT as `--musie-header-block`, which pads its top by it: out of the
 * flow, the header no longer reserves its own space, so the root does it for
 * it.
 *
 * NOT THE HEADER'S OWN HEIGHT any more: as the bar it has no band round it,
 * and a root padded by THAT would pull the whole page up 32px the moment the
 * bar appeared.
 *
 * Three more numbers come out of the same reading. The band plus the CSS's
 * `--musie-header-clearance` is `reach`, how far above the window a pill
 * waits. The pill's height, halved, is the bar's corner (`--musie-pill-block`).
 * And its width, taken only while it IS the pill — as the bar it is stretched —
 * is what the bar narrows to (`--musie-pill-inline`).
 *
 * ── ONLY UP TO 1440 ───────────────────────────────────────────────────────
 * Ben, 2026-11-18. Over that the bar is off and the header behaves exactly as
 * before it. 1440 is not a Layer 1 breakpoint (`--bp-xl` is 1280), and a media
 * query cannot read a custom property anyway; so the number lives here, once,
 * logged as a token gap in OPEN-QUESTIONS.md.
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
import { AT_REST, morphAt, nextReveal, shownAt } from './headerReveal';
import type { BarGeometry, RevealState } from './headerReveal';

/** Where the bar stops — see ONLY UP TO 1440 above. */
const BAR_QUERY = '(max-width: 1440px)';

/** Re-measured on a change, because shell.css sets the morph's run to 0 there. */
const STILL_QUERY = '(prefers-reduced-motion: reduce)';

type Written = { at: number; mode: RevealState['mode']; form: RevealState['form']; morph: number };

type Geometry = { reach: number; bar: BarGeometry | null };

export function useHeaderReveal(
  header: React.RefObject<HTMLElement | null>,
  resetKey: string,
): void {
  const state = React.useRef<RevealState>(AT_REST);
  /* The measured numbers, so a scroll reads them rather than the layout. */
  const geometry = React.useRef<Geometry>({ reach: 0, bar: null });
  /* What is on the element right now, so a write happens only on a change. */
  const written = React.useRef<Written | null>(null);

  const place = React.useCallback((next: RevealState) => {
    state.current = next;
    const element = header.current;
    if (element === null) return;
    const morph = Math.round(morphAt(next, geometry.current.bar) * 1000) / 1000;
    const was = written.current;
    if (was === null || was.at !== next.at) {
      element.style.setProperty('--musie-header-at', `${next.at}px`);
    }
    if (was === null || was.mode !== next.mode) {
      element.dataset.mode = next.mode;
    }
    if (was === null || was.form !== next.form) {
      element.dataset.form = next.form;
    }
    if (was === null || was.morph !== morph) {
      element.style.setProperty('--musie-header-morph', String(morph));
    }
    written.current = { at: next.at, mode: next.mode, form: next.form, morph };
  }, [header]);

  /* Arrival and focus are both "showing, from here". On an arrival the page
     is already at 0, where that is simply the rest position. */
  const show = React.useCallback(() => {
    place(shownAt(window.scrollY, geometry.current.bar));
  }, [place]);

  /* Declared BEFORE the reset below, so the first `show` already knows
     whether there is a bar at this width. */
  React.useEffect(() => {
    const element = header.current;
    if (element === null) return undefined;
    const pill = element.querySelector<HTMLElement>('.musie-header__pill') ?? element;
    const barQuery = window.matchMedia(BAR_QUERY);
    const stillQuery = window.matchMedia(STILL_QUERY);

    const measure = () => {
      const style = getComputedStyle(element);
      /* A custom property's computed value has its var() resolved, so each
         of these is px — whatever token shell.css names. */
      const px = (name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;
      const box = pill.getBoundingClientRect();
      const top = px('--musie-header-pad-top');
      const bottom = px('--musie-header-pad-bottom');
      const clearance = px('--musie-header-clearance');
      const band = top + box.height + bottom;

      element.parentElement?.style.setProperty('--musie-header-block', `${band}px`);
      element.style.setProperty('--musie-pill-block', `${box.height}px`);
      if (state.current.form === 'pill') {
        element.style.setProperty('--musie-pill-inline', `${box.width}px`);
      }
      geometry.current = {
        reach: band + clearance,
        bar: barQuery.matches
          ? { reach: box.height + bottom + clearance, handover: top, morph: px('--musie-header-morph-run') }
          : null,
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);

    const onScroll = () => {
      place(nextReveal(state.current, {
        scrollY: window.scrollY,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        reach: geometry.current.reach,
        bar: geometry.current.bar,
      }));
    };

    /* Crossing 1440, or the motion preference changing: new numbers, and the
       same position read against them — a bar where there is no bar any more
       is the pill on the spot. */
    const onQuery = () => {
      measure();
      onScroll();
    };

    /* One reading now, before any gesture: the page may already be scrolled —
       a reload restores the position, and so does going Back. */
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('focusin', show);
    barQuery.addEventListener('change', onQuery);
    stillQuery.addEventListener('change', onQuery);

    return () => {
      window.removeEventListener('scroll', onScroll);
      element.removeEventListener('focusin', show);
      barQuery.removeEventListener('change', onQuery);
      stillQuery.removeEventListener('change', onQuery);
      observer.disconnect();
    };
  }, [header, place, show]);

  React.useEffect(() => { show(); }, [resetKey, show]);
}
