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

/** @param sentence  The finalised statement, cleaned. @param language  "de" | "en", or whatever was detected. */
export type SentenceFinalHandler = (sentence: string, language: string) => void;

/** Does nothing until something replaces it. Nothing is what F.0 promises. */
let handler: SentenceFinalHandler = () => {};

/**
 * Installs the handler. Returns the previous one, so a caller that takes over
 * temporarily can put back what it found rather than guessing.
 *
 * A module-level singleton rather than React context on purpose: the write
 * this becomes is not a rendering concern, and every call site is already
 * inside a hook that has no business knowing about it.
 */
export function setSentenceFinalHandler(next: SentenceFinalHandler): SentenceFinalHandler {
  const previous = handler;
  handler = next;
  return previous;
}

export function onSentenceFinal(sentence: string, language: string): void {
  handler(sentence, language);
}
