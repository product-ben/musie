/**
 * Radio Group — text only — Layer 2
 * base-ui: RadioGroup + Radio + Fieldset
 *   (`@base-ui/react/radio-group`, `/radio`, `/fieldset`).
 * APG pattern: Radio Group (https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
 *
 * Radio.Root IS the row: it is the focusable element and it carries
 * [data-checked] / [data-unchecked] / [data-disabled], so the whole 56px row is
 * the target with no hidden-input trickery. Roving arrow-key focus and the
 * single-tab-stop behaviour come from RadioGroup.
 *
 * Fieldset.Root renders AS the RadioGroup (base-ui's documented composition),
 * so the group gets a real <legend> without a second wrapper element.
 *
 * Selection is carried by THREE cues — tinted fill, a step from
 * --border-width-regular to --border-width-thick, and a check glyph in the
 * marker. Strip the hue and the state is still readable (1.4.1).
 *
 * Truncation: the label clamps at 2 lines. The component MEASURES whether the
 * clamp actually cut anything and, if it did, drops the clamp for that option
 * rather than hiding meaning-bearing text. There is no ellipsis-only path.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check } from 'lucide-react';
import { Icon } from './Icon';
import { Message } from './Message';

export type RadioAccent = 'primary' | 'accent-placeholder1' | 'accent-placeholder2';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupTextProps {
  /** Identifies the field when a form is submitted. */
  name: string;
  legend: string;
  /** Optional supporting sentence under the legend. */
  hint?: string;
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  accent?: RadioAccent;
  /** Raise each row to --target-guided. */
  guided?: boolean;
  disabled?: boolean;
  /** Validation message. Renders a Message in error variant below the group
   *  and marks every row's boundary, so the error is not colour-only. */
  error?: string;
  /** Empty state, shown instead of the rows when options is empty. */
  emptyLabel?: string;
  className?: string;
}

export function RadioGroupText({
  name, legend, hint, options, value, onValueChange,
  accent = 'primary', guided = false, disabled = false,
  error, emptyLabel = 'Keine Optionen verfügbar', className,
}: RadioGroupTextProps) {
  const hintId = React.useId();
  const errorId = React.useId();

  /* Overflow measurement — see the truncation note above. */
  const labelRefs = React.useRef<Record<string, HTMLSpanElement | null>>({});
  const [unclamped, setUnclamped] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const [key, el] of Object.entries(labelRefs.current)) {
      if (el && el.scrollHeight > el.clientHeight + 1) next[key] = true;
    }
    setUnclamped(next);
  }, [options, value]);

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
      className={[
        'musy-radio-group',
        accent !== 'primary' ? `musy-radio-group--${accent}` : '',
        guided ? 'musy-radio-group--guided' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-invalid={error ? '' : undefined}
    >
      <Fieldset.Legend className="musy-radio-group__legend">{legend}</Fieldset.Legend>
      {hint && <p id={hintId} className="musy-radio-group__hint">{hint}</p>}

      {options.length === 0 ? (
        <p className="musy-radio-group__hint">{emptyLabel}</p>
      ) : options.map((opt) => (
        <Radio.Root
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          nativeButton
          render={<button type="button" />}
          className={['musy-radio__body', unclamped[opt.value] ? 'musy-radio__body--no-clamp' : '']
            .filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
        >
          <span className="musy-radio__marker" aria-hidden="true">
            {/* keepMounted: the check must be in the DOM at all times or the
                marker resizes on selection. */}
            <Radio.Indicator keepMounted render={<span />}>
              <Icon glyph={Check} size="sm" />
            </Radio.Indicator>
          </span>
          <span
            className="musy-radio__label"
            ref={(el) => { labelRefs.current[opt.value] = el; }}
          >{opt.label}</span>
        </Radio.Root>
      ))}

      {error && (
        <div className="musy-radio-group__error">
          <Message id={errorId} variant="error" headline={error} live="assertive" />
        </div>
      )}
    </Fieldset.Root>
  );
}
