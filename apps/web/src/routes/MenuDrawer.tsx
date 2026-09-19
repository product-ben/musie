/**
 * /menu — the route that drives the nav drawer.
 *
 * A thin adapter, and deliberately thin: everything visual lives in
 * components/NavDrawer.tsx, which owns no state.
 *
 * ── THE URL IS THE OVERLAY VALUE ───────────────────────────────────────────
 * The spec asked for a single `overlay` value — 'nav' | 'profile' | null —
 * rather than a boolean per overlay, so two overlays can never be open at
 * once and stack.
 *
 * `location.pathname` already IS that single value, and more strongly: it is
 * one value by construction, so two overlays cannot both be open even if
 * someone writes the code wrongly. It also keeps 2.1's rule — every screen is
 * a real route, so Back closes the drawer and /menu is linkable — which local
 * state cannot offer.
 *
 * The scrim follows from the same fact. It is its own element with a shared
 * `.musie-scrim` class, rendered by whichever overlay is mounted; only one can
 * be, because the URL permits one. (It cannot be hoisted above the Dialog:
 * base-ui's Backdrop is what wires click-outside dismissal.)
 */
import { NavDrawer } from '../components/NavDrawer';
import type { NavRow } from '../components/NavDrawer';
import { useCloseOverlay } from '../lib/useCloseOverlay';
import { useProfile } from '../lib/profileContext';
import { usePagePath } from '../lib/shellContext';
import { readActiveSession } from '../lib/session';

export function MenuDrawer() {
  const close = useCloseOverlay();
  const { profile } = useProfile();
  const pagePath = usePagePath();

  /**
   * ── THE ACTION ROW IS ONE ROW, NOT TWO ─────────────────────────────────
   * While a session is active the drawer offers "Continue session"; otherwise
   * it offers "Start a session". They are alternatives, so exactly one is in
   * the list — which is what "the start CTA is hidden while a session runs"
   * means structurally, rather than rendering both and hiding one.
   *
   * CURRENTLY ALWAYS THE START BRANCH: readActiveSession() returns null
   * because no sessions table exists yet. See lib/session.ts.
   */
  const activeSession = readActiveSession();

  /**
   * Where "Start a session" goes, and it is TWO gates, not one:
   *
   *   1. no user type recorded → /about asks who they are here as first
   *      (2.5's rule, and the reason /about exists on first use);
   *   2. otherwise → /exercises, where they pick what to start with.
   *
   * Falls back to /about while the profile is loading or unavailable, because
   * asking again is recoverable and skipping the question is not.
   */
  const startHref = profile?.user_type_id ? '/exercises' : '/about';

  const action: NavRow = activeSession === null
    ? { id: 'start', labelKey: 'menu.startSession', href: startHref, action: true }
    : {
        id: 'continue',
        labelKey: 'menu.continueSession',
        href: `/session/${encodeURIComponent(activeSession.id)}/${activeSession.step}`,
        action: true,
      };

  /**
   * The list as DATA, and the order is the design rather than an accident:
   * the ACTION first, the two things you look at next, and the explainer last
   * behind a rule, because it is the row you use once and then never again.
   */
  const pages: NavRow[] = [
    action,
    { id: 'diary', labelKey: 'menu.yourDiary', href: '/diary', separatorBefore: true },
    { id: 'about', labelKey: 'menu.aboutYou', href: '/about' },
    { id: 'how', labelKey: 'menu.howItWorks', href: '/', separatorBefore: true },
  ];

  /**
   * The current page is the one BENEATH the overlay. Open the drawer and the
   * location is /menu, but the user is still on whatever page it covers — so
   * the path comes from the shell, which already tracks it to keep that page
   * mounted. Null on a cold deep-link to /menu, where nothing preceded it, and
   * then no row is current.
   */
  const currentPage = pages.find((row) => !row.action && row.href === pagePath)?.id ?? null;

  return (
    <NavDrawer
      open
      onClose={close}
      currentPage={currentPage}
      /* The rows are anchors, so the router's navigation is what closes the
         drawer. Nothing to do here — see NavDrawerProps.onNavigate. */
      onNavigate={() => {}}
      pages={pages}
    />
  );
}
