/**
 * Starting a session — the one sequence, from the library and from a printed
 * card. 2026-11-23, PRD „Übungskarten mit QR-Code".
 *
 * /exercises starts a run when a card in the pile is pressed; `/s/:code`
 * starts one when a QR code on paper is scanned. Both end the running session
 * first when the person chose that in the dialog, then create the new row,
 * then tell analytics — and the order is not reversible: creating first is
 * what the one-running-session index refuses. It lived inline in
 * `routes/Exercises.tsx` until the second caller arrived.
 *
 * How the run began is `startedVia.ts`'s: the address carries it to the intro
 * (V3), and PostHog gets it as `entry` on `session_started` (A3).
 */
import type { Exercise } from './content';
import { analyticsReady, posthog } from './posthog';
import { posthogLog } from './posthogLogs';
import { createSession, endSession } from './session';
import type { ActiveSession, StartResult } from './session';
import type { StartedVia } from './startedVia';

/**
 * End what is running (when the person chose that), start the new run, and
 * count it. The caller navigates — with `introPath` — and draws the dialog
 * when the result is `already-running`.
 */
export async function startSession(args: {
  userId: string;
  exercise: Pick<Exercise, 'id' | 'kind'>;
  goalId: string | null;
  replacing: ActiveSession | null;
  via: StartedVia;
}): Promise<StartResult> {
  if (args.replacing !== null) {
    /* `abandoned`, not `finished`: the diary already calls a run that stopped
       before its reflection abandoned. */
    await endSession(args.replacing.id, 'abandoned', new Date().toISOString());
  }
  const result = await createSession(args.userId, args.exercise.id, args.goalId);
  if (result.kind === 'started') {
    if (analyticsReady()) {
      posthog.capture('session_started', { exercise_kind: args.exercise.kind, entry: args.via });
    }
    posthogLog.sessionStarted(args.exercise.kind);
  }
  return result;
}
