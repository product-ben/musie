/**
 * Hint — Layer 2 · §7.24
 * A hover bubble for something that is NOT a control.
 *
 * WHY NOT 7.2's TOOLTIP. That one belongs to an Icon Button and takes its
 * string from the button's own aria-label, so the string is authored once.
 * A Hint has no owner to borrow from, and it usually sits INSIDE a control —
 * a glyph in a Radio Card — where a second focusable element would be illegal
 * and a second tab stop unwelcome.
 *
 * SO THE BUBBLE IS A POINTER SHORTCUT, NEVER THE ONLY COPY. The same string
 * is always rendered as visually-hidden text inside the trigger, which keeps
 * it clear of 1.4.13: nothing appears on hover that is not already in the
 * accessible name. Coarse pointers drop the bubble entirely — the same call
 * 7.2 makes, because a touch-triggered bubble sits under the finger.
 *
 * Not base-ui Tooltip: that primitive assumes a focusable trigger and gives
 * it aria-describedby. Here there is nothing focusable to describe.
 */
import * as React from 'react';

export interface HintProps {
  /** The explanation. Shown on hover AND rendered visually-hidden for AT. */
  text: string;
  /** The glyph, figure or word the hint explains. */
  children: React.ReactNode;
  className?: string;
}

export function Hint({ text, children, className }: HintProps) {
  return (
    <span className={['musy-tip', className ?? ''].filter(Boolean).join(' ')}>
      {children}
      <span className="musy-sr-only">{text}</span>
      <span className="musy-tip__bubble" aria-hidden="true">{text}</span>
    </span>
  );
}
