/**
 * What counts as an answer.
 *
 * ── WHY THIS IS ITS OWN MODULE AND NOT A CONST IN THE STEP ─────────────────
 * The rule is needed in two places: the reflect step decides what to draw, and
 * `Session.tsx` decides whether *Finish session* is enabled — because the
 * action row belongs to `WizardPanel` and is filled by the session rather than
 * by the step. Exporting it from the component's own file made that file
 * export a component AND a function, which is the react-refresh warning and,
 * more usefully, a real smell: this is a rule about the session's data, not
 * about a rendered thing.
 *
 * It is also pure, which is the other half of the argument — it can be tested
 * with nothing mounted.
 */

/**
 * How the text was produced. The same three values `reflections.mode` allows,
 * and deliberately the same spellings: the column is the vocabulary, and a
 * second set of names here would be a mapping nobody asked for.
 */
export type ReflectMode = 'text' | 'voice' | 'photo';

/**
 * Whether there is an ANSWER TO SAVE.
 *
 * It does not decide whether the step can be left — *Skip reflection* leaves
 * it with nothing saved, and that is a separate path in `Session.tsx` that
 * never consults this. This is one question only: is there something to write
 * into `reflections.body`, which is `not null`.
 *
 * VOICE COUNTS SINCE F.6, and the day this comment anticipated has arrived: a
 * transcript is words, and words are what this asks for. But it is not the
 * same words — the typed box is empty in voice mode, because the statements
 * live in the transcript editor. So voice is asked about SEPARATELY, through
 * `spokenWords`, which the reflect step reports upward from the list it holds.
 *
 * PHOTO STILL CANNOT SATISFY IT. It is an interactive mockup and produces
 * nothing to store, so a session finished from it would claim a reflection
 * that does not exist. It says so on screen rather than being hidden — the
 * honest version of a disabled button.
 */
export function hasAnswered(mode: ReflectMode, text: string, spokenWords = false): boolean {
  if (mode === 'voice') return spokenWords;
  return mode === 'text' && text.trim().length > 0;
}

/**
 * ── TWO SHEETS ON ONE STEP, SO TWO TOKENS — 2026-10-16 ────────────────────
 *
 * `SHEET_OPEN` (`?focus`, in lib/digitalCards.ts) means *a sheet is up*, and
 * its header argues at length that which sheet should be decided by the step
 * rather than by a second token. That argument holds everywhere it was
 * written about — and the reflect step is the case it did not have: it has
 * TWO sheets, so the step cannot decide, and one token would be a state the
 * screen could not resolve.
 *
 * These are therefore not a second name for `?focus`. They are the names of
 * two different sheets, which is what Ben's brief calls them.
 *
 * THEY ARE EXCLUSIVE, and the screen resolves rather than renders both — a
 * hand-typed `?focus-feelings&focus-thoughts` opens feelings. The same rule
 * `SessionListen` applies to `?focus&overview`.
 */
export const FOCUS_FEELINGS = 'focus-feelings';
export const FOCUS_THOUGHTS = 'focus-thoughts';

/** Which reflect sheet the address is asking for, if either. */
export type ReflectSheet = typeof FOCUS_FEELINGS | typeof FOCUS_THOUGHTS;
