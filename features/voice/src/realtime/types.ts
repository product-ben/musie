import type { VoiceMessage } from '../messages';

/** What the UI cares about. Everything else from the API is filtered out. */
export type TranscriptEvent =
  | { type: 'ready' }
  /** OpenAI's own VAD started or stopped hearing speech. */
  | { type: 'speech'; active: boolean }
  | { type: 'interim'; text: string }
  /**
   * A turn closed with nothing in it — an empty commit, which is the ordinary
   * outcome of committing during a pause. Nothing to show and nothing wrong,
   * but the session must STOP WAITING for it.
   *
   * It exists because `completed` with an empty transcript used to emit
   * nothing at all, and `awaitingStatement` is cleared only by an event: so an
   * empty turn left it stuck true, which permanently disabled the idle
   * cut-off and left `pending` on until the 60-second ceiling. A session that
   * would not stop — the mirror image of the one that stopped too soon.
   * Logged as L4 in docs/VOICE-CAPTURE-FIX.md.
   */
  | { type: 'cleared' }
  | { type: 'final'; text: string; language: string }
  /** One statement failed, but the session is still usable — keep recording. */
  | { type: 'warning'; message: VoiceMessage }
  /** The session cannot continue — stop recording. */
  | { type: 'error'; message: VoiceMessage };
