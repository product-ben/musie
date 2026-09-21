/**
 * The voice editor's decisions, as functions with nothing mounted — F.4.
 *
 * ── WHY THESE ARE NOT IN THE COMPONENT ─────────────────────────────────────
 * `VoiceTranscript` cannot be unit-tested in this repository: the `unit`
 * project runs in `environment: 'node'` with no jsdom and no testing-library
 * (apps/web/vitest.config.ts says why, and the reason is good). So the parts
 * of the screen that can be WRONG — which label the record button carries,
 * which sentence sits under it, whether an ended session owes the reader an
 * explanation — are pulled out here, where a test can drive them with fixture
 * values instead of a microphone.
 *
 * What is left in the component is JSX and one `await`. That is deliberate:
 * the only thing F.4 cannot exercise without a real microphone is the wiring,
 * and the wiring should therefore be the only thing left unexercised.
 *
 * ── EVERY RETURN IS A `MessageKey` ─────────────────────────────────────────
 * Never a string. Same guarantee `voiceMessages.ts` gives across the package
 * boundary, for the same reason: a key that does not exist is a typecheck
 * error in English and German at once, and a sentence returned from a `lib`
 * file would be a user-visible string outside the catalogue (CLAUDE.md 6, 7).
 */
import type { Status, StopReason } from '@musie/voice';
import type { MessageKey } from '../i18n';

/**
 * What the record button is doing, from the reader's side.
 *
 * THREE PHASES FROM TWO SOURCES. `useTranscription` is `connecting` only once
 * the socket is opening, and the token request happens BEFORE that — a round
 * trip to an Edge Function which on a phone is the slow half. Left to
 * `status` alone the button would sit on *Record answer*, enabled, for as
 * long as that takes, and a second tap would mint a second token.
 */
export type RecordPhase = 'ready' | 'connecting' | 'recording';

export function recordPhase(status: Status, awaitingToken: boolean): RecordPhase {
  if (awaitingToken || status === 'connecting') return 'connecting';
  return status === 'recording' ? 'recording' : 'ready';
}

/**
 * The button's own word.
 *
 * `hasRecorded` changes it from *Record answer* to *Record more*, because
 * recording again APPENDS — `start` is called with `keepExisting: true` — and
 * a button that still says *Record answer* over a list of five statements
 * reads as *start over*, which is the one thing it does not do.
 */
export function recordLabelKey(phase: RecordPhase, hasRecorded: boolean): MessageKey {
  if (phase === 'connecting') return 'voice.record.connecting';
  if (phase === 'recording') return 'reflect.voice.recording';
  return hasRecorded ? 'voice.record.more' : 'reflect.voice.record';
}

/**
 * The sentence under the button.
 *
 * Two of them, not one: before the first statement the thing to explain is
 * where statements come from, and after it the thing to explain is where the
 * next one will land. Both carry the two cut-offs, because a recorder that
 * stops on its own without having said it would is indistinguishable from a
 * broken one.
 */
export function hintKey(hasRecorded: boolean): MessageKey {
  return hasRecorded ? 'voice.hint.more' : 'voice.hint.first';
}

/**
 * What to say about a session that ended, or `null` when nothing is owed.
 *
 * `manual` is silent: the reader pressed Stop and does not need to be told
 * that Stop stopped it. `error` is silent HERE because the error Message is
 * already on screen saying the same thing with more in it — two boxes for one
 * event is how a screen starts to nag.
 *
 * That leaves the two that genuinely surprise: the minute running out, and
 * the silence cut-off. Both are the recorder acting on its own.
 */
export function stopNoticeKey(reason: StopReason): MessageKey | null {
  if (reason === 'timeout') return 'voice.stopped.timeout';
  if (reason === 'silence') return 'voice.stopped.silence';
  return null;
}

/**
 * Whether anything has been captured in this reflection.
 *
 * `stopReason` is in it on purpose. A run that produced no statements — a
 * silent minute, a refused microphone — has still HAPPENED, and the button
 * that offers to try again should say *Record more* rather than pretending
 * the first attempt did not occur.
 */
export function hasRecorded(sentenceCount: number, reason: StopReason): boolean {
  return sentenceCount > 0 || reason !== null;
}
