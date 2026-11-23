/**
 * Step 1 · Intro — what to have to hand before anything starts, and, for a
 * listening exercise, the two answers that decide what plays.
 *
 * The thinnest of the four, and deliberately: its whole job is to let the
 * exercise say "lay the cards out, take a breath" before the run begins. Every
 * word of that belongs to the exercise — headline and description both, as
 * `intro_md` — so when the exercise has none this is one borrowed sentence and
 * a way forward.
 *
 * BACK LEAVES THE SESSION rather than moving a step, because there is no step
 * behind this one. It goes to the library, and the session stays running — the
 * drawer will offer it back as *Continue session*, and closing it properly is
 * the control in the context box. Leaving is not abandoning. That button lives
 * in `Session.tsx` with the rest of the action row.
 *
 * ── THE TWO QUESTIONS, AND ONLY FOR ONE KIND — Ben, 2026-10-11 ────────────
 * A listening run plays music with guidance over it, and which guidance is a
 * question only the person can answer:
 *
 *   Wie möchtest du zuhören?   Sitzend · Liegend
 *   Wie soll es enden?         Zurück in den Tag · Ins Einschlafen
 *
 * BOTH PRESELECTED. A first screen that blocks on an unanswered question is a
 * first screen that stops people, and these two defaults are what most
 * sessions want. Changing either is one tap, and the row records the answer
 * whether it was chosen or inherited.
 *
 * ── THE SECOND QUESTION IS NAMED AFTER THE ENDING, NOT THE PURPOSE ────────
 * *Entspannen / Einschlafen* was the obvious phrasing and is the wrong one:
 * `goals` already has a row labelled **Entspannen**, which the library asked
 * about and `sessions.goal_id` already holds. The same word, two screens
 * apart, meaning two different things. Ben's own account of the difference is
 * audible rather than purposive — the fall-asleep cut *"has a very
 * soothing ending while the other one is bringing the person back into the
 * now"* — so the question asks about the ending, which no goal is phrased as.
 *
 * ── WHY A SEGMENTED CONTROL ───────────────────────────────────────────────
 * Two options, both visible, one tap, no scrolling — and the component
 * requires a glyph per option, which is what survives a clipped German label.
 * `RadioGroupText` would be right past four options; neither question will
 * have four.
 */
import { Armchair, BatteryCharging, BedSingle, Flower2, Layers, Moon, Sparkles, Sunrise, Waves } from 'lucide-react';
import { SegmentedControl, Switch, WizardContent, WizardIntro } from '@musie/design-system';
import { Markdown } from './Markdown';
import { InstrumentIntro } from './InstrumentIntro';
import type { InstrumentIntroProps } from './InstrumentIntro';
import { useT } from '../i18n/localeContext';
import type { Card, Exercise, Goal } from '../lib/content';
import { fromRoot } from '../lib/assets';
import { ENDINGS, POSTURES, isEnding, isPosture } from '../lib/exerciseKind';
import type { Ending, Posture } from '../lib/exerciseKind';
import { headingAndLead, withoutHeadingAndLead } from '../lib/markdown';
import { useIntroImageFit } from '../lib/useIntroImageFit';

export interface SessionIntroProps {
  exercise: Exercise;
  /**
   * How long the recording that is about to play runs, in seconds — or null
   * where there is none to quote.
   *
   * The intro copy names it (`{minutes}`), and it is a property of the CUT
   * rather than of the exercise: the same exercise can be re-recorded at a
   * different length, and `intro_md` is one string for every recording of it.
   * So the sentence lives in the content and the number arrives here.
   */
  durationSeconds?: number | null;
  /**
   * The two answers, and what to do when they move. Absent for a kind that
   * does not ask — the card exercises. Optional rather than nullable on
   * purpose: a screen that passes no handler is a screen with no QUESTION,
   * which is a different thing from one with no answer.
   *
   * THEY ARE ABSENT INDEPENDENTLY since 2026-10-13. The Klangreise asks about
   * the ending and not about the posture (`exerciseKind.ts`, `asksPosture`),
   * so `posture` is undefined while `ending` is a value — and the step draws
   * one question rather than none. Gating both on one flag is what this
   * stopped being able to do.
   */
  posture?: Posture;
  ending?: Ending;
  onPostureChange?: (posture: Posture) => void;
  onEndingChange?: (ending: Ending) => void;
  /**
   * ── THE CARDS SWITCH — `DIGITAL-CARDS.md` §3 ────────────────────────────
   *
   * Absent for an exercise that asks for no object, which is the same
   * distinction the two questions above draw: a step that passes no handler is
   * a step with no QUESTION, which is a different thing from one whose answer
   * happens to be false. Only `kind === 'card_based'` passes these.
   *
   * `cardsPresent`, not `digital`: the switch is named after the OBJECT the
   * exercise asks for, so the next exercise that needs one inherits the shape
   * and adds a string (§1.1, clause 1). The MODE is the negative of it and
   * lives in the URL, where `Session.tsx` puts it.
   */
  cardsPresent?: boolean;
  onCardsPresentChange?: (present: boolean) => void;
  /**
   * An instruments exercise's settings, made on this step (Ben, 2026-11-09):
   * how to play, the vibration, the motion sensor. Held in `Session.tsx`;
   * undefined for every other kind. `exercise.instrument` says whether there
   * is an instrument at all.
   */
  instrumentSettings?: Omit<InstrumentIntroProps, 'instrument'>;
  /**
   * ── „WAS BRAUCHST DU GERADE?" — 2026-11-23 ──────────────────────────────
   * PRD „Übungskarten mit QR-Code" (D5–D9). A card exercise started from a
   * printed card asks which goal this run is for; the answer decides which of
   * the card's two pieces plays. The goal sheet's question and its goals, in
   * its order. Absent where the question is not put — every run started
   * from the library — exactly like the two questions above.
   */
  goal?: string;
  goals?: readonly Goal[];
  onGoalChange?: (goal: string) => void;
  /**
   * ── A DECK CARD, SCANNED WITH THE PHONE'S CAMERA (D2) ────────────────────
   * Its picture stands where the exercise's would — the same image slot, the
   * same crop — with its own description for a screen reader.
   */
  scannedCard?: Card;
  /**
   * Only the headline and its first sentence, with nothing about the stack
   * under them (D23): after a deck card the card is already drawn. The shape
   * every exercise without cards has today.
   */
  leadOnly?: boolean;
}

/** The glyph per option. A `Record`, so a third posture fails the typecheck
 *  rather than rendering a segment with no icon. */
const POSTURE_GLYPH: Record<Posture, typeof Armchair> = {
  sitting: Armchair,
  lying: BedSingle,
};

/**
 * THE GOALS' GLYPHS — 2026-11-23. Chosen here because the goals had none, and
 * clear of the intro's other two questions (no armchair, bed, sunrise or
 * moon): `Waves` for settling down, `BatteryCharging` for gathering energy,
 * `Flower2` for attention. Keyed by goal id; a goal added later draws
 * `Sparkles` until it is given its own.
 */
const GOAL_GLYPH: Readonly<Record<string, typeof Armchair>> = {
  relax: Waves,
  'wake-up': BatteryCharging,
  mindfulness: Flower2,
};

/**
 * `Sunrise` and `Moon`, and they are the two ENDINGS rather than two times of
 * day. A sun for *back into the day* reads as noon; a sunrise reads as coming
 * back up, which is what the piece does to you. `Moon` needs no argument.
 */
const ENDING_GLYPH: Record<Ending, typeof Armchair> = {
  day: Sunrise,
  sleep: Moon,
};

/**
 * THE BODY ONLY. The action row belongs to `WizardPanel`, which owns it through
 * its `actions` slot — so `Session.tsx` renders the buttons and this renders
 * what the step has to say. A step that drew its own row would be emitting
 * `.musy-wizard__actions` from `apps/web`, which is the app reaching into a
 * component's geometry (CLAUDE.md rule 1, and 10-layout.md L7).
 */
export function SessionIntro({
  exercise, durationSeconds, posture, ending, onPostureChange, onEndingChange,
  cardsPresent, onCardsPresentChange, instrumentSettings,
  goal, goals, onGoalChange, scannedCard, leadOnly = false,
}: SessionIntroProps) {
  const t = useT();
  /* The picture's width on a tablet follows the copy's height (Ben,
     2026-11-17); `lib/introImage.ts` says why that is measured. */
  const headRef = useIntroImageFit<HTMLDivElement>();

  /* ONE FLAG PER QUESTION, read off the prop that carries its answer. The
     group itself survives as long as EITHER is asked: it is what spaces the
     questions from the copy above them, and a single question still needs
     that. */
  const asksPosture = posture !== undefined;
  const asksEnding = ending !== undefined;

  /* ── `{minutes}`, ROUNDED UP ───────────────────────────────────────────
     183 seconds reads as four minutes, not three: the sentence is a promise
     about how long nothing may interrupt you, and rounding down would
     under-promise by three seconds of somebody's attention.

     The placeholder is left ALONE when there is no recording to quote, which
     is better than writing a zero into a sentence — and it is visible rather
     than silent, so a missing duration shows up as `{minutes}` on screen the
     first time somebody looks, instead of as a confident wrong number. */
  const md = durationSeconds === null || durationSeconds === undefined
    ? exercise.introMd
    : exercise.introMd.replaceAll('{minutes}', String(Math.ceil(durationSeconds / 60)));

  /* ONE FLAG, read off the prop that carries the answer — the same shape the
     two questions above use, and for the same reason. */
  const asksForCards = cardsPresent !== undefined;
  const digital = asksForCards && cardsPresent === false;
  const asksGoal = goal !== undefined && goals !== undefined && goals.length >= 2;

  /* THE PICTURE: the exercise's, or the scanned deck card's in its place. */
  const picture = scannedCard !== undefined && scannedCard.imageUrl !== null
    ? { src: scannedCard.imageUrl, alt: scannedCard.imageAlt ?? '', exercise: undefined }
    : exercise.imageUrl === null
      ? null
      : { src: exercise.imageUrl, alt: exercise.imageAlt, exercise: exercise.id };

  return (
    <>
      {/* ── THE COPY, SPLIT AROUND THE SWITCH ───────────────────────────────
          Ben's placement: the switch goes BETWEEN the headline and the text,
          and it is the right one — the body copy is the instruction the switch
          makes true or false (*Leg die Karten vor dich*), so the answer is
          given above the sentence it governs rather than under it.

          `headingAndLead` / `withoutHeadingAndLead` are `lib/markdown.ts`'s
          (2026-11-16; `headingOnly` / `withoutHeading` before the intro
          sentence came along above the switch). One string, two places, no
          second content column.

          IN DIGITAL MODE THE BODY DOES NOT COME BACK. It is an instruction
          about paper that is not there, and §6 records the three ways that
          could have gone: hiding it is the simplest thing that is honest, and
          the sheet one tap away carries what it used to say. */}
      {/* ── THE EXERCISE'S PICTURE BESIDE ITS HEADLINE — Ben, 2026-11-16 ──
          Figma *Exercise pages*. On a phone it stands beside the HEADLINE
          only, a fixed width as tall as the headline, cropped to fill; on a
          tablet it stands 12 beside the whole text column, as tall as the
          copy and at most 30% of the row wide (2026-11-17, measured by
          `useIntroImageFit`); from 1024px a fifth, 16:9, top right.
          `shell.css` (`.musie-intro__head`) carries both layouts. The same
          picture and description the exercise card on /exercises shows. */}
      {/* ── INTRO, THEN CONTENT — Ben, 2026-11-16 ─────────────────────────
          `WizardPanel`'s two body sections, in that order, and the panel owns
          the space around and inside them. The INTRO is what this step is:
          the headline, the sentence about the next minutes, the picture. On a
          card exercise that sentence comes along ABOVE the switch
          (`headingAndLead`), so it is there in the digital mode as well; the
          instructions about paper stay below it. */}
      <WizardIntro>
        <div className="musie-intro__head" ref={headRef}>
          {asksForCards || leadOnly
            ? <Markdown md={md} fallbackKey="session.intro.fallback" arrange={headingAndLead} />
            : <Markdown md={md} fallbackKey="session.intro.fallback" />}
          {picture !== null && (
            <img
              className="musie-intro__image"
              src={fromRoot(picture.src)}
              alt={picture.alt}
              decoding="async"
              /* Which picture this is, for a crop that has to keep one part
                 of it in view (shell.css: the body scan's head). A deck card
                 has no such rule and crops from the centre. */
              data-exercise={picture.exercise}
            />
          )}
        </div>
      </WizardIntro>

      {/* The CONTENT: what the step asks of you. 24 between its blocks,
          from the panel. */}
      <WizardContent>
      {asksForCards && (
        <div className="musie-intro__cards">
          {/* Rule 7: the label is passed. `Layers` / `Layers` would be one
              glyph for two states, so the pair says what is switching — a pile
              of cards on the table, or none. */}
          {/* NO `reverse`. That prop pushes the label to the far edge of the
              row — the settings-sheet layout — and this is not a settings row:
              it is one control in a column of copy, and every other Switch in
              the app (the music one on the listen sheet, the dark-mode one in
              the menu) sits directly beside its own label. Ben, 2026-10-14. */}
          <Switch
            label={t('session.intro.cardsPresent')}
            checked={cardsPresent}
            onCheckedChange={(next) => onCardsPresentChange?.(next)}
            onGlyph={Layers}
            offGlyph={Layers}
          />

          {/* NO LINE WHERE THE PAPER INSTRUCTION WAS. A one-card exercise in
              digital mode said „Es gibt nichts vorzubereiten, legen wir los.“
              here until 2026-11-19, when Ben took it out: the forward action
              already says what happens next. */}

          {/* ── THE SCREEN IS SMALL, AND THAT IS ALL IT SAYS ─────────────
              Ben, 2026-10-14. Drawn whenever the cards are not on the table,
              and HIDDEN ABOVE 850px BY CSS rather than by a measurement here:
              what fits on a screen is a question the stylesheet can answer
              without a resize listener, a hydration branch or a first paint
              that guesses. `shell.css` carries the width and the reason.

              It gates nothing. The exercise works at 393px — the hand is two
              columns, the sheet asks you to turn the phone — so this is an
              aside about where it is BEST, and it is written so that somebody
              on a phone is told their screen is fine. */}
          {digital && (
            <p className="musie-intro__small">{t('session.intro.smallScreen')}</p>
          )}
        </div>
      )}

      {/* `withoutHeading`, NOT `bodyOnly` — Ben, 2026-10-14, from Freie Bahn.
          `bodyOnly` PROMOTES the first paragraph to a heading, because the
          listen sheet it was written for has no other heading to show. Here
          the heading is already above the switch, so promoting gave this step
          two of them: *Lege den Stapel Karten verdeckt vor dich.* arrived in
          display type, which is the same defect `withoutHeading` was added for
          on the reflect step. Achtsame Pause hid it by having a LIST as its
          body, and a list is never promoted. */}
      {asksForCards && !digital && <Markdown md={md} arrange={withoutHeadingAndLead} />}

      {/* The two questions sit directly in the Content: the panel's 24
          between them is what `.musie-intro__questions` used to declare
          (Ben, 2026-10-12, then 2026-11-16). Rule 7: the legend and every
          label are passed. The legend IS the question, so it stays visible —
          `legendHidden` would leave an unexplained pair of segments. */}
          {asksPosture && (
            <SegmentedControl
              name="session-posture"
              legend={t('session.intro.posture.legend')}
              value={posture}
              onValueChange={(next) => { if (isPosture(next)) onPostureChange?.(next); }}
              options={POSTURES.map((option) => ({
                value: option,
                label: t(`session.intro.posture.${option}`),
                glyph: POSTURE_GLYPH[option],
              }))}
            />
          )}

          {asksEnding && (
            <SegmentedControl
              name="session-ending"
              legend={t('session.intro.ending.legend')}
              value={ending}
              onValueChange={(next) => { if (isEnding(next)) onEndingChange?.(next); }}
              options={ENDINGS.map((option) => ({
                value: option,
                label: t(`session.intro.ending.${option}`),
                glyph: ENDING_GLYPH[option],
              }))}
            />
          )}

          {/* The goal question, in the same slot and the same component as the
              two above (D5) — „Kein neues Layout" (Ben, 2026-11-23). The
              legend is the library's own question, `exercises.goal.question`,
              and the labels are the goals' (D8). */}
          {asksGoal && (
            <SegmentedControl
              name="session-goal"
              legend={t('exercises.goal.question')}
              value={goal}
              onValueChange={(next) => { if (goals.some((g) => g.id === next)) onGoalChange?.(next); }}
              options={goals.map((option) => ({
                value: option.id,
                label: option.label,
                glyph: GOAL_GLYPH[option.id] ?? Sparkles,
              }))}
            />
          )}

      {/* ── AN INSTRUMENT: HOW TO PLAY, VIBRATION, MOTION — 2026-11-09 ─────
          Below the exercise's own copy, which says how to be ready; these are
          the settings, made here and nowhere else. `InstrumentIntro` has the
          reasons. */}
      {exercise.instrument !== null && instrumentSettings !== undefined && (
        <InstrumentIntro instrument={exercise.instrument} {...instrumentSettings} />
      )}
      </WizardContent>
    </>
  );
}
