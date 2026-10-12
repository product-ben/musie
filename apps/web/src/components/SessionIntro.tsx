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
import { Armchair, BedSingle, Moon, Sunrise } from 'lucide-react';
import { SegmentedControl } from '@musie/design-system';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import type { Exercise } from '../lib/content';
import { ENDINGS, POSTURES, isEnding, isPosture } from '../lib/exerciseKind';
import type { Ending, Posture } from '../lib/exerciseKind';

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
   */
  posture?: Posture;
  ending?: Ending;
  onPostureChange?: (posture: Posture) => void;
  onEndingChange?: (ending: Ending) => void;
}

/** The glyph per option. A `Record`, so a third posture fails the typecheck
 *  rather than rendering a segment with no icon. */
const POSTURE_GLYPH: Record<Posture, typeof Armchair> = {
  sitting: Armchair,
  lying: BedSingle,
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
}: SessionIntroProps) {
  const t = useT();
  const asks = posture !== undefined && ending !== undefined;

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

  return (
    <>
      <Markdown md={md} fallbackKey="session.intro.fallback" />

      {asks && (
        /* `--space-gap-group` between the two question groups and under the
            second — Ben, 2026-10-12. The class is `shell.css`'s and exists
            because `SegmentedControl` owns a control rather than the space
            between two of them; see its block there for the L14 argument. */
        <div className="musie-intro__questions">
          {/* Rule 7: the legend and every label are passed. The legend IS the
              question, so it stays visible — `legendHidden` would leave two
              unexplained pairs of segments on the screen. */}
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
        </div>
      )}
    </>
  );
}
