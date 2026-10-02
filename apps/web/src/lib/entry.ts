/**
 * Where opening Musie takes you.
 *
 * ── WHY THIS IS A FUNCTION AND NOT A REDIRECT ──────────────────────────────
 * `/` used to BE the explainer, which held this decision inside itself: a
 * returning visitor arriving cold was bounced to /exercises from within
 * `AboutMusie`. 2026-10-02 gave the explainer its own route, `/about`, and the
 * decision had to go somewhere.
 *
 * It could NOT go with the page. The skip's first condition is "this page is
 * where the app was opened", which React Router expresses as
 * `location.key === 'default'` — the first entry in a history stack. A `/` that
 * merely redirected to `/about` would mint a second entry, so the condition
 * would be false by the time anything could read it, and every returning
 * visitor would be shown the explainer on every cold open. Keeping the decision
 * at `/` keeps the condition true by construction: **`/` IS the cold arrival.**
 *
 * ── WHY IT IS PURE ─────────────────────────────────────────────────────────
 * Both inputs are facts the caller already holds, and the whole of the
 * behaviour is in which pair maps to which destination — exactly the part that
 * can be wrong without anything throwing. `lib/requireAccount.ts` splits itself
 * the same way and for the same reason.
 */

/** The two places `/` can send somebody. Not `string`: there are two. */
export type EntryDestination = '/about' | '/exercises';

/**
 * `arrivedCold` — the app was OPENED here (typed URL, bookmark, reload),
 * rather than navigated here from inside the app.
 *
 * `hasUserType` — `profiles.user_type_id is not null`, which is this app's one
 * definition of "has been here before". The nav drawer forks on the same column
 * to decide where *Start a session* goes, so there is one source of truth for
 * "returning" rather than a second one in localStorage that can disagree.
 *
 * NOT COLD means somebody inside the app asked for `/`, and the honest answer
 * to that is the explainer — it is what `/` is about. The only reason this
 * takes `arrivedCold` at all is that the two cases genuinely differ: opening
 * Musie takes you to the library, asking for the front page shows you the front
 * page.
 */
export function entryDestination(arrivedCold: boolean, hasUserType: boolean): EntryDestination {
  return arrivedCold && hasUserType ? '/exercises' : '/about';
}
