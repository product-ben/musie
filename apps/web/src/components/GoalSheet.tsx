/**
 * The goal, chosen in a sheet that argues for its options.
 *
 * ── IT REPLACES A PILL AND A BOX, AND THE REASON IS NOT LAYOUT ────────────
 * `GoalPicker.tsx` was two exports: a `Funnel` pill in the toolbar and a
 * `ContentBox` holding four `RadioGroupText` rows. Both are deleted, and the
 * thing they could not do is the whole point of this file.
 *
 * User testing found people stalling at the door — *warum sollte ich das
 * machen?*, *was soll das bringen?* — and a radio row is a one-line label
 * with nowhere to answer that. A card has a body. So the question moved out
 * of a box on the page and into a sheet, where four cards have room to say
 * what each goal is for, and the control that opens it moved into the
 * headline, where the goal is now the subject of the sentence rather than a
 * chip beside it.
 *
 * ── THE SHEET IS SINGLE-BODY, NOT PAGED ──────────────────────────────────
 * `Sheet` without `pages`: no dots, no chevrons, four cards stacked and
 * scrolled if they do not fit. Paging was considered and is wrong here — the
 * four are meant to be COMPARED, and a gesture that shows one at a time is
 * the one arrangement that makes comparing them impossible.
 *
 * ── CHOOSING CLOSES IT, AND NOTHING CONFIRMS ─────────────────────────────
 * One tap, like every other choice on this screen: the list view starts an
 * exercise on a tap, the deck starts one on a press, and the old goal box
 * applied its answer the moment a row was chosen. A *Done* button underneath
 * would be a second decision about a decision already made, and reopening is
 * one tap on the headline.
 *
 * ── ONLY ONE OF THE FOUR CARDS HAS A BODY ────────────────────────────────
 * Ben, 2026-10-15: *"Musie kennenlernen", "Entspannung" und "Aktivierung"
 * brauchen keinen description text.* Those three name a state you already
 * know you want; Achtsamkeit is the abstract one, and it is the one the
 * testing actually heard the question about. `goal.why` is null for the other
 * three and `RadioCards` draws a headline alone — which is why `description`
 * became optional in the component rather than being passed an empty string
 * here.
 */
import * as React from 'react';
import { RadioCards, Sheet } from '@musie/design-system';
import type { LightboxOrigin } from '@musie/design-system';
import type { Goal } from '../lib/content';
import type { GoalChoice } from '../lib/goals';
import { useT } from '../i18n/localeContext';

export interface GoalSheetProps {
  goals: Goal[];
  /** Null until the goals have landed and the choice is known. */
  choice: GoalChoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rect of the headline's link, so the sheet grows out of it. */
  origin: LightboxOrigin | null;
  onChoose: (choice: GoalChoice) => void;
}

export function GoalSheet({
  goals, choice, open, onOpenChange, origin, onChoose,
}: GoalSheetProps) {
  const t = useT();

  const options = React.useMemo(() => goals.map((goal) => ({
    value: goal.id,
    headline: goal.label,
    /* `?? undefined`, NOT `?? ''`. An empty string would draw an empty
       paragraph with a bold "Warum?" leading nothing; undefined is what tells
       RadioCards there is no body at all. */
    description: goal.why ?? undefined,
    /* The lead is chrome — one word, the same on every card that has a body —
       and the sentences after it are content. Passed unconditionally: the
       component ignores it without a description, so there is no second
       condition here that could disagree with the first. */
    descriptionLead: t('exercises.goal.why'),
  })), [goals, t]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      /* Rule 7, twice. `title` is announced and never drawn — Sheet's own
         contract — and `closeLabel` exists because Lightbox underneath
         defaults to the German 'Schließen', which an English screen would
         wear without a word of warning. */
      title={t('exercises.goal.sheetTitle')}
      closeLabel={t('common.closeLabel')}
      origin={origin}
      /* The gutter at M and L. `Sheet`'s own inset is 32px at every width,
         which is a margin on a phone and nothing on a laptop — see
         `.musie-goal-sheet` in exercises.css for why the correction is this
         sheet's and not the component's. */
      className="musie-goal-sheet"
      /* ── THE QUESTION, PINNED TO THE TOP ───────────────────────────────
         In the `header` slot rather than in the body, which is what keeps it
         in the same place whatever the cards below do — Sheet's header is
         pinned and its body is what scrolls. An h2, because the page's h1 is
         the headline that opened this. */
      header={<h2 className="musie-goal-sheet__headline">{t('exercises.goal.question')}</h2>}
    >
      <RadioCards
        name="exercise-goal"
        /* THE SAME STRING AS THE HEADING ABOVE, AND DELIBERATELY SO. A
           fieldset needs its own accessible name (1.3.1, 4.1.2) and a heading
           above it does not supply one — so the question is passed twice and
           drawn once. The pattern GoalBox used before this replaced it. */
        legend={t('exercises.goal.question')}
        legendHidden
        /* h3, under the sheet's own h2. Never guessed — the component takes
           the level because only the caller knows what it is nested in. */
        headingLevel={3}
        /* NO `accent` PROP, like every other choice in this app since
           2026-10-10. The default is `primary`, primary is green, and green is
           the interactive colour everywhere. */
        options={options}
        /* `undefined`, not null: base-ui reads undefined as "nothing checked"
           and null as a value to match, which no option carries. */
        value={choice ?? undefined}
        onValueChange={onChoose}
        emptyLabel={t('content.empty')}
      />
    </Sheet>
  );
}
