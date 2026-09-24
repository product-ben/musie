/**
 * The one shell every route renders inside.
 *
 * DOM order is the deliverable here: header, then main. Everything below is
 * either that order or a consequence of it.
 */
import * as React from 'react';
import { Menu } from 'lucide-react';
import { IconButton, Logo, MusyTooltipProvider } from '@musie/design-system';
import { useLocation, useMatches, useNavigate, useOutlet } from 'react-router';
import { BRAND_NAME } from './brand';
import { useLocale, useT } from './i18n/localeContext';
import { useAuth } from './lib/authContext';
import { PagePathContext } from './lib/shellContext';
import { HeaderPinContext, useHeaderReveal } from './lib/useHeaderReveal';
import type { PinHeader } from './lib/useHeaderReveal';
import type { RouteHandle } from './routeHandle';

const MAIN_ID = 'main';

const MENU_PATH = '/menu';

export function AppShell() {
  const outlet = useOutlet();
  const matches = useMatches();
  const location = useLocation();
  const navigate = useNavigate();

  const leaf = matches[matches.length - 1];
  const handle = (leaf?.handle ?? {}) as Partial<RouteHandle>;
  const isOverlay = handle.overlay === true;

  /**
   * THE AUTH GATE. The shell — header and main landmark — renders
   * immediately, because none of it needs a user and blanking it would make
   * the page look broken during the round trip. What waits is the ROUTES,
   * since every one of them will read data as soon as there is data to read.
   *
   * Nothing elaborate while waiting: an empty main. No spinner, so there is no
   * copy to translate and nothing to delete when the real screens land.
   *
   * 'error' holds the same empty main. The reason is on the console, and
   * inventing an error screen now would be a product decision made by
   * accident.
   */
  const { status: authStatus } = useAuth();
  const { resolved: localeResolved } = useLocale();
  const authReady = authStatus === 'ready';

  /* Content waits for the locale as well as the user. The CHROME does not:
     re-labelling a button when profiles.language arrives is cheap, and for a
     returning user the cached locale is already right, so nothing flips.
     Fetching a list in the wrong language and swapping it is not cheap. */
  const contentReady = authReady && localeResolved;

  /**
   * An overlay route presents OVER the page rather than replacing it, but
   * `<Outlet>` only ever yields the leaf. So the last non-overlay page is kept
   * and re-rendered beneath — it is just a React element, so re-rendering a
   * held one is cheap and safe.
   *
   * Written during render rather than in an effect because the sheet's FIRST
   * render is the one that needs the page behind it; an effect would flash an
   * empty frame. The write is idempotent, so StrictMode's double render is not
   * a problem.
   *
   * `wide` is held alongside the element, or the page beneath would reflow
   * from 980px to `--bp-md` the moment the sheet opened over it.
   */
  const beneath = React.useRef<{ node: React.ReactNode; wide: boolean; path: string | null }>({
    node: null,
    wide: false,
    path: null,
  });
  if (!isOverlay) {
    beneath.current = {
      node: outlet,
      wide: handle.wide === true,
      /* Kept so an overlay can mark the right nav item current — the overlay
         IS the location, but the page underneath is where the user is. */
      path: location.pathname,
    };
  }

  /**
   * A COLD DEEP-LINK HAS NOTHING TO KEEP. Paste an overlay's URL into a fresh
   * tab and the ref above has never been written: the overlay IS the first
   * render, so there is no previous page, and `main` would be empty behind the
   * scrim. For /menu that is honest — it covers whatever page you were on and
   * belongs to no one page — so it says nothing and gets it.
   *
   * An overlay that belongs to exactly one page says which, in its handle, and
   * gets that page drawn beneath instead. It is the same three values the ref
   * holds, named by the route rather than remembered from a navigation.
   */
  const held = beneath.current;
  const cold = handle.beneath;
  const under = held.node !== null || cold === undefined
    ? held
    : { node: cold.element, wide: cold.wide === true, path: cold.path };

  const pageNode = isOverlay ? under.node : outlet;
  const pageWide = isOverlay ? under.wide : handle.wide === true;
  const pagePath = isOverlay ? under.path : location.pathname;

  const t = useT();
  const title = handle.titleKey ? t(handle.titleKey, leaf?.params) : BRAND_NAME;

  React.useEffect(() => {
    document.title = `${title} · ${BRAND_NAME}`;
  }, [title]);

  /**
   * Arriving at a route means arriving at its top — the prototype does this on
   * every screen AND every step change, and on a phone a long step otherwise
   * hands the next one a scroll position it was never at.
   *
   * Two things this deliberately does not do. It does not fire for an overlay
   * route: the sheet locks page scroll anyway, and scrolling the page behind it
   * would throw away the position the user returns to. And it compares the path
   * rather than trusting `location.key`, so closing the sheet — which restores
   * the previous entry, and with it that entry's key — does not read as an
   * arrival and does not scroll.
   */
  const scrolledFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (isOverlay) return;
    const path = location.pathname + location.search;
    if (scrolledFor.current === path) return;
    scrolledFor.current = path;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [isOverlay, location.pathname, location.search]);

  /**
   * THE HEADER GETS OUT OF THE WAY WHILE YOU READ.
   *
   * On a phone the sticky header costs 69px of every screen for as long as
   * you are on it, and the diary, the exercise library and the reflect step
   * are all longer than a window. So it slides out while the reader goes down
   * the page and comes back as soon as they come up. `useHeaderReveal` holds
   * the listener and `headerReveal.ts` every rule it applies; what belongs
   * here is only the three things the SHELL knows.
   *
   * WHICH PAGE COUNTS AS ARRIVING: `pagePath`, not the location — it is
   * already the path of the page underneath an overlay, so opening the drawer
   * over a scrolled page is not an arrival and closing it changes nothing.
   *
   * WHO MAY PIN IT: any screen that does its own scrolling, through
   * `usePinnedHeader`. Counted rather than set, because two screens overlap
   * for a frame during a route change; see the hook.
   *
   * WHERE THE ANSWER GOES: one attribute. The slide itself is a transform in
   * shell.css, so nothing here reflows and no geometry moves — the header is
   * drawn in the same place either way and only travels.
   */
  const headerRef = React.useRef<HTMLElement>(null);
  const [pins, setPins] = React.useState(0);
  const pinHeader = React.useCallback<PinHeader>(() => {
    setPins((count) => count + 1);
    return () => setPins((count) => count - 1);
  }, []);
  const headerHidden = useHeaderReveal(headerRef, pins > 0, pagePath ?? '');

  return (
    /* Mounted once, so a tooltip's open delay is not re-run per control. It was
       written for the two header buttons; the header has one now, and the
       provider still has to sit above everything that renders an IconButton. */
    <MusyTooltipProvider>
      <PagePathContext.Provider value={pagePath}>
      <HeaderPinContext.Provider value={pinHeader}>
      <div className="musie-app">
        <header
          ref={headerRef}
          className="musie-header"
          data-hidden={headerHidden ? 'true' : 'false'}
        >
          <IconButton
            glyph={Menu}
            label={t('shell.menuLabel')}
            variant="ghost"
            size="primary"
            aria-expanded={location.pathname === MENU_PATH}
            onClick={() => navigate(MENU_PATH)}
          />
          {/* AND NOTHING AFTER IT. The profile button went with /settings on
              2026-09-24: the preferences it opened are in the drawer now, so a
              second icon would open the same overlay the first one does. The
              header's third grid column is left in place and empty — `1fr auto
              1fr` is what centres the logo against the VIEWPORT, and dropping
              the column would centre it against the space left over beside the
              hamburger instead. See .musie-header. */}
          <Logo size="nav" showWordmark alt={BRAND_NAME} />
        </header>

        {/* NO SKIP LINK, and it is a removal rather than an omission — Ben,
            2026-09-20. WCAG 2.4.1 Bypass Blocks is a Level A criterion and this
            was how the app met it: one tab stop, first in the DOM, that jumped
            past the header.

            What is left in its place: `<main>` is still a real landmark with
            an id, so screen-reader users reach it by landmark navigation,
            which is how most of them actually move. What is lost is the
            KEYBOARD-ONLY, SIGHTED user, who has no landmark list — on this app
            that is one tab stop of header to walk past (two, until the profile
            button went with /settings), which is why the cost is small. It is a
            cost, though, and it is logged as one.

            `tabIndex={-1}` went with the link: it existed so the skip target
            could take programmatic focus, and nothing focuses main any more. */}
        <main
          id={MAIN_ID}
          className="musie-main"
          data-wide={pageWide ? '1' : '0'}
          data-auth={authStatus}
          data-locale-resolved={localeResolved ? '1' : '0'}
        >
          {contentReady ? pageNode : null}
        </main>

        {/* The overlay route's own element. It portals itself to the end of
            body, which is what `isolation: isolate` on .musie-app is for.
            Gated on the same condition as the page, so there is one rule
            rather than two that can disagree. */}
        {isOverlay && contentReady ? outlet : null}
      </div>
      </HeaderPinContext.Provider>
      </PagePathContext.Provider>
    </MusyTooltipProvider>
  );
}
