/**
 * Whether this browser has been shown the deck's legend.
 *
 * ── WHY localStorage AND NOT THE PROFILE ──────────────────────────────────
 * The two candidates are a `profiles` column, which follows the person to any
 * device, and web storage, which does not. This is the second: the legend
 * explains CONTROLS — a card you press, two chevrons, a filter — and controls
 * are learnt per device rather than per account. Somebody who has used the
 * deck on a phone still meets a mouse and a 1280px window for the first time.
 *
 * It is also the house pattern for exactly this shape of answer: the cached
 * locale, the theme and the chosen goal all live here, all through a two-line
 * read-and-write with a try/catch around it (`cacheLocale`, `cacheGoal`).
 *
 * ── NO STORE MEANS SHOW IT ────────────────────────────────────────────────
 * Private modes and blocked site data make the accessor itself throw. With
 * nowhere to remember, the two possible policies are "always" and "never", and
 * never is the one that silently withholds an explanation from the people most
 * likely to be new. Always is a little irritating and entirely recoverable —
 * the legend goes away on any press, and the state holding that is React's, so
 * it comes back only on a reload.
 */

/** The two methods this needs, so the policy can be tested without a DOM —
 *  both vitest projects are `environment: 'node'`. */
export interface GuideStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Namespaced like every other key this app keeps in web storage. */
export const DECK_GUIDE_KEY = 'musie-deck-guide';

export function guideStore(): GuideStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** True the first time, and after site data is cleared. See the header. */
export function shouldShowDeckGuide(store: GuideStore | null): boolean {
  if (store === null) return true;
  try {
    return store.getItem(DECK_GUIDE_KEY) === null;
  } catch {
    return true;
  }
}

/**
 * Remember that it has been read.
 *
 * A failed write is not reported: the cost is one more legend on the next
 * visit, which is the same thing a private window gets by design, and there is
 * nothing a reader could do about it.
 */
export function noteDeckGuideSeen(store: GuideStore | null): void {
  if (store === null) return;
  try {
    store.setItem(DECK_GUIDE_KEY, 'seen');
  } catch {
    /* See above. */
  }
}
