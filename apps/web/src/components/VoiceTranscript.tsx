/**
 * The voice editor — F.4, and the first thing in this repository that renders
 * `@musie/voice`.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 * It is not the proof-of-concept's `MusieTranscriptWorkspace`. That file and
 * `MusieStatementCard` beside it were 475 lines, of which 281 were
 * `useDragList` and 194 were a Content Box with a float, a hidden headline, a
 * `data-no-drag` opt-out, a Field-parts editor and three drop modes — which is
 * §7.24's Draggable List, rewritten in an app. F.0 left both behind on purpose
 * and logged why; the plan's own words for this step are "on the real `Toast`
 * and `DraggableList`", and that is a rewrite rather than a port.
 *
 * What survived the rewrite is the SHAPE, because it was already right: a
 * transcript region above, a record control below it, feedback between the
 * two, and the undo offer floating over all of it. What did not survive is
 * every line that drew any of that. The list is a component now, and this file
 * is the wiring plus the words.
 *
 * ── THE STATE LAYER IS ONE HOOK ────────────────────────────────────────────
 * `useTranscription` owns the microphone, the socket, the 60-second clock and
 * the statements — it mounts `useSentences` itself, so calling both here would
 * be two independent lists with one of them invisible. Everything this file
 * holds of its own is the token request, which lives outside the hook by F.2's
 * design: the hook takes a token and never learns where credentials come from.
 *
 * ── EVERY STRING IS PASSED, INCLUDING THE ONES THAT HAVE DEFAULTS ──────────
 * `DraggableList` has a German default for all nine of its copy props. They
 * are passed anyway (CLAUDE.md 7): they are this transcript's words, not the
 * component's, and the list's accessible name is *your spoken answer* rather
 * than a generic *Transcript*. The exceptions are the four row controls and
 * the five keyboard announcements, which have NO props — they come from the
 * package's own locale catalogue through the `MusyLocaleProvider` main.tsx
 * mounts, in the reader's language. Same call as `DiaryCard`'s transport
 * verbs, and for the same reason.
 *
 * ── WHAT IT CANNOT DO YET ──────────────────────────────────────────────────
 * Nothing here writes a row. `onSentenceFinal` is F.6's seam and is left
 * untouched, so the transcript lives for as long as the step is open and
 * *Finish session* stays disabled in voice mode — which `SessionReflect` says
 * on screen rather than leaving as a dead button.
 */
import * as React from 'react';
import { DraggableList, Message, RecordButton, Toast } from '@musie/design-system';
import {
  DEFAULT_MODEL, IDLE_STOP_MS, SESSION_SECONDS, setStatementsHandler, useTranscription,
} from '@musie/voice';
import { saveStatements } from '../lib/statements';
import type { VoiceMessageCode } from '@musie/voice';
import { useLocale, useT } from '../i18n/localeContext';
import { realtimeToken } from '../lib/realtimeToken';
import { VOICE_MESSAGE_KEYS, VOICE_UNDO_KEYS } from '../lib/voiceMessages';
import { hasRecorded, hintKey, recordLabelKey, recordPhase, stopNoticeKey } from '../lib/voiceScreen';

/** The two cut-offs, as strings, for the sentences that name them. */
const SECONDS = String(SESSION_SECONDS);
const SILENCE = String(IDLE_STOP_MS / 1000);

export function VoiceTranscript({
  sessionId, onSpokenWords,
}: {
  sessionId: string;
  /** Reported upward so *Finish session* can open — F.6. The statements live
   *  in here, and the typed box the step otherwise asks about is empty. */
  onSpokenWords?: (has: boolean) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const session = useTranscription();

  /**
   * ── F.6 · THE WRITE, INSTALLED WHILE THIS SCREEN IS ON ───────────────────
   * `@musie/voice` holds the handler as a module singleton rather than as
   * context, because the write is not a rendering concern. This is the only
   * thing that installs it, and it puts back whatever it found on unmount —
   * so leaving the reflect step stops the writing rather than leaving a
   * handler pointed at a session that has ended.
   *
   * ERRORS ARE LOGGED AND NOT RAISED. This runs behind the screen while
   * somebody is speaking; throwing here would replace a reflection in progress
   * with a failure page and lose the words on screen, which is a worse outcome
   * than a row that did not save. The statements are still in the list, and
   * the next change writes them all again — because the payload is the whole
   * list rather than a delta, a failed write is retried by the next sentence.
   */
  /* WHETHER THERE IS AN ANSWER, REPORTED UP. `hasAnswered` asks the typed
     box, which is empty in voice mode, so the step cannot know this without
     being told. Sent on every change including back to false, because
     deleting the last statement un-answers the question. */
  React.useEffect(() => {
    onSpokenWords?.(session.sentences.some((s) => s.text.trim() !== ''));
  }, [session.sentences, onSpokenWords]);

  React.useEffect(() => {
    const previous = setStatementsHandler((statements) => {
      void saveStatements(sessionId, statements).catch((thrown: unknown) => {
        console.error('[musie] could not persist the spoken reflection:', thrown);
      });
    });
    return () => { setStatementsHandler(previous); };
  }, [sessionId]);


  /**
   * True from the tap until the token comes back.
   *
   * It is NOT `status`. The hook is still `idle` during the Edge Function
   * round trip — the socket has not been asked for yet — so without this the
   * button would sit enabled and unchanged for the slowest part of starting,
   * and a second tap would mint a second token against a live account.
   */
  const [awaitingToken, setAwaitingToken] = React.useState(false);
  /**
   * A token failure, which the hook never sees and therefore never reports.
   * Same `VoiceMessageCode` union, so it resolves through the same map.
   */
  const [tokenFailure, setTokenFailure] = React.useState<VoiceMessageCode | null>(null);

  const recorded = hasRecorded(session.sentences.length, session.stopReason);
  const phase = recordPhase(session.status, awaitingToken);
  const running = phase === 'recording';
  /** The hook's own failure wins: it is the later and more specific one. */
  const failure = session.error?.code ?? tokenFailure;
  const stopped = stopNoticeKey(session.stopReason);

  async function begin() {
    setTokenFailure(null);
    setAwaitingToken(true);
    /* One token per recording, never cached — realtimeToken.ts says why. */
    const outcome = await realtimeToken(DEFAULT_MODEL);
    setAwaitingToken(false);
    if (outcome.kind === 'failed') {
      setTokenFailure(outcome.code);
      return;
    }
    /* `keepExisting` is always true: recording again ADDS to the reflection
       rather than replacing it, which is what "Record more" promises. The
       list is only ever cleared by leaving the step. */
    await session.start(outcome.token, DEFAULT_MODEL, locale, 'silence', { keepExisting: true });
  }

  return (
    <div className="musie-stack">
      {/* THE LIST IS THE EDITING SURFACE and also the live one: `pending` and
          `partial` are the same box in two more states, so the page does not
          change shape as words arrive (L10). `editable` is false while a
          session runs — nothing is reorderable mid-capture, and the component
          drops every row control rather than leaving them to fight the
          incoming statements. */}
      <DraggableList
        items={session.sentences}
        editable={!running}
        onEdit={session.editSentence}
        onCombine={session.combineSentences}
        onMove={session.moveSentence}
        onDelete={session.deleteSentence}
        pending={session.pending}
        partial={session.interim}
        /* The step's question is the h2 above this, so a row's hidden headline
           is an h3 — the same level the two Messages in this step take. */
        headingLevel={3}
        label={t('reflect.voice.label')}
        itemNoun={t('voice.item.noun')}
        emptyHeadline={t('voice.empty.headline')}
        emptyText={t('voice.empty.text')}
        listeningLabel={t('voice.listening')}
        hearingLabel={t('voice.hearing')}
        dropHints={{
          combine: (position) => t('voice.drop.combine', { position: String(position) }),
          before: (position) => t('voice.drop.before', { position: String(position) }),
          after: (position) => t('voice.drop.after', { position: String(position) }),
          cancel: t('voice.drop.cancel'),
        }}
      />

      {/* F.5's affordance, in words. The lift announcement says the same thing
          to a screen reader; a sighted keyboard user has nothing else to go
          on, and an undiscoverable shortcut is not a shortcut. Only while the
          list can actually be edited. */}
      {!running && session.sentences.length > 1 && (
        <p className="musie-note">{t('voice.hint.edit')}</p>
      )}

      <RecordButton
        state={running ? 'recording' : 'ready'}
        /* The app owns the clock and the ceiling, as §7.22 requires; the
           button only draws them. */
        elapsed={SESSION_SECONDS - session.secondsLeft}
        maxSeconds={SESSION_SECONDS}
        levels={session.levels}
        disabled={phase === 'connecting'}
        onToggle={() => {
          if (running) session.stop('manual');
          else void begin();
        }}
        readyLabel={t(recordLabelKey(phase, recorded))}
        recordingLabel={t('reflect.voice.recording')}
        status={(elapsed, remaining) => t('reflect.voice.status', { elapsed, remaining })}
      />

      <p className="musie-note">
        {t(hintKey(recorded), { seconds: SECONDS, silence: SILENCE })}
      </p>

      {/* THE RECORDER STOPPING ON ITS OWN IS NEWS. Polite, not assertive: it
          is an explanation, not an interruption, and the transcript above is
          what the reader is looking at. A manual stop and a failure both
          return null from stopNoticeKey — see lib/voiceScreen.ts. */}
      {!running && stopped && (
        <Message
          variant="info"
          live="polite"
          headingLevel={3}
          headline={t('voice.stopped.headline')}
          text={t(stopped, { seconds: SECONDS, silence: SILENCE })}
        />
      )}

      {/* Assertive, because recording has ended and the reader is mid-thought
          with a microphone that is no longer listening. */}
      {failure && (
        <Message
          variant="error"
          live="assertive"
          headingLevel={3}
          headline={t('voice.error.headline')}
          text={t(VOICE_MESSAGE_KEYS[failure])}
        />
      )}

      {/* The non-fatal one. Polite: recording is still running and the thing
          to do is carry on talking. */}
      {session.warning && (
        <Message
          variant="warning"
          live="polite"
          headingLevel={3}
          headline={t('voice.warning.headline')}
          text={t(VOICE_MESSAGE_KEYS[session.warning.code])}
        />
      )}

      {/* UNDO IS THE CONSUMER'S, and the consumer is `useSentences` — it holds
          the snapshot and the six-second window, and `undoReason` going null
          is what takes the toast away. §7.23 ships no timer of its own so
          that there is only ever one clock. */}
      <Toast
        label={session.undoReason ? t(VOICE_UNDO_KEYS[session.undoReason]) : null}
        action={{ label: t('voice.undo.action'), onAction: session.undo }}
        onDismiss={session.dismissUndo}
        dismissLabel={t('voice.undo.dismiss')}
      />
    </div>
  );
}
