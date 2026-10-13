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
 *
 * ── AND `align` CAN NOW SURVIVE THE STACK — 2026-10-12 ────────────────────
 * It could not before, and the reason was sound: a full-width button has no
 * alignment to have, so `align` was documented as ignored once stacked.
 *
 * `stacked="hug"` removes the premise rather than the rule. The actions keep
 * their own width in the column, which gives them an alignment again — and
 * `align` then means the same thing in both directions, so a group that is
 * trailing on a wide screen stays trailing on a phone instead of silently
 * becoming two full-width rows.
 *
 * `fill` STAYS THE DEFAULT and is still right for a step's final actions,
 * which is what this component was built for: at 320px a full-width target is
 * the easiest thing in the world to hit. `hug` is for a group that is NOT the
 * end of a step — an aside beside the way on, where a pair of full-width
 * buttons reads as two equal commitments.
 *
 * ── AND TWO RELATIONSHIPS, ONE LAYOUT — 2026-10-12 ───────────────────────
 * Every group in the product held two ALTERNATIVES until then — Discard ·
 * Save, Back · Continue — which L6 puts at --space-gap-inline because they
 * read as one control pair. The listening step's sheet ends with a switch
 * beside the way on, and those are not alternatives: pressing one is not
 * declining the other. `relation` spends L2's --space-gap-stack between them
 * instead.
 *
 * The gap stays the component's either way. WHICH RELATIONSHIP the row holds
 * is the caller's, because it is the only one who knows — and that is the
 * whole reason this is a prop and not a class a screen adds from outside
 * (CLAUDE.md rule 1, 10-layout.md L7).
 *
 * THE TWO ARE ORTHOGONAL, and arrived the same day from two branches.
 * `stacked` is what the COLUMN does below --bp-md; `relation` is what the
 * SPACE between the controls means, in the column and the row alike.
 */
import * as React from 'react';

/**
 * What the group does once it is a column, below --bp-md.
 *
 * `fill` — every action full width, in DOM order. The default, and what a
 *   step's final actions want: at 320px a full-width target is the easiest
 *   thing to hit.
 * `hug` — the actions keep their own width, and `align` therefore applies to
 *   the column as well as the row. For a group that is not the end of a step,
 *   where two full-width buttons read as two equal commitments.
 */
export type ButtonGroupStacked = 'fill' | 'hug';

export interface ButtonGroupProps {
  children: React.ReactNode;
  /** Alignment at --bp-md and up — and below it too, when `stacked` is
   *  `hug`. Ignored once stacked with the default `fill`, because a
   *  full-width action has no alignment to have. */
  align?: 'start' | 'center' | 'end';
  /** Column behaviour below --bp-md. See ButtonGroupStacked. */
  stacked?: ButtonGroupStacked;
  /**
   * What the children are to EACH OTHER, which is the only thing the gap
   * ladder keys on — 10-layout.md L2: "Layer 1 §5 names a token for each
   * relationship; use the name, never a number".
   *
   * `alternatives` (default) — two ways out of one step. One control pair,
   *   --space-gap-inline (L6). Every group written before 2026-10-12.
   * `molecule` — controls of different KINDS, standing together because the
   *   step ends here and not because they are choices between each other.
   *   L2's "controls inside one molecule", --space-gap-stack.
   *
   * AND IT ALSO SAYS WHAT DOM ORDER MEANS. Among alternatives the order is
   * priority, so the primary comes first and the stacked column puts it on
   * top. In a molecule it is reading order: the way on stays last, so the
   * stacked column ends with it — which is where the step ends.
   */
  relation?: 'alternatives' | 'molecule';
  className?: string;
}

export function ButtonGroup({
  children, align = 'start', stacked = 'fill', relation = 'alternatives',
  className,
}: ButtonGroupProps) {
  return (
    <div
      className={[
        'musy-btn-group',
        align === 'start' ? '' : `musy-btn-group--${align}`,
        stacked === 'fill' ? '' : `musy-btn-group--stacked-${stacked}`,
        relation === 'alternatives' ? '' : `musy-btn-group--${relation}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
