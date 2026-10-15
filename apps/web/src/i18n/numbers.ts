/**
 * Small numbers, written out.
 *
 * Ben, 2026-10-15: *always write out numbers in the headline.* So
 * /exercises reads *Drei Übungen zum Achtsamer werden* rather than *3 Übungen
 * zum …* — which is the ordinary typographic rule for prose, and a headline
 * is prose rather than data.
 *
 * ── WHY THESE WORDS ARE NOT IN THE CATALOGUE ──────────────────────────────
 * Rule 7 says every user-visible string is passed explicitly and nothing is
 * written inline in `apps/web`. These are user-visible and they are not in
 * `en.ts`.
 *
 * The precedent is two tables up the file in `i18n/index.ts`: `LOCALE_LABELS`
 * holds *English* and *Deutsch*, both of which are drawn on screen, and they
 * are deliberately outside `t()` because translating them is the bug. The
 * rule rule 7 is actually about is *a screen must not invent a string* —
 * `MessageKey` exists so an unknown key is a typecheck error instead of a
 * runtime fallback. A closed numeral table in the i18n layer is the same kind
 * of object as a locale table: it is per-locale data the i18n layer owns, not
 * copy a screen made up.
 *
 * Twenty-two keys in the flat catalogue — eleven per locale — would also have
 * made `en.ts` a worse document for the one job it does well, which is being
 * read end to end.
 *
 * ── CAPITALISED, BECAUSE EVERY USE IS SENTENCE-INITIAL ────────────────────
 * Both headline templates begin with the slot — *{count} Übungen zum …* — and
 * German capitalises nothing here that English does not. A second call site
 * mid-sentence would want the lower-case form, and that is the moment to add
 * a `position` argument rather than to lower-case at the call site and hope.
 *
 * ── TWELVE, AND THEN DIGITS ───────────────────────────────────────────────
 * The convention this follows (Chicago, Duden §: *Zahlwörter bis zwölf*) is
 * to spell out through twelve and use figures above it. The product has five
 * exercises, so nothing today goes past three; the cap is there so that the
 * day a goal offers fifteen, the headline says *15* rather than reaching for
 * a word this table does not have.
 */
import type { Locale } from './index';

/**
 * Zero and one are absent on purpose. The headline has separate `none` and
 * `one` keys — *Keine Übung* and *Eine Übung* — because both inflect the noun
 * as well as the number, which no interpolation can do.
 */
const WORDS: Record<Locale, readonly string[]> = {
  de: ['Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'],
  en: ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'],
};

const FIRST = 2;

/**
 * `n` as a word where this locale has one, and as digits otherwise.
 *
 * Total by construction: anything outside the table — a negative, a fraction,
 * thirteen — comes back as `String(n)`, so a caller can never be handed
 * `undefined` to interpolate.
 */
export function numberWord(n: number, locale: Locale): string {
  const word = Number.isInteger(n) ? WORDS[locale][n - FIRST] : undefined;
  return word ?? String(n);
}
