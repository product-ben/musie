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
import { getCard, getExercise, getTrackFor } from '../lib/content';
import type { Card, Exercise, Track } from '../lib/content';
import { hasAnswered } from '../lib/reflect';
import type { ReflectMode } from '../lib/reflect';
import { scanCardInto } from '../lib/scan';
import {
  completedBefore, endSession, readSession, saveCard, saveReflection, saveStep,
} from '../lib/session';
import type { SessionRow } from '../lib/session';
import {
  activeSteps, resumeSession, sessionReducer, stepTransition,
} from '../lib/sessionMachine';
import { useAsync } from '../lib/useAsync';
import { STEP_IDS } from '../routeHandle';
import type { StepId } from '../routeHandle';

/** Every step's display name, as a catalogue key. A `Record`, so a fifth step
 *  fails the typecheck rather than rendering a raw slug. */
const STEP_LABEL: Record<StepId, MessageKey> = {
  intro: 'session.step.intro',
  scan: 'session.step.scan',
  listen: 'session.step.listen',
  reflect: 'session.step.reflect',
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

  const skipped: StepId[] = React.useMemo(
    () => (data !== null && !data.exercise.needsCards ? ['scan'] : []),
    [data],
  );


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

  const [reflectMode, setReflectMode] = React.useState<ReflectMode>('text');
  /* Whether the transcript editor holds any words — F.6. It owns the
     statements, so the step has to be told. */
  const [spokenWords, setSpokenWords] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  const [listened, setListened] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const { row, exercise, card, track } = data;

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

  const run_ = activeSteps(skipped);
  const stepAfter = (step: StepId) => run_[run_.indexOf(step) + 1] ?? null;
  const stepBefore = (step: StepId) => run_[run_.indexOf(step) - 1] ?? null;

  function advance() {
    const next = stepAfter(state.step);
    if (next !== null) go(next);
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
   */
  async function submitCode(scanned: string) {
    if (busy) return;
    setBusy(true);
    setScanError(null);
    try {
      const outcome = await scanCardInto(id, exercise.id, scanned, locale);
      if (outcome.kind === 'applied') {
        onRescan();
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
      const at = new Date().toISOString();
      await endSession(id, 'finished', at);
      dispatch({ type: 'FINISH', at });
      /* THE LIST, not the entry. Ben, 2026-09-20: finishing hands you your
         diary rather than one page of it — and the list now leads with the
         session you just finished, so nothing is lost by landing a level up. */
      navigate('/diary', { replace: true });
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
         the same place, and the diary leads with the one you just left. */
      navigate('/diary', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not close the session:', thrown);
      setBusy(false);
    }
  }

  /* ONE QUESTION, SHOWN TWICE — on listen and again on reflect. Resolved once,
     here, so the two steps cannot disagree about what it is. */
  const question = exercise.question ?? t('reflect.questionFallback');

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
    /* SKIP sits beside FINISH, as the alternative to it — L6's "two buttons
       that are alternatives to each other" pair. It is `secondary` rather than
       ghost so it reads as a real way out rather than as a link, and it comes
       FIRST in the DOM so the likely action stays outermost and tab order
       matches the screen.

       It does not toggle a mode and wait for a second press: skipping IS a
       way to end the run, so it finishes the session and writes no
       `reflections` row. Both buttons take the same path — `finish(skip)` —
       so the session cannot end two different ways. */
    actions = (
      <>
        {back}
        <CtaButton
          variant="secondary"
          disabled={busy}
          onClick={() => void finish(true)}
        >
          {t('reflect.skip')}
        </CtaButton>
        <CtaButton
          disabled={!hasAnswered(reflectMode, answer, spokenWords)}
          loading={busy}
          loadingLabel={t('content.loading')}
          onClick={() => void finish()}
        >
          {t('reflect.finish')}
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
              accent="accent"
              steps={STEP_IDS.map((step) => ({ id: step, label: t(STEP_LABEL[step]) }))}
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
          {state.step === 'intro' && <SessionIntro exercise={exercise} />}

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
              track={track}
              sessionId={id}
              card={card}
              question={question}
              listened={listened}
              onListened={() => setListened(true)}
              onAdvance={advance}
              back={back}
            />
          )}

          {state.step === 'reflect' && (
            <SessionReflect
              exercise={exercise}
              sessionId={id}
              onSpokenWords={setSpokenWords}
              question={question}
              mode={reflectMode}
              onModeChange={setReflectMode}
              text={answer}
              onTextChange={setAnswer}
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
      <div className="musie-session__exit">
        <CtaButton variant="ghost" onClick={() => setClosing(true)}>
          {t('session.close')}
        </CtaButton>
      </div>

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
    </div>
  );
}