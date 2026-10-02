/**
 * Is capture alive, and if not, which way did it fail? — the decision this
 * package got wrong, as a pure function.
 *
 * ── WHY THIS IS NOT IN THE HOOK ────────────────────────────────────────────
 * `apps/web/src/lib/voiceScreen.ts` states the pattern and the reason: the
 * parts of a screen that can be WRONG are pulled out where a test can drive
 * them with fixture values instead of a microphone. That argument applies
 * with more force here, because this is the part that WAS wrong.
 *
 * `useTranscription` cannot be unit-tested in this repository — this package's
 * `unit` project is `environment: 'node'` with no jsdom, deliberately
 * (vitest.config.ts says why). So the timing logic lived inside a hook, inside
 * a `setInterval`, and no test in the repo touched it. It does not live there
 * any more.
 *
 * ── THE BUG THIS FILE EXISTS TO MAKE IMPOSSIBLE ────────────────────────────
 * One predicate used to answer two different questions:
 *
 *     Date.now() - lastSound.current >= IDLE_STOP_MS
 *
 * `lastSound` only moves on a chunk LOUDER than CLIENT_SILENCE_LEVEL, so that
 * expression is true both when the room is quiet and when no audio ever
 * arrived at all. The app reported the flattering one — *"it went quiet for 6
 * seconds"* — to a person whose microphone it had never heard from.
 *
 * The two are separable for free, and this is the whole insight: the worklet
 * posts a chunk every ~40 ms REGARDLESS OF LOUDNESS, so a silent room still
 * produces 25 chunks a second at level 0.000. Chunks flowing and quiet means
 * the room is quiet. No chunks means we stopped hearing. Two timestamps where
 * there was one.
 */
import { CAPTURE_LOST_MS, CONNECT_TIMEOUT_MS, IDLE_STOP_MS } from '../config';

/**
 * What the session should do about capture, right now.
 *
 * - `live` — carry on. Either audio is arriving, or a statement is still being
 *   transcribed and the session is held open for it.
 * - `quiet-room` — chunks are arriving and none of them is loud. The person
 *   really has gone quiet, and `voice.stopped.silence` is a true sentence.
 * - `capture-lost` — chunks stopped arriving mid-session. We stopped hearing;
 *   they did not stop talking.
 * - `never-started` — `connecting` has outlasted CONNECT_TIMEOUT_MS. The
 *   socket or the microphone never came up.
 */
export type CaptureVerdict = 'live' | 'quiet-room' | 'capture-lost' | 'never-started';

export interface CaptureState {
  /** When capture was PROVEN live — the first chunk. `null` while connecting. */
  captureLiveAt: number | null;
  /** When `start()` was called. Only used while `captureLiveAt` is null. */
  connectingSince: number;
  /** The newest chunk of ANY loudness. Means *capture is alive*. */
  lastChunkAt: number;
  /** The newest LOUD chunk. Means *the person is speaking*. */
  lastSoundAt: number;
  /**
   * A statement is still in flight. It holds the session open through both
   * silence verdicts: closing the socket mid-transcription loses that
   * statement, which is the one thing worse than stopping too late.
   *
   * It does NOT hold off `never-started`, because nothing can be in flight
   * before capture has ever begun.
   */
  awaitingStatement: boolean;
  /**
   * Whether a loud chunk has been heard at all this session.
   *
   * THE IDLE CUT-OFF ARMS ON THE FIRST SOUND, not on the first chunk — Ben's
   * call, logged in apps/web/OPEN-QUESTIONS.md. Before it, the cut-off could
   * not tell *"you stopped talking"* from *"you never started"*, and for a
   * question about how somebody feels, taking eight seconds to begin is
   * ordinary rather than abandonment. The 60-second ceiling is what bounds an
   * abandoned session, and at $0.017 a minute the worst case is under two
   * cents.
   */
  heardAnySound: boolean;
}

export function captureVerdict(now: number, s: CaptureState): CaptureVerdict {
  /* ── STILL CONNECTING ──────────────────────────────────────────────────
     The only verdict available before capture exists. Note what is NOT
     checked here: neither silence clock, because there is nothing to be
     silent about yet. That is precisely the conflation this file removes. */
  if (s.captureLiveAt === null) {
    return now - s.connectingSince >= CONNECT_TIMEOUT_MS ? 'never-started' : 'live';
  }

  /* A statement in flight outranks both silences below. */
  if (s.awaitingStatement) return 'live';

  /* ── WE STOPPED HEARING ───────────────────────────────────────────────
     Checked BEFORE the quiet room, and the order is load-bearing: a lost
     capture also has a stale `lastSoundAt`, so testing silence first would
     report every interruption as the person having gone quiet — which is the
     original bug wearing a second coat. */
  if (now - s.lastChunkAt >= CAPTURE_LOST_MS) return 'capture-lost';

  /* ── THEY STOPPED TALKING ─────────────────────────────────────────────
     Chunks are arriving, so capture is healthy and this sentence is true. */
  if (s.heardAnySound && now - s.lastSoundAt >= IDLE_STOP_MS) return 'quiet-room';

  return 'live';
}
