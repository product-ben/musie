/**
 * /menu — the route that drives the nav drawer.
 *
 * A thin adapter, and deliberately thin: everything visual lives in
 * components/NavDrawer.tsx, which owns no state, and everything the drawer's
 * preferences are wired to lives in components/MenuPreferences.tsx, which owns
 * its own.
 *
 * ── IT IS THE ONLY OVERLAY NOW — Ben, 2026-09-24 ───────────────────────────
 * /settings is deleted. Dark mode, the language picker and the account moved
 * into this drawer (MenuPreferences), delete-everything moved to /diary, and
 * *Here as* went entirely because /about-you — a row in this list — already
 * asks it. The header lost its profile icon with the route.
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
import * as React from 'react';
import { useNavigate } from 'react-router';
import { MenuPreferences } from '../components/MenuPreferences';
import { NavDrawer } from '../components/NavDrawer';
import type { NavRow } from '../components/NavDrawer';
import { useCloseOverlay } from '../lib/useCloseOverlay';
import { useProfile } from '../lib/profileContext';
import { usePagePath } from '../lib/shellContext';
import { endSession, useActiveSession } from '../lib/session';

export function MenuDrawer() {
  const close = useCloseOverlay();
  const { profile } = useProfile();
  const pagePath = usePagePath();
  const navigate = useNavigate();

  /**
   * ── THE ACTION ROW IS ONE ROW, NOT TWO ─────────────────────────────────
   * While a session is active the drawer offers "Continue session"; otherwise
   * it offers "Start a session". They are alternatives, so exactly one is in
   * the list — which is what "the start CTA is hidden while a session runs"
   * means structurally, rather than rendering both and hiding one.
   *
   * NOW THREE BRANCHES, NOT TWO, because the answer is fetched rather than
   * known: *Continue session*, *Start a session*, and — until the read lands —
   * neither. The third is not padding. Guessing *Start a session* and swapping
   * it a beat later would let a fast tap try to open a second session, which
   * the unique index refuses with an error the user did nothing to deserve.
   * So the row renders busy and disabled while the answer is unknown.
   *
   * A FAILED read is treated as the loading case too, deliberately: what it
   * means is "we do not know", and the honest response to not knowing is not
   * to offer to start something. The error is already logged by useAsync.
   */
  const { data: activeSession, loading, error } = useActiveSession();
  const unknown = loading || error !== null;

  /**
   * ── ENDING THE RUNNING SESSION FROM THE MENU — Ben, 2026-09-24 ──────────
   * The drawer offered one thing to somebody mid-session: go back into it. The
   * way to start something ELSE was to go back in, close it there, and come
   * out again. This is that, in one row.
   *
   * `abandoned`, with a timestamp, which is the same write *Close session*
   * makes from inside the run and the same one the library's refusal makes —
   * three doors, one act, so the diary cannot tell them apart and does not
   * have to. `finished` would claim a reflection that never happened
   * (DOMAIN-MODEL's `started --> finished : completes the reflection`).
   *
   * THEN /exercises, REPLACING /menu, so Back does not reopen a drawer
   * offering to continue a session that is now over. The library reads its own
   * state on mount, so "fresh" costs nothing extra: nothing is running any
   * more, and the next tap starts rather than being refused.
   *
   * A FAILURE PUTS THE ROW BACK rather than navigating. Ending is the whole of
   * what this row promises; arriving at the library with the session still
   * running would be the refusal message one tap later, blaming the person for
   * something that already went wrong here.
   */
  const [ending, setEnding] = React.useState(false);

  async function endAndChoose(id: string) {
    if (ending) return;
    setEnding(true);
    try {
      await endSession(id, 'abandoned', new Date().toISOString());
      navigate('/exercises', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not end the session from the menu:', thrown);
      setEnding(false);
    }
  }

  /**
   * Where "Start a session" goes, and it is TWO gates, not one:
   *
   *   1. no user type recorded → /about-you asks who they are here as first
   *      (2.5's rule, and the reason /about-you exists on first use);
   *   2. otherwise → /exercises, where they pick what to start with.
   *
   * Falls back to /about-you while the profile is loading or unavailable,
   * because asking again is recoverable and skipping the question is not.
   */
  const startHref = profile?.user_type_id ? '/exercises' : '/about-you';

  let action: NavRow;
  if (unknown) {
    /* The label is the start label, but the row is disabled and announces
       itself busy, so it is never read as an offer. Keeping a label rather
       than emptying the row avoids the drawer reflowing under the user's
       thumb as the answer arrives. */
    action = {
      id: 'start',
      labelKey: 'menu.startSession',
      href: startHref,
      action: true,
      loading: true,
    };
  } else if (activeSession === null) {
    action = { id: 'start', labelKey: 'menu.startSession', href: startHref, action: true };
  } else {
    action = {
      id: 'continue',
      labelKey: 'menu.continueSession',
      href: `/session/${encodeURIComponent(activeSession.id)}/${activeSession.step}`,
      action: true,
    };
  }

  /**
   * The list as DATA, and the order is the design rather than an accident:
   * the ACTION first, the two things you look at next, and the explainer last
   * behind a rule, because it is the row you use once and then never again.
   *
   * ENDING SITS DIRECTLY UNDER *Continue session*, with no rule between them:
   * they are the two things you can do about the run you are in, and the rule
   * above *Your diary* is what separates that pair from the pages. It exists
   * ONLY when there is something to end — `unknown` included, because a row
   * offering to end a session we have not confirmed is running is a row that
   * can only disappoint.
   */
  const pages: NavRow[] = [
    action,
    ...(!unknown && activeSession !== null
      ? [{
        id: 'end',
        labelKey: 'menu.endSession' as const,
        /* No `href`: it writes first and decides where to go afterwards. */
        onSelect: () => void endAndChoose(activeSession.id),
        loading: ending,
      }]
      : []),
    { id: 'diary', labelKey: 'menu.yourDiary', href: '/diary', separatorBefore: true },
    { id: 'about', labelKey: 'menu.aboutYou', href: '/about-you' },
    { id: 'how', labelKey: 'menu.howItWorks', href: '/', separatorBefore: true },
  ];

  /**
   * The current page is the one BENEATH the overlay. Open the drawer and the
   * location is /menu, but the user is still on whatever page it covers — so
   * the path comes from the shell, which already tracks it to keep that page
   * mounted. Null on a cold deep-link to /menu, where nothing preceded it, and
   * then no row is current.
   */
  const currentPage = pages.find(
    (row) => !row.action && row.href !== undefined && row.href === pagePath,
  )?.id ?? null;

  return (
    <NavDrawer
      open
      onClose={close}
      currentPage={currentPage}
      /* The rows are anchors, so the router's navigation is what closes the
         drawer. Nothing to do here — see NavDrawerProps.onNavigate. */
      onNavigate={() => {}}
      pages={pages}
      /* Below the rows and behind a rule: the three things you set here rather
         than the places you go. It reads no props — the theme store, the locale
         and the auth session are all context or global — so there is nothing
         for this adapter to thread through. */
      preferences={<MenuPreferences />}
    />
  );
}
