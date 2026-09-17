/**
 * Button Group — Layer 2 · §7.4a
 * The 2–3 actions a step ends with, as one part.
 *
 * NOT A NEW BUTTON, AND NOT A TOOLBAR. No roving focus, no segmented
 * selection, no shared border radius: the children are ordinary §7.4 CTA
 * Buttons and each one keeps its own target, focus ring and state matrix. The
 * group owns exactly one thing — how the row behaves when it stops fitting.
 *
 * WHY IT EXISTS. A row of --target-guided buttons is already about 2×20ch.
 * Below --bp-md it either wraps into a ragged staircase or squeezes the
 * labels, and every screen was solving that again with its own inline flex
 * rules. Here the rule is written once: below --bp-md the group stacks and
 * every action goes full width, in DOM order — which is also priority order,
 * so the primary action must come first in the markup.
 */
import * as React from 'react';

export interface ButtonGroupProps {
  children: React.ReactNode;
  /** Row alignment at --bp-md and up. Ignored once stacked. */
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function ButtonGroup({ children, align = 'start', className }: ButtonGroupProps) {
  return (
    <div
      className={[
        'musy-btn-group',
        align === 'start' ? '' : `musy-btn-group--${align}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
