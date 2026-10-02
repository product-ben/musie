/**
 * Segmented Control — Layer 2
 * base-ui: RadioGroup + Radio (+ Fieldset when the group is labelled).
 * APG pattern: Radio Group (https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
 *
 * NOT Tabs. The choice here is an answer the surrounding form carries, not
 * navigation between panels; `role="tablist"` would promise a tab/panel
 * relationship that does not exist, and it would take the option out of the
 * form. Roving arrow keys and the single tab stop come from RadioGroup either
 * way, so the accessible behaviour is the same and the semantics are honest.
 *
 * Two to four options, each with an icon AND text, all visible at once. Past
 * four, segments get too narrow for a German label to survive and the right
 * component is RadioGroupText (7.6) or a Select.
 *
 * Truncation: labels ellipse at one line, per the brief. CSS truncation does
 * not touch the accessibility tree, so the full label is still announced —
 * which is why the icon is REQUIRED per option rather than optional: it is the
 * cue that survives a clipped label for a sighted user. Below ~30rem of
 * CONTAINER width the label stacks under the icon and gets the segment's full
 * width, which recovers far more characters than shrinking the type would.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import type { RadioAccent } from './RadioGroupText';

export interface SegmentedOption {
  value: string;
  /** Short. Two words is the design target — this is a segment, not a row. */
  label: string;
  /**
   * Required, not optional. The label may be clipped; the glyph never is, so
   * an icon-less segment would be the one that loses its meaning first.
   */
  glyph: LucideIcon;
  disabled?: boolean;
}

/**
 * The rung the segments stand on.
 *
 * `min` and `primary` are the system's own names for these two heights — the
 * same words `CtaButton` and `IconButton` use — so "the small one" means the
 * same thing in every component. `guided` is the third rung and keeps its own
 * boolean, because it predates this prop.
 */
export type SegmentedSize = 'min' | 'primary';

export interface SegmentedControlProps {
  name: string;
  /**
   * The group's accessible name. Rendered as a visible <legend> unless
   * `legendHidden` — never dropped: an unnamed radio group announces as a bare
   * set of options (1.3.1, 4.1.2).
   */
  legend: string;
  legendHidden?: boolean;
  /** 2–4. More than that is the wrong component — see the note above. */
  options: SegmentedOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  accent?: RadioAccent;
  /**
   * The segment height. `primary` (44px) by default; `min` is the 24px rung,
   * for a control that sits in a row of page furniture rather than in a form.
   * L5 picks between them from the POINTER, not from the viewport — see
   * useCoarsePointer — so a screen that uses `min` under a thumb is making a
   * deliberate exception, not following the rule.
   *
   * `guided` outranks this: it is the third rung and the two must not be asked
   * for at once.
   */
  size?: SegmentedSize;
  /**
   * Draw the glyphs alone and hide the labels visually.
   *
   * THE LABEL IS NOT DROPPED, it moves to `.musy-sr-only` — the text is what
   * names each radio, and without it the group announces as an unnamed set
   * (4.1.2). This is a presentation switch, never a content one.
   *
   * The track also stops stretching: an icon-only control is page furniture,
   * so it takes the width of its glyphs instead of the width on offer.
   *
   * It is only honest where the glyphs are already unambiguous. This component
   * requires a glyph per option precisely so that the icon can carry the
   * option when the label is clipped — `iconOnly` is that same bet, made all
   * the way.
   */
  iconOnly?: boolean;
  /** Raise each segment to --target-guided. */
  guided?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl({
  name, legend, legendHidden = false, options, value, onValueChange,
  accent = 'primary', size = 'primary', iconOnly = false, guided = false,
  disabled = false, className,
}: SegmentedControlProps) {
  if (process.env.NODE_ENV !== 'production' && (options.length < 2 || options.length > 4)) {
    console.warn(
      `SegmentedControl "${name}": ${options.length} options. This component is specified for 2–4; ` +
      'use RadioGroupText or a Select beyond that.'
    );
  }

  return (
    <Fieldset.Root
      render={
        <RadioGroup
          name={name}
          value={value}
          onValueChange={(v) => onValueChange?.(String(v))}
          disabled={disabled}
        />
      }
      className={[
        'musy-seg',
        accent !== 'primary' ? `musy-seg--${accent}` : '',
        size !== 'primary' ? `musy-seg--${size}` : '',
        iconOnly ? 'musy-seg--icon-only' : '',
        guided ? 'musy-seg--guided' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      <Fieldset.Legend className={legendHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}>
        {legend}
      </Fieldset.Legend>

      <div className="musy-seg__track">
        {options.map((opt) => (
          <Radio.Root
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            nativeButton
            render={<button type="button" />}
            className="musy-seg__option"
          >
            <Icon glyph={opt.glyph} size={size === 'min' ? 'sm' : 'md'} />
            {/* Visually hidden, never absent — see `iconOnly`. */}
            <span className={iconOnly ? 'musy-sr-only' : 'musy-seg__label'}>{opt.label}</span>
          </Radio.Root>
        ))}
      </div>
    </Fieldset.Root>
  );
}
