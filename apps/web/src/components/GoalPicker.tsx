/**
 * The goal, asked once and then worn as a pill.
 *
 * ── TWO EXPORTS, BECAUSE THEY SIT IN TWO PLACES (Ben, 2026-10-07) ─────────
 * `GoalPill` rides in `.musie-deck-toolbar` beside the view switch;
 * `GoalBox` stands above that row, where the question needs the width.
 *
 * They were one component in one slot until Ben asked for the pill and the
 * switch to share a row — so this file stopped being a component that picks
 * between two states and became two components that the screen places. The
 * state is still one thing and still lives in `Exercises.tsx`; only the
 * drawing is split.
 *
 * The cost is the one `Exercises.tsx` records against the view switch on
 * 2026-10-05: the goal control is in the toolbar when collapsed and above it
 * when open, so it moves when you press it. That is Ben's call, made knowing
 * the note — and it is a smaller version of the old problem, because the
 * toolbar keeps its place and its other control either way.
 *
 * ── THE QUESTION IS THE HEADLINE, AND IT IS SAID ONCE ────────────────────
 * It was the other way round until 2026-10-08: the box carried the question
 * as a HIDDEN headline and the fieldset's legend carried it visibly, because
 * `RadioGroupText` had no `legendHidden` and two visible copies would have
 * asked the same thing twice.
 *
 * That produced the bug Ben reported. `ContentBox`'s `__headrow` exists to
 * put "THE HEADLINE AND THE X, ON ONE ROW" — its own words — and a HIDDEN
 * headline is absolutely positioned, so it occupies nothing: the row
 * collapsed to the close control alone, which floated at the trailing edge
 * with the question stranded on its own line underneath, wrapped to two lines
 * inside a box ten times its width.
 *
 * So the question moved into the headline where the box can lay it out, and
 * `RadioGroupText` grew the `legendHidden` its two siblings already had. The
 * legend is still there for a screen reader; it is simply not drawn twice.
 *
 * ── FOUR OPTIONS, THREE ROWS ──────────────────────────────────────────────
 * "Musie entdecken" is appended here rather than read from the table. It is
 * the absence of a goal, it has no row, and `lib/goals.ts` owns that
 * distinction — this file only draws it last, after the content's own `sort`.
 */
import * as React from 'react';
import { Filter } from 'lucide-react';
import { ContentBox, CtaButton, RadioGroupText } from '@musie/design-system';
import type { Goal } from '../lib/content';
import type { GoalChoice } from '../lib/goals';
import { NO_GOAL, goalLabel } from '../lib/goals';
import { useT } from '../i18n/localeContext';

interface GoalPillProps {
  goals: Goal[];
  /** Null until something has been chosen — the question has not been asked. */
  choice: GoalChoice | null;
  onOpen: () => void;
}

interface GoalBoxProps {
  goals: Goal[];
  choice: GoalChoice | null;
  /** Dismissed without choosing. Null when there is nothing to go back to. */
  onCancel: (() => void) | null;
  onChoose: (choice: GoalChoice) => void;
}

/** The collapsed state: what you chose, and the way back to the question. */
export function GoalPill({ goals, choice, onOpen }: GoalPillProps) {
  const t = useT();

  /* THE LABEL IS THE CHOICE, including "Musie entdecken" — the pill reads
     "Ziel: Musie entdecken" for it rather than inventing a second sentence for
     the one option that means no goal. It is an option the person picked from
     a list of four, and the pill reports what they picked. */
  const label = choice === null ? null : goalLabel(goals, choice) ?? t('exercises.goal.none');
  if (label === null) return null;

  /* NO WRAPPER. The pill is a child of `.musie-deck-toolbar` now, which owns
     the row, the gap and the scrolling — so a row of its own here would be a
     second layout fighting the first.

     `size="min"` is the small rung; there is no `size="small"` in this system,
     and `min` is also what the view switch beside it uses, so the two controls
     share a height. `secondary` rather than `primary`: the way ON from this
     screen is the card, and one primary per unit is the rule Exercises.tsx
     already applies to the running-session notice. */
  return (
    <CtaButton
      variant="secondary"
      size="min"
      /* A FUNNEL, NOT A TARGET — Ben, 2026-10-07. `Target` drew the goal as
         the thing being aimed at, which is what the word says and not what the
         control does: pressing it narrows five exercises to the ones that
         serve the goal. A filter glyph says that, and it is the same glyph the
         first-use legend uses to point here. */
      leadingIcon={Filter}
      /* The row owns the spacing around this control — see `.musie-goal-pill`
         in exercises.css for what that class does and why it has to. */
      className="musie-goal-pill"
      onClick={onOpen}
    >
      {t('exercises.goal.pill', { goal: label })}
    </CtaButton>
  );
}

/** The open state: the question, and the four answers. */
export function GoalBox({ goals, choice, onCancel, onChoose }: GoalBoxProps) {
  const t = useT();

  return (
    <ContentBox
      className="musie-goal-box"
      headline={t('exercises.goal.question')}
      headingLevel={2}
      /* The question is a label for the four rows under it, not prose to be
         read and tracked back from — so it is released from the 26ch heading
         measure, which was breaking 32 characters into two balanced
         half-lines inside a 930px row. It still wraps at 393px, where the
         room genuinely runs out. */
      headlineWide
      /* BOTH OR NEITHER — ContentBox requires `dismissLabel` whenever
         `onDismiss` is passed. Absent on the first ask, because there is no
         previous choice to close back to and a dismissable question with no
         answer behind it is a way to reach a screen with nothing on it. */
      {...(onCancel === null ? {} : { onDismiss: onCancel, dismissLabel: t('common.closeLabel') })}
    >
      <RadioGroupText
        name="exercise-goal"
        /* THE SAME STRING AS THE HEADLINE, AND DELIBERATELY SO. A fieldset
           needs its own accessible name (1.3.1, 4.1.2) and a heading above it
           does not supply one — so the question is passed twice and drawn
           once. */
        legend={t('exercises.goal.question')}
        legendHidden
        /* OCHER, like every other choice in this app. `accent` is
           `--interactive-accent` → `--ocher-9`, and it is what AboutYou,
           MenuPreferences, BetaSignup, SessionReflect, Diary and AboutMusie
           all pass — this group was the only one left on the terracotta
           default, which made the one question the app asks before a session
           look like a different app's.

           IT DOES NOT REACH THE PILL. `CtaButton` has no accent variants —
           they were deleted on 2026-10-05, "no CTA is yellow" — so the
           collapsed state stays `secondary`. The yellow is the colour of
           CHOOSING here, not of the answer you are carrying around. */
        accent="accent"
        options={[
          ...goals.map((goal) => ({ value: goal.id, label: goal.label })),
          /* LAST, ALWAYS. The three above are ordered by the content's `sort`;
             this one is not content and does not compete for a place in it. */
          { value: NO_GOAL, label: t('exercises.goal.none') },
        ]}
        /* `undefined`, not null: base-ui reads undefined as "nothing checked"
           and null as a value to match, which no option carries. */
        value={choice ?? undefined}
        onValueChange={onChoose}
        emptyLabel={t('content.empty')}
      />
    </ContentBox>
  );
}
