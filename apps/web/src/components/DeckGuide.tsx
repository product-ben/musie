/**
 * The legend, as an extra card on the pile.
 *
 * ── WHY IT IS A CARD AND NOT A DIALOG ─────────────────────────────────────
 * Everything it explains is on this screen and under it: the chevrons beside
 * the pile, the card itself, the funnel in the row above. A dialog would take
 * the screen away to describe it. Sitting in the pile's own cell — the deck's
 * `cover` slot — it covers exactly the card and nothing else, and the card it
 * covers stays visible through it.
 *
 * SEMI-TRANSPARENT AND BLURRED, which is the whole of that last point: Ben
 * asked for the card to shimmer through, so the thing being explained is
 * behind the explanation rather than replaced by it.
 *
 * ── ONE CONTROL, AND IT IS THE WHOLE CARD ─────────────────────────────────
 * "Any interaction dissolves it", so there is exactly one thing to press and
 * it is everything. A `<button>` rather than a div with a handler: it is in
 * the tab order, it answers Enter and Space, and a screen reader is told it
 * can be pressed. Everything inside is phrasing content — spans and svgs —
 * which is what keeps a button legal while holding three rows of layout.
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
import { ArrowRight, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
      {/* ── THE TWO DIRECTIONS ──────────────────────────────────────────
          Both chevrons, in the order they sit in beside the pile, because the
          row is about the PAIR — one glyph would explain half a control. */}
      <span className="musie-deck-guide__row">
        <span className="musie-deck-guide__glyph">
          <Icon glyph={ChevronLeft} size="md" />
          <Icon glyph={ChevronRight} size="md" />
        </span>
        <span className="musie-deck-guide__text">{t('exercises.guide.next')}</span>
      </span>

      {/* ── THE WAY ON, DRAWN RATHER THAN NAMED ─────────────────────────
          A stylised Start button: the card's own control, in white, so the eye
          matches it to the thing on the card underneath instead of reading a
          description of it.

          `aria-hidden`, and it is not decoration — it is a PICTURE OF A
          CONTROL, and a screen reader meeting the word "Start" inside a button
          that does something else would hear two actions in one. The sentence
          beside it carries the meaning. */}
      <span className="musie-deck-guide__row">
        <span className="musie-deck-guide__cta" aria-hidden="true">
          <Icon glyph={ArrowRight} size="sm" />
          {t('exercises.startShort')}
        </span>
        <span className="musie-deck-guide__text">{t('exercises.guide.start')}</span>
      </span>

      {/* ── THE FILTER ──────────────────────────────────────────────────
          The same glyph the goal pill carries, which is why that pill stopped
          being a target: a legend pointing at a control has to be pointing at
          the control's own picture. */}
      <span className="musie-deck-guide__row">
        <span className="musie-deck-guide__glyph">
          <Icon glyph={Filter} size="md" />
        </span>
        <span className="musie-deck-guide__text">{t('exercises.guide.goal')}</span>
      </span>

      {/* The verb, for the reader who cannot see that this is a card over a
          card. Without it the accessible name is three explanations and no
          action. */}
      <span className="musy-sr-only">{t('exercises.guide.dismiss')}</span>
    </button>
  );
}
