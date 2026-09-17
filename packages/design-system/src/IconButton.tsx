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
import type { LucideIcon } from 'lucide-react';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost';
export type IconButtonSize = 'min' | 'primary' | 'comfort' | 'guided';

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
  /** Announced while loading. German default: the app is German-primary. */
  loadingLabel?: string;
  className?: string;
}

const ICON_FOR_TARGET: Record<IconButtonSize, IconSize> = {
  min: 'sm', primary: 'md', comfort: 'lg', guided: 'lg',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({
    glyph, label, variant = 'ghost', size = 'primary',
    tooltip = true, loading = false, loadingLabel = 'Wird geladen',
    disabled, className, ...rest
  }, ref) {
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
        {loading && <span className="musy-sr-only" role="status">{loadingLabel}</span>}
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
