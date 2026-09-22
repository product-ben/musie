import type { Sentence } from './transcript/types';

/**
 * ─────────────────────────────────────────────────────────────
 *  EXTENSION POINT
 *  Called once per finalised statement, on all four paths that can produce
 *  one: a turn completing, Stop's grace period expiring, an edit being saved,
 *  and two statements being combined. F.6 makes this the Supabase write, which
 *  is why it is one function with one call site per path rather than a
 *  callback threaded through the hooks — and why F.6's note that it "fires on
 *  four paths, so it must be idempotent" belongs here rather than there.
 * ─────────────────────────────────────────────────────────────
 *
 * WHAT WAS LEFT BEHIND. The proof-of-concept's copy of this file carried a
 * `console.log` and a toast-listener registry — a `Set` of subscribers, a
 * `subscribeToToasts`, and a hardcoded "Sentence finished" raised on every
 * statement. All three were demo instrumentation: something had to be visible
 * on screen to prove the hook had fired at all. None of it came across. The
 * toast the product actually wants is the UNDO offer, and that one is already
 * owned by useSentences, which knows what was undone; a second toast saying a
 * sentence had finished would fire on every pause, over the top of it, in
 * English.
 */

/**
 * ── F.6 CHANGED THE PAYLOAD, AND THE REASON IS WORTH READING ─────────────
 * This used to hand over `(sentence, language)` — the text of the ONE
 * statement that had just finalised. That is what the four paths naturally
 * produce, and it is not enough to write with:
 *
 *   · two of the three call sites had no ID to write under. `append` mints
 *     ids inside the state updater, so the caller firing the event did not
 *     know what it had just created;
 *   · merging ENDS a statement. A per-statement event has no way to say "and
 *     this other row is gone";
 *   · moving changes no text at all, so nothing fired — yet `position` is a
 *     column, and a reordered list that was never written back is a
 *     reflection that reads in the wrong order tomorrow.
 *
 * So the payload is the WHOLE LIST after any change, and the handler upserts
 * it and deletes what is missing. That is idempotent by construction rather
 * than by care, which is what F.6 asks for — and it cannot miss a path,
 * because it is not wired per path any more. `useSentences` fires it from an
 * effect on the list, so append, edit, merge, move, delete and UNDO are all
 * covered by the same three lines.
 *
 * Writing every row on every change is the cost. A reflection is a handful of
 * statements and a change happens a few times a minute, so it buys
 * correctness for nothing measurable.
 */
export type StatementsHandler = (statements: Sentence[]) => void;

/** Does nothing until something replaces it. Nothing is what F.0 promises. */
let handler: StatementsHandler = () => {};

/**
 * Installs the handler. Returns the previous one, so a caller that takes over
 * temporarily can put back what it found rather than guessing.
 *
 * A module-level singleton rather than React context on purpose: the write
 * this becomes is not a rendering concern, and every call site is already
 * inside a hook that has no business knowing about it.
 */
export function setStatementsHandler(next: StatementsHandler): StatementsHandler {
  const previous = handler;
  handler = next;
  return previous;
}

export function onStatementsChanged(statements: Sentence[]): void {
  handler(statements);
}
