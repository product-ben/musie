/**
 * The one shell every route renders inside.
 *
 * DOM order is the deliverable here: header, then main. Everything below is
 * either that order or a consequence of it.
 */
import * as React from 'react';
import { Menu } from 'lucide-react';
import { IconButton, Logo, MusyTooltipProvider } from '@musie/design-system';
import { Link, useLocation, useMatches, useNavigate, useOutlet } from 'react-router';
import { BRAND_NAME } from './brand';
import { useLocale, useT } from './i18n/localeContext';
import { useAuth } from './lib/authContext';
import { useProfile } from './lib/profileContext';
import { PagePathContext } from './lib/shellContext';
import { useHeaderReveal } from './lib/useHeaderReveal';
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
   * On a phone the header costs 88px of every screen for as long as you are
   * on it (`--sticky-block`), and the diary, the exercise library and the
   * reflect step are all longer than a window. So it leaves with the page
   * while the reader goes down, one pixel for one pixel, and comes back with
   * it as soon as they come up (Ben, 2026-11-17: „direkt und ohne lag").
   * `useHeaderReveal` holds the listener and `headerReveal.ts` every rule it
   * applies; what belongs here is only the two things the SHELL knows.
   *
   * WHICH PAGE COUNTS AS ARRIVING: `pagePath`, not the location — it is
   * already the path of the page underneath an overlay, so opening the drawer
   * over a scrolled page is not an arrival and closing it changes nothing.
   *
   * NO SCREEN PINS IT any more. The listen step did, until its views stopped
   * being sized around the header (2026-11-17); with nothing left to call it,
   * the pin went too.
   *
   * WHERE THE ANSWER GOES: nowhere in React. The browser moves the header —
   * it is sticky, in the flow of the page — and the hook only places it, by
   * writing to the element directly at a turn. No scroll renders the shell.
   */
  const headerRef = React.useRef<HTMLElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  useHeaderReveal(headerRef, ghostRef, pagePath ?? '');

  /**
   * THE LOGO GOES HOME · Ben, 2026-11-18: „klicking on musie/the logo brings
   * me back to /exercises". Home is /exercises behind the same gate every
   * other way there uses (MenuDrawer's `startHref`): no user type yet means
   * /about-you, which asks it first, and so does a profile still loading —
   * asking again is recoverable, skipping the question is not.
   *
   * ALREADY THERE, it goes to the top. The router does nothing visible for a
   * link to the current page, and the arrival scroll above keys on the path,
   * so without this a logo tapped half way down the library would seem dead.
   */
  const { profile } = useProfile();
  const homeHref = profile?.user_type_id ? '/exercises' : '/about-you';
  const goHome = () => {
    if (location.pathname === homeHref) window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    /* Mounted once, so a tooltip's open delay is not re-run per control. It was
       written for the two header buttons; the header has one now, and the
       provider still has to sit above everything that renders an IconButton. */
    <MusyTooltipProvider>
      <PagePathContext.Provider value={pagePath}>
      <div className="musie-app">
        {/* THE GHOST · 2026-11-18. On the way back up the header is a bar,
            and where it becomes the pill again the bar fades out while the
            pill fades in (`useHeaderReveal`). The header is the pill from
            that frame on, so the bar that fades is this: a copy of it, held
            at the bar's place by its own two attributes, hidden until the
            hook fades it. Decoration only — `aria-hidden` and `inert`, so
            its button is in no tab order and its name in no tree; the label
            is passed all the same, because nothing user-visible is left to
            a default (CLAUDE.md rule 7). Before the header, so the pill
            fades in above it. */}
        <div
          ref={ghostRef}
          className="musie-header musie-header--ghost"
          data-mode="held"
          data-form="bar"
          aria-hidden="true"
          inert
        >
          <div className="musie-header__pill">
            <Logo size="nav" variant="flat" showWordmark alt={BRAND_NAME} />
            <IconButton glyph={Menu} label={t('shell.menuLabel')} variant="ghost" size="sm" />
          </div>
        </div>

        {/* `--musie-header-at`, `data-mode` and `data-form` are written by
            `useHeaderReveal`, straight onto the element and only when they
            change: rendering them here would re-render the shell on every
            turn and fight the hook over who owns them. */}
        <header ref={headerRef} className="musie-header">
          {/* THE PILL · Ben, 2026-11-17 (Figma *Einsteigen · Bodyscan ·
              17.11.*). The full-width bar with its centred logo became one
              rounded pill at the inline start: the flat mark and the wordmark,
              then the menu button. The header element is the transparent band
              it floats in — the band is what the page starts below, and the
              pill is the only part of it that takes a pointer (shell.css).

              Logo before the button, and that is the reading order too. The
              logo is a link home since 2026-11-18, so the header has two tab
              stops again: the logo, then the menu button. `render` is the
              Logo's own composition point for exactly this (Logo.tsx: wrapping
              it in an anchor is the app's job); its name is the wordmark.

              The profile button went with /settings on 2026-09-24, and nothing
              has taken its place: the drawer holds what it opened. */}
          <div className="musie-header__pill">
            <Logo
              size="nav"
              variant="flat"
              showWordmark
              alt={BRAND_NAME}
              className="musie-header__home"
              render={<Link to={homeHref} onClick={goHome} />}
            />
            <IconButton
              glyph={Menu}
              label={t('shell.menuLabel')}
              variant="ghost"
              size="sm"
              aria-expanded={location.pathname === MENU_PATH}
              onClick={() => navigate(MENU_PATH)}
            />
          </div>
        </header>

        {/* NO SKIP LINK, and it is a removal rather than an omission — Ben,
            2026-09-20. WCAG 2.4.1 Bypass Blocks is a Level A criterion and this
            was how the app met it: one tab stop, first in the DOM, that jumped
            past the header.

            What is left in its place: `<main>` is still a real landmark with
            an id, so screen-reader users reach it by landmark navigation,
            which is how most of them actually move. What is lost is the
            KEYBOARD-ONLY, SIGHTED user, who has no landmark list — on this app
            that is two tab stops of header to walk past (the logo, a link home
            since 2026-11-18, and the menu button; it was one from the profile
            button going with /settings until then), which is why the cost is
            small. It is a cost, though, and it is logged as one.

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
