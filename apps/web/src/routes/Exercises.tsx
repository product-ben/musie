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
import {
  ArrowRight, ChevronLeft, ChevronRight, EllipsisVertical, HelpCircle, LayoutList, Layers,
  Shuffle, Timer,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  ButtonGroup, CardDeck, ContentBox, CtaButton, Icon, IconButton, InlineLink, RadioCards,
  SegmentedControl,
} from '@musie/design-system';
import type {
  CardDeckCard, CardDeckItem, LightboxOrigin, RadioCardFact,
} from '@musie/design-system';
import { GoalSheet } from '../components/GoalSheet';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { SessionRunningLightbox } from '../components/SessionRunningLightbox';
import { useLocale, useT } from '../i18n/localeContext';
import { numberWord } from '../i18n/numbers';
import { splitSlot } from '../i18n/slot';
import { timeOfDay } from '../lib/greeting';
import { stepMessageKey } from '../routeHandle';
import { useAuth } from '../lib/authContext';
import { createSession, endSession, useActiveSession } from '../lib/session';
import type { ActiveSession } from '../lib/session';
import { useExercises, useGoals } from '../lib/useContent';
import { fromRoot } from '../lib/assets';
import type { Exercise } from '../lib/content';
import {
  cacheGoal, defaultGoal, filterByGoal, goalPurpose, readCachedGoal, startable,
} from '../lib/goals';
import { useEdgeFade } from '../lib/useEdgeFade';
import { guideStore, noteDeckGuideSeen, shouldShowDeckGuide } from '../lib/deckGuide';
import { DeckGuide } from '../components/DeckGuide';
import type { GoalChoice } from '../lib/goals';
import '../exercises.css';

type View = 'deck' | 'list';

/**
 * How far one press of a toolbar chevron scrolls, as a fraction of what you
 * can see.
 *
 * FOUR FIFTHS RATHER THAN A WHOLE ONE, so the control you were looking at is
 * still on screen afterwards — a full page swaps the row's contents for
 * strangers and gives the eye nothing to carry across. Not a token: it is a
 * fraction of an element's own measured width, which is geometry rather than
 * spacing, and there is no rung on the ladder for "most of a row".
 */
const NUDGE = 0.8;

export function Exercises() {
  const t = useT();
  /* The headline writes its count as a WORD, and the word is per locale —
     so the screen needs the locale itself, not only the lookup bound to it. */
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data, loading, error } = useExercises();
  const { data: goalData, loading: goalsLoading } = useGoals();
  const goals = React.useMemo(() => goalData ?? [], [goalData]);

  /* ── THE GOAL, AND WHY THE QUESTION IS NO LONGER THE DOOR ────────────────
     THE SCREEN OPENS WITH A PILE, NOT A QUESTION — Ben, 2026-10-07, and still
     true. It used to ask before it dealt: no stored goal meant `null`, and
     `null` drew the question over an empty stage, so everybody paid a
     decision to see the thing they came for.

     WHAT THE DEFAULT IS CHANGED ON 2026-10-15. It was `NO_GOAL` — *show me
     everything*, which was the absence of a goal rather than one of them. It
     is now the FIRST GOAL OFFERED, which is a real row with three exercises
     behind it, because Ben's mapping gave *Musie kennenlernen* a list of its
     own and left nothing for absence to mean. `defaultGoal()` carries the
     "first by sort" rule and the reason it is not a hardcoded id.

     IT IS STILL NOT A CHOICE SOMEBODY MADE, which is why nothing is written:
     `cacheGoal` runs in `choose` and only there. A browser with no stored
     goal keeps having none, so the day this default moves it moves for
     everyone rather than for whoever has not been here yet.

     `null` SURVIVES, AND NOW MEANS ONLY "NOT YET KNOWN" — the window before
     the goals have landed, which the screen draws neither a question nor a
     pile in. It is the same answer `DiaryGraph` gives for the same question.
     lib/goals.ts used to keep three states here and keeps two.

     READ ONCE THE GOALS HAVE LANDED, never before: `readCachedGoal` validates
     the stored id against the goals that actually exist, and run against an
     empty list every stored goal looks retired. An EMPTY list leaves `choice`
     null — `defaultGoal([])` is null — and the screen waits rather than
     drawing a headline it cannot finish. `restored` is what stops the effect
     running a second time and overwriting a choice made in the meantime. */
  const [choice, setChoice] = React.useState<GoalChoice | null>(null);
  const restored = React.useRef(false);

  React.useEffect(() => {
    if (restored.current || goalsLoading) return;
    restored.current = true;
    setChoice(readCachedGoal(goals) ?? defaultGoal(goals));
  }, [goals, goalsLoading]);

  /* ── THE SHEET, AND THE RECT IT GROWS OUT OF ─────────────────────────────
     `picking` until 2026-10-15, when the question stopped being a box on the
     page and became a sheet. The name changed with the thing: a box was a
     state this screen was IN, and a sheet is a surface that is open over it.

     `sheetOrigin` is the headline link's rect, captured on the press and
     handed to Lightbox so the sheet grows out of the control rather than out
     of the middle of the screen. A ref, not state: it is read during the
     open and never rendered, so storing it in state would be a re-render for
     a number nothing draws. The same arrangement Session.tsx uses for the
     card sheet. */
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const sheetOrigin = React.useRef<LightboxOrigin | null>(null);

  const openSheet = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    sheetOrigin.current = event.currentTarget.getBoundingClientRect();
    setSheetOpen(true);
  }, []);

  const choose = React.useCallback((next: GoalChoice) => {
    setChoice(next);
    cacheGoal(next);
    /* CHOOSING CLOSES IT. One tap, like every other choice on this screen —
       and closing is also what ANNOUNCES the change: Lightbox restores focus
       to the link that opened the sheet, and that link's label is now the new
       goal, so a screen reader hears the new state as the focus lands. A live
       region on the headline would say it a second time. */
    setSheetOpen(false);
  }, []);

  /* The toolbar scrolls sideways when its controls outgrow the row, and fades
     at whichever end still has something past it. `edges` is that same
     measurement, read back: it says whether the row scrolls at all — which is
     whether the two chevrons are drawn — and which of them has anywhere to
     go. */
  const toolbar = useEdgeFade<HTMLDivElement>();
  const scrollable = toolbar.edges !== 'none';
  /* THE BACK CHEVRON IS DRAWN ONLY WHEN THERE IS SOMETHING BEHIND US — Ben,
     2026-10-15. `'end'` means the only travel left is forwards, so the back
     one is spent and comes OUT of the row rather than going grey in it; see
     the block over the chevron itself for why the two ends differ. */
  const backShown = toolbar.edges === 'start' || toolbar.edges === 'both';

  /* `behavior` IS NOT PASSED. `scroll-behavior` on the row is what decides
     whether this glides or jumps, so the motion lives in the stylesheet with
     the rest of it and reduced motion is a media query rather than a branch
     in here. */
  const nudge = React.useCallback((direction: -1 | 1) => {
    const row = toolbar.ref.current;
    if (row === null) return;
    row.scrollBy({ left: direction * row.clientWidth * NUDGE });
  }, [toolbar.ref]);

  /**
   * ── THE LEGEND, ONCE PER BROWSER — Ben, 2026-10-07 ──────────────────────
   *
   * READ IN AN EFFECT AND NOT IN THE INITIALISER, which is not fussiness: the
   * initialiser runs during the first render, and `guideStore()` touches
   * `window`. Every other cached answer on this screen is read the same way
   * for the same reason (`readCachedGoal` above).
   *
   * `seen` IS WRITTEN WHEN IT IS DISMISSED, not when it is shown. Somebody who
   * arrives and leaves before pressing anything has not read it, and the next
   * visit should still offer it.
   *
   * THE `?` BUTTON DOES NOT CLEAR THE FLAG. Asking to see it again is not the
   * same as never having seen it — the flag answers "has this browser been
   * offered the legend", and it has.
   */
  const [guide, setGuide] = React.useState(false);
  const guideAsked = React.useRef(false);

  React.useEffect(() => {
    if (guideAsked.current) return;
    guideAsked.current = true;
    if (shouldShowDeckGuide(guideStore())) setGuide(true);
  }, []);

  const closeGuide = React.useCallback(() => {
    setGuide(false);
    noteDeckGuideSeen(guideStore());
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

  /* WHAT A PRESS WOULD ACTUALLY START. The headline counts these and *Such mir
     eine Übung aus* draws from them — one memo, so the number on screen and
     the set the shuffle can reach are the same thing rather than two filters
     that agree today. `startable` carries the reasoning. */
  const ready = React.useMemo(() => startable(visible), [visible]);

  /* THE CHOICE IS KNOWN — which is not the same as "somebody chose".
     It is false only in the window before the goals have landed, and what it
     gates is the same as it always did: nothing is dealt until the screen
     knows what it is dealing. */
  const settled = choice !== null;
  const showDeck = settled && !loading && error === null;

  /* ── THE HEADLINE IS THE FILTER NOW (Ben, 2026-10-15) ────────────────────
     It was a question — *Welche Übung starten wir?* — and before that it was
     three states managing a count. It is a sentence again, and the count is
     back, because the thing the question could not do is the reason this
     change exists: user testing found people stalling at the door, and a
     line that asks cannot also say what is on offer and what it is for.

     THREE PLURAL FORMS, not one interpolated string. The count moves with the
     filter and this catalogue has no plural machinery, which is exactly why
     the number was deleted on 2026-10-08 — answered properly this time rather
     than by removal. `none` is what the headline says the day an exercise is
     retired; *0 Übungen* would be a worse sentence.

     ── IT COUNTS `visible`, AND IT COUNTED `ready` FOR HALF A DAY ──────────
     The first build counted what could be STARTED, which is the answer Ben
     picked when the question was asked in the abstract. On screen it was
     wrong, and he reported it as a bug: the headline read *2 Übungen zum
     Aktivieren* over a pile of THREE cards, because Achtsam Atmen is mapped
     to three of the four goals and is not built.

     Both numbers are defensible in a document and only one of them is
     defensible on a page: the count sits directly above the thing it counts,
     so it has to be the number of cards there. A promise that undercounts
     what is visible reads as a bug whatever the reasoning behind it, which is
     exactly how it was found.

     WHAT DID NOT MOVE is `pickForMe`, which still draws from `ready` — the
     shuffle must never start something that refuses. So the two numbers still
     exist; the headline simply stopped being the place that reports the
     smaller one.

     THE NUMBER IS A WORD (Ben, 2026-10-15). `numberWord` spells out through
     twelve and falls back to digits above, which is the ordinary rule for
     prose — and a headline is prose. `none` and `one` carry their own
     numerals, because both inflect the noun as well: *Keine Übung*, *Eine
     Übung*.

     THE SPLIT, AND WHY IT IS NOT THREE KEYS. `{goal}` is left unfilled on
     purpose and `splitSlot` cuts the rendered sentence at it, so the link can
     sit anywhere a language puts it and the catalogue still holds one
     readable sentence per locale. `i18n/slot.ts` is the argument.

     NULL WHILE THE GOALS ARE IN FLIGHT. `purpose` comes from the catalogue, so
     there is no sentence to write until it lands — and the screen already
     draws nothing else in that window. */
  /* ── THE GREETING, READ ONCE WHEN THE SCREEN ARRIVES ────────────────────
     Morning, day or evening, on GERMAN time rather than the reader's —
     `lib/greeting.ts` owns the bands and the argument for the clock.

     `useMemo` WITH NO DEPENDENCIES, so it is the time this screen was opened
     at and not the time of the last render. Both are defensible and this one
     is stable: a heading that re-greets you mid-session because a goal
     changed at 11:31 is stranger than one that is a few minutes behind.

     THE COST IS A TAB LEFT OPEN ACROSS A BOUNDARY, which keeps the greeting
     it arrived with until the next navigation. The alternative is a timer
     re-rendering a heading nobody is looking at, for a word that is wrong
     for at most one visit. */
  const greeting = React.useMemo(() => timeOfDay(), []);

  const purpose = choice === null ? null : goalPurpose(goals, choice);
  const headline = React.useMemo(() => {
    if (purpose === null) return null;
    const count = visible.length;
    const key = count === 0
      ? 'exercises.headline.none'
      : count === 1 ? 'exercises.headline.one' : 'exercises.headline.other';
    /* `goal` is deliberately not passed — `translate` leaves an unmatched slot
       verbatim, which is what there is to split on. */
    return splitSlot(t(key, { count: numberWord(count, locale) }), 'goal');
  }, [purpose, visible.length, locale, t]);

  /* ── WHAT IS IN THE TOOLBAR, AND WHEN ────────────────────────────────────
     The pill and the view switch shared this row from 2026-10-07, and the
     row's visibility was the OR of its two children so that neither could
     leave an empty 44px band behind. THE PILL IS GONE — the goal lives in the
     headline now — so the OR has one operand and is written as one.

     What stays is the rule the switch always had: it goes when there is
     nothing to switch between, and a goal that offers no exercise has no deck
     and no list. `visible`, not `ready` — there are two views of the pile the
     moment there is a pile, built or not. */
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
      /* THE GOAL AS IT WAS WHEN THE CARD WAS PRESSED, and it is now always a
         real one. `goalIdFor(choice)` stood here to turn the `NO_GOAL`
         sentinel back into null; there is no sentinel, so the id goes
         straight through and `sessions.goal_id` is never null again (which is
         strictly better diary data — the commonest answer used to record
         nothing).

         `choice` IS STILL NULLABLE and still passed as such: the column
         accepts null and the one state that produces it — the goals not yet
         landed — cannot reach here anyway, because the pile is not dealt
         until `settled`. A `?? ''` would invent a goal; null says honestly
         that none was known. */
      const result = await createSession(userId, exercise.id, choice);
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

  /**
   * Pick one for me — out of `ready`, which is the same set the headline
   * counts.
   *
   * TWO RULES, AND THEY ARE NOW ONE EXPRESSION. Among the BUILT ones, because
   * the prototype picked among all three and opened the not-implemented
   * lightbox two times in three; and among the VISIBLE ones, because a goal
   * offering two exercises must not have "pick one for me" reach past it into
   * a third. `ready` is `startable(filterByGoal(…))` and is the memo the
   * headline reads, so the button cannot start something the count did not
   * promise.
   */
  const pickForMe = React.useCallback(() => {
    const exercise = ready[Math.floor(Math.random() * ready.length)];
    if (exercise !== undefined) void start(exercise, null);
  }, [ready, start]);

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
         on those terms on 2026-10-08, over a solid accent fill that would
         have needed B25's edge back to be identifiable at all (1.41:1 against
         the track in light). The prop itself went on 2026-10-10 — the control
         takes the green default now, like everything else — but the reasoning
         is kept because it is the argument for why a view switch is ink and
         not a fill, which is still true.

         THE CARD'S *STARTEN* IS STILL TERRACOTTA, and that is the point of
         the pairing: the way ON stays primary, and the two controls that only
         narrow what you are looking at share the other colour. */
      /* While the sheet is open, everything the answer governs is inert — and
         the view switch governs which of the two filtered views you are
         looking at, so it is one of them. The sheet is modal and makes the
         page inert anyway; this keeps the control's own state honest rather
         than leaning on a surface above it. */
      disabled={sheetOpen}
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
    accent: ((index % 2) + 1) as 1 | 2,
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
       only if somebody remembered to give it one. A `gap` skips an absent
       child for free, so no block carries a margin and none needs a class to
       borrow one — `.musie-running` was that borrowed class and had no rule
       left to give by 2026-10-13. See `.musie-exercises`. */
    <div className="musie-exercises">
      {/* ── THE HEADING IS THE CONTROL (Ben, 2026-10-15) ───────────────────
          One heading and nothing around it, which is unchanged from
          2026-10-08 — the avatar, the hairline box and the subline all went
          that day and none of them is back. What changed is what the line
          SAYS: it asked a question, and it now states the offer and carries
          the filter inside itself.

          THE GOAL IS A LINK IN THE MIDDLE OF THE SENTENCE, which is the whole
          arrangement: the thing you would change is the thing the sentence is
          about, so there is no chip beside it and nothing to find. The
          shuffle and the view switch sit directly below as before.

          `headline` IS A PAIR OF STRINGS, before and after the slot. Rendering
          it as three children of the h1 keeps the heading one text node deep
          on either side of the control, so `text-wrap: balance` and the
          German hyphenation both still work across the whole line.

          IT DRAWS NOTHING UNTIL THE GOALS LAND. `purpose` is content, so
          there is no sentence to write before the query returns — and the
          screen already draws neither pile nor toolbar in that window. A
          skeleton here would be the one thing moving on an otherwise still
          page. */}
      {headline !== null && purpose !== null && (
        <h1 className="musie-placeholder">
          {/* ── THE GREETING, AND IT IS IN THE SAME HEADING ────────────────
              Two sentences, one `h1`. Ben asked to EXTEND the headline, not
              to put something above it — and the two belong together: the
              first greets you, the second says what is here. Splitting them
              into a heading and a subline would make the greeting the page's
              title and demote the offer, which is the wrong way round.

              `{' '}` between them because JSX drops whitespace at a line
              break, and two sentences run together is the kind of thing that
              is invisible in review and obvious on screen. */}
          {t(`exercises.headline.${greeting}`)}{' '}
          {headline[0]}
          <InlineLink
            trailingIcon={EllipsisVertical}
            /* The sheet is a dialog and this is what opens it. base-ui's
               Dialog.Trigger would set both for us, but Sheet owns its
               Lightbox and does not expose the trigger slot — so they are
               said here rather than left unsaid. */
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={openSheet}
          >
            {purpose}
            {/* HEARD, NEVER SEEN. "Entspannen" alone is a thin name for a
                control; this makes it announce as "Entspannen, Ziel ändern"
                while the h1 still reads as one sentence. An `aria-label`
                would have REPLACED the visible text in the heading's
                accessible name — see the key's own note in en.ts. */}
            <span className="musy-sr-only">{`, ${t('exercises.goal.change')}`}</span>
          </InlineLink>
          {headline[1]}
        </h1>
      )}

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
          headingLevel={2}
          headline={t('exercises.running.headline', {
            name: runningName ?? t('exercises.running.fallback'),
          })}
          text={t('exercises.running.stoppedAt', { step: t(stepMessageKey(running.step)) })}
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

      {/* ── THE QUESTION IS A SHEET NOW ────────────────────────────────────
          It was a `ContentBox` in the page flow, between the running notice
          and the toolbar, holding four `RadioGroupText` rows — and a radio
          row is a one-line label with nowhere to say why the goal is worth
          choosing, which is exactly what the user testing asked for. The box
          and the pill that opened it are both deleted; `GoalSheet` carries
          the argument.

          IT IS RENDERED UNCONDITIONALLY AND DRIVEN BY `open`, unlike the box
          it replaces. Lightbox animates its own exit, so unmounting the sheet
          the moment it closes would cut that short — and `origin` makes the
          close a journey back to the control rather than a disappearance.

          It still waits for the goals: four cards drawn from an empty list
          would be the component's empty state flashing under a question. */}
      {!goalsLoading && goals.length > 0 && (
        <GoalSheet
          goals={goals}
          choice={choice}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          origin={sheetOrigin.current}
          onChoose={choose}
        />
      )}

      {/* ── ONE ROW, AND IT HAS LOST A CONTROL (Ben, 2026-10-15) ───────────
          The goal pill and the view switch shared this row from 2026-10-07.
          The goal moved into the headline, so what is left is the shuffle and
          the switch — the two controls that act on the pile rather than
          deciding what is in it.

          THE SIDEWAYS SCROLL STAYS, and not out of caution: it is driven by
          `useEdgeFade`'s own measurement, so a row that now fits simply stops
          drawing the two chevrons. The width it was bought for was *Ziel:
          Achtsamkeit stärken* at 393px, which is gone — and *Such mir eine
          Übung aus* beside *Stapel / Liste* is still close enough that the
          measurement is worth keeping rather than a wrap worth risking. */}
      {switchShown && (
        <div className="musie-deck-toolbar-row">
          {/* ── THE WAY TO SCROLL IT WITHOUT A FINGER (Ben, 2026-10-07) ────
              DRAWN ONLY WHEN THERE IS SOMEWHERE TO GO. `scrollable` is the
              row's own measurement, so the pair appears at the widths that
              scroll and nowhere else — two permanently dead controls on a
              desktop would be the accessibility answer written as clutter.

              `edges` names the end that has something PAST it, so `end` means
              nothing is behind us and the back chevron is spent.

              ── AND THE TWO CHEVRONS NOW ANSWER "SPENT" DIFFERENTLY ────────
              THE BACK ONE IS HIDDEN (Ben, 2026-10-15); the forward one is
              still disabled. That asymmetry is the point rather than an
              oversight, and the rule it bends is worth stating because it
              was written here deliberately: *a control that vanished as you
              reached the end would move the row under the pointer that was
              pressing it.*

              It still would. What outweighs it is WHERE the back chevron
              sits: first in the row, so while it is drawn it indents
              everything after it, and the shuffle button starts ~40px to the
              right of the headline directly above it. Two left edges that
              nearly line up read as a mistake in a way one honest edge does
              not, and this column has exactly two things in it.

              THE FORWARD ONE HAS NO SUCH COST — it is last, so hiding it
              would move nothing into alignment with anything, and the
              pointer argument is unopposed. It keeps `disabled`.

              THE SHIFT IS REAL AND IS THE PRICE. Scrolling right brings the
              back chevron in and pushes the row ~40px. The pointer is on the
              FORWARD chevron when that happens, which is the one that moves
              least — it is pinned to the row's trailing edge — so the thing
              being pressed stays under the finger even though the row does
              not. That is why this is affordable here and would not be if
              the pair were both at one end.

              `size="min"` is the smallest rung this system has — 24px, with
              `--sp-2` of clear space baked into the class because 2.5.8 only
              allows a target that small when it is spaced. That margin is
              why the row around them carries no gap, and it is also most of
              the 40px above. */}
          {backShown && (
            <IconButton
              glyph={ChevronLeft}
              size="min"
              label={t('exercises.toolbar.left')}
              onClick={() => nudge(-1)}
            />
          )}
          {/* `useEdgeFade` keeps `data-fade` in step with where the row has
             been scrolled to, and the stylesheet turns that into a mask — so
             the ends soften only where there is more of the row past them.
             See lib/edgeFade.ts for why this is not an always-on gradient. */}
          <div className="musie-deck-toolbar" ref={toolbar.ref}>
            {/* ── PICK ONE FOR ME, MOVED OUT OF THE DECK (Ben, 2026-10-08) ──
                It stood in `CardDeck`'s `actions` slot, which at --bp-md and up
                is a column BESIDE the card and below it on a phone — so the one
                control that acts on the pile as a whole moved house at the
                breakpoint while the two that filter it stayed put.

                FIRST IN THE ROW SINCE 2026-10-15, because the goal it used to
                sit beside has moved into the headline. It was second of three
                — pick a goal, or hand the pick over entirely, and then the
                view switch, which only changes how the same set is drawn. The
                order it belonged to is still the order: deciding what you get
                comes before deciding how you look at it, and the first half
                of that decision is now the line above.

                `outline`, not `ghost`: it is a real action on the pile rather
                than a quiet aside, and at the `min` rung a ghost reads as a
                label with a hover state. The way on is still the card, so it is
                not `primary`.

                AND NOT `secondary`, WHICH IS WHAT IT WAS (Ben, 2026-10-07).
                The same border either way; the difference is the fill, and
                secondary's is `--surface-raised` — the card's own surface, on
                a screen whose subject is a pile of raised cards.

                IT IS DISABLED WHEN THERE IS NOTHING BUILT TO PICK. `ready` is
                what it draws from, and a goal offering three unbuilt
                exercises would otherwise give a control that does nothing at
                all when pressed. Cannot happen under today's mapping; cheaper
                to state than to rediscover. */}
            <CtaButton
              variant="outline"
              size="min"
              leadingIcon={Shuffle}
              /* The row owns the spacing — `.musy-btn--min` brings `--sp-2`
                 of its own, which was putting 8px into two of this row's
                 gaps until 2026-10-07. */
              className="musie-toolbar-control"
              disabled={busy || sheetOpen || ready.length === 0}
              onClick={pickForMe}
            >
              {t('exercises.surpriseMeShort')}
            </CtaButton>
            {viewSwitch}
          </div>
          {scrollable && (
            <IconButton
              glyph={ChevronRight}
              size="min"
              label={t('exercises.toolbar.right')}
              disabled={toolbar.edges === 'start'}
              onClick={() => nudge(1)}
            />
          )}
        </div>
      )}

      {/* ── A GOAL NOTHING SERVES ───────────────────────────────────────────
          BELOW THE TOOLBAR, which is the same place the deck sits — the
          headline names the goal, and this says what that goal leaves. Drawn
          above the toolbar, the screen told you there was nothing before it
          told you what for. Found on screen.

          IT IS UNREACHABLE TODAY AND IS KEPT. Every goal offers three
          exercises after the mapping of 2026-10-15, where before it two of
          the three goals offered none at all — so this was the common case
          and is now the retirement case. The headline's `none` form is the
          other half of it: that one says how many, this one says what to do.

          NOT `content.empty`: the catalogue loaded, and it has nothing for
          this goal. `exercises.length > 0` keeps the two empties apart — an
          empty catalogue is already reported above, and saying both would
          blame the goal for a failed load. */}
      {settled && !loading && error === null
        && exercises.length > 0 && visible.length === 0 && (
        <ContentBox
          headingLevel={2}
          headline={t('exercises.goal.empty')}
          headlineHidden
          text={t('exercises.goal.empty')}
        >
          <ButtonGroup align="end">
            {/* NO ORIGIN. The sheet grows out of the headline's link, which is
                where it will send the focus back to — and that is the better
                destination from here anyway: the control that was pressed is
                about to be replaced by a pile. */}
            <CtaButton variant="secondary" onClick={() => setSheetOpen(true)}>
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
              busy={busy || sheetOpen}
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
              /* ── THE LEGEND, AS AN EXTRA CARD ON THE PILE ──────────────
                 The deck's `cover` slot puts it in the card's own cell, so it
                 is exactly as wide as a card and as tall as the tallest face —
                 two numbers this screen would otherwise be measuring in a
                 layout that reflows with the copy, in two languages.

                 ONLY WHILE THE DECK IS LIVE. Drawn over the goal question, or
                 over a start already in flight, it would explain controls that
                 are inert at that moment. */
              cover={guide && !busy && !sheetOpen
                ? <DeckGuide onDismiss={closeGuide} />
                : undefined}
              /* ── AND THE WAY BACK TO IT ────────────────────────────────
                 Third in the row the chevrons are in, because it is the same
                 KIND of thing they are: something you do to the pile rather
                 than to the exercise. `ghost`, where they are `secondary` —
                 it is the quietest control on the screen and the only one
                 nobody needs twice.

                 It does not toggle. Pressing it while the legend is up would
                 be a second way to dismiss something that already dismisses on
                 any press, so it only ever shows. */
              navActions={(
                <IconButton
                  glyph={HelpCircle}
                  label={t('exercises.guide.show')}
                  variant="ghost"
                  onClick={() => setGuide(true)}
                />
              )}
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
              disabled={busy || sheetOpen}
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
 * `needsSound` is still on the row; `needs_cards` was superseded by
 * `exercises.kind` on 2026-10-11 and is now a mirror of it. Either way this
 * screen stops drawing both.
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

