/**
 * Which URLs are PUBLIC — that is, served without an account and without ever
 * asking Supabase who is calling.
 *
 * There are THREE now: `/beta`, the closed-beta sign-up, and the two pages the
 * law asks for. Everything else is the app, and the app is behind the gate.
 *
 * ── WHY THE LEGAL PAGES HAD TO JOIN THIS LIST ──────────────────────────────
 * `§ 5 DDG` wants an Impressum that is *leicht erkennbar, unmittelbar
 * erreichbar und ständig verfügbar*, and Art. 13 DSGVO wants the privacy
 * notice available where data is collected rather than after. A legal page
 * behind a sign-in form is neither: a stranger who types /impressum would meet
 * a password field, which is the one answer that cannot be right.
 *
 * And the argument this file was written for applies to them more strongly
 * than to the sign-up page: a stranger who reaches `AuthProvider` with no
 * session is shown the gate INSTEAD of whatever was below it, so an Impressum
 * mounted in that tree would not be unreachable-ish, it would be unreachable —
 * a password field standing where a legal document is supposed to be, for
 * exactly the people the obligation exists to serve.
 *
 * ── WHY A STRING COMPARISON AND NOT A ROUTE ────────────────────────────────
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
 * mounts anything, and the public pages get a tree of their own: no auth, no
 * profile, no router. What that costs is what a route would have given — a
 * Back button that means something within the page, and `handle.titleKey`.
 * None of these three has internal navigation, and each sets its own
 * `document.title`.
 *
 * ── THE MATCH IS FORGIVING, BECAUSE THESE URLS GET TYPED ───────────────────
 * `/beta` is read off a slide, a card or the end of a talk; `/impressum` is
 * typed by somebody who expects every German site to have one. So `/beta/`,
 * `/Beta` and `/BETA` all land on the page, and so do `/Impressum` and
 * `/Datenschutz`. Paths are case-sensitive to a server, but Cloudflare answers
 * every unmatched path with `index.html`
 * (`not_found_handling: single-page-application` in wrangler.jsonc) — so the
 * alternative is not a 404, it is the sign-in gate appearing for somebody who
 * typed the address correctly and capitalised it.
 *
 * It is NOT forgiving about prefixes: `/beta-test`, `/beta/thanks` and
 * `/privacy-policy` are not these pages, and reach the app's not-found route.
 *
 * ── TWO SPELLINGS PER LEGAL PAGE, ONE CANONICAL ────────────────────────────
 * `/impressum` is canonical and `/imprint` resolves to it; `/privacy` is
 * canonical and `/datenschutz` resolves to it. The aliases exist because the
 * word somebody types depends on the language they are thinking in, and the
 * cost of accepting both is one entry in a table. The LINKS always use the
 * canonical spelling — see components/LegalLinks.tsx — so there is one URL
 * anybody can copy, and the other is a courtesy to whoever guessed.
 */

/** The canonical spellings — what gets printed, linked and shared. */
export const BETA_PATH = '/beta';
export const IMPRINT_PATH = '/impressum';
export const PRIVACY_PATH = '/privacy';

/** Which public page a path names, or null for "this is the app". */
export type PublicPage = 'beta' | 'imprint' | 'privacy';

/**
 * Every spelling that resolves, lower-cased and without a trailing slash.
 *
 * ONE TRAILING SLASH REMOVED, NOT EVERY ONE: `/beta//` is a typo of a
 * different kind and the app's not-found route is a fine answer to it.
 * `replace` with a `$` anchor rather than a loop, for exactly that reason.
 */
const PAGES = new Map<string, PublicPage>([
  [BETA_PATH, 'beta'],
  [IMPRINT_PATH, 'imprint'],
  ['/imprint', 'imprint'],
  [PRIVACY_PATH, 'privacy'],
  ['/datenschutz', 'privacy'],
]);

export function publicPage(pathname: string): PublicPage | null {
  const normalised = pathname.replace(/\/$/, '').toLowerCase();
  return PAGES.get(normalised) ?? null;
}

/**
 * Kept, because the question "is this the app?" is asked in one place and
 * reads better as a boolean there. It is now one line over `publicPage`
 * rather than a second copy of the matching rules — the bug this shape
 * prevents is the two disagreeing.
 */
export function isPublicPath(pathname: string): boolean {
  return publicPage(pathname) !== null;
}
