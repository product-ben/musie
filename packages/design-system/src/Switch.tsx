/**
 * Switch — Layer 2
 * base-ui: Switch (`@base-ui/react/switch`).
 * APG pattern: Switch (https://www.w3.org/WAI/ARIA/apg/patterns/switch/).
 *
 * Switch.Root is the TRACK and is the focusable element; Switch.Thumb is the
 * knob. base-ui renders the hidden <input> itself and owns form participation,
 * so there is no input in this file and no sibling-selector styling.
 *
 * Labelling (2.5.3): a VISIBLE label is preferred. base-ui's own guidance is an
 * enclosing <label>, but this component uses the sibling pattern (htmlFor/id)
 * because the label needs to sit on either side of the track for the settings
 * row — so Switch.Root renders a native <button> and takes \`nativeButton\`,
 * exactly as base-ui documents for that case.
 *
 * Two sizes (`size`, 2026-11-09). `md` is the switch as it always was; `sm` is
 * the one the harp experiment built for itself as `.musie-switch--sm`, for a
 * row of settings set in label-md beside a segmented control — knob
 * `--icon-size-sm`, the label at label-md and regular weight. The ROW keeps
 * its 44px target at both sizes; only the track and the type step down.
 */
import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export type SwitchAccent = 'primary' | 'accent';

/**
 * The track and the label's type step.
 *
 * `md` — the default and the switch as specified: a 24px knob (60×32 track),
 * the label at label-lg.
 *
 * `sm` — a 16px knob (`--icon-size-sm`, a 44×24 track), the label at label-md
 * and regular weight, the gap closed to `--space-gap-inline`. For a switch
 * that sits among small controls — the instruments' settings, beside a
 * SegmentedControl — where a label-lg semibold label would be the loudest
 * thing in the panel. The harp experiment built exactly this as
 * `.musie-switch--sm`; this is that, moved into the system.
 *
 * THE ROW IS STILL THE TARGET. `--target-primary` is the row's min-height at
 * both sizes, so the smaller track costs a thumb nothing (2.5.8).
 */
export type SwitchSize = 'md' | 'sm';

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, 'className' | 'render' | 'nativeButton'> {
  /** Visible label text. Strongly preferred over labelHidden. */
  label: string;
  /** Hide the label visually. It stays in the accessible name. */
  labelHidden?: boolean;
  /** Label after the track instead of before, pushed to the far edge — the
   *  settings-row layout. */
  reverse?: boolean;
  accent?: SwitchAccent;
  /** The track and the label's type step. `md` by default — see `SwitchSize`. */
  size?: SwitchSize;
  /** Raise the row to --target-guided for assisted use. */
  guided?: boolean;
  /** Embedded knob glyphs. On by default per the brief; they are the
   *  non-colour cue for the on/off state (1.4.1). */
  showStateIcons?: boolean;
  /**
   * The knob glyph pair. Defaults to Check / X — the generic on/off reading.
   * Pass a domain pair when the switch controls something the user pictures
   * (Sun / Moon for dark mode, Volume2 / VolumeX for sound): the glyph then
   * says WHAT is switching, not just that something is. Both glyphs stay
   * mounted, so the knob never resizes mid-toggle.
   */
  onGlyph?: LucideIcon;
  offGlyph?: LucideIcon;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({
    label, labelHidden = false, reverse = false, accent = 'primary', size = 'md',
    guided = false, showStateIcons = true, onGlyph = Check, offGlyph = X,
    id, checked, className, ...rest
  }, ref) {
    const autoId = React.useId();
    const switchId = id ?? `musy-switch-${autoId}`;

    return (
      <div
        className={[
          'musy-switch',
          accent !== 'primary' ? `musy-switch--${accent}` : '',
          size !== 'md' ? `musy-switch--${size}` : '',
          reverse ? 'musy-switch--reverse' : '',
          guided ? 'musy-switch--guided' : '',
          className ?? '',
        ].filter(Boolean).join(' ')}
      >
        <BaseSwitch.Root
          {...rest}
          ref={ref}
          id={switchId}
          checked={checked}
          nativeButton
          render={<button type="button" />}
          className="musy-switch__track"
        >
          <BaseSwitch.Thumb className="musy-switch__knob">
            {showStateIcons && (
              <>
                {/* The span carries the state, not the Icon. IconProps is a
                    closed interface with no index signature, so a `data-state`
                    passed to <Icon> is dropped silently and
                    `.musy-switch__glyph[data-state="hidden"]` never matches —
                    which left both glyphs stacked in the same grid cell at full
                    opacity, in both states. Wrapping keeps Icon's API closed and
                    restores the cue the stylesheet was already written for. */}
                <span className="musy-switch__glyph" data-state={checked ? 'shown' : 'hidden'}>
                  <Icon glyph={onGlyph} size="sm" />
                </span>
                <span className="musy-switch__glyph" data-state={checked ? 'hidden' : 'shown'}>
                  <Icon glyph={offGlyph} size="sm" />
                </span>
              </>
            )}
          </BaseSwitch.Thumb>
        </BaseSwitch.Root>
        <label htmlFor={switchId} className={labelHidden ? 'musy-sr-only' : 'musy-switch__label'}>
          {label}
        </label>
      </div>
    );
  }
);
