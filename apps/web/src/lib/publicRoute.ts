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
 * thing the router cannot do — the router renders inside it.
 *
 * ── THE REASON CHANGED ON 2026-10-20, AND THE CONCLUSION DID NOT ──────────
 * It used to be that `AuthProvider` would CREATE something: with
 * `VITE_REQUIRE_ACCOUNT` off, no session meant `signInAnonymously()`, so a
 * landing page mounted inside that tree minted a real `auth.users` row for
 * every stranger who read the pitch and left.
 *
 * Anonymous accounts are gone and so is the flag, so nothing is created any
 * more. What the provider does now is REFUSE: no session resolves to
 * `{ kind: 'gate' }`, and `SessionGate` renders the sign-in screen in place of
 * whatever was below it. A public page mounted inside that tree would
 * therefore never be reachable at all — a stranger sent to `/beta` would be
 * shown a form asking for an access code they have not got.
 *
 * Weaker failure, stronger argument: the old one rested on a deploy variable
 * that was meant to be flipped, and this one cannot be switched off.
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
