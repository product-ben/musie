/**
 * The one shell every route renders inside.
 *
 * DOM order is the deliverable here: header, then main. Everything below is
 * either that order or a consequence of it.
 */
import * as React from 'react';
import { Menu, User } from 'lucide-react';
import { IconButton, Logo, MusyTooltipProvider } from '@musie/design-system';
import { useLocation, useMatches, useNavigate, useOutlet } from 'react-router';
import { BRAND_NAME } from './brand';
import { useLocale, useT } from './i18n/localeContext';
import { useAuth } from './lib/authContext';
import { PagePathContext } from './lib/shellContext';
import type { RouteHandle } from './routeHandle';

const MAIN_ID = 'main';

const SETTINGS_PATH = '/settings';
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
   * scrim. For /menu and /settings that is honest — they cover whatever page
   * you were on and belong to no one page — so they say nothing and get it.
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

  return (
    /* Mounted once, so moving between the two header buttons does not re-run
       the open delay. */
    <MusyTooltipProvider>
      <PagePathContext.Provider value={pagePath}>
      <div className="musie-app">
        <header className="musie-header">
          <IconButton
            glyph={Menu}
            label={t('shell.menuLabel')}
            variant="ghost"
            size="primary"
            aria-expanded={location.pathname === MENU_PATH}
            onClick={() => navigate(MENU_PATH)}
          />
          <Logo size="nav" showWordmark alt={BRAND_NAME} />
          <IconButton
            glyph={User}
            label={t('shell.profileLabel')}
            variant="ghost"
            size="primary"
            aria-expanded={location.pathname === SETTINGS_PATH}
            onClick={() => navigate(SETTINGS_PATH)}
          />
        </header>

        {/* NO SKIP LINK, and it is a removal rather than an omission — Ben,
            2026-09-20. WCAG 2.4.1 Bypass Blocks is a Level A criterion and this
            was how the app met it: one tab stop, first in the DOM, that jumped
            past the header.

            What is left in its place: `<main>` is still a real landmark with
            an id, so screen-reader users reach it by landmark navigation,
            which is how most of them actually move. What is lost is the
            KEYBOARD-ONLY, SIGHTED user, who has no landmark list — on this app
            that is two tab stops of header to walk past, which is why the cost
            is small. It is a cost, though, and it is logged as one.

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
      </PagePathContext.Provider>
    </MusyTooltipProvider>
  );
}
