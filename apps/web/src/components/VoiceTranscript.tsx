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
 * verbs, and for the same reason. The swipe panel's two words join that
 * second group: the panel says *Delete*, which must be the SAME word the row
 * menu says, and a prop here would be a second place for it to drift.
 *
 * ── SWIPE TO DELETE IS LEFT ON ─────────────────────────────────────────────
 * `swipeToDelete` defaults true and is not passed. The prop exists for lists
 * whose deletion cannot be taken back; this one's can — `useSentences` holds
 * the snapshot and the six-second window, and the `Toast` at the foot of this
 * file is already wired to it. Deleting by swipe lands in the same undo as
 * deleting from the menu, because it is the same `onDelete`.
 *
 * ── WHAT IT CANNOT DO YET ──────────────────────────────────────────────────
 * Nothing here writes a row. `onSentenceFinal` is F.6's seam and is left
 * untouched, so the transcript lives for as long as the step is open and
 * *Finish session* stays disabled in voice mode — which `SessionReflect` says
 * on screen rather than leaving as a dead button.
 */
import * as React from 'react';
import { CtaButton, DraggableList, Message, RecordButton, Toast } from '@musie/design-system';
import {
  DEFAULT_MODEL, IDLE_STOP_MS, SESSION_SECONDS, setStatementsHandler, useTranscription,
} from '@musie/voice';
import { saveStatements } from '../lib/statements';
import type { VoiceMessageCode } from '@musie/voice';
import { useLocale, useT } from '../i18n/localeContext';
import { realtimeToken } from '../lib/realtimeToken';
import { VOICE_MESSAGE_KEYS, VOICE_UNDO_KEYS } from '../lib/voiceMessages';
import { hasRecorded, recordLabelKey, recordPhase, stopNoticeKey } from '../lib/voiceScreen';

/** The two cut-offs, as strings, for the ONE sentence that still names them —
 *  `voice.stopped.*`, said when a cut-off actually fires. The two standing
 *  hints that used to carry them are gone (lib/voiceScreen.ts says why). */
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

  /**
   * ── THE EDITING TIPS, WHICH ARE NOW ASKED FOR ───────────────────────────
   * Ben, 2026-09-23. F.5's affordance used to be a standing paragraph above
   * the record button: fifty words about dragging, drop targets, the space
   * bar, the arrow keys, M and escape. It was the largest block of text on a
   * screen whose subject is the person's own words, and it was there every
   * time — including the twentieth time, when nobody reads it.
   *
   * It is a disclosure now, beside the record button, and it CLOSES: the
   * dismiss is the same control as the toggle, said from inside the panel, so
   * somebody who opened it to check one shortcut can put it away without
   * hunting for the button that opened it.
   *
   * WHAT DOES NOT CHANGE IS THE KEYBOARD PATH ITSELF. The lift announcement
   * still says the same thing to a screen reader as the list is used, which is
   * where a screen-reader user meets it; this paragraph was only ever the
   * sighted keyboard user's copy of that, and an undiscoverable shortcut is
   * still not a shortcut — which is why the button says what it opens rather
   * than being an icon.
   */
  const [tipsOpen, setTipsOpen] = React.useState(false);

  const recorded = hasRecorded(session.sentences.length, session.stopReason);
  const phase = recordPhase(session.status, awaitingToken);
  const running = phase === 'recording';
  /** The hook's own failure wins: it is the later and more specific one. */
  const failure = session.error?.code ?? tokenFailure;
  const stopped = stopNoticeKey(session.stopReason);
  /* There is something to reorder, and nothing is arriving. The same two facts
     `DraggableList`'s `editable` is given, named once so the tips button and
     the tips panel cannot disagree about when they exist. */
  const editable = !running && session.sentences.length > 1;
  /**
   * WHETHER THE TRANSCRIPT SURFACE IS ON SCREEN AT ALL — Ben, 2026-09-24.
   *
   * The empty state is a dashed box saying that finished statements will appear
   * in it. On arrival at the step, with the microphone untouched, that box was
   * the largest thing on the screen and it described a list that did not exist
   * yet — an instruction where the answer goes. Ben's call: show it while
   * recording, which is when it is a place to watch rather than a caption.
   *
   * `phase !== 'ready'` rather than `running`, so it appears on the TAP — the
   * token round trip is the slow half on a phone, and a box that arrives a
   * second after the press reads as the press having done something else.
   * `sentences.length > 0` keeps it for as long as there are words in it,
   * which is the whole of the editing and the finishing.
   */
  const transcriptVisible = session.sentences.length > 0 || phase !== 'ready';

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
          incoming statements.

          L10 HOLDS WHERE IT WAS AIMED. The three states the component keeps in
          one box are the three it reaches once recording has started, and
          those still never move each other about. What `transcriptVisible`
          decides is something else: whether the step opens with an empty box
          on it. */}
      {transcriptVisible && (
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
      )}

      {/* ── ONE ROW: THE RECORDER, AND THE WAY TO THE TIPS ─────────────────
          A row rather than two stacked blocks, and it is also what stops the
          record button being stretched the width of the column: `.musie-stack`
          is a flex COLUMN, whose `align-items: stretch` pulls an inline-flex
          button edge to edge, and `RecordButton`'s own `block` prop was
          already false — the button was never asking to be full width, the
          column was making it so. Ben asked for it to hug its label; a row is
          the same fix and the place the tips button belongs. */}
      <div className="musie-voice__controls">
      <RecordButton
        state={running ? 'recording' : 'ready'}
        /* The app owns the clock and the ceiling, as §7.22 requires; the
           button only draws them. */
        elapsed={SESSION_SECONDS - session.secondsLeft}
        maxSeconds={SESSION_SECONDS}
        levels={session.levels}
        disabled={phase === 'connecting'}
        /* SECOND RECORDING, SECOND-RANK BUTTON — Ben, 2026-09-24. *Record
           more* stands over a list that is already an answer, and by then the
           screen's loudest action is *Finish session* in the action row. Two
           solid primaries arguing about which one ends the step is how
           somebody taps the wrong one. It follows `recorded`, not `running`,
           so the family does not change under the finger mid-session —
           §7.22's own rule that the state is never carried by hue. */
        variant={recorded ? 'secondary' : 'primary'}
        onToggle={() => {
          if (running) session.stop('manual');
          else void begin();
        }}
        readyLabel={t(recordLabelKey(phase, recorded))}
        recordingLabel={t('reflect.voice.recording')}
        status={(elapsed, remaining) => t('reflect.voice.status', { elapsed, remaining })}
      />

      {/* Only while the list can actually be edited — one statement cannot be
          reordered and nothing is reorderable mid-capture, which is the same
          test `DraggableList`'s own `editable` takes. */}
      {editable && (
        <CtaButton
          variant="ghost"
          aria-expanded={tipsOpen}
          aria-controls="voice-edit-tips"
          onClick={() => setTipsOpen((was) => !was)}
        >
          {t('voice.hint.editToggle')}
        </CtaButton>
      )}
      </div>

      {/* The tips themselves, when they have been asked for — AFTER the
          button that opens them, which is the whole of why they are not up
          beside the list they describe. A disclosure whose panel precedes its
          trigger sends somebody who just pressed it forward past the thing
          they asked for. `live="off"`: nothing happened; the reader opened a
          panel and is looking at it. */}
      {editable && tipsOpen && (
        <Message
          id="voice-edit-tips"
          variant="info"
          live="off"
          entering
          headingLevel={3}
          headline={t('voice.hint.editHeadline')}
          text={t('voice.hint.edit')}
          onDismiss={() => setTipsOpen(false)}
          dismissLabel={t('voice.hint.editHide')}
        />
      )}


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
