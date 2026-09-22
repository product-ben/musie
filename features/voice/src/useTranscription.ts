import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLIENT_SILENCE_LEVEL,
  CLIENT_SILENCE_MS,
  IDLE_STOP_MS,
  MODELS,
  STOP_GRACE_MS,
  SESSION_SECONDS,
  type LanguageChoice,
  type SegmentationMode,
  type TranscriptionModel,
} from './config';
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

/** Why the last session ended — so the UI never has to say "it just stopped". */
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
  /** Last moment any audible sound arrived, for the idle cut-off. */
  const lastSound = useRef(0);
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
      // The microphone closes at once. Stop always means stop capturing.
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
      lastSound.current = Date.now();
      deadline.current = Date.now() + SESSION_SECONDS * 1000;
      heardSpeech.current = false;
      silentSince.current = null;
      setStatus('connecting');

      connection.current = connectRealtime(token, model, language, segmentation, (event) => {
        switch (event.type) {
          case 'ready':
            setStatus('recording');
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
        recorder.current = await startRecorder((chunk, chunkLevel) => {
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
          if (loud) lastSound.current = Date.now();
          if (!browserDecidesTurns) return;
          setSpeaking(loud);

          if (loud) {
            heardSpeech.current = true;
            silentSince.current = null;
            setPending(true);
            return;
          }
          if (!heardSpeech.current) return;

          const now = Date.now();
          silentSince.current ??= now;
          if (now - silentSince.current >= CLIENT_SILENCE_MS) {
            heardSpeech.current = false;
            silentSince.current = null;
            connection.current?.commit();
          }
        });
      } catch (micError) {
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

  // The countdown reads a fixed deadline, so stopping happens inside the timer
  // callback rather than as a side effect of rendering.
  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        stop('timeout');
        return;
      }
      // Waiting on a statement holds the session open: closing the socket
      // mid-transcription would lose it.
      if (!awaitingStatement.current && Date.now() - lastSound.current >= IDLE_STOP_MS) {
        clearInterval(timer);
        stop('silence');
      }
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
    warning,
    stopReason,
    level,
    levels,
    speaking,
    secondsLeft,
    start,
    stop,
  };
}
