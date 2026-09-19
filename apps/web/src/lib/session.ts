/**
 * The active session — the shape, and the one honest fact about it.
 *
 * ── THERE IS NO SOURCE OF TRUTH FOR THIS YET ───────────────────────────────
 * The product model is: a session is one exercise being worked through, at
 * most one is active at a time, and the nav drawer shows "Continue session"
 * instead of "Start a session" while one is. Implementing that needs to know
 * whether a session is active, and NOTHING IN THIS APP KNOWS THAT:
 *
 *   · there is no `sessions` table — the content migration creates exercises,
 *     cards, situations and their translations, and nothing else;
 *   · `/session/:id/:step` validates the step and CARRIES the id, deliberately
 *     never looking it up (2.1: "There is no session data yet");
 *   · `profiles` holds display_name, user_type_id, language and theme.
 *
 * So `readActiveSession()` returns null, always, and says so loudly rather
 * than guessing. The drawer's "Continue session" branch is built and tested
 * around this type — the only missing piece is where the answer comes from,
 * and that is a data-model decision (what a session row is, when it stops
 * being active, whether an abandoned one expires) rather than a drawer one.
 */

export interface ActiveSession {
  /** The `:id` segment of /session/:id/:step. */
  id: string;
  /** Which of the four steps the user stopped at. */
  step: string;
}

/**
 * Always null until a sessions table exists.
 *
 * Deliberately a function rather than a constant, so the call sites are
 * already shaped for the async read that will replace it.
 */
export function readActiveSession(): ActiveSession | null {
  return null;
}
