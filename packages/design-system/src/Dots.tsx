/**
 * Dots — Layer 2 part
 *
 * The position row: one mark per item, the current one drawn as a pill.
 *
 * EXTRACTED FROM §7.11 RATHER THAN COPIED. It was the Carousel's, and the Card
 * Deck needs exactly the same row for exactly the same reason — "which of how
 * many, and roughly where" — so it became a part instead of a second
 * implementation. The markup, the sizes and the 2.5.8 bargain below are the
 * Carousel's, unchanged; only the class names moved.
 *
 * SC 2.5.8: the MARK is 12px and the TARGET is 24px. The two are deliberately
 * different — a 12px dot is the right size to look at and the wrong size to
 * hit, so the button is padded out to `--target-min` around a mark that is
 * not.
 *
 * THE SELECTED STATE IS WIDTH AND FILL, NOT FILL ALONE (1.4.1). The active
 * mark is a pill at 2:1, exactly `--target-min` wide, so colour is never the
 * only thing separating current from not.
 *
 * `--musy-sel-fill` is READ, NOT SET. It is the host component's selected
 * colour — the Carousel sets it per accent — so the dots take the colour of
 * whatever they are the position row for.
 */
import * as React from 'react';

export interface DotsProps {
  /** How many marks. */
  total: number;
  /** Which one is current, 0-based. */
  index: number;
  /**
   * Each dot's accessible name, given a 1-based position and the total.
   * Required: a row of unnamed buttons is a row of nothing (4.1.2).
   */
  label: (position: number, total: number) => string;
  /**
   * Jump to one.
   *
   * OMIT IT AND THE ROW STOPS BEING CONTROLS. Without a destination there is
   * nothing to press, so the dots render as spans and the row is marked
   * `aria-hidden` — a screen reader meeting five unpressable buttons learns
   * only that they cannot be pressed. A host that hides them this way owes its
   * own announcement of the position; the Card Deck's live region is the
   * reference case.
   */
  onSelect?: (index: number) => void;
  /** Stable keys, so a mark survives a reorder. Falls back to the position. */
  ids?: readonly string[];
  className?: string;
}

export function Dots({ total, index, label, onSelect, ids, className }: DotsProps) {
  const marks = Array.from({ length: total }, (_, i) => i);
  const classes = ['musy-dots', className ?? ''].filter(Boolean).join(' ');

  if (onSelect === undefined) {
    return (
      <div className={classes} aria-hidden="true">
        {marks.map((i) => (
          <span key={ids?.[i] ?? i} className="musy-dot" data-current={i === index}>
            <span className="musy-dot__mark" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={classes}>
      {marks.map((i) => (
        <button
          key={ids?.[i] ?? i}
          type="button"
          className="musy-dot"
          /* 'false', not undefined: the stylesheet's selected rules key off
             [aria-current="true"], and the hover rule off :not() of it. */
          aria-current={i === index ? 'true' : 'false'}
          data-current={i === index}
          aria-label={label(i + 1, total)}
          onClick={() => onSelect(i)}
        >
          {/* Empty on purpose. The mark IS the state — a 12px dot, or a 24px
              pill when it is the current one — and the button's own aria-label
              says where it goes. */}
          <span className="musy-dot__mark" />
        </button>
      ))}
    </div>
  );
}
