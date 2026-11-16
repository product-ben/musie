/**
 * Icon Button — Layer 2
 * base-ui: Button + Tooltip (`@base-ui/react/button`, `/tooltip`).
 * APG pattern: Button (https://www.w3.org/WAI/ARIA/apg/patterns/button/).
 *
 * The accessible name is authored ONCE, in \`label\`, and reused verbatim as the
 * tooltip string — so the two can never disagree.
 *
 * The tooltip is base-ui's, not hand-rolled CSS: it portals, so it cannot be
 * clipped by a scroll container, and it collision-flips near a viewport edge.
 * Both were real defects in the native version. base-ui opens a tooltip on
 * hover AND focus by default, which is what 1.4.13 requires — hover-only fails.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Tooltip } from '@base-ui/react/tooltip';
import { Icon, type IconSize } from './Icon';
import { useMusyText } from './locale';
import type { LucideIcon } from 'lucide-react';

/**
 * `outline` ARRIVED LAST (2026-10-07), to match `Button`'s own.
 *
 * The deck's two chevrons asked for it: beside a card they were `secondary`,
 * a raised surface with a border, and three raised chips sitting next to a
 * raised card read as a fourth and fifth card rather than as controls. The
 * outline is the same border with nothing behind it — the quiet rung that
 * `Button` has had all along, and the two now agree about what the word
 * means so a row mixing the two shapes cannot drift apart.
 */
export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
/* `comfort` is unused today and reserved — see Button.tsx's note: it is
   the rung for when Musie is optimised for elderly and for children.

   ── `sm` IS ON THIS LADDER AND NOT ON Button's (Ben, 2026-11-11) ──────
   40px, --target-sm (amendment gap G6). It exists for the help button in the
   /exercises toolbar, which stands in a row of Button `min`s — and those
   draw about 40px tall (39px on a 393px phone, 40.4px at 1440, measured):
   the label and the --sp-2 block padding set the height, not --target-min.
   An IconButton has no label to grow it, so it needed the rung by name.

   Button does NOT get `sm`, on purpose: its `min` already IS the 40px
   control, and a second name for the same height would be a rung nobody can
   choose between. That breaks the rule the two ladders kept until now — they
   read identically, `min` named so on both for that reason — and it breaks it
   knowingly; Button.tsx's header and §7.4 say so too. Do not "fix" the
   asymmetry by adding `sm` to Button.

   Unlike `min`, `sm` takes no baked-in margin: 40px clears 2.5.8 on its own,
   without the spacing exception, so there is nothing for a margin to earn. */
export type IconButtonSize = 'min' | 'sm' | 'primary' | 'comfort' | 'guided';

export interface IconButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children' | 'className' | 'render'> {
  glyph: LucideIcon;
  /** Accessible name AND tooltip text. Required — an icon-only control with
   *  no name is a 4.1.2 failure. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Show the tooltip. Off for controls whose meaning is obvious in context
   *  (a close X in a sheet header). */
  tooltip?: boolean;
  loading?: boolean;
  /** Announced while loading. Defaults to the locale catalogue's word
   *  (src/locale.ts) — German unless the app says otherwise. */
  loadingLabel?: string;
  className?: string;
}

/* Two ladders, one word: the ICON BUTTON's `sm` (40px) carries the ICON's
   `sm` (16px, `--icon-stroke-sm`). It stands in a row of Button `min`s, whose
   glyphs are that icon; at `md` its 2px stroke on a 20px glyph read visibly
   bolder than its neighbours (Ben, 2026-11-11). */
const ICON_FOR_TARGET: Record<IconButtonSize, IconSize> = {
  min: 'sm', sm: 'sm', primary: 'md', comfort: 'lg', guided: 'lg',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({
    glyph, label, variant = 'ghost', size = 'primary',
    tooltip = true, loading = false, loadingLabel,
    disabled, className, ...rest
  }, ref) {
    const t = useMusyText();
    const sizeClass = size === 'primary' ? 'primary-size' : size;
    const classes = ['musy-icon-btn', `musy-icon-btn--${variant}`, `musy-icon-btn--${sizeClass}`, className ?? '']
      .filter(Boolean).join(' ');

    const button = (
      <Button
        {...rest}
        ref={ref}
        className={classes}
        aria-label={label}
        aria-busy={loading || undefined}
        data-loading={loading ? '' : undefined}
        disabled={disabled || loading}
      >
        <Icon glyph={glyph} size={ICON_FOR_TARGET[size]} />
        {loading && <span className="musy-spinner" aria-hidden="true" />}
        {loading && <span className="musy-sr-only" role="status">{loadingLabel ?? t.loading}</span>}
      </Button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip.Root
        /* Coarse pointers get no tooltip: the label is already the accessible
           name, and a touch-triggered tooltip sits under the finger. */
        trackCursorAxis="none"
      >
        <Tooltip.Trigger render={button} />
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={8} collisionPadding={8}>
            {/* aria-hidden: the popup duplicates the trigger's accessible name,
                so announcing it would double it. */}
            <Tooltip.Popup className="musy-icon-btn__tooltip" aria-hidden="true">
              {label}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }
);

/**
 * Mount ONCE near the app root. base-ui groups tooltips so that moving between
 * neighbouring icon buttons does not re-run the open delay — which matters in
 * the nav bar, where three of them sit side by side.
 */
export function MusyTooltipProvider({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delay={400} closeDelay={0}>{children}</Tooltip.Provider>;
}
