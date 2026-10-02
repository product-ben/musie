import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLIENT_SILENCE_LEVEL,
  CLIENT_SILENCE_MS,
  MODELS,
  STOP_GRACE_MS,
  SESSION_SECONDS,
  type LanguageChoice,
  type SegmentationMode,
  type TranscriptionModel,
} from './config';
import { captureVerdict } from './capture/health';
import { segment } from './segmentation';
import { stripFillers } from './transcript/fillers';
import { MicrophoneError, startRecorder, type Recorder } from './audio/recorder';
import { connectRealtime, type RealtimeConnection } from './realtime/connection';
import type { VoiceMessage } from './messages';
import { useSentences } from './useSentences';

export type Status = 'idle' | 'connecting' | 'recording';

/**
 * How many recent chunk loudnesses to keep. A level meter needs a history, not
 * just the newest value, and the recorder callback is the only place that sees
 * every chunk. Collected here rather than reconstructed by a consumer, because
 * doing it in a component would mean accumulating state during render.
 *
 * Twelve is also what §7.22's Record Button draws, so `levels` goes straight
 * into its `levels` prop.
 */
const LEVEL_HISTORY = 12;

/**
 * Why the last session ended — so the UI never has to say "it just stopped".
 *
 * `silence` now means what it says: chunks were arriving and none of them was
 * loud, so the room really was quiet. Until 2026-09-30 it ALSO covered a
 * microphone that produced nothing at all, and the screen told those people
 * they had gone quiet. Those two cases are `error` now, carrying
 * `recorderFailed` or `micInterrupted`. See capture/health.ts.
 */
export type StopReason = 'manual' | 'timeout' | 'silence' | 'error' | null;

export function useTranscription() {
  const [status, setStatus] = useState<Status>('idle');
  const list = useSentences();
  /** Pulled out because it is stable; see saveStatement. */
  const { append } = list;
  const [interim, setInterim] = useState('');
  /**
   * True from the moment speech is heard until the statement lands, so the
   * waiting box appears straight away. On a post-turn model there is otherwise
   * nothing on screen at all while you talk, which reads as a broken feature.
   */
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<VoiceMessage | null>(null);
  const [warning, setWarning] = useState<VoiceMessage | null>(null);
  const [stopReason, setStopReason] = useState<StopReason>(null);
  /** Loudness of the newest audio chunk (0–1), for the microphone meter. */
  const [level, setLevel] = useState(0);
  /** The last LEVEL_HISTORY chunk loudnesses, newest last, for a bar meter. */
  const [levels, setLevels] = useState<number[]>([]);
  /** True while OpenAI's VAD is hearing speech. */
  const [speaking, setSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  const connection = useRef<RealtimeConnection | null>(null);
  const recorder = useRef<Recorder | null>(null);
  /** Wall-clock end of the session, so reconnects don't reset the countdown. */
  const deadline = useRef(0);
  /** Browser-side turn detection, used when the model has no server VAD. */
  const heardSpeech = useRef(false);
  const silentSince = useRef<number | null>(null);
  /**
   * ── THE TWO CLOCKS, WHICH USED TO BE ONE ────────────────────────────────
   * `lastSound` is the newest LOUD chunk and means *the person is speaking*.
   * `lastChunk` is the newest chunk of ANY loudness and means *capture is
   * alive* — the worklet posts every ~40 ms whatever the level, so a silent
   * room still moves it and a dead microphone does not.
   *
   * One ref answered both questions until 2026-09-30, which is the whole bug:
   * see capture/health.ts for the argument and the four verdicts.
   */
  const lastSound = useRef(0);
  const lastChunk = useRef(0);
  /** Whether a loud chunk has EVER arrived this session — the idle cut-off
   *  does not arm until one has. */
  const heardAnySound = useRef(false);
  /** When the first chunk proved capture was live. Null while connecting. */
  const captureLiveAt = useRef<number | null>(null);
  /** When `start()` was called, for the connecting ceiling. */
  const connectingSince = useRef(0);
  /** Both halves, tracked separately, because `recording` means BOTH. */
  const socketReady = useRef(false);
  /**
   * Which attempt is current. `startRecorder` is awaited, so a stop can land
   * while a microphone is still opening — and the assignment after that await
   * would then install a live recorder into a session that has already ended.
   * Bumped by every `start` and every `stop`, so a late arrival can tell that
   * it is no longer wanted and close itself.
   */
  const run = useRef(0);
  /**
   * ── THE NINE NUMBERS — 2026-09-30 ────────────────────────────────────────
   * What a bug report needs and did not have. The reported failure took a day
   * to diagnose because `features/voice/src` contained no logging at all, and
   * the one on-screen signal was ambiguous by construction: §7.22's meter pads
   * an empty `levels` with zeroes and floors every bar at 10%, so "no audio"
   * and "silent audio" draw the IDENTICAL picture.
   *
   * Facts, never copy. Nothing renders them.
   */
  const chunks = useRef(0);
  const maxLevel = useRef(0);
  const commitsSent = useRef(0);
  const socketReadyAt = useRef<number | null>(null);
  /**
   * `status` and the statement count, mirrored for `stop` to read.
   *
   * `stop` has to keep its identity — the countdown effect restarts whenever
   * it changes — so it cannot depend on either value. Refs, synced by an
   * effect, are how it reads them without a stale closure. The same argument
   * `interimText` and `awaitingStatement` already make above.
   */
  const statusRef = useRef<Status>('idle');
  const sentenceCount = useRef(0);
  /** Mirrors `interim`, so the stop timer reads it without a stale closure. */
  const interimText = useRef('');
  /** The running session's settings, needed to finalise after Stop. */
  const sessionLanguage = useRef<string>('de');
  const sessionSegmentation = useRef<SegmentationMode>('silence');
  /** Set while Stop is waiting for the statement that was still in flight. */
  const stopTimer = useRef<number | null>(null);
  /**
   * Whether a statement is still being transcribed. The idle timer reads it,
   * and it must be a ref: the timer callback would otherwise close over the
   * value from the render that started it.
   */
  const awaitingStatement = useRef(false);

  /**
   * Turns one finished turn into statements and fires the hook. Shared by the
   * `completed` event and by the fallback when Stop beats it, so both paths
   * clean and split the text identically.
   *
   * Depends on `append`, which is stable, rather than on `list`, which is a new
   * object every render — `stop` has to keep its identity, because the
   * countdown effect restarts whenever it changes.
   */
  const saveStatement = useCallback(
    (text: string, language: string) => {
      // One turn can yield several statements in punctuation mode. Hesitation
      // sounds are cleaned off as the statement becomes a card; the live
      // interim text still shows what was actually said.
      const parts = segment(text, sessionSegmentation.current)
        .map((part) => stripFillers(part, language))
        .filter(Boolean);
      if (parts.length === 0) return;
      /* The write is fired by `useSentences` from the list itself — see
         onSentenceFinal.ts. Appending IS the change. */
      append(parts, language);
    },
    [append],
  );

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { sentenceCount.current = list.sentences.length; }, [list.sentences]);

  /**
   * A REPORTED FAILURE IS DISMISSABLE NOW, because it is a toast rather than
   * an inline Message (2026-09-30). Inline, it went away when the next session
   * cleared it; over the content, the person needs to be able to push it away
   * — and `setError(null)` is the only thing that can take it off screen,
   * since §7.23 ships no timer of its own.
   */
  const dismissError = useCallback(() => setError(null), []);
  const dismissWarning = useCallback(() => setWarning(null), []);

  /** Clears whatever was in flight and drops the socket. */
  const settle = useCallback(() => {
    if (stopTimer.current !== null) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    setInterim('');
    interimText.current = '';
    setPending(false);
    awaitingStatement.current = false;
    connection.current?.close();
    connection.current = null;
    socketReady.current = false;
    captureLiveAt.current = null;
  }, []);

  /**
   * Ends a Stop that is still waiting. Nothing came back in time, so the words
   * already on screen become the statement — they were captured, and captured
   * words are not thrown away. A no-op when no stop is pending.
   */
  const finishPendingStop = useCallback(() => {
    if (stopTimer.current === null) return;
    if (interimText.current.trim()) {
      saveStatement(interimText.current, sessionLanguage.current);
    }
    settle();
  }, [saveStatement, settle]);

  const stop = useCallback(
    (reason: StopReason = 'manual', options?: { immediate?: boolean }) => {
      /**
       * ── THE ONE LOG LINE, AND WHY IT IS console.info ────────────────────
       * Written on EVERY stop, including the successful ones, because the
       * numbers are only diagnostic next to what a healthy session looks
       * like. `info` and not `warn`: nothing here is a problem by itself.
       *
       * IT DOES NOT REACH A PHONE, and that is the honest limit — a beta
       * tester on iOS Chrome has no console. Getting these off a device needs
       * either visible text (CLAUDE.md 7) or a column on the session row
       * (rules 2 and 4), and which of those is Ben's call, logged in
       * apps/web/OPEN-QUESTIONS.md. This closes the laptop case today and
       * costs nothing.
       */
      if (statusRef.current !== 'idle') {
        const now = Date.now();
        console.info('[musie] voice session ended:', {
          reason,
          msToSocketReady:
            socketReadyAt.current === null ? null : socketReadyAt.current - connectingSince.current,
          msToCaptureLive:
            captureLiveAt.current === null ? null : captureLiveAt.current - connectingSince.current,
          msCapturing: captureLiveAt.current === null ? 0 : now - captureLiveAt.current,
          chunks: chunks.current,
          maxLevel: Number(maxLevel.current.toFixed(4)),
          heardAnySound: heardAnySound.current,
          commitsSent: commitsSent.current,
          statements: sentenceCount.current,
          ...(connection.current?.diagnostics() ?? {}),
          ...(recorder.current?.diagnostics() ?? {}),
        });
      }

      /* The microphone closes at once. Stop always means stop capturing — and
         the generation moves, so a `startRecorder` still in flight knows on
         arrival that nobody wants it. */
      run.current += 1;
      recorder.current?.stop();
      recorder.current = null;
      setLevel(0);
      setLevels([]);
      setSpeaking(false);
      setStatus((previous) => {
        // Only record a reason if a session was actually running.
        if (previous !== 'idle') setStopReason(reason);
        return 'idle';
      });

      const socket = connection.current;
      /**
       * Half a sentence is still a sentence. If a turn is open, ask OpenAI to
       * transcribe what it already has and hold the socket open for the answer.
       * A fatal error has a broken socket to wait on, and an unmount has
       * nowhere to put the result, so neither waits.
       */
      const unfinished =
        socket !== null &&
        awaitingStatement.current &&
        reason !== 'error' &&
        !options?.immediate;

      if (!unfinished) {
        settle();
        return;
      }

      socket.commit();
      stopTimer.current = window.setTimeout(finishPendingStop, STOP_GRACE_MS);
    },
    [finishPendingStop, settle],
  );

  const start = useCallback(
    async (
      /* F.2: an ephemeral token from the `realtime-token` Edge Function, not
         an API key. The caller fetches one per session; this hook never sees
         the account's real credential. */
      token: string,
      model: TranscriptionModel,
      language: LanguageChoice,
      segmentation: SegmentationMode = 'silence',
      options?: { keepExisting?: boolean },
    ) => {
      // Recording again while the last stop is still waiting: keep that
      // statement rather than dropping it on the floor.
      finishPendingStop();
      sessionLanguage.current = language;
      sessionSegmentation.current = segmentation;

      setError(null);
      setWarning(null);
      setStopReason(null);
      setLevel(0);
      setLevels([]);
      setSpeaking(false);
      if (!options?.keepExisting) list.reset();
      setInterim('');
      setPending(false);
      awaitingStatement.current = false;
      setSecondsLeft(SESSION_SECONDS);
      /**
       * ── WHAT IS ARMED HERE, AND WHAT DELIBERATELY IS NOT ──────────────────
       * Only the CONNECTING ceiling. The silence clock and the 60-second
       * deadline are armed when capture proves itself, below.
       *
       * They used to be armed here, which is the timing half of the bug: the
       * WebSocket handshake, the session round trip, `getUserMedia` and any
       * permission dialog were all charged against the person's six seconds of
       * silence, so a slow start could run the clock out before the microphone
       * existed. docs/VOICE-CAPTURE-FIX.md §1.
       */
      const generation = (run.current += 1);
      chunks.current = 0;
      maxLevel.current = 0;
      commitsSent.current = 0;
      socketReadyAt.current = null;
      connectingSince.current = Date.now();
      captureLiveAt.current = null;
      socketReady.current = false;
      lastSound.current = 0;
      lastChunk.current = 0;
      heardAnySound.current = false;
      heardSpeech.current = false;
      silentSince.current = null;
      setStatus('connecting');

      /**
       * `recording` MEANS BOTH HALVES ARE LIVE — the socket is configured and
       * the microphone is proven. It used to mean only the first, which is why
       * the button said *Recording* over a microphone that had never delivered
       * a sample: `status` was wired to the socket alone.
       */
      const enterRecordingWhenReady = () => {
        if (socketReady.current && captureLiveAt.current !== null) setStatus('recording');
      };

      connection.current = connectRealtime(token, model, language, segmentation, (event) => {
        switch (event.type) {
          case 'ready':
            socketReady.current = true;
            socketReadyAt.current ??= Date.now();
            enterRecordingWhenReady();
            break;
          case 'speech':
            setSpeaking(event.active);
            // Speech stopping does not clear it: the words are still coming.
            if (event.active) {
              setPending(true);
              awaitingStatement.current = true;
            }
            break;
          case 'interim':
            setInterim(event.text);
            interimText.current = event.text;
            setPending(true);
            awaitingStatement.current = true;
            break;
          case 'final': {
            const stopping = stopTimer.current !== null;
            setInterim('');
            interimText.current = '';
            setPending(false);
            awaitingStatement.current = false;
            saveStatement(event.text, event.language);
            // This is the turn Stop was waiting for; nothing more is coming.
            if (stopping) settle();
            break;
          }
          /* A turn closed with nothing in it. Nothing to show, and nothing
             wrong — but the session must stop waiting for it, or the idle
             cut-off stays disabled for the rest of the session. */
          case 'cleared':
            setInterim('');
            interimText.current = '';
            setPending(false);
            awaitingStatement.current = false;
            if (stopTimer.current !== null) settle();
            break;
          // Non-fatal: one statement was lost, recording continues.
          case 'warning':
            setWarning(event.message);
            // That turn will never arrive, so stop waiting for it.
            setInterim('');
            interimText.current = '';
            setPending(false);
            awaitingStatement.current = false;
            if (stopTimer.current !== null) settle();
            break;
          case 'error':
            setError(event.message);
            stop('error');
            break;
        }
      });

      // A model without server VAD leaves the browser to decide where a
      // sentence ends and to commit the turn itself.
      const browserDecidesTurns = !MODELS[model].serverVad;

      try {
        const opened = await startRecorder(
          (chunk, chunkLevel) => {
            const now = Date.now();
            /**
             * EVERY CHUNK MOVES THIS, loud or quiet. It is the proof that
             * capture is alive, and it is what the watchdog reads — the
             * distinction the whole fix rests on. See capture/health.ts.
             */
            lastChunk.current = now;
            chunks.current += 1;
            if (chunkLevel > maxLevel.current) maxLevel.current = chunkLevel;

            /* The first chunk is what makes the session `recording`, and it
               is where the two clocks that matter to a person start. */
            if (captureLiveAt.current === null) {
              captureLiveAt.current = now;
              lastSound.current = now;
              deadline.current = now + SESSION_SECONDS * 1000;
              setSecondsLeft(SESSION_SECONDS);
              enterRecordingWhenReady();
            }

            connection.current?.sendAudio(chunk);
            setLevel(chunkLevel);
            // Same event, so React batches this with setLevel: no extra render.
            setLevels((previous) =>
              previous.length < LEVEL_HISTORY
                ? [...previous, chunkLevel]
                : [...previous.slice(1), chunkLevel],
            );

            const loud = chunkLevel >= CLIENT_SILENCE_LEVEL;
            // Tracked for every model, not just the ones that commit their own
            // turns, because the idle cut-off applies to all of them.
            if (loud) {
              lastSound.current = now;
              heardAnySound.current = true;
            }
            if (!browserDecidesTurns) return;
            setSpeaking(loud);

            if (loud) {
              heardSpeech.current = true;
              silentSince.current = null;
              setPending(true);
              return;
            }
            if (!heardSpeech.current) return;

            silentSince.current ??= now;
            if (now - silentSince.current >= CLIENT_SILENCE_MS) {
              heardSpeech.current = false;
              silentSince.current = null;
              commitsSent.current += 1;
              connection.current?.commit();
            }
          },
          {
            /* Capture died after it started. Not throwable — the promise
               resolved long ago and there is nobody left to catch it — so it
               arrives here and ends the session with the true reason rather
               than drifting into the silence cut-off. */
            onInterrupted: () => {
              if (generation !== run.current) return;
              setError({ code: 'micInterrupted' });
              stop('error');
            },
          },
        );

        /**
         * A STOP CAN HAVE LANDED WHILE THE MICROPHONE WAS OPENING. The
         * assignment used to happen unconditionally, so a recorder that
         * resolved after `stop()` was installed into a dead session — and a
         * later `start()` then overwrote the ref and orphaned it, leaving the
         * microphone indicator lit with nothing reading from it.
         */
        if (generation !== run.current) {
          opened.stop();
          return;
        }
        recorder.current = opened;
      } catch (micError) {
        if (generation !== run.current) return;
        setError(
          micError instanceof MicrophoneError
            ? { code: micError.code }
            : { code: 'recorderFailed', detail: String(micError) },
        );
        stop('error');
      }
    },
    [stop, settle, saveStatement, finishPendingStop, list],
  );

  /**
   * ── THE ONE TIMER, AND FOUR HONEST ENDINGS ────────────────────────────────
   * The countdown reads a fixed deadline, so stopping happens inside the timer
   * callback rather than as a side effect of rendering.
   *
   * What changed on 2026-09-30 is the decision, not the interval: it used to
   * be one inline predicate over `lastSound`, which answered "is the room
   * quiet" and "did we ever hear anything" with the same expression and
   * reported the first for both. That decision now lives in
   * `captureVerdict` — pure, and tested in capture/health.test.ts, which is
   * the test that would have caught this.
   */
  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setInterval(() => {
      const now = Date.now();

      /* The ceiling is only meaningful once capture has started, because that
         is when it is armed. While connecting there is nothing to count down. */
      if (captureLiveAt.current !== null) {
        const remaining = Math.max(0, Math.ceil((deadline.current - now) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          clearInterval(timer);
          stop('timeout');
          return;
        }
      }

      const verdict = captureVerdict(now, {
        captureLiveAt: captureLiveAt.current,
        connectingSince: connectingSince.current,
        lastChunkAt: lastChunk.current,
        lastSoundAt: lastSound.current,
        /* Waiting on a statement holds the session open: closing the socket
           mid-transcription would lose it. */
        awaitingStatement: awaitingStatement.current,
        heardAnySound: heardAnySound.current,
      });

      if (verdict === 'live') return;
      clearInterval(timer);

      /* THE ROOM WAS QUIET — chunks were arriving and none of them was loud.
         The only one of the three that is the person's doing, and the only one
         `voice.stopped.silence` is a true sentence about. */
      if (verdict === 'quiet-room') {
        stop('silence');
        return;
      }

      /* WE STOPPED HEARING, and the three cases are three different
         sentences. `capture-lost` did start and then stopped. `never-started`
         never got going — and WHICH HALF was late decides what to say: an
         unconfigured socket is `connectionFailed`, a socket that came up over
         a microphone that never delivered is `recorderFailed`. A generic
         timeout here would throw away the one thing the person could act on. */
      setError({
        code:
          verdict === 'capture-lost'
            ? 'micInterrupted'
            : socketReady.current
              ? 'recorderFailed'
              : 'connectionFailed',
      });
      stop('error');
    }, 250);
    return () => clearInterval(timer);
  }, [status, stop]);

  // Close the socket if the tab is closed mid-session.
  useEffect(() => {
    const handleUnload = () => stop('manual', { immediate: true });
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      stop('manual', { immediate: true });
    };
  }, [stop]);

  return {
    status,
    sentences: list.sentences,
    editSentence: list.edit,
    combineSentences: list.combine,
    moveSentence: list.move,
    deleteSentence: list.remove,
    undoReason: list.undoReason,
    undo: list.undo,
    dismissUndo: list.dismissUndo,
    interim,
    pending,
    error,
    dismissError,
    warning,
    dismissWarning,
    stopReason,
    level,
    levels,
    speaking,
    secondsLeft,
    start,
    stop,
  };
}
