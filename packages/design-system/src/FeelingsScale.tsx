/**
 * Feelings Scale — Layer 2
 * One question about how somebody feels, answered on an ORDERED set of points.
 *
 * ── WHY THIS IS NOT A SEGMENTED CONTROL ───────────────────────────────────
 * §15 is specified for "two to four options, each with an icon AND text, all
 * visible at once", which describes this component's anatomy exactly — and
 * describes nothing about what it MEANS. The two differ in the only place that
 * matters:
 *
 *   A segmented control SWITCHES something. Its options are alternatives, they
 *   have no order, and reordering them changes nothing. Stack and List could
 *   trade places tomorrow.
 *
 *   A scale MEASURES something. Its points are ordered, the order is the
 *   information, and reordering them is a different question. Worse–Same–Better
 *   read in any other sequence is not the same instrument.
 *
 * That is why the selected point here is not "the segment that is lit" but a
 * position on an axis, why the axis is drawn, and why `points` is documented
 * as ordered rather than as a set. Ben's ruling, 2026-10-09: "This is always a
 * scale, the segmented control is not. Very different semantics."
 *
 * ── IT IS A RADIO GROUP, LIKE ITS SIBLINGS ────────────────────────────────
 * base-ui `Fieldset` + `RadioGroup`, the same construction §7.7, §13 and §15
 * all use: one answer, arrow keys between points, the legend naming the
 * question. The ordering is carried by the DOM order, which is also what a
 * screen reader walks — so the axis is decoration over a sequence that is
 * already true, not a picture standing in for one.
 *
 * ── NO DEFAULT COPY, DELIBERATELY ─────────────────────────────────────────
 * Every word is the consumer's: the legend, and each point's label. The
 * siblings carry an `emptyLabel` that falls back to the German catalogue, and
 * that fallback is exactly the leak CLAUDE.md rule 7 warns about. A scale with
 * no points is a programming error rather than an empty state, so it warns in
 * development and renders the fieldset without a track.
 */
import * as React from 'react';
import { Fieldset } from '@base-ui/react/fieldset';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import type { RadioAccent } from './RadioGroupText';

/**
 * One point on the scale.
 *
 * `glyph` is required for the same reason §15 requires it: the label may wrap
 * or clip at a narrow width, and the glyph never does. On a scale it carries a
 * second job — it is what makes the DIRECTION readable before the words are.
 */
export interface FeelingsScalePoint {
  value: string;
  label: string;
  glyph: LucideIcon;
  disabled?: boolean;
}

export interface FeelingsScaleProps {
  name: string;
  /** The question. A scale with no question is a row of buttons. */
  legend: string;
  legendHidden?: boolean;
  /**
   * The points, **in order**, lowest first. Three to five: two is a choice and
   * belongs in a segmented control or a switch, and past five the labels stop
   * fitting side by side and the instrument wants a different shape.
   */
  points: FeelingsScalePoint[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** The shared radio accent union — `primary` unless the screen says otherwise. */
  accent?: RadioAccent;
  disabled?: boolean;
  className?: string;
}

export function FeelingsScale({
  name, legend, legendHidden = false, points, value, onValueChange,
  accent = 'primary', disabled = false, className,
}: FeelingsScaleProps) {
  if (process.env.NODE_ENV !== 'production' && (points.length < 3 || points.length > 5)) {
    console.warn(
      `FeelingsScale "${name}": ${points.length} points. This component is specified for 3–5; ` +
      'two options is a choice, not a scale — use SegmentedControl or Switch.'
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
        'musy-scale',
        accent !== 'primary' ? `musy-scale--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      <Fieldset.Legend className={legendHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}>
        {legend}
      </Fieldset.Legend>

      {/* THE AXIS IS DRAWN BY THE TRACK, not by an element of its own: a line
          between the points is not a thing anybody can select, and a real node
          would land in the tab order or need hiding from it. `aria-hidden` on
          a decorative <span> would work too and would be one more node to keep
          empty — see the `::before` in §25. */}
      {points.length > 0 && (
        <div className="musy-scale__track">
          {points.map((point) => (
            <Radio.Root
              key={point.value}
              value={point.value}
              disabled={point.disabled}
              nativeButton
              render={<button type="button" />}
              className="musy-scale__point"
            >
              <span className="musy-scale__mark">
                <Icon glyph={point.glyph} size="md" />
              </span>
              <span className="musy-scale__label">{point.label}</span>
            </Radio.Root>
          ))}
        </div>
      )}
    </Fieldset.Root>
  );
}
