/**
 * Chip — Layer 2
 *
 * A thing the person put there, with a way to take it back out.
 *
 * ── IT IS NOT A CONTROL, AND ONLY ITS × IS ───────────────────────────────
 * Ben, 2026-10-16: *"Die Chips sind nicht hoverbar, nur das x ist hoverbar."*
 *
 * That is the whole semantic difference between this and everything near it.
 * A `FilterChips` chip is a checkbox — pressing it changes a query. A
 * `SegmentedControl` option is a radio. This is a NOUN: a word somebody
 * already chose, sitting there being true. Nothing happens when you press it,
 * so nothing about it may suggest that something would — no hover, no active,
 * no pointer cursor, no focus ring on the chip itself.
 *
 * The remove control is the only interactive thing in the box, and it is an
 * ordinary `IconButton` with its own states and its own accessible name.
 *
 * ── AN ERASER, NOT AN × — Ben, 2026-10-16 ────────────────────────────────
 * An × means CLOSE almost everywhere it appears in this system — the
 * Lightbox's corner, the Toast's dismiss — and both of those put the thing
 * away without changing anything. This one deletes a row. The eraser says
 * the difference, and says it at a glance in a line where the two could
 * otherwise be confused for each other.
 *
 * ── BACKGROUND ONLY, NO BORDER ───────────────────────────────────────────
 * Also Ben's. An edge is what a control wears to say where you may press, and
 * this is not a control; the fill alone is enough to say "this is one object"
 * when the object is a single word. It is the one visual difference from
 * every other chip in the system, and it is carrying meaning rather than
 * taste.
 *
 * ── WITHOUT `onRemove` IT IS A <span> ────────────────────────────────────
 * A chip nobody can remove is a label, and a label does not need a button
 * slot, a group role or a name for a control that is not there. The diary
 * reads its feelings back as plain text for the same reason: there is
 * nothing to remove on a session that is over.
 *
 * ── THE ROW IS `ChipRow`, NOT THE CONSUMER'S FLEXBOX ─────────────────────
 * The gap between chips is a Layer 1 rung and a decision (L2, L6): chips in a
 * line are atoms that belong together, which is `--space-gap-related`. Shipped
 * here so a screen cannot pick a different number, which is the same argument
 * `ButtonGroup` makes about a row of actions.
 */
import * as React from 'react';
import { Eraser } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ChipProps {
  /** The word. Inherits nothing — a chip sets its own type step. */
  children: React.ReactNode;
  /**
   * Offer a way to take it back out. Omit it and the chip renders as a
   * `<span>` with no control in it at all.
   */
  onRemove?: () => void;
  /**
   * Rule 7, and it is REQUIRED alongside `onRemove`: an icon-only control
   * needs a name, and four chips whose buttons all say "Remove" are four
   * identical buttons to anybody who cannot see which row they are on. Name
   * the thing being removed.
   */
  removeLabel?: string;
  className?: string;
}

export function Chip({ children, onRemove, removeLabel, className }: ChipProps) {
  if (process.env.NODE_ENV !== 'production' && onRemove && !removeLabel) {
    console.warn(
      'Chip: onRemove without removeLabel — the × is then an unnamed button. '
      + 'Pass the word being removed, not a bare "Remove".'
    );
  }

  return (
    <span className={['musy-chip', className ?? ''].filter(Boolean).join(' ')}>
      <span className="musy-chip__label">{children}</span>
      {onRemove && (
        <IconButton
          className="musy-chip__remove"
          glyph={Eraser}
          size="min"
          variant="ghost"
          label={removeLabel ?? ''}
          /* The × sits against the word it removes, and its meaning is the
             word. A tooltip repeating the label over a 36px target inside a
             line of chips is noise. */
          tooltip={false}
          onClick={onRemove}
        />
      )}
    </span>
  );
}

export interface ChipRowProps {
  children: React.ReactNode;
  /**
   * The chips are a LIST to anything that cannot see the gaps between them.
   * `as="ul"` wraps each child in an `<li>`; the default `span` is for a
   * chip or two inside a sentence, where a list would be furniture.
   */
  as?: 'span' | 'ul';
  className?: string;
}

/**
 * A line of chips at the system's own gap.
 *
 * Wraps rather than scrolls, unlike `FilterChips`' row: that one is a
 * control strip with a known set of dimensions and a horizontal gesture;
 * this is content, and content that runs off the side of a reading column is
 * content somebody loses.
 */
export function ChipRow({ children, as = 'span', className }: ChipRowProps) {
  const classes = ['musy-chip-row', className ?? ''].filter(Boolean).join(' ');

  if (as === 'ul') {
    return (
      <ul className={classes}>
        {/* The index IS the key, and it is the right one here: this wrapper
            adds no identity of its own, and the children it wraps carry
            whatever keys their own list already gave them. */}
        {React.Children.map(children, (child) => (
          <li className="musy-chip-row__item">{child}</li>
        ))}
      </ul>
    );
  }
  return <span className={classes}>{children}</span>;
}
