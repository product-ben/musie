/**
 * `/exercises` — choosing an exercise from a pile you deal with.
 *
 * ── IT REPLACED A LIST, AND THE LIST IS STILL HERE ────────────────────────
 * This screen was five cards in a column, all visible, each a radio. It is a
 * deck now: one card at a time under a thumb, swipe either way to see another
 * and PRESS the one you want. The column did not go — the switch at the top of
 * the actions turns it back on, and it is `RadioCards`, the same component the
 * screen used to be built from. So the two ways of choosing differ in layout
 * and in nothing else, which is what made the comparison worth keeping.
 *
 * It began as /dev/deck, a proof of concept beside the list rather than
 * instead of it. Ben took the swap on 2026-10-02.
 *
 * ── AND THE TWO VIEWS NOW AGREE ABOUT WHAT A PRESS DOES (2026-10-05) ──────
 * The list has started a run on a tap since 2026-09-24 — the note against
 * `exercises.start` in en.ts is where that is written down. The deck did not:
 * a press went nowhere and a right swipe started the exercise, which is what
 * Ben reported as unintuitive. Pressing a card starts it in both views now,
 * and the deck's swipe browses the pile instead; `CardDeck`'s own header
 * carries the reasoning for the component half of the change.
 *
 * ── THE DECK IS THE DESIGN SYSTEM'S; THE CARD IS THIS SCREEN'S ────────────
 * `CardDeck` owns the pile, the gesture, the thresholds, the overlay that
 * names where a swipe is going, and every button. This file owns what is ON a
 * card — picture, name, description, time — and what the three actions MEAN.
 * That split is why the deck has a Storybook story at all: nothing in it knows
 * what an exercise is.
 *
 * ── THE PRESS IS THE ONE-WAY DOOR, AND IT CAN BE REFUSED ──────────────────
 * Starting is `createSession()`: it writes a row, navigates into the session,
 * and the database refuses a second running one through a partial unique
 * index. So the press has three outcomes and all three are drawn:
 *
 *   started  → /session/:id/intro.
 *   refused  → the card COMES BACK and SessionRunningLightbox asks the
 *              question. A dialog, not a Message: the card has already lifted
 *              off the pile, so there is nothing left for an inline notice to
 *              sit beside.
 *   failed   → the card comes back and the failure is named.
 *
 * `busy` is what holds the card out there. CardDeck's contract is that the
 * card returns when `busy` falls with the item still in `items`, so every path
 * that does not navigate simply stops being busy and the deck puts itself
 * back.
 *
 * ── ALL FIVE EXERCISES, INCLUDING THE THREE THAT ARE NOT BUILT ────────────
 * A press on an unbuilt one opens `NotImplementedLightbox`, which is the same
 * refusal the list gives. Filtering them out would quietly show two exercises
 * where the product has five.
 *
 * ── NOTHING ON A CARD GOES THROUGH THE CATALOGUE ──────────────────────────
 * The name, the description, the picture and the timeframe are the exercise's,
 * read through `useExercises()`. The two time strings are the exception that
 * proves it: they are CHROME wrapped around a content number, and they are the
 * catalogue's own `exercises.fact.time*`.
 */
import * as React from 'react';
import { ArrowRight, LayoutList, Layers, Shuffle, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  ButtonGroup, CardDeck, ContentBox, CtaButton, Icon, RadioCards, SegmentedControl,
} from '@musie/design-system';
import type { CardDeckCard, CardDeckItem, RadioCardFact } from '@musie/design-system';
import { GoalBox, GoalPill } from '../components/GoalPicker';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { SessionRunningLightbox } from '../components/SessionRunningLightbox';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import type { StepId } from '../routeHandle';
import { useAuth } from '../lib/authContext';
import { createSession, endSession, useActiveSession } from '../lib/session';
import type { ActiveSession } from '../lib/session';
import { useExercises, useGoals } from '../lib/useContent';
import type { Exercise } from '../lib/content';
import { cacheGoal, filterByGoal, goalIdFor, readCachedGoal } from '../lib/goals';
import type { GoalChoice } from '../lib/goals';
import '../exercises.css';

type View = 'deck' | 'list';

/**
 * A step id, as the catalogue says it.
 *
 * The four ids are the URL's and the row's; these are their display names, and
 * the split is the schema's own (`session.step.*` in en.ts). A map rather than
 * four branches, and typed by `StepId` so a fifth step fails the typecheck here
 * rather than rendering a key.
 */
const STEP_LABEL: Record<StepId, MessageKey> = {
  intro: 'session.step.intro',
  scan: 'session.step.scan',
  listen: 'session.step.listen',
  reflect: 'session.step.reflect',
};

export function Exercises() {
  const t = useT();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data, loading, error } = useExercises();
  const { data: goalData, loading: goalsLoading } = useGoals();
  const goals = React.useMemo(() => goalData ?? [], [goalData]);

  /* ── THE GOAL, AND WHY NULL IS NOT "NO GOAL" ─────────────────────────────
     `choice` has three states and the screen draws three screens from them:
     null is nobody-has-chosen (the question IS the screen, and no card is
     dealt), NO_GOAL is "Musie entdecken" (every exercise), and an id filters.
     lib/goals.ts carries the reasoning.

     READ ONCE THE GOALS HAVE LANDED, never before: `readCachedGoal` validates
     the stored id against the goals that actually exist, and run against an
     empty list every stored goal looks retired — so the question would be
     asked again on every cold load. `restored` is what stops the effect
     running a second time and overwriting a choice made in the meantime. */
  const [choice, setChoice] = React.useState<GoalChoice | null>(null);
  const [picking, setPicking] = React.useState(false);
  const restored = React.useRef(false);

  React.useEffect(() => {
    if (restored.current || goalsLoading || goals.length === 0) return;
    restored.current = true;
    setChoice(readCachedGoal(goals));
  }, [goals, goalsLoading]);

  const choose = React.useCallback((next: GoalChoice) => {
    setChoice(next);
    cacheGoal(next);
    setPicking(false);
  }, []);

  const [view, setView] = React.useState<View>('deck');
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] =
    React.useState<{ exercise: Exercise; session: ActiveSession | null } | null>(null);
  const [failed, setFailed] = React.useState(false);
  /** Pressed an exercise that is not built yet. Names it, nothing more. */
  const [unbuilt, setUnbuilt] = React.useState<string | null>(null);

  /* ── THE RUNNING SESSION, READ ON ARRIVAL (2026-10-05) ───────────────────
     This screen used to learn about a running session the hard way: you
     pressed a card, the database refused the insert, and a dialog explained.
     That is a dead end dressed as an answer — the first anybody heard of it
     was the moment it stopped them.

     So the screen asks. `useActiveSession()` is the same read the drawer and
     the diary already make, and it costs one query on mount.

     NOTHING IS DRAWN WHILE THE ANSWER IS UNKNOWN. `loading` and a failed read
     both render no notice, which is the answer `DiaryGraph` gives for the same
     question: not knowing is answered by not offering, never by a control that
     appears under a thumb already travelling.

     AND IT CANNOT REFETCH. `AsyncState` has no reload, so ending the run from
     here is remembered locally — the screen holds what it did rather than
     asking the server to agree with it. */
  const { data: activeSession, loading: sessionLoading } = useActiveSession();
  const [endedHere, setEndedHere] = React.useState(false);
  const [endingRunning, setEndingRunning] = React.useState(false);
  /* IT WAITS FOR THE CATALOGUE TOO, not just for the session. The notice names
     the running exercise, and the name comes from `useExercises()` — so a
     notice drawn before that lands says "A session is still running" and then
     changes its own headline a moment later. Measured, in English, on a cold
     load. Both reads are in flight at once, so the wait costs nothing. */
  const running = endedHere || sessionLoading || loading || goalsLoading ? null : activeSession;

  /* ALL FIVE, not just the built ones.
     An earlier pass filtered to `implemented` on the theory that a deck whose
     cards cannot be started lies about its one gesture. It did something
     worse: it silently showed two exercises where the product has five, so the
     POC stopped being a prototype of the real choice. /exercises shows all
     five and refuses the three that are not built yet, and the deck does the
     same — a press on one opens the same lightbox, which is the honest
     "not yet" rather than a card that was never dealt. */
  const exercises = React.useMemo(() => data ?? [], [data]);

  /* WHAT THE GOAL LEAVES. `exercises` stays whole — the running-session
     notice names an exercise by id and must still find one the filter hides —
     and every count, every card and every list row below reads `visible`. */
  const visible = React.useMemo(() => filterByGoal(exercises, choice), [exercises, choice]);

  /* Chosen, and not being changed. The three states of the screen, named
     once: nothing is dealt until a goal exists, and the pile goes inert while
     the question is back on screen. */
  const chosen = choice !== null;
  const showDeck = chosen && !loading && error === null;
  /* THE HEADLINE ONLY COUNTS WHEN THERE IS SOMETHING TO COUNT. A goal nothing
     serves would otherwise read "0 exercises for you" over the sentence
     explaining why — the same discouraging line the unchosen state exists to
     avoid, arriving by a different door. Found on screen, not in review.

     It stays counted while the question is REOPENED over a working deck:
     `picking` is not in here, because the pile behind the box has not
     changed and a headline that flickered as you opened the question would
     be reporting the question rather than the pile. */
  const counted = chosen && visible.length > 0;

  /* ── WHAT IS IN THE TOOLBAR, AND WHEN ────────────────────────────────────
     The pill and the view switch share one row (Ben, 2026-10-07), and they
     come and go for different reasons — so the row's own visibility is the
     OR of its two children rather than a third rule that could disagree with
     both and leave an empty 44px band on the page.

     The pill goes while the question is open, because the question IS the
     expanded pill. The switch goes when there is nothing to switch between —
     a goal that offers no exercise has no deck and no list. */
  const pillShown = chosen && !picking;
  const switchShown = showDeck && visible.length > 0;

  /**
   * Start it, with the running session's fate already decided by the caller.
   *
   * THE ORDER IS END THEN CREATE and it is not reversible: creating first is
   * what the database refuses. Lifted from /exercises, which is the only other
   * caller of this sequence — see the note at the top of that file.
   */
  const start = React.useCallback(async (exercise: Exercise, replacing: ActiveSession | null) => {
    /* NO USER, NO SESSION — and it says so. `sessions.user_id` is not null, so
       there is nothing to insert, and a press that evaporated would be
       indistinguishable from a broken deck. */
    if (userId === null) { setBusy(false); setFailed(true); return; }
    setFailed(false);
    setBusy(true);
    try {
      if (replacing !== null) {
        /* `abandoned`, not `finished`: the diary already calls a run that
           stopped before its reflection abandoned. */
        await endSession(replacing.id, 'abandoned', new Date().toISOString());
      }
      /* THE GOAL AS IT WAS WHEN THE CARD WAS PRESSED. `goalIdFor` is the one
         place NO_GOAL turns back into null, so the sentinel cannot reach the
         column through this path or any other. */
      const result = await createSession(userId, exercise.id, goalIdFor(choice));
      if (result.kind === 'started') {
        /* The one path that does NOT clear `busy`: the deck is about to
           unmount, and dropping busy first would bring the card back for a
           frame on the way out. */
        navigate(`/session/${encodeURIComponent(result.session.id)}/intro`);
        return;
      }
      /* ── PRESSING THE ONE THAT IS ALREADY RUNNING IS NOT A CHOICE ────────
         It is the same exercise, so there is nothing to decide between: the
         dialog would have offered to "end Mindful Break and start Mindful
         Break instead", which is a sentence, not a question. Found by pressing
         the front card twice in a row, which is the most ordinary thing
         anybody does here.

         It CONTINUES instead — the run you already have of the exercise you
         just asked for. Starting it fresh is still one press away and is said
         out loud: end it in the notice above the deck, then press the card. */
      if (result.session !== null && result.session.exerciseId === exercise.id) {
        navigate(`/session/${encodeURIComponent(result.session.id)}/${result.session.step}`);
        return;
      }
      /* Refused, and by a different exercise. `busy` falls, so CardDeck brings
         the card back, and the dialog asks the question over the returned
         deck. */
      setRefused({ exercise, session: result.session });
      setBusy(false);
    } catch (thrown: unknown) {
      console.error('[musie] could not start a session:', thrown);
      setRefused(null);
      setFailed(true);
      setBusy(false);
    }
  }, [choice, navigate, userId]);

  const byId = React.useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  /* THE RUNNING EXERCISE'S NAME, out of the catalogue this screen already
     holds. `ActiveSession` carries the id and never the name — the name is
     content, per locale, and `useExercises()` is where it lives. Null until
     the catalogue arrives, or for a row this locale has no name for; both
     callers below have an answer for null. */
  const runningName = running === null ? null : byId.get(running.exerciseId)?.name ?? null;

  /** End the running session from the notice, and stay here to choose. */
  const endRunning = React.useCallback(async () => {
    if (running === null) return;
    setEndingRunning(true);
    try {
      /* `abandoned` with a timestamp — the same write the menu's row makes and
         the same one the dialog's second button makes. Three doors, one act, so
         the diary cannot tell them apart and does not have to. */
      await endSession(running.id, 'abandoned', new Date().toISOString());
      setEndedHere(true);
    } catch (thrown: unknown) {
      console.error('[musie] could not end the running session:', thrown);
      setFailed(true);
    } finally {
      setEndingRunning(false);
    }
  }, [running]);

  const onAccept = React.useCallback((id: string) => {
    const exercise = byId.get(id);
    if (exercise === undefined) return;
    /* THE ONE THAT IS ALREADY RUNNING GOES STRAIGHT BACK IN, without asking
       the database a question whose answer is on screen. The same rule the
       refusal branch of `start` applies — this is the half that does not need
       a round trip to know. */
    if (running !== null && running.exerciseId === exercise.id) {
      navigate(`/session/${encodeURIComponent(running.id)}/${running.step}`);
      return;
    }
    /* NOT BUILT YET — the same refusal /exercises gives, from the same
       component, so the two screens say it in one voice. `busy` is never set,
       so CardDeck returns the card immediately and the lightbox opens over a
       deck that is back where it was. */
    if (!exercise.implemented) { setUnbuilt(exercise.name); return; }
    void start(exercise, null);
  }, [byId, navigate, running, start]);

  /* BOTH DIRECTIONS ARE FREE AND REPORT NOTHING. CardDeck has already turned
     its own pile, and this screen keeps no order of its own to update. The
     handlers exist because the component requires them — a deck that could not
     tell its consumer the top card had changed is a deck nothing could be
     counted on — and here there is nothing to count. */
  const onNext = React.useCallback(() => {}, []);
  const onPrevious = React.useCallback(() => {}, []);

  /** Pick one for me. The same escape hatch /exercises offers, and the same
   *  rule: among the IMPLEMENTED ones only. */
  const pickForMe = React.useCallback(() => {
    /* Among the BUILT ones only — the prototype picked among all three and
       then opened the not-implemented lightbox two times in three, which is
       the note /exercises records against this same escape hatch. */
    /* AMONG THE VISIBLE ONES, not the whole catalogue: a goal that offers two
       exercises must not have "pick one for me" reach past it into a third.
       The `implemented` filter is the older half of the same rule. */
    const available = visible.filter((exercise) => exercise.implemented);
    const exercise = available[Math.floor(Math.random() * available.length)];
    if (exercise !== undefined) void start(exercise, null);
  }, [visible, start]);

  /* ONE SWITCH, ONE HOME (Ben, 2026-10-05). It used to ride in CardDeck's
     action column in the deck view and in a row of its own in the list — so
     the one control the two views SHARE was the one thing that moved when you
     pressed it, and on a phone it moved from under the card to above the list.
     It stands above both now, in the same place whichever view is on.

     THE VIEW YOU ARE NOT IN CARRIES THE WORD — `labels="unchecked"`, the
     component's own mode since 2026-10-05. Two glyphs alone asked the screen to
     teach that a pile means a pile; this way the half you might press says
     "Stapel" or "Liste" and the half you are on is the glyph that is already
     lit. The control is still as narrow as its own content, which is what the
     `min` rung and both of these homes need. */
  const viewSwitch = (
    <SegmentedControl
      name="exercises-view"
      legend={t('exercises.view.legend')}
      legendHidden
      size="min"
      labels="unchecked"
      /* OCHER, so the row is one family (Ben, 2026-10-08). The goal question
         beside it is `accent` and this was the last control on the screen
         still answering in terracotta, which left the toolbar reading as two
         unrelated widgets that happened to share a line.

         IT IS A QUIET CHANGE, AND THAT IS THE WHOLE OF IT (measured, not
         assumed). `.musy-seg--accent`'s rule sets a border as well, and that
         border is not drawn — conflict B25 neutralises selected-state edges
         across this component and the radio groups, accent modifiers
         included. So the only rendered difference is the checked segment's
         INK, one dark brown for another: 6.37 light / 5.17 dark against a 4.5
         bar, which is what `primary` scores in the same slots to within a
         rounding error. Contrast-neutral, and subtle to look at. Ben took it
         on those terms on 2026-10-08, over a solid ocher fill that would have
         needed B25's edge back to be identifiable at all (1.41:1 against the
         track in light).

         THE CARD'S *STARTEN* IS STILL TERRACOTTA, and that is the point of
         the pairing: the way ON stays primary, and the two controls that only
         narrow what you are looking at share the other colour. */
      accent="accent"
      /* While the question is open, everything the answer governs is inert —
         and the view switch governs which of the two filtered views you are
         looking at, so it is one of them. */
      disabled={picking}
      value={view}
      onValueChange={(next) => setView(next === 'list' ? 'list' : 'deck')}
      options={[
        { value: 'deck', label: t('exercises.view.deck'), glyph: Layers },
        { value: 'list', label: t('exercises.view.list'), glyph: LayoutList },
      ]}
    />
  );

  const items: CardDeckItem[] = visible.map((exercise, index) => ({
    id: exercise.id,
    /* Fixed by the exercise's place in the printed order, NOT by its place in
       the pile, so a card keeps its colour as the deck is dealt. */
    accent: ((index % 3) + 1) as 1 | 2 | 3,
    /* A FUNCTION, SO THE FACE CAN PLACE THE DECK'S ACCEPT ITSELF. The deck
       drew that button into the card's corner until 2026-10-05 and could not
       know how wide this card's own bottom row was — see the note over
       `.musie-exercise-card__foot`. */
    content: (card: CardDeckCard) => <ExerciseFace exercise={exercise} card={card} />,
  }));

  return (
    /* ONE STACK, SO THE GAPS ARE THE SCREEN'S RATHER THAN EACH BLOCK'S.
       Four of the children below are conditional and each used to carry its
       own `margin-block-end`, which meant a new block was spaced correctly
       only if somebody remembered to give it one — and the empty-goal notice
       below is spaced today only because it borrows `.musie-running`'s class.
       A `gap` skips an absent child for free. See `.musie-exercises`. */
    <div className="musie-exercises">
      {/* HEADLINE AND SUBLINE ARE ONE MOLECULE, so they are wrapped as one:
          `--space-gap-related` between them, which Layer 1 documents as
          "title+subtitle". The distance to whatever follows is the stack's. */}
      {/* TWO HEADLINES, BECAUSE THERE ARE TWO SCREENS HERE. Before a goal is
          chosen there is no pile, so `{count} exercises for you` would read
          "0 exercises for you" over a question — a true count of a list
          nobody has asked for yet, and the most discouraging possible first
          sentence. It is a noun phrase either way (GERMAN-UI-WRITING §3).

          The subline explains the swipe, so it waits for something to swipe. */}
      <div className="musie-deck-intro">
        <h1 className="musie-placeholder">
          {counted
            ? t('exercises.headline', { count: String(visible.length) })
            : t('exercises.goal.headline')}
        </h1>
        {/* The subline explains the swipe, so it waits for something to
            swipe. Drawn over an empty stage it taught a gesture that had
            nothing to act on. */}
        {counted && <p className="musie-note">{t('exercises.intro')}</p>}
      </div>

      {loading && <p className="musie-note">{t('content.loading')}</p>}
      {error !== null && <p className="musie-note">{t('content.errorDetail')}</p>}
      {data !== null && exercises.length === 0 && <p className="musie-note">{t('content.empty')}</p>}
      {/* NOT `content.error`, which says a list did not load — this says a
          press did not start anything, which is a different sentence. */}
      {failed && <p className="musie-note" role="alert">{t('exercises.startFailed')}</p>}

      {/* ── A RUN THAT IS STILL OPEN, SAID BEFORE ANYTHING IS PRESSED ───────
          UNDER THE INTRO AND ABOVE THE SWITCH, which is the one position that
          is the same in both views and keeps the heading order honest: the
          page's h1 is above it and this is an h2.

          A CONTENT BOX, NOT A `Message variant="info"`. L11's table sends
          "context present on load" to an info Message, and that is what this
          was first — measured, screenshotted, and wrong on this screen: the
          info variant is a blue panel, and a blue panel over a sand page full
          of terracotta cards reads as a system notification about something
          going wrong. Nothing is wrong. This is the person's own open session,
          so it is drawn in the product's own frame, like the content it is
          about. Flagged against L11 in OPEN-QUESTIONS.md.

          NOTHING IS ANNOUNCED, which is the half of L11 that does apply: this
          is present on load, so there is no live region. A `Message` would have
          carried `live="off"` for the same reason.

          NEITHER ACTION IS `primary`, and that is Ben's own rule rather than
          modesty: one primary per unit, and it is the way ON. On this screen
          the way on is the deck, and the filled button belongs to the card.
          Inside the dialog there is no deck, which is why *Continue session* is
          primary there and secondary here — the same rule, read twice. */}
      {running !== null && (
        <ContentBox
          className="musie-running"
          headingLevel={2}
          headline={t('exercises.running.headline', {
            name: runningName ?? t('exercises.running.fallback'),
          })}
          text={t('exercises.running.stoppedAt', { step: t(STEP_LABEL[running.step]) })}
        >
          <ButtonGroup align="end">
            <CtaButton
              variant="ghost"
              loading={endingRunning}
              loadingLabel={t('content.loading')}
              onClick={() => void endRunning()}
            >
              {t('exercises.running.end')}
            </CtaButton>
            <CtaButton
              variant="secondary"
              /* It renders an `<a>`; base-ui asks to be told so, and warns in
                 the console when it is not. */
              nativeButton={false}
              render={
                <Link to={`/session/${encodeURIComponent(running.id)}/${running.step}`} />
              }
            >
              {t('exercises.goToSession')}
            </CtaButton>
          </ButtonGroup>
        </ContentBox>
      )}

      {/* ── THE QUESTION, AND THE PILL IT BECOMES ──────────────────────────
          One home for both states — see the note at the top of GoalPicker.
          Above the toolbar and below the running notice, so the order down
          the page is: what is already open, what you are here for, how you
          want to look at it, and then the pile.

          It waits for the goals, like everything else that would otherwise
          re-label itself a moment after it was drawn. */}
      {!goalsLoading && goals.length > 0 && (!chosen || picking) && (
        <GoalBox
          goals={goals}
          choice={choice}
          /* NOTHING TO CANCEL BACK TO on the first ask: dismissing it would
             leave a screen with a headline and no content. */
          onCancel={chosen ? () => setPicking(false) : null}
          onChoose={choose}
        />
      )}

      {/* ── ONE ROW, TWO CONTROLS (Ben, 2026-10-07) ────────────────────────
          The goal and the way you look at what it offers, side by side, above
          whichever view is on. It scrolls sideways rather than wrapping when
          the two will not fit — which at 393px in German they do not, because
          *Ziel: Achtsamkeit stärken* is most of a phone wide on its own. */}
      {(pillShown || switchShown) && (
        <div className="musie-deck-toolbar">
          {pillShown && (
            <GoalPill goals={goals} choice={choice} onOpen={() => setPicking(true)} />
          )}
          {/* ── PICK ONE FOR ME, MOVED OUT OF THE DECK (Ben, 2026-10-08) ──
              It stood in `CardDeck`'s `actions` slot, which at --bp-md and up
              is a column BESIDE the card and below it on a phone — so the one
              control that acts on the pile as a whole moved house at the
              breakpoint while the two that filter it stayed put.

              SECOND IN THE ROW, beside the goal (Ben, 2026-10-08). The two
              controls that decide WHICH exercises are in front of you sit
              together — pick a goal, or hand the pick over entirely — and the
              view switch, which only changes how the same set is drawn, comes
              after them.

              `secondary`, not `ghost`: it is a real action on the pile rather
              than a quiet aside, and at the `min` rung a ghost reads as a
              label with a hover state. The way on is still the card, so it is
              not `primary`. */}
          {switchShown && (
            <CtaButton
              variant="secondary"
              size="min"
              leadingIcon={Shuffle}
              disabled={busy || picking}
              onClick={pickForMe}
            >
              {t('exercises.surpriseMeShort')}
            </CtaButton>
          )}
          {switchShown && viewSwitch}
        </div>
      )}

      {/* ── A GOAL NOTHING SERVES ───────────────────────────────────────────
          BELOW THE TOOLBAR, which is the same place the deck sits — the row
          names the goal, and this says what that goal leaves. Drawn above it
          the screen told you there was nothing before it told you what for,
          and the pill then sat under the box explaining it. Found on screen.
          Today every exercise is mapped to `mindfulness` alone, so Entspannen
          and Aufwachen land here — which is why this is a written sentence
          and a way out rather than a blank stage. NOT `content.empty`: the
          catalogue loaded, and it has nothing for this goal.

          `exercises.length > 0` is what keeps the two empties apart — an
          empty catalogue is already reported above, and saying both would
          blame the goal for a failed load. */}
      {chosen && !picking && !loading && error === null
        && exercises.length > 0 && visible.length === 0 && (
        <ContentBox
          className="musie-running"
          headingLevel={2}
          headline={t('exercises.goal.empty')}
          headlineHidden
          text={t('exercises.goal.empty')}
        >
          <ButtonGroup align="end">
            <CtaButton variant="secondary" onClick={() => setPicking(true)}>
              {t('exercises.goal.emptyAction')}
            </CtaButton>
          </ButtonGroup>
        </ContentBox>
      )}


      {showDeck && visible.length > 0 && (
        <>
          {view === 'deck' ? (
            <CardDeck
              className="musie-deck-stage"
              items={items}
              /* ONE EXPRESSION FOR TWO REASONS THE PILE GOES INERT: a start
                 in flight, and the goal question back on screen. CardDeck's
                 `busy` already means "do not take a card from me", and both
                 are that. Written as one so they cannot drift — the deck's
                 contract is that a card held out comes back when `busy`
                 falls, and two independent flags could strand it. */
              busy={busy || picking}
              /* THE GOAL IS THE KEY. Choosing deals the pile; changing the
                 goal deals it again; nothing else does, which is why this is
                 the choice rather than `visible.length` or the item ids. */
              dealKey={choice ?? undefined}
              onAccept={onAccept}
              onNext={onNext}
              onPrevious={onPrevious}
              /* ONE WORD FOR BOTH DIRECTIONS, which is the component's own
                 arrangement since 2026-10-05: the overlay says `nextLabel`
                 whichever way the card is going, and `previousLabel` is read
                 by a screen reader off the back button rather than seen. */
              nextLabel={t('exercises.next')}
              previousLabel={t('exercises.previous')}
              label={t('exercises.deckLabel')}
              /* Under the deck's two directions, in the same column. It acts
                 on the deck as a whole rather than on the card in front, which
                 is why it is last and why it is the quiet one. The big *Übung
                 starten* that used to head this column is gone (Ben,
                 2026-10-05): the card carries that action now, and the same
                 thing twice in two sizes is redundancy rather than
                 reassurance. */
              positionLabel={(position, total, id) =>
                t('exercises.deckPosition', {
                  name: byId.get(id)?.name,
                  index: String(position),
                  total: String(total),
                })}
            />
          ) : (
            /* THE LIST IS /exercises' OWN COMPONENT. RadioCards is what that
               screen chooses an exercise with, down to the facts row, so the
               two halves of this comparison differ in the one thing being
               compared — a pile you deal with against a column you read — and
               in nothing else. A bespoke list here would have compared the
               deck against something nobody is proposing to ship. */
            <RadioCards
              name="exercises-list"
              /* THE SCREEN'S OWN QUESTION, not the view switch's name. The
                 switch borrowed this slot while the deck was a POC beside the
                 list; now that the list IS this screen's other half it gets
                 the legend the screen always had. */
              legend={t('exercises.legend')}
              legendHidden
              accent="accent"
              headingLevel={2}
              options={visible.map((exercise) => ({
                value: exercise.id,
                headline: exercise.name,
                description: exercise.description,
                facts: factsFor(exercise, t),
                image: exercise.imageUrl === null ? '' : fromRoot(exercise.imageUrl),
                imageAlt: exercise.imageAlt,
              }))}
              /* Choosing IS starting, exactly as on /exercises: there is no
                 second confirming tap there and there is none here. */
              onValueChange={(id) => {
                const exercise = byId.get(id);
                if (exercise === undefined) return;
                if (!exercise.implemented) { setUnbuilt(exercise.name); return; }
                void start(exercise, null);
              }}
              disabled={busy || picking}
              emptyLabel={t('content.empty')}
            />
          )}
        </>
      )}

      {unbuilt !== null && (
        <NotImplementedLightbox what={unbuilt} onClose={() => setUnbuilt(null)} />
      )}

      {refused !== null && (
        <SessionRunningLightbox
          name={refused.exercise.name}
          runningName={
            refused.session === null
              ? null
              : byId.get(refused.session.exerciseId)?.name ?? null
          }
          session={refused.session}
          starting={busy}
          onEndAndStart={() => void start(refused.exercise, refused.session)}
          onClose={() => setRefused(null)}
        />
      )}
    </div>
  );
}

/**
 * THE TIME, AND NOTHING ELSE.
 *
 * There were three facts here — the duration, "needs your deck" and "sound on"
 * — each with its own glyph, and a legend above the list saying what the three
 * glyphs meant. Ben cut the deck and headphone glyphs and the legend with them
 * (2026-10-02). The duration is the one that varies in a way worth comparing
 * two exercises on; the other two were true of almost all of them, so they
 * spent a row of every card and a block of chrome to say very little.
 *
 * `needsCards` and `needsSound` are still on the row and still read by the
 * session — this screen just stops drawing them.
 */
function factsFor(exercise: Exercise, t: ReturnType<typeof useT>): RadioCardFact[] {
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);

  return [{
    id: 'time',
    glyph: Timer,
    text: t('exercises.fact.time', { min, max }),
    shortText: t('exercises.fact.timeShort', { min, max }),
  }];
}

/**
 * The face: picture, name, description, and a bottom row carrying the time and
 * the way in. The first four are the exercise's own, straight off the row.
 *
 * ── THE START BUTTON IS IN THIS ROW, AND THAT IS THE POINT ────────────────
 * `CardDeck` drew it itself for half a day, absolutely positioned in the
 * card's bottom-trailing corner, and it could not be made safe from there: at
 * 320px the German *5–8 Min.* ran 18px under it and the English *5–8 min*
 * cleared it by four. A button's width is its label's width, and no token
 * knows that — so the component now hands the action over (`CardDeckItem`'s
 * function form) and this row lays the two out together. They cannot overlap,
 * the time wraps inside its own share if it ever has to, and one `align-items`
 * puts the two on the same baseline because both sit at the same type step.
 *
 * THE PICTURE IS FULL-BLEED TO THREE EDGES and cropped to 16:9 by the
 * stylesheet. `alt` is the row's `image_alt`, which is real alt text written
 * per exercise ("Two hands resting on a belly, just below the ribs"), so it is
 * passed through rather than replaced with the name.
 *
 * THE TIME IS SAID TWICE, which is the system's own pattern for a fact with a
 * long form and a short one (the facts row in §7.14): the short form beside
 * the glyph for the eye, the whole sentence as visually-hidden text for a
 * screen reader, which would otherwise meet a bare "2–12 min" and a decorative
 * icon with no word saying what was measured.
 */
function ExerciseFace({ exercise, card }: { exercise: Exercise; card: CardDeckCard }) {
  const t = useT();
  const min = String(exercise.timeframeMin);
  const max = String(exercise.timeframeMax);

  return (
    <div className="musie-exercise-card">
      {exercise.imageUrl !== null && (
        <img
          className="musie-exercise-card__image"
          src={fromRoot(exercise.imageUrl)}
          alt={exercise.imageAlt}
          decoding="async"
        />
      )}
      <div className="musie-exercise-card__body">
        <h2 className="musie-exercise-card__headline">{exercise.name}</h2>
        <p className="musie-exercise-card__text">{exercise.description}</p>
      </div>
      <div className="musie-exercise-card__foot">
        <p className="musie-exercise-card__time">
          <Icon glyph={Timer} size="sm" inline />
          <span aria-hidden="true">{t('exercises.fact.timeShort', { min, max })}</span>
          <span className="musy-sr-only">{t('exercises.fact.time', { min, max })}</span>
        </p>
        {/* THE CONDENSED RUNG (Ben, 2026-10-05). §5.4 permits --target-min for
            a card control and never for a primary action, and this is both at
            once; it renders at 36px, over 2.5.8's 24 and under §5.4's 44. The
            full-size button beside the deck is the same action, so nothing is
            out of reach — logged in OPEN-QUESTIONS.md.

            `card.accept` rather than `start()` directly: the deck owns what an
            accept DOES to the pile — the card lifts, the deck goes inert, a
            refusal brings it back — and a screen that reached past that would
            be the one place the card did not move when it was taken. */}
        <CtaButton
          variant="primary"
          size="min"
          leadingIcon={ArrowRight}
          className="musie-exercise-card__start"
          disabled={card.disabled}
          onClick={card.accept}
        >
          {t('exercises.startShort')}
        </CtaButton>
      </div>
    </div>
  );
}

/**
 * A content image path, made root-relative.
 *
 * THE ROW STORES IT RELATIVE — `assets/web/exercises/body-scan.webp`, with no
 * leading slash — so the browser resolves it against the CURRENT PATH. On
 * `/exercises` that happens to be right: one segment, so it lands on
 * `/assets/web/…`. On `/dev/deck` it is two segments and the same string
 * resolves to `/dev/assets/web/…`, which is a 404 and an empty band where the
 * picture should be. Nothing in the product renders one below the first path
 * segment today, so nothing is broken — but it is luck rather than design, and
 * this POC is what found it. Logged in OPEN-QUESTIONS.md.
 */
function fromRoot(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) return url;
  return `/${url}`;
}
