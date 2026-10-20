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
 * NEITHER PAGE EXISTS YET. `LEGAL-PAGES.md` plans `/privacy` as a public page
 * and has no terms page at all; both are a later step, and Ben accepted on
 * 2026-10-20 that these links 404 until then. They are written here rather
 * than inline so that the day the pages land, one file changes.
 */
export const TERMS_PATH = '/terms';
export const PRIVACY_PATH = '/privacy';
