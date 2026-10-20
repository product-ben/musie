/**
 * Which version of the terms and the privacy policy is on screen right now.
 *
 * ── WHY A CONSTANT AND NOT A DATE FROM THE SERVER ─────────────────────────
 * The documents are pages this app serves (`LEGAL-PAGES.md` §2: `/impressum`
 * and `/privacy` are public pages, like `/beta`), not rows in a table. So the
 * version is a property of the BUNDLE, and the bundle is the only thing that
 * knows which wording a person actually saw.
 *
 * ── CHANGE THESE WHEN THE WORDING CHANGES, AND ONLY THEN ──────────────────
 * A new value means "this is a different document now", and everybody who
 * signed up under the old one keeps a row saying so. Bumping it for a typo
 * would ask the whole beta to re-agree to nothing; not bumping it for a real
 * change makes every earlier row claim something untrue. The date is the date
 * the WORDING changed, never today's date.
 *
 * ── THEY MOVE INDEPENDENTLY ───────────────────────────────────────────────
 * Two constants rather than one, because the two documents are revised by
 * different people for different reasons — and `legal_acceptances` keys on
 * (document, version) precisely so they can disagree.
 *
 * `YYYY-MM-DD`, matched by a check constraint in
 * `20261020160000_legal_acceptances.sql`. A value this file and the database
 * disagree about is refused rather than stored.
 */

/** The terms, which sign-up requires a tick for. */
export const TERMS_VERSION = '2026-10-20';

/**
 * The privacy policy, which sign-up does NOT require a tick for.
 *
 * It is linked and acknowledged beside the terms, never toggled — Ben,
 * 2026-10-20. A privacy policy is information provided under Art. 13 DSGVO,
 * and a required box agreeing to it is bundled consent. The version is still
 * recorded, because *which notice was on screen* is the Art. 13 fact that
 * cannot be reconstructed later.
 */
export const PRIVACY_VERSION = '2026-10-20';

/**
 * Where the two documents live.
 *
 * ── ONE OF THEM EXISTS NOW, AND IT IS NOT SPELLED HERE ────────────────────
 * This file said "NEITHER PAGE EXISTS YET … both links 404 until then". Half
 * of that stopped being true the day `/privacy` landed as a public page, and
 * the spelling of a public path belongs to the one list that decides what IS
 * public: `lib/publicRoute.ts`. Re-exported rather than repeated, so the two
 * cannot drift into a link that points at a page the allowlist does not serve
 * — which would not 404, it would show the sign-in gate.
 *
 * `/terms` is still a promise. There is no terms page, `publicRoute.ts` does
 * not serve one, and a visitor who follows that link meets the gate rather
 * than a 404. It stays a plain string here because adding it to the allowlist
 * would make the app answer for a document nobody has written — see
 * LEGAL-PAGES.md §8, where terms are deliberately out of scope.
 */
export { PRIVACY_PATH } from './publicRoute';
export const TERMS_PATH = '/terms';
