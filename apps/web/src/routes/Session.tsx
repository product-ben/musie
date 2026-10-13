/**
 * `/session/:id/:step` — the run, and the seam between three sources of truth.
 *
 * ── THE URL DRIVES; THE REDUCER RULES; THE ROW REMEMBERS ───────────────────
 * Three things hold a step, and each has exactly one job:
 *
 *   THE URL says which step is on screen. It has to — reloading on
 *   /session/:id/reflect must land on reflect, and that is D.4's done-when.
 *   Every control here navigates rather than setting state directly.
 *
 *   THE REDUCER (`sessionMachine`) says which steps are ALLOWED, and holds
 *   `completed` across the visit. It is pure, so it is the only part of this
 *   that can be tested without a database.
 *
 *   THE ROW is what survives a closed tab. Every step change writes it, so
 *   *Continue session* comes back to where the person actually was.
 *
 * They are reconciled in ONE effect, below, and in one direction: URL → rules
 * → row. Two effects pushing at each other is how a wizard ends up flickering
 * between steps, and the single direction is what makes the redirect for an
 * unreachable step a redirect rather than a fight.
 *
 * ── `completed` IS DERIVED ON ARRIVAL AND HELD AFTERWARDS ──────────────────
 * `sessions` has no `completed` column (D.4's finding). On mount the set is
 * rebuilt from `step` — everything before it that is in the run — because the
 * reachability rule only ever lets you stand where your predecessors are done.
 * Within the visit the reducer keeps it, so walking BACK does not re-lock the
 * steps ahead.
 *
 * The honest cost, stated: go back, then close the tab, and you resume at the
 * step you went back to rather than the furthest you reached. That is what
 * `sessions.step` means — "where you stopped" — and it is what the diary
 * reports for an unfinished run, so the alternative would have needed a second
 * column meaning something else.
 *
 * ── A CARDLESS EXERCISE SKIPS `scan` ───────────────────────────────────────
 * Derived from `exercises.needs_cards`, never stored, so a content edit cannot
 * leave a stale answer in a row. The rail draws four markers with `scan`
 * visibly skipped (D14), which is the fifth wizard state D.0 built.
 *
 * ── CLOSING IS REACHABLE FROM INSIDE, AND HAS TO BE ────────────────────────
 * While a session runs the drawer offers no other way out, so without a close
 * control here the only exit would be to finish. Confirmed, because the row it
 * writes is permanent and shows up in the diary as unfinished.
 */
import * as React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { DoorOpen, Headphones, Quote, ScanQrCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, InteractiveWizard, Lightbox, Message,
  WizardPanel,
} from '@musie/design-system';
import { SessionIntro } from '../components/SessionIntro';
import { SessionListen } from '../components/SessionListen';
import { SessionReflect } from '../components/SessionReflect';
import { SessionScan } from '../components/SessionScan';
import { useLocale, useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { warmTrackBytes } from '../lib/audio';
import { getCard, getExercise, getListenAudio, getTrackFor } from '../lib/content';
import {
  DEFAULT_ENDING, DEFAULT_POSTURE, isEnding, isPosture, skippedFor, stepsForKind,
} from '../lib/exerciseKind';
import type { Ending, Posture } from '../lib/exerciseKind';
import type { Card, Exercise, ListenAudio, Track } from '../lib/content';
import { hasAnswered } from '../lib/reflect';
import type { ReflectMode } from '../lib/reflect';
import { scanCardInto } from '../lib/scan';
import {
  completedBefore, endSession, readSession, saveCard, saveFeelingChange,
  saveListeningAnswers, saveReflection, saveStep,
} from '../lib/session';
import type { FeelingChange, SessionRow } from '../lib/session';
import { useSessionQuestion } from '../lib/useQuestion';
import { resumeSession, sessionReducer, stepTransition } from '../lib/sessionMachine';
import { useAsync } from '../lib/useAsync';
import type { StepId } from '../routeHandle';

/** Every step's display name, as a catalogue key. A `Record`, so a fifth step
 *  fails the typecheck rather than rendering a raw slug. */
const STEP_LABEL: Record<StepId, MessageKey> = {
  intro: 'session.step.intro',
  scan: 'session.step.scan',
  listen: 'session.step.listen',
  reflect: 'session.step.reflect',
};

/**
 * Every step's marker glyph, replacing the position number in the rail
 * (2026-09-24, from user testing).
 *
 * A `Record` for the same reason `STEP_LABEL` is one: a fifth step fails the
 * typecheck rather than quietly falling back to a number beside four icons.
 *
 * TWO OF THE FOUR ARE NOT CHOICES — they are the glyph this product already
 * uses for that idea, and one idea with two glyphs is worse than either glyph:
 *
 *   scan    ScanQrCode  what the card scanner itself shows (QrScanner.tsx,
 *                       its `leadingIcon` in all three modes)
 *   listen  Headphones  the `sound` fact chip on every exercise card
 *                       (Exercises.tsx) — the same promise, earlier
 *
 * THE SCAN LINE WAS WRONG ON BOTH HALVES, and the comment above is the
 * corrected one (2026-10-09). It used to read `ScanLine … what the card
 * scanner itself shows (CardScanner.tsx)`. CardScanner.tsx imports no glyph at
 * all — it is an adapter over QrScanner and says so in its own header — and
 * what the scanner draws is ScanQrCode. So the rail and the scanner were two
 * glyphs for one idea, which is the exact thing this paragraph forbids, while
 * citing a file that could not have settled it either way. ScanLine is now
 * used nowhere in the repo.
 *
 * The other two had nothing to inherit:
 *
 *   intro   DoorOpen    the step is the way in, and it is the German word
 *                       the rail now uses for it — 'Einsteigen', getting in.
 *                       BookOpen was the alternative, reading the step as the
 *                       explainer you read; the door won because the label
 *                       names the act, not the page.
 *   reflect Quote       the step gives you your own words back, which is what
 *                       a quotation mark is for. It replaced
 *                       MessageCircleQuestionMark on 2026-10-09: that glyph reads
 *                       as "do you have a question" — a help desk — where this
 *                       step is Nachdenken, and user testing produced the
 *                       first field evidence against it. Still deliberately
 *                       NOT PenLine, Mic or Camera: those three are the answer
 *                       MODES inside this very step (SessionReflect.tsx), so
 *                       any of them in the rail would promise one of the three
 *                       before you have chosen.
 */
const STEP_ICON: Record<StepId, LucideIcon> = {
  intro: DoorOpen,
  scan: ScanQrCode,
  listen: Headphones,
  reflect: Quote,
};

/** Everything one session screen needs, in one read. */
interface SessionData {
  row: SessionRow;
  exercise: Exercise;
  card: Card | null;
  track: Track | null;
}

export function Session() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();
  const navigate = useNavigate();

  const id = params.id ?? '';
  const urlStep = params.step as StepId;

  /**
   * ONE READ, FOUR THINGS, AND A VERSION TO RE-RUN IT.
   *
   * The card and the track follow the row, so a scan has to re-read — but
   * only the scan changes them, and only once per session. A counter in the
   * key is the whole of the invalidation: cheaper than a query library, and
   * there is nothing else in the app that would use one.
   *
   * THE DECK USED TO BE READ HERE TOO, and it is not any more. It existed for
   * one caller: the simulated scan, which picked one of the nine at random.
   * E.1 deleted that, and a code names its own card — so every session stopped
   * fetching nine cards and their translations to show one.
   */
  const [version, setVersion] = React.useState(0);
  const run = React.useCallback(async (): Promise<SessionData | null> => {
    const row = await readSession(id);
    if (row === null) return null;

    const exercise = await getExercise(row.exerciseId, locale);
    if (exercise === null) return null;

    /* In parallel: neither depends on the other. */
    const [card, track] = await Promise.all([
      row.cardId === null ? Promise.resolve(null) : getCard(row.cardId, locale),
      getTrackFor(row.exerciseId, row.cardId),
    ]);

    return { row, exercise, card, track };
  }, [id, locale]);

  const { data, loading, error } = useAsync(run, `session:${id}:${locale}:${version}`);

  /* ── Failure, absence, and the two redirects ────────────────────────────*/
  if (loading) return <p className="musie-note">{t('content.loading')}</p>;

  if (error !== null) {
    return (
      <Message
        variant="error"
        live="assertive"
        headingLevel={1}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  }

  if (data === null) {
    return (
      <ContentBox
        headingLevel={1}
        headline={t('session.notFound')}
        text={t('session.notFoundText')}
        outline="dashed"
      >
        <CtaButton variant="secondary" onClick={() => navigate('/exercises')}>
          {t('common.back')}
        </CtaButton>
      </ContentBox>
    );
  }


  /**
   * ── THE MACHINE IS MOUNTED WITH ITS ANSWER, NOT SEEDED AFTER IT ─────────
   * Everything below this line used to live in one component, and the reducer
   * was initialised EMPTY and `RESUME`d from the row by an effect. Effects run
   * after render, so there was one frame in which the row had arrived and the
   * machine had not been told about it — `step: 'intro'`, nothing completed.
   *
   * The refusal guard runs during that frame. Resuming at `listen` was read as
   * unreachable, redirected to `state.step` (which was `intro`), and the
   * reconciliation then dutifully wrote `intro` back to the row. *Continue
   * session* did not fail to resume; it REWOUND the session, and the row it
   * rewound was the only record of where the person had got to. Ben found it
   * on the first walk; `e2e/resume.spec.ts` is the walk that now finds it.
   *
   * A flag saying "not seeded yet" would have fixed this instance. Mounting
   * the machine only once its initial state is known removes the frame, and
   * with it the class — there is no longer a moment when `state` can be asked
   * a question it has no basis to answer.
   *
   * KEYED ON THE ROW'S ID, and deliberately not on its step: the step changes
   * on every advance, and remounting there would throw away `listened`, the
   * typed answer and the reflect mode every time somebody moved.
   */
  return (
    <SessionRun
      key={data.row.id}
      data={data}
      id={id}
      urlStep={urlStep}
      onRescan={() => setVersion((n) => n + 1)}
    />
  );
}

interface SessionRunProps {
  /** Loaded before this mounts — which is the whole point of the split. */
  data: SessionData;
  id: string;
  urlStep: StepId;
  /** A scan changes the row's card and track, so the read has to happen again. */
  onRescan: () => void;
}

function SessionRun({ data, id, urlStep, onRescan }: SessionRunProps) {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();

  /* ── WHICH STEPS THIS RUN HAS, AND WHICH IT DOES NOT ───────────────────
     ONE DERIVATION, TWO CONSUMERS: the reducer is given `skipped` and the rail
     is given `steps`, and both come from `exercises.kind` through
     `lib/exerciseKind.ts`. A second rule for either would be a rule that can
     disagree with the first.

     It was `!data.exercise.needsCards ? ['scan'] : []` until 2026-10-11. The
     fact is the same for every exercise that exists today — `needs_cards` is
     held equal to the kind by a check constraint — and what changed is that
     the rail now draws THREE markers for a listening exercise instead of four
     with a gap, because it is handed three steps. See `stepsForKind`'s note
     for why that overturns D14 for this kind and only this kind. */
  const steps: readonly StepId[] = React.useMemo(
    () => stepsForKind(data.exercise.kind),
    [data.exercise.kind],
  );

  const skipped: StepId[] = React.useMemo(
    () => skippedFor(data.exercise.kind),
    [data.exercise.kind],
  );

  /* ── THE TWO ANSWERS THE EINSTEIGEN STEP ASKS FOR ──────────────────────
     Only a listening run asks, and both are PRESELECTED — so the state starts
     from the row where there is one and from the defaults where there is not.

     SEEDED FROM THE ROW, which is what makes coming back to a run play what it
     was going to play: resuming with the defaults would quietly re-choose for
     somebody who had already chosen. Narrowed rather than cast, because the
     column is `text` and a check constraint is not a Postgres enum. */
  const asksHowToListen = data.exercise.kind === 'listening_only';

  const [posture, setPosture] = React.useState<Posture>(
    isPosture(data.row.posture) ? data.row.posture : DEFAULT_POSTURE,
  );
  const [ending, setEnding] = React.useState<Ending>(
    isEnding(data.row.ending) ? data.row.ending : DEFAULT_ENDING,
  );

  /* ── AND WHETHER THE FIRST QUESTION IS ASKED AT ALL — Ben, 2026-10-13 ──
     Two gates, not one, and only the second is a judgement. The KIND decides
     whether a run asks about its audio; the ROW decides whether the posture
     half is worth asking, and the Klangreise says no
     (`exercises.asks_posture`, `20261013140000`).

     `asksHowToListen` is still here and is not redundant:
     `exercises_asks_posture_applies` already keeps the column null outside
     `listening_only`, so the two can never disagree — but reading the gate off
     the kind is what makes the ENDING question's rule visible beside it,
     rather than implied by a constraint in another file.

     `posture` the STATE survives either way, because the cut lookup still
     needs a value to match against and every cut delivered so far serves any
     posture. What changes is whether the question is drawn, and whether the
     answer is written down as if somebody had given it. */
  const asksPostureQuestion = asksHowToListen && data.exercise.asksPosture;

  /* ── WHICH AUDIO, FOR THOSE ANSWERS ───────────────────────────────────
     A SECOND read rather than part of the first, because it depends on the
     answers and they change on the screen: keyed on all four, so moving a
     segment re-resolves and arriving at Hören has the right files. The card
     exercises never reach it — their recording came with the session row.

     It is also where the PREFETCH happens: this runs on the intro step, where
     the person is reading two sentences and looking at two preselected
     answers, so the signed URLs are minted and cached (`lib/audio.ts`) before
     the listen step mounts and asks for them. */
  const { data: listenAudio } = useAsync(
    () => (asksHowToListen
      ? getListenAudio(data.row.exerciseId, locale, posture, ending)
      : Promise.resolve(null)),
    `listen-audio:${data.row.exerciseId}:${locale}:${posture}:${ending}:${asksHowToListen}`,
  );

  /* ── AND THE FIRST BYTES, WHILE THE ANSWERS ARE BEING LOOKED AT ───────
     The URLs are minted by the read above; this pulls 128 KB of each file into
     the HTTP cache so the first press of play costs a decode rather than a
     connection. Only on `intro`, which is where the free seconds are, and only
     once per key per page. See `warmTrackBytes`.

     Keyed on `urlStep` rather than `state.step`: the URL is what says which
     step is on screen (this file's first rule), and it is in scope before the
     reducer that reconciles it. */
  React.useEffect(() => {
    if (urlStep !== 'intro' || listenAudio === null || listenAudio === undefined) return;
    warmTrackBytes(listenAudio.kind === 'cut'
      ? [listenAudio.mixedSrc, listenAudio.voiceSrc]
      : [listenAudio.src]);
  }, [urlStep, listenAudio]);

  /**
   * ONE SHAPE FOR THE LISTEN STEP, out of two sources.
   *
   * A listening run resolves a cut — or the unducked original, when its
   * guidance is not recorded in this language yet. A card run already holds
   * its one file, from the session row. The step reads both the same way, so
   * neither it nor the mixer carries a branch for "the card case".
   */
  const audio: ListenAudio | null = React.useMemo(() => {
    if (asksHowToListen) return listenAudio ?? null;
    if (data.track === null) return null;
    return {
      kind: 'piece',
      trackId: data.track.id,
      src: data.track.src,
      durationSeconds: data.track.durationSeconds,
    };
  }, [asksHowToListen, listenAudio, data.track]);

  /**
   * THE LENGTH THE INTRO COPY QUOTES, HELD ACROSS A RE-RESOLVE — Ben,
   * 2026-10-13, from user testing.
   *
   * THE BUG: moving *Was machst du nach der Übung?* made the sentence flicker.
   * `useAsync` clears its data on a key change (`lib/useAsync.ts`, and it is
   * right to — stale data under a new key is the worse failure), so `audio`
   * goes null for the length of one round trip. `SessionIntro` interpolates
   * `{minutes}` off that number and is DOCUMENTED to show the placeholder when
   * there is none, so the sentence read *die nächsten {minutes} Minuten* for a
   * few hundred milliseconds and then settled back.
   *
   * THE FIX IS TO REMEMBER rather than to stop clearing: the last length we
   * actually resolved stands while the next one is in flight. It is not a
   * guess — it is the number that was true a moment ago, and for these two
   * exercises it is the number that will be true again, since a cut's endings
   * are two bounces of one session and share a length.
   *
   * It does NOT cover the first resolve of a cold load, where there has been
   * no length yet and the placeholder is still what shows. That is the
   * documented behaviour for "no recording to quote" and is one render rather
   * than a flicker between two answers.
   */
  const [introDuration, setIntroDuration] = React.useState<number | null>(null);
  const resolvedDuration = audio?.durationSeconds ?? null;
  React.useEffect(() => {
    if (resolvedDuration !== null) setIntroDuration(resolvedDuration);
  }, [resolvedDuration]);

  /* ── THE ROTATING QUESTION, HELD FOR THE WHOLE RUN — 2026-10-11 ─────────
     Here and not inside `SessionListen` for the reason `feelingChange` is
     here: the LISTEN step asks it and the REFLECT step asks it again in the
     past tense, and the rail unmounts each step when you walk between them.
     A question held by the listen step would be re-drawn on the way back.

     It is only ever ASSIGNED on the listen step (`lib/useQuestion.ts`), so a
     session abandoned at intro or scan consumes nothing. */
  const question = useSessionQuestion(data.row, locale);


  /* ── The state machine, INITIALISED FROM THE ROW ────────────────────────
     Not initialised empty and resumed: `data` is already loaded when this
     component mounts, so the row's step and its derived `completed` are the
     reducer's first state rather than its second. The `RESUME` effect and the
     `seeded` ref it needed are both gone. */
  const [state, dispatch] = React.useReducer(
    sessionReducer,
    undefined,
    () => resumeSession(
      {
        step: data.row.step,
        status: data.row.status,
        completed: completedBefore(data.row.step, skipped),
        endedAt: data.row.endedAt,
      },
      skipped,
    ),
  );

  /* ── URL → rules → row. The one reconciliation. ─────────────────────────
     Runs after the seed, so `state` already reflects the row.

     `stepTransition` is what decides between NEXT and GO_TO, and the
     difference is load-bearing rather than cosmetic: NEXT completes the step
     you are leaving and GO_TO does not. Dispatching GO_TO for a forward move
     leaves `completed` empty forever, and every step after the first is then
     permanently unreachable — which is exactly what the first version of this
     effect did. See `stepTransition`'s own note.

     A refused step is not navigated away from HERE. A redirect issued during
     an effect races the render it was trying to prevent; the guard below does
     it with `<Navigate>` instead, which replaces the frame. */
  React.useEffect(() => {
    if (data === null) return;
    const move = stepTransition(state, urlStep);
    if (move === 'stay' || move === 'refuse') return;
    dispatch(move === 'next' ? { type: 'NEXT' } : { type: 'GO_TO', step: urlStep });
    void saveStep(id, urlStep).catch((thrown: unknown) => {
      console.error('[musie] could not save the step:', thrown);
    });
  }, [data, urlStep, state, id]);

  /**
   * WHY THE LAST CODE DID NOT LAND — already translated, or null.
   *
   * Held here rather than in `SessionScan` because two of the three answers
   * are facts the lookup discovered (this is not a code; this deck has no such
   * card) and the third is the query failing. The field renders whichever
   * sentence it is given and decides nothing.
   */
  const [scanError, setScanError] = React.useState<string | null>(null);

  /**
   * HOW THE SESSION LEFT YOU, on the three-point scale the reflect step asks
   * for. `null` until somebody answers, and that is a real state rather than a
   * missing one: the question is optional in the sense that a session can be
   * saved without it, and the completion dialog is what says so out loud.
   *
   * HELD HERE, beside `answer` and `reflectMode`, because it is written in the
   * same `finish()` as they are and because the step itself is unmounted and
   * remounted by the rail. A value kept inside `SessionReflect` would be lost
   * by stepping back to listen and forward again.
   */
  const [feelingChange, setFeelingChange] = React.useState<FeelingChange | null>(null);

  /** The completion dialog, opened by saving while something is unanswered. */
  const [confirmingIncomplete, setConfirmingIncomplete] = React.useState(false);

  /**
   * VOICE IS THE DEFAULT — Ben, 2026-09-23.
   *
   * It was `text` for as long as text was the only mode that could be saved.
   * F.6 ended that: a spoken reflection is written statement by statement as
   * it is spoken, so the mode the segmented control lands on is now a question
   * about which answer the product WANTS rather than which one works. Speaking
   * is the one it wants — it is the shorter path on a phone, and the exercise
   * has just spent ninety seconds asking the person to be somewhere other than
   * in a text box.
   */
  const [reflectMode, setReflectMode] = React.useState<ReflectMode>('voice');
  /* Whether the transcript editor holds any words — F.6. It owns the
     statements, so the step has to be told. */
  const [spokenWords, setSpokenWords] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  const [listened, setListened] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  /* `track` stays on `data` and is read by the `audio` memo above rather than
     destructured here: a card exercise's one file is the only thing that uses
     it, and the step is given one shape for both kinds. */
  const { row, exercise, card } = data;

  /* A session that has ENDED is history, not a run. The diary is where it
     lives, and that screen already knows how to draw it. */
  if (row.status !== 'started') {
    return <Navigate to={`/diary/${encodeURIComponent(row.id)}`} replace />;
  }

  /* An unreachable step never renders. The effect above deliberately does not
     navigate — a redirect during an effect races the render it was trying to
     prevent — so the guard is here, where `<Navigate>` replaces the frame
     instead of painting the wrong step first. */
  if (stepTransition(state, urlStep) === 'refuse') {
    return <Navigate to={`/session/${encodeURIComponent(id)}/${state.step}`} replace />;
  }

  const go = (step: StepId) => navigate(`/session/${encodeURIComponent(id)}/${step}`);

  /* `steps` IS the run, so `activeSteps(skipped)` is no longer computed here:
     it returned exactly this list, from the same derivation, one indirection
     later. One name for one thing. */
  const stepAfter = (step: StepId) => steps[steps.indexOf(step) + 1] ?? null;
  const stepBefore = (step: StepId) => steps[steps.indexOf(step) - 1] ?? null;

  function advance() {
    const next = stepAfter(state.step);
    if (next === null) return;

    /* THE ANSWERS ARE WRITTEN ON THE WAY OUT OF `intro`, not as each control
       moves: one request instead of four on a screen whose whole job is two
       taps. Not awaited, because the navigation must not wait on a round trip
       — but it does throw, so a failure surfaces in the console rather than as
       a silently wrong answer in the row. */
    if (state.step === 'intro' && asksHowToListen) {
      /* NULL WHERE THE QUESTION WAS NOT PUT. `sessions.posture` is documented
         as the answer "AS ASKED on the Einsteigen step", and the Klangreise
         no longer asks — so writing the default would be the row claiming an
         answer nobody gave, and `missing_cuts` would read it as demand for a
         posture-specific recording that nothing has asked for. */
      void saveListeningAnswers(id, asksPostureQuestion ? posture : null, ending);
    }

    go(next);
  }

  function retreat() {
    const previous = stepBefore(state.step);
    if (previous !== null) go(previous);
  }

  /**
   * A CODE, AND THE CARD IT NAMES — E.1, and the end of the simulated draw.
   *
   * This used to pick one of the nine at random and write it. It now takes
   * what the person typed (or what the deep link held for them) and resolves
   * the card they are actually holding. The write is unchanged: `card_id` and
   * `track_id` together, through `scanCardInto`, which is the same function
   * `/s/:code` calls — so a typed code and a scanned one cannot end up meaning
   * two different things.
   *
   * THREE OUTCOMES, AND ONLY ONE OF THEM IS AN ERROR. A code that is not a
   * code, and a code no card carries, are answers: they go to the field, which
   * says them next to what was typed. A THROW is the query failing, and it
   * gets the third sentence plus the console — it is not the person's typing
   * that was wrong.
   *
   * ── A CARD THAT LANDS MOVES THE PERSON ON — Ben, 2026-09-24 ─────────────
   * It used to write the card and stay, so the step redrew itself as "your
   * card is MC-08" with Continue underneath: a screen whose only content was
   * the answer to a question already asked, and a tap to leave it. Naming the
   * card IS finishing this step, so finishing it is what naming the card now
   * does.
   *
   * `advance()` rather than `go('listen')`, so this asks the run which step
   * comes next instead of knowing — the same call Continue made, from the same
   * place in the same state.
   *
   * THE RE-READ FIRST. `onRescan` is what fetches the card and the track the
   * next step is about to play; navigating without it would land on `listen`
   * with `track` still null and the step saying there is nothing to play.
   *
   * CHANGING THE CARD IS STILL THERE, one step back: the scan step keeps its
   * drawn-card state and *Scan a different card*, which is what Back from
   * `listen` returns to.
   */
  async function submitCode(scanned: string) {
    if (busy) return;
    setBusy(true);
    setScanError(null);
    try {
      const outcome = await scanCardInto(id, exercise.id, scanned, locale);
      if (outcome.kind === 'applied') {
        onRescan();
        advance();
        return;
      }
      setScanError(
        outcome.kind === 'malformed'
          ? t('session.scan.codeMalformed')
          : t('session.scan.codeUnknown', { code: outcome.code }),
      );
    } catch (thrown: unknown) {
      console.error('[musie] could not record the scan:', thrown);
      setScanError(t('session.scan.codeFailed'));
    } finally {
      setBusy(false);
    }
  }

  /**
   * *Scan a different card* RESETS THE STEP rather than drawing again.
   *
   * It used to re-roll straight to another card, which made it a shuffle
   * button: you got a card you did not choose, again. Clearing puts the reader
   * back, so the next draw is an act the person takes rather than one that
   * happens to them — which is the whole premise of drawing a card.
   *
   * The TRACK is cleared with it. They were written together because one act
   * decided both, and they are cleared together for the same reason: a session
   * holding a recording with no card would be claiming something it has no
   * reason to play.
   */
  async function clearScan() {
    if (busy) return;
    setBusy(true);
    setScanError(null);
    try {
      await saveCard(id, null, null);
      onRescan();
    } catch (thrown: unknown) {
      console.error('[musie] could not clear the scan:', thrown);
    } finally {
      setBusy(false);
    }
  }

  /**
   * FINISHING, and the order is the point.
   *
   * The reflection first, then the status. If the write of the answer fails,
   * the session is still running and the person can try again; if the order
   * were reversed, a failed answer would leave a finished session claiming a
   * reflection that was never stored — which is the one thing the diary must
   * never do.
   *
   * A DECLINED ANSWER WRITES NO ROW, and finishes anyway. `reflections.body`
   * is not null, so "nothing to say" can only be expressed as the absence of a
   * row; the diary already renders that as an entry with no answer.
   */
  /**
   * `skip` is *Skip reflection* — a FINISH WITH NO ROW, not a mode.
   *
   * An explicit argument rather than a flag in state, because the two have to
   * be decided in the same tick: a `setDeclined(true)` followed by `finish()`
   * would read the state from the render that has not happened yet and write
   * an empty reflection.
   */
  async function finish(skip = false) {
    if (busy) return;
    setBusy(true);
    try {
      /* VOICE HAS ALREADY WRITTEN ITSELF — F.6.
       
         A spoken reflection is persisted as it is spoken, statement by
         statement, and `reflections.body` is assembled from those rows on
         every write. Calling `saveReflection` here would upsert the same row
         with `answer` — the TYPED box's text, which in voice mode is empty —
         and replace a finished transcript with nothing at the last possible
         moment. The row exists and is correct before Finish is ever pressed. */
      if (!skip && reflectMode !== 'voice') {
        await saveReflection(id, reflectMode, answer.trim());
      }
      /* HOW THE SESSION LEFT YOU, written in the same act as the reflection
         and for the same reason: the scale sits on a step that can be walked
         back out of, so saving on every press would record a mind being
         changed rather than an answer being given.

         IT SURVIVES `skip`, which the reflection does not. Saving without a
         written answer is a real outcome the dialog offers by name, and the
         scale may well be the only thing somebody chose to give — dropping it
         because the text box is empty would discard the answer they did make.

         NOT WRITTEN WHEN UNANSWERED. Null is the column's own resting state,
         so a write of null would be a round trip that says nothing. */
      if (feelingChange !== null) {
        /* ITS OWN CATCH, AND THE SESSION SURVIVES IT. Everything else in this
           block is the session: the reflection somebody wrote, and the status
           that makes it an entry. This is one optional field on a nullable
           column, answering a question the save dialog already offers to skip
           — so losing it must cost the answer, never the session.

           Without this, the shared `catch` below would swallow the whole
           finish: no `endSession`, no navigation, `busy` cleared, and somebody
           standing on /reflect pressing a button that does nothing while the
           only explanation is in the console. A column that is missing, a
           constraint that rejects, or a dropped connection would all land
           there.

           STILL LOGGED, never silent. The answer is gone and the console says
           so, which is the same bargain `markListened` makes on the step
           before this one. */
        try {
          await saveFeelingChange(id, feelingChange);
        } catch (thrown: unknown) {
          console.error('[musie] the session was saved without how it left you:', thrown);
        }
      }
      const at = new Date().toISOString();
      await endSession(id, 'finished', at);
      dispatch({ type: 'FINISH', at });
      /* THE LIST, not the entry. Ben, 2026-09-20: finishing hands you your
         diary rather than one page of it — and the list now leads with the
         session you just finished, so nothing is lost by landing a level up.

         `sessionSaved` is what /diary's confirmation toast keys on (2026-09-26).
         ROUTE STATE rather than a query string or a flag in a store, and that
         choice is what makes "no toast when you arrive through the nav" free:
         nothing else in the app sets it, so the diary has no rule to enforce.
         /diary clears it out of the history entry on arrival, so a reload does
         not re-confirm a session finished an hour ago.

         ── AND ONLY WHEN THERE IS A REFLECTION TO FIND — 2026-09-29 ────────
         The toast said "Im Tagebuch findest du einen Eintrag für jede beendete
         Übung", which was true after ANY session, so it was shown on both ways
         out of one. Ben's new wording names the REFLECTION — "Deine Reflexion
         findest du im neuesten Tagebucheintrag" — and that is a promise about
         a specific thing being there.

         `skip` is *Überspringen* on the reflect step: the session finishes and
         no reflection is written. Confirming one anyway would send somebody to
         an entry to look for something they had just declined to write. So the
         flag rides on `!skip`, and `close()` below drops it entirely. */
      navigate('/diary', {
        replace: true,
        state: skip ? undefined : { sessionSaved: true },
      });
    } catch (thrown: unknown) {
      console.error('[musie] could not finish the session:', thrown);
      setBusy(false);
    }
  }

  async function close() {
    if (busy) return;
    setBusy(true);
    try {
      const at = new Date().toISOString();
      await endSession(id, 'abandoned', at);
      dispatch({ type: 'CANCEL', at });
      /* THE LIST, exactly as finishing does. Both ways out of a session end in
         the same place, and the diary leads with the one you just left.

         ── NO `sessionSaved` HERE ANY MORE — 2026-09-29 ───────────────────
         It carried the flag from 2026-09-26, on Ben's call that closing early
         writes an entry just as finishing does, which is what the confirmation
         then promised.

         Ben's new wording promises something narrower: that a REFLECTION is in
         the latest entry. An abandoned session has none — that is what
         abandoning it means — so the sentence would be false on exactly this
         path. The flag goes rather than the sentence.

         This also settles the clash logged in OPEN-QUESTIONS.md, which was
         that 'für jede BEENDETE Übung' sat above an entry badged 'Nicht
         beendet'. There is no adjective left to contradict, and no toast on
         this path to contradict it with. */
      navigate('/diary', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not close the session:', thrown);
      setBusy(false);
    }
  }

  /**
   * THE WAY OUT OF WHICHEVER STEP IS SHOWING.
   *
   * Back is FIRST in the DOM and the stylesheet pushes it to the leading edge:
   * it is navigation, not an alternative to going on. The forward action is
   * last, so tab order matches the screen (L6).
   *
   * Back on the FIRST step leaves the session rather than moving in it —
   * there is no step behind intro. The session stays running and the drawer
   * offers it back; closing it properly is the control in the context box.
   */
  const backwards = stepBefore(state.step);
  const back = backwards === null
    ? <CtaButton variant="ghost" render={<Link to="/exercises" />}>{t('common.back')}</CtaButton>
    : <CtaButton variant="ghost" onClick={retreat}>{t('common.back')}</CtaButton>;

  let actions: React.ReactNode = null;
  if (state.step === 'intro') {
    actions = (
      <>
        {back}
        <CtaButton onClick={advance}>{t('common.continue')}</CtaButton>
      </>
    );
  } else if (state.step === 'scan') {
    actions = (
      <>
        {back}
        {card !== null && (
          <>
            <CtaButton variant="secondary" onClick={() => void clearScan()}>
              {t('session.scan.again')}
            </CtaButton>
            <CtaButton onClick={advance}>{t('common.continue')}</CtaButton>
          </>
        )}
      </>
    );
  } else if (state.step === 'listen') {
    /* ONE FILLED PRIMARY, AND IT MOVES WHEN THE GATE OPENS. Until the step is
       satisfied, listening is the only thing to do and the transport holds the
       filled treatment; at the threshold the CTA takes it. An exercise with no
       recording cannot be listened to, so the gate it would never pass is not
       applied — the step says why there is nothing to play instead of becoming
       a dead end. */
    /* BACK ALONE, because the listen step owns its own row — see
       `SessionListen`'s `onAdvance`. The transport, the details detour and
       *Start reflection* are three things you can do with one recording and
       the prototype groups them together; splitting them across two rows made
       the transport read as content and the CTA as chrome.

       AND BACK GOES WITH THEM. `WizardPanel` renders `actions` after its
       children, and this step's children are three full-height views — so
       Back sat at the foot of the third one, two screens below the step it
       leaves. The panel gets no row here at all. */
    actions = null;
  } else {
    /* ── ONE WAY OUT (Ben, 2026-10-09) ────────────────────────────────────
       This row carried TWO exits — *Skip reflection* beside *Finish session* —
       and the step carried a third, the ghost *Close this session* below the
       panel. Three doors out of one step, which is what user testing reported
       and what the board still lists as open. The ghost is hidden on this step
       now and skip is gone; what is left is one button that names where the
       session goes.

       IT IS NEVER DISABLED, and that is the change that needed a dialog. The
       old primary was disabled until `hasAnswered`, which stops somebody
       without telling them anything — the control that knows what is missing
       says nothing, and the one asking has no way to ask. Now the press is
       always accepted and the answer comes back as a sentence.

       WHAT COUNTS AS COMPLETE is the written answer AND the scale. Either one
       open opens the dialog; the dialog's second button saves anyway, so this
       is a speed bump rather than a gate. */
    const complete = hasAnswered(reflectMode, answer, spokenWords) && feelingChange !== null;
    actions = (
      <>
        {back}
        <CtaButton
          loading={busy}
          loadingLabel={t('content.loading')}
          onClick={() => {
            if (complete) void finish();
            else setConfirmingIncomplete(true);
          }}
        >
          {t('reflect.save')}
        </CtaButton>
      </>
    );
  }

  return (
    <div className="musie-session">
      <ContentBox
        /* Framed: the exercise's name and the rail above the hairline, the
           live step below it. §7.9's own arrangement, and the prototype's. */
        headingLevel={1}
        headlineStep="heading-sm"
        /* The name is CONTEXT, not an announcement: it sits above the rail as
           a reminder of what you are in, and at full contrast it competes with
           the step you are actually doing. The prototype makes the same call
           inline. Ink only — the heading level is untouched. */
        headlineTone="muted"
        headline={exercise.name}
        header={
          <div className="musie-rail">
            <InteractiveWizard
              label={t('session.wizardLabel')}
              /* THE RUN'S OWN STEPS, not all four — so a listening exercise
                 draws three markers rather than four with one crossed out.
                 `skipped` is still passed, and is empty for every kind whose
                 run is the full list; the design system's fifth wizard state
                 is untouched and is what a future kind with a genuine gap
                 would use. */
              steps={steps.map((step) => ({
                id: step,
                label: t(STEP_LABEL[step]),
                icon: STEP_ICON[step],
              }))}
              current={state.step}
              completed={[...state.completed]}
              skipped={skipped}
              /* The rail proposes; the URL disposes. Navigating rather than
                 dispatching keeps one path into a step, so a rail tap and a
                 pasted URL behave identically. */
              onStepChange={(next) => go(next as StepId)}
            />
          </div>
        }
      >
        {/* THE ACTION ROW IS `WizardPanel`'s, and it is filled from out here.
            The step components render their own body and nothing else: a step
            that drew its own row would be emitting `.musy-wizard__actions`
            from `apps/web`, which is the app reaching into a component's
            geometry (CLAUDE.md rule 1, 10-layout.md L7).

            It also puts every way OUT of a step in one place, which is where
            the rules about them live — the gate, the answer, and the fact that
            Back from the first step leaves the session rather than moving in
            it. */}
        <WizardPanel actions={actions}>
          {state.step === 'intro' && (
            <SessionIntro
              exercise={exercise}
              /* The length of what is about to play, for the `{minutes}` the
                 intro copy quotes. From the resolved cut rather than from the
                 exercise, because a re-recording changes it. */
              durationSeconds={introDuration}
              /* Undefined where the question is not put, which is how the step
                 knows there is no question rather than no answer — now per
                 question rather than for both at once. */
              posture={asksPostureQuestion ? posture : undefined}
              ending={asksHowToListen ? ending : undefined}
              onPostureChange={setPosture}
              onEndingChange={setEnding}
            />
          )}

          {state.step === 'scan' && (
            <SessionScan
              exercise={exercise}
              card={card}
              scanning={busy}
              codeError={scanError}
              onSubmitCode={(scanned) => void submitCode(scanned)}
            />
          )}

          {state.step === 'listen' && (
            <SessionListen
              exercise={exercise}
              audio={audio}
              sessionId={id}
              card={card}
              listened={listened}
              onListened={() => setListened(true)}
              onAdvance={advance}
              back={back}
              question={question}
            />
          )}

          {state.step === 'reflect' && (
            <SessionReflect
              exercise={exercise}
              sessionId={id}
              onSpokenWords={setSpokenWords}
              mode={reflectMode}
              onModeChange={setReflectMode}
              text={answer}
              onTextChange={setAnswer}
              feeling={feelingChange}
              onFeelingChange={setFeelingChange}
              question={question}
            />
          )}
        </WizardPanel>
      </ContentBox>

      {/* THE WAY OUT THAT IS NOT FINISHING.
          While a session runs the nav drawer offers nothing else, so without
          this the only exit would be to complete the run. Quiet and below the
          panel: it is not what this screen is for, but it has to be reachable.

          It used to live in a "This session" box beside the panel. That box is
          gone (Ben, 2026-09-20) — the rail already says which step you are on
          and the panel header already names the exercise, so it restated the
          screen rather than adding to it. */}
      {/* ── EVERY STEP BUT REFLECT (Ben, 2026-10-09) ───────────────────────
          /reflect used to carry THREE exits at once — skip, finish, and this
          ghost — which user testing found and the board records as still open
          after two doors were added elsewhere. Reflect now has exactly one way
          out, and it is the filled button that saves; a quiet third door
          beside it is the ambiguity that was being complained about.

          IT STAYS ON THE OTHER THREE. On intro, scan and listen nothing else
          ends a run from inside it, and the drawer is a tap further away. The
          board's own reading: "session exit is done three ways over, one act…
          nothing on this board asks for more" — so this removes a door rather
          than adding one. */}
      {state.step !== 'reflect' && (
        <div className="musie-session__exit">
          <CtaButton variant="ghost" onClick={() => setClosing(true)}>
            {t('session.close')}
          </CtaButton>
        </div>
      )}

      {closing && (
        <Lightbox
          open
          title={t('session.close.title')}
          closeLabel={t('common.closeLabel')}
          onOpenChange={(next) => {
            if (!next) setClosing(false);
          }}
        >
          <ContentBox
            headingLevel={3}
            headlineHidden
            headline={t('session.close.title')}
            text={t('session.close.text')}
          >
            {/* L6's action row: the likely action outermost, and the other one
                first in the DOM so tab order matches the screen. Closing is
                destructive-ish and reversible only by starting again, so it is
                `secondary` rather than the filled primary — carrying on is
                what most people who opened this by accident want. */}
            <ButtonGroup align="end">
              <CtaButton variant="ghost" onClick={() => setClosing(false)}>
                {t('common.cancel')}
              </CtaButton>
              <CtaButton
                variant="secondary"
                loading={busy}
                loadingLabel={t('content.loading')}
                onClick={() => void close()}
              >
                {t('session.close.confirm')}
              </CtaButton>
            </ButtonGroup>
          </ContentBox>
        </Lightbox>
      )}

      {/* ── SOMETHING IS STILL OPEN, AND THE PRESS SAYS SO ──────────────────
          The save button is never disabled (see the action row), so this is
          where "not finished yet" is delivered — as a sentence, at the moment
          somebody asked to leave, rather than as a dead control they have to
          work out for themselves.

          THE PRIMARY GOES BACK TO THE WORK. It is the likely intent of anybody
          who reads the sentence and the only one of the two that is not a
          decision; saving incomplete stays available in the second rank and
          says `unvollständig` out loud, so the diary holds nothing the person
          was not told about.

          ONE SENTENCE, and it argues from what they get rather than from what
          the product wants — `reflect.incomplete.text`. */}
      {confirmingIncomplete && (
        <Lightbox
          open
          title={t('reflect.incomplete.title')}
          closeLabel={t('common.closeLabel')}
          onOpenChange={(next) => {
            if (!next) setConfirmingIncomplete(false);
          }}
        >
          <ContentBox
            headingLevel={3}
            headlineHidden
            headline={t('reflect.incomplete.title')}
            text={t('reflect.incomplete.text')}
          >
            <ButtonGroup align="end">
              <CtaButton
                variant="ghost"
                loading={busy}
                loadingLabel={t('content.loading')}
                onClick={() => {
                  setConfirmingIncomplete(false);
                  void finish(!hasAnswered(reflectMode, answer, spokenWords));
                }}
              >
                {t('reflect.incomplete.save')}
              </CtaButton>
              <CtaButton onClick={() => setConfirmingIncomplete(false)}>
                {t('reflect.incomplete.continue')}
              </CtaButton>
            </ButtonGroup>
          </ContentBox>
        </Lightbox>
      )}
    </div>
  );
}