/**
 * Radio Group — image and text — Layer 2
 * base-ui: RadioGroup + Radio + Fieldset. Same primitives and the same
 * selection semantics as RadioGroupText.
 *
 * DELIBERATELY a separate component (brief §9): \`imageAlt\` is required per
 * item in the type, and the
 * label is NEVER clamped — three behaviours the text-only group does not have.
 * Collapsing them into one component with an optional image prop would force
 * one of the two truncation policies to lose.
 *
 * Image ratio: 1 / 1, read from the Figma card (152px wide, 150px media).
 *
 * CARD FLOOR — 196px (--musy-card-min, shared with RadioCards). The column
 * count yields before the card does, and it answers to the CONTAINER, not the
 * viewport: one auto-fit rule caps the grid at four columns and floors the
 * track at 196px, so the count is correct inside a theme panel or a sidebar,
 * where a media query would resolve the desktop grid and overflow. Token gap G4.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check } from 'lucide-react';
import { Icon } from './Icon';
import { Message } from './Message';
import type { RadioAccent } from './RadioGroupText';

export interface RadioCardOption {
  value: string;
  label: string;
  /** Source for the media slot. */
  image: string;
  /**
   * Alt text, authored PER ITEM. These images carry meaning — they are how a
   * pre-literate or low-literacy user tells the options apart — so alt="" is
   * not reachable through this API.
   */
  imageAlt: string;
  disabled?: boolean;
}

export interface RadioGroupImageProps {
  name: string;
  legend: string;
  hint?: string;
  options: RadioCardOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  accent?: RadioAccent;
  disabled?: boolean;
  error?: string;
  emptyLabel?: string;
  className?: string;
}

export function RadioGroupImage({
  name, legend, hint, options, value, onValueChange,
  accent = 'primary', disabled = false, error,
  emptyLabel = 'Keine Optionen verfügbar', className,
}: RadioGroupImageProps) {
  const hintId = React.useId();
  const errorId = React.useId();

  return (
    <Fieldset.Root
      render={
        <RadioGroup
          name={name}
          value={value}
          onValueChange={(v) => onValueChange?.(String(v))}
          disabled={disabled}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
        />
      }
      className="musy-radio-group"
      data-invalid={error ? '' : undefined}
    >
      <Fieldset.Legend className="musy-radio-group__legend">{legend}</Fieldset.Legend>
      {hint && <p id={hintId} className="musy-radio-group__hint">{hint}</p>}

      <div className={[
        'musy-radio-card-group',
        accent !== 'primary' ? `musy-radio-card-group--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}>
        {options.length === 0 ? (
          <p className="musy-radio-card-group__empty musy-radio-group__hint">{emptyLabel}</p>
        ) : options.map((opt) => (
          <Radio.Root
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            nativeButton
            render={<button type="button" />}
            className="musy-radio-card__body"
            aria-invalid={error ? true : undefined}
          >
            <span className="musy-radio-card__media">
              <img src={opt.image} alt={opt.imageAlt} />
              <span className="musy-radio-card__check" aria-hidden="true">
                <Radio.Indicator keepMounted render={<span />}>
                  <Icon glyph={Check} size="sm" />
                </Radio.Indicator>
              </span>
            </span>
            <span className="musy-radio-card__label">{opt.label}</span>
          </Radio.Root>
        ))}
      </div>

      {error && (
        <div className="musy-radio-group__error">
          <Message id={errorId} variant="error" headline={error} live="assertive" />
        </div>
      )}
    </Fieldset.Root>
  );
}
