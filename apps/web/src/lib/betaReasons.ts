/**
 * How somebody heard about Musie — the list the `/beta` form offers.
 *
 * ── THIS IS THE FILE TO EDIT WHEN THERE IS A NEW ONE ───────────────────────
 * Adding a reason is three lines and no migration:
 *
 *   1. a row in BETA_REASONS below, with a code nobody has used before;
 *   2. the English label in `i18n/en.ts`, as `beta.reason.<code>`;
 *   3. the German label in `i18n/de.ts`, same key.
 *
 * Step 3 is not optional and cannot be forgotten: `de.ts` is typed against
 * `en.ts`, so an English key with no German fails `pnpm check` (rule 6). The
 * labels are CHROME — ours, permanent, and no spreadsheet will ever supply
 * them — which is why they are in the catalogue rather than in a content table.
 *
 * REMOVING one is different, and the asymmetry is the whole reason the code is
 * stored rather than the words. Rows already written keep the code they were
 * written with, and `beta_signups.reason_code` has no foreign key and no `in
 * (…)` check to stop them: an old code simply stops being OFFERED. Deleting a
 * row here is therefore safe for the database and lossy for nothing — but the
 * CATALOGUE KEY should outlive it, so that whoever is reading the list later
 * can still find out what `uxdx` meant.
 *
 * ── WHY NOT A LOOKUP TABLE ─────────────────────────────────────────────────
 * Because the public page would then have to fetch the options before it could
 * draw its own form, with a loading state and a failure state, for four words
 * that change about once a quarter — and each new reason would be a migration
 * plus an `_i18n` sibling row for its German. The migration header
 * (20261006120000_beta_signups.sql) sets the three options against each other
 * at more length.
 */
import type { MessageKey } from '../i18n';

export interface BetaReason {
  /** Stored verbatim in `beta_signups.reason_code`. See CODE_SHAPE. */
  code: string;
  labelKey: MessageKey;
}

/**
 * The column's own check constraint, written here so the test can hold this
 * list against it. It is a COPY of the SQL — a slug: lower case, ascii, first
 * character a letter, 40 at most — and the copy is deliberate: a code that
 * fails it is a failed insert in production and a red test here, and the test
 * is the cheaper of the two places to find out.
 */
export const CODE_SHAPE = /^[a-z][a-z0-9-]{0,39}$/;

/**
 * THE ORDER IS THE ORDER ON SCREEN, and it is not alphabetical: the two people
 * who are actually handing the link out come first, then the conference, then
 * the catch-all. `other` stays last wherever this list grows, because a
 * catch-all above a real answer invites people to take it.
 */
export const BETA_REASONS: readonly BetaReason[] = [
  { code: 'ben', labelKey: 'beta.reason.ben' },
  { code: 'lucy', labelKey: 'beta.reason.lucy' },
  { code: 'uxdx', labelKey: 'beta.reason.uxdx' },
  /* The one Ben did not name, and the reason it is here: with three options
     and a required answer, somebody who found Musie another way has to pick a
     wrong one — so the list would quietly fill with "Via Ben" rows that are
     not Ben's. A catch-all costs one row in the list and keeps the other three
     true. */
  { code: 'other', labelKey: 'beta.reason.other' },
];

/** Narrows a string from the form to a code this build actually offers. */
export function isBetaReasonCode(value: string): boolean {
  return BETA_REASONS.some((reason) => reason.code === value);
}
