/**
 * The legend, as an extra card on the pile.
 *
 * ── WHY IT IS A CARD AND NOT A DIALOG ─────────────────────────────────────
 * Everything it explains is on this screen and around it: the two directions
 * the card goes, and the card itself. A dialog
 * would take the screen away to describe it. Sitting in the pile's own cell —
 * the deck's `cover` slot — it covers exactly the card and nothing else.
 *
 * ── IT IS A MAP OF THE SCREEN, NOT A LIST OF FACTS (Ben, 2026-10-07) ───────
 * Centred rows, each a glyph beside a sentence, said the same things in a
 * column that pointed nowhere. The wireframe's correction is that WHERE a
 * hint sits is half of what it says, so each row sits where its control is:
 *
 *   swipe  → the middle, with a chevron at each edge of the card, because the
 *            pair is the hint: the gesture goes either way.
 *   start  → the bottom, with a picture of the Start button in the corner the
 *            real one is in on the face underneath.
 *
 * TWO ROWS SINCE 2026-10-15. A third pointed up out of the card at the goal
 * pill; the goal is the page's headline now, so the one thing that row
 * existed to locate is the largest line on the screen. Its own block, below,
 * is the argument.
 *
 * The stylesheet does the placing; this file owns the order, which is also the
 * reading order a screen reader gets.
 *
 * ── ONE CONTROL, AND IT IS THE WHOLE CARD ─────────────────────────────────
 * "Any interaction dissolves it", so there is exactly one thing to press and
 * it is everything. A `<button>` rather than a div with a handler: it is in
 * the tab order, it answers Enter and Space, and a screen reader is told it
 * can be pressed. Everything inside is phrasing content — spans and svgs —
 * which is what keeps a button legal while holding two rows of layout.
 *
 * FOCUS IS NOT MOVED TO IT. It is onboarding over a screen somebody has just
 * arrived at, not a decision owed before anything else can happen; stealing
 * focus would be the second thing in two seconds that moved without being
 * asked. It is in the tab order where it sits, which is inside the pile.
 *
 * ── IT DISSOLVES RATHER THAN DISAPPEARING ─────────────────────────────────
 * Three states, not two: shown, leaving, gone. The middle one exists because
 * unmounting on click gives the reader no idea what happened to the thing they
 * just pressed — and because the card underneath is the destination, so the
 * fade is what connects the two. `onAnimationEnd` is what ends it, so the
 * duration lives in the stylesheet with the rest of the motion, and reduced
 * motion collapses it to 1ms through Layer 1 without this file knowing.
 */
import * as React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@musie/design-system';
import { useT } from '../i18n/localeContext';

export interface DeckGuideProps {
  /** Read and then gone. The parent owns whether it is drawn at all. */
  onDismiss: () => void;
}

export function DeckGuide({ onDismiss }: DeckGuideProps) {
  const t = useT();
  const [leaving, setLeaving] = React.useState(false);

  return (
    <button
      type="button"
      className="musie-deck-guide"
      data-leaving={leaving || undefined}
      onClick={() => setLeaving(true)}
      /* THE ANIMATION ENDS IT, not a timer: one duration, in the stylesheet,
         where reduced motion already flattens it. A `setTimeout` here would be
         a second copy of that number and would outlive the element. */
      onAnimationEnd={() => { if (leaving) onDismiss(); }}
    >
      {/* ── THE GOAL ROW IS GONE — Ben, 2026-10-15 ──────────────────────
          An arrow pointing up out of the card, beside *Ändere dein Ziel*,
          aimed at the goal control in the row above the pile.

          IT STOPPED BEING WORTH A THIRD OF THIS CARD on the day the goal
          moved into the headline. The pill it pointed at was a small
          outlined chip among three controls, and the thing a first-time
          reader did not know was WHERE it was — which is the whole reason
          the row drew a direction rather than a funnel. The goal is now the
          largest line on the screen, in the sentence the page opens with,
          wearing a coloured link and a glyph. A card that covers the deck in
          order to point at it is explaining the one thing that no longer
          needs explaining.

          So the legend is two rows now: the gesture and the press, which are
          the two things still invisible until somebody does them.

          `exercises.guide.goal` went with it — a key nothing renders is the
          invisible rot the catalogue's own header warns about. */}

      {/* ── THE TWO DIRECTIONS, AT THE TWO EDGES ────────────────────────
          Both chevrons, in the order they sit in beside the pile and pushed
          to the card's own sides, because the row is about the PAIR — one
          glyph would explain half a gesture, and both in one corner would
          describe a control instead of a movement. */}
      <span className="musie-deck-guide__row musie-deck-guide__row--swipe">
        <span className="musie-deck-guide__glyph">
          <Icon glyph={ChevronLeft} size="lg" />
        </span>
        <span className="musie-deck-guide__text">{t('exercises.guide.next')}</span>
        <span className="musie-deck-guide__glyph">
          <Icon glyph={ChevronRight} size="lg" />
        </span>
      </span>

      {/* ── THE WAY ON, DRAWN RATHER THAN NAMED ─────────────────────────
          A stylised Start button, in the bottom-right corner — which is where
          `.musie-exercise-card__start` sits on the face underneath, so the
          picture is in the place of the thing it is a picture of.

          `aria-hidden`, and it is not decoration — it is a PICTURE OF A
          CONTROL, and a screen reader meeting the word "Start" inside a button
          that does something else would hear two actions in one. The sentence
          above it carries the meaning. */}
      <span className="musie-deck-guide__row musie-deck-guide__row--start">
        <span className="musie-deck-guide__text">{t('exercises.guide.start')}</span>
        <span className="musie-deck-guide__cta" aria-hidden="true">
          <Icon glyph={ArrowRight} size="sm" />
          {t('exercises.startShort')}
        </span>
      </span>

      {/* The verb, for the reader who cannot see that this is a card over a
          card. Without it the accessible name is three explanations and no
          action. */}
      <span className="musy-sr-only">{t('exercises.guide.dismiss')}</span>
    </button>
  );
}
