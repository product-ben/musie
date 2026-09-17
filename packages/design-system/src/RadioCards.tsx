/**
 * Radio Cards — Layer 2
 * base-ui: RadioGroup + Radio + Fieldset — the same primitives and the same
 * selection semantics as 7.7, composed over Content Box's anatomy.
 *
 * A THIRD radio component, not a variant of RadioGroupImage, because the
 * content differs in kind: these cards carry a description, so they are read
 * rather than scanned, and that inverts the responsive rule. RadioGroupImage
 * goes 2 / 3 / 4 columns — a short label survives two-up at 393px. A card with
 * a headline, two lines of German body and a meta label does not, so this one
 * is a LIST while narrow (media beside the text), two-up then three-up as it
 * widens. Collapsing the two components would force one of those two
 * column tables to lose.
 *
 * The whole card is the control. There is no nested link or button: a radio
 * with an interactive child is a 4.1.2 failure waiting to happen, and the
 * "learn more" affordance belongs outside the group.
 *
 * CARD FLOOR — 196px (--musy-card-min, the same constant RadioGroupImage
 * uses), capped at three columns. Below 196px a Badge row wraps one-per-line
 * and the anatomy stops reading as a card, so the grid drops a column instead.
 * Token gap G4.
 *
 * CONTAINER, NOT VIEWPORT — the group is an inline-size container: the column
 * count is an auto-fit cap-plus-floor rule, and the card's own list-to-stacked
 * switch is an @container query at --bp-md of GROUP width. Both halves have to
 * agree, or a narrow panel gets a correct one-up grid holding cards laid out
 * for a desktop three-up. This component sits in the MVP's sidebar column,
 * where that is not hypothetical.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check } from 'lucide-react';
import { Icon } from './Icon';
import { Message } from './Message';
import type { TypeStep } from './ContentBox';
import type { RadioAccent } from './RadioGroupText';

export interface RadioCardOptionRich {
  value: string;
  /** The card's name. Rendered as a real heading, so the group reads as a list
   *  of titled things rather than a wall of prose. */
  headline: string;
  /** One or two lines. Longer than that and this is a Content Box with its own
   *  screen, not an option in a chooser. */
  description: string;
  /**
   * The meta label — duration, level, count. Last in the reading order and
   * de-emphasised: it QUALIFIES the card, it does not name it. Optional,
   * because a card with nothing to qualify should not carry an empty line.
   */
  label?: string;
  image: string;
  /**
   * Alt text, authored PER ITEM — same rule as 7.7. These images are how a
   * pre-literate or low-literacy user tells the options apart, so `alt=""` is
   * not reachable through this API.
   */
  imageAlt: string;
  disabled?: boolean;
}

export interface RadioCardsProps {
  name: string;
  legend: string;
  hint?: string;
  options: RadioCardOptionRich[];
  value?: string;
  onValueChange?: (value: string) => void;
  accent?: RadioAccent;
  /** Heading level for the card headlines — never guessed (1.3.1). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  headlineStep?: TypeStep;
  descriptionStep?: TypeStep;
  disabled?: boolean;
  error?: string;
  emptyLabel?: string;
  className?: string;
}

export function RadioCards({
  name, legend, hint, options, value, onValueChange, accent = 'primary',
  headingLevel = 3, headlineStep = 'heading-sm', descriptionStep = 'body-md',
  disabled = false, error, emptyLabel = 'Keine Optionen verfügbar', className,
}: RadioCardsProps) {
  const hintId = React.useId();
  const errorId = React.useId();
  const H = `h${headingLevel}` as 'h3';

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
        'musy-rcard-group',
        accent !== 'primary' ? `musy-rcard-group--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}>
        {options.length === 0 ? (
          <p className="musy-rcard-group__empty musy-radio-group__hint">{emptyLabel}</p>
        ) : options.map((opt) => (
          <Radio.Root
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            nativeButton
            render={<button type="button" />}
            className="musy-rcard__body"
            aria-invalid={error ? true : undefined}
          >
            <span className="musy-rcard__media">
              <img src={opt.image} alt={opt.imageAlt} />
              <span className="musy-rcard__check" aria-hidden="true">
                <Radio.Indicator keepMounted render={<span />}>
                  <Icon glyph={Check} size="sm" />
                </Radio.Indicator>
              </span>
            </span>
            <span className="musy-rcard__text">
              <H className="musy-rcard__headline" data-type-step={headlineStep}>{opt.headline}</H>
              <p className="musy-rcard__desc" data-type-step={descriptionStep}>{opt.description}</p>
              {opt.label && <span className="musy-rcard__label">{opt.label}</span>}
            </span>
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
