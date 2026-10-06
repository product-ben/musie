/**
 * Which URLs are PUBLIC — that is, served without an account and without ever
 * asking Supabase who is calling.
 *
 * There is one: `/beta`, the closed-beta sign-up page. Everything else is the
 * app, and the app is behind the gate.
 *
 * ── WHY THIS IS A STRING COMPARISON AND NOT A ROUTE ────────────────────────
 * Every screen in this app is a real route (`router.tsx` opens by saying so),
 * so a page that is not in the route table deserves an explanation.
 *
 * The public page has to be decided ABOVE `AuthProvider`, which is the one
 * thing the router cannot do — the router renders inside it. And the provider
 * is not passive: with `VITE_REQUIRE_ACCOUNT` off, no session means
 * `signInAnonymously()`, so a landing page mounted anywhere inside that tree
 * would create a real `auth.users` row for every visitor who ever read the
 * pitch. Today the flag is on and nothing would happen; the flag exists to be
 * turned off again (`lib/requireAccount.ts` is explicit that the anonymous
 * path is not dead code), and "the marketing page stops creating accounts
 * because of a deploy variable" is not a property to leave resting on one.
 *
 * So `main.tsx` asks this question of `window.location.pathname` before it
 * mounts anything, and the public page gets a tree of its own: no auth, no
 * profile, no router. What it costs is what a route would have given — a Back
 * button that means something within the page, and `handle.titleKey` — and the
 * page has no internal navigation to go Back through, so the second is the
 * only real loss. It sets its own `document.title`.
 *
 * ── THE MATCH IS FORGIVING, BECAUSE THIS URL GETS TYPED ────────────────────
 * It is read off a slide, a card or the end of a talk, so `/beta/`, `/Beta`
 * and `/BETA` all land on the page. Paths are case-sensitive to a server, but
 * Cloudflare answers every unmatched path with `index.html`
 * (`not_found_handling: single-page-application` in wrangler.jsonc) — so the
 * alternative is not a 404, it is the sign-in gate appearing for somebody who
 * typed the address correctly and capitalised it.
 *
 * It is NOT forgiving about prefixes: `/beta-test` and `/beta/thanks` are not
 * this page, and would reach the app's not-found route.
 */

/** The canonical spelling — what gets printed and shared. */
export const BETA_PATH = '/beta';

export function isPublicPath(pathname: string): boolean {
  /* One trailing slash removed, not every one: `/beta//` is a typo of a
     different kind and the app's not-found route is a fine answer to it.
     `replace` with a `$` anchor rather than a loop, for exactly that reason. */
  const normalised = pathname.replace(/\/$/, '').toLowerCase();
  return normalised === BETA_PATH;
}
