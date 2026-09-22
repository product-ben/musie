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
