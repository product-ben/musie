/**
 * Splitting a rendered message around a slot that was deliberately left
 * unfilled, so a component can put an ELEMENT where a string cannot go.
 *
 * ── THE PROBLEM, AND WHY IT IS NOT SOLVED WITH THREE KEYS ─────────────────
 * /exercises' headline is "3 Übungen zum **Entspannen**", and the goal in it
 * is a control — an `InlineLink` that opens the goal sheet. `translate()`
 * returns a string, so the link cannot be a parameter.
 *
 * The obvious answer is three keys — a prefix, the link's own text, and a
 * suffix — and it is wrong in both the ways that matter. It fixes the WORD
 * ORDER in the component, so a language that puts the goal first cannot be
 * written at all; and it hands a translator three fragments with no sentence
 * to read, which is how "Übungen" ends up on the wrong side of a number.
 *
 * ── WHAT THIS DOES INSTEAD ────────────────────────────────────────────────
 * One template per locale, with two slots, and only one of them filled:
 *
 *     t('exercises.headline.other', { count: '3' })   →  "3 Übungen zum {goal}"
 *     splitSlot(that, 'goal')                         →  ['3 Übungen zum ', '']
 *
 * `translate()` leaves an unmatched slot VERBATIM — it is written that way so
 * a missing parameter shows up on screen rather than as an empty gap — and
 * this function is the other half of that behaviour rather than a trick
 * played on it. The slot is free to sit anywhere in the sentence, including
 * first, and the catalogue still reads as a sentence.
 *
 * ── IT IS IN i18n/ AND NOT IN lib/ ────────────────────────────────────────
 * The `{name}` syntax is `translate()`'s, declared in `index.ts`, and nothing
 * outside this folder should know the shape of a slot. A second screen
 * wanting a control inside a sentence imports this rather than writing the
 * regex again.
 */

/**
 * Split `text` around the literal slot `{name}`.
 *
 * Returns the text before and after it, or **null** when the slot is not
 * there — which is a catalogue that has lost it, and is a case the caller has
 * to answer rather than one this function can paper over. `parity.test.ts`
 * asserts every headline string in both locales still contains its slot, so
 * null is insurance and not a path anybody takes.
 *
 * ONLY THE FIRST OCCURRENCE. A sentence naming the same control twice would
 * be two controls with one name, which is a 4.1.2 problem rather than a
 * formatting one, so splitting on the first and leaving the rest visible is
 * the honest failure.
 */
export function splitSlot(text: string, name: string): [string, string] | null {
  const slot = `{${name}}`;
  const at = text.indexOf(slot);
  if (at === -1) return null;
  return [text.slice(0, at), text.slice(at + slot.length)];
}
