/**
 * Slider — Layer 2
 * base-ui: Slider (`@base-ui/react/slider`) — Root, Label, Value, Control,
 * Track, Indicator, Thumb.
 * APG pattern: Slider (https://www.w3.org/WAI/ARIA/apg/patterns/slider/).
 *
 * ONE value on a continuous range, chosen by dragging, pressing the track or
 * the arrow keys. Built for how long an exercise runs (Ben, 2026-11-26): in
 * user testing some people found an exercise too long and some too short, so
 * the length became something the person sets — from 1:30 up to the length of
 * the piece that plays.
 *
 * ── THE SEGMENTED CONTROL'S PRIMITIVES, NOT THE MUSIC PLAYER'S ────────────
 * Ben, 2026-11-26, choosing between a thin rail and this. The slider sits
 * under segmented controls in the session intro, so it is drawn from theirs:
 *
 *   · the LABEL is the segmented control's legend — the same class and the
 *     same `[data-type-step]`, label-lg by default and label-md as one field
 *     among several. One rule draws both, so they cannot drift;
 *   · the TRACK is `.musy-seg__track` — sunken fill, `--sp-1` of padding,
 *     `--radius-control`, and a lane inside it `--target-primary` high;
 *   · the CHOSEN PART is the chosen segment — raised fill and the
 *     primary-on-subtle ink — stretched from the start of the track to the
 *     thumb. At the minimum it is exactly one segment's square;
 *   · the end values are set like an unchosen segment's word — label-md,
 *     muted.
 *
 * The thin rail is the music player's scrubber, which seeks inside a piece;
 * this sets a quantity before anything plays. Different jobs, different
 * shapes — and a 44px lane is a target no thumb misses (2.5.8).
 *
 * ── THE THUMB SITS INSIDE THE TRACK ───────────────────────────────────────
 * `thumbAlignment="edge"`: at the minimum the thumb's leading edge meets the
 * lane's, at the maximum its trailing edge does. A centred thumb would hang
 * half outside the sunken track at both ends, and the raised part could never
 * shrink to a segment's square. The indicator runs to the thumb's CENTRE (that
 * is what base-ui gives it) and the thumb, filled the same, carries the raised
 * part the rest of the way — one shape, two elements, no seam.
 *
 * ── EVERY STRING ON SCREEN IS THE CALLER'S ────────────────────────────────
 * The readout and both ends are the value as `formatValue` writes it, and
 * there is no default: a duration is `1:30`, a count is `3`, and guessing
 * between them would be the system choosing copy (rule 7 of the repo). What a
 * screen reader hears is `valueText`, which falls back to the same string —
 * pass it whenever the drawn form reads badly aloud. `1:30` is announced as a
 * time of day; „1 Minute 30 Sekunden“ is not.
 *
 * The readout is base-ui's <output>, which keeps `aria-live="off"`: the thumb
 * already announces its value as it moves, and a live region would say every
 * step of a drag a second time.
 *
 * ── NO `size` AND NO `guided`, YET ────────────────────────────────────────
 * The segmented control has both. The `min` rung would put a drag control at
 * 24px, which §21's header argues against for the only other one in the
 * system; `guided` has no caller. Both are one rule each when one turns up.
 */
import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';

/** The steps the label may take — the segmented control's `legendStep`. */
export type SliderLabelStep = 'label-lg' | 'label-md';

export type SliderAccent = 'primary' | 'accent';

export interface SliderProps {
  /**
   * The slider's accessible name, drawn above the track. Rendered visibly
   * unless `labelHidden` — never dropped: an unnamed slider announces as a bare
   * number (1.3.1, 4.1.2).
   */
  label: string;
  /** Hide the label visually. It stays the slider's accessible name. */
  labelHidden?: boolean;
  /**
   * The label's type step. `label-lg` by default, as the segmented control's
   * legend; `label-md` as one field among several in a form. The readout
   * beside the label takes the same step.
   */
  labelStep?: SliderLabelStep;
  /** The lowest value. Drawn at the start of the track via `formatValue`. */
  min: number;
  /** The highest value. Drawn at the end of the track via `formatValue`. */
  max: number;
  /**
   * The granularity of a value: dragging snaps to multiples of it, counted
   * from `min`, and an arrow key moves by it. `1` by default. `max` stays
   * reachable when `max − min` is not a multiple — dragging to the end and
   * End both land on it.
   */
  step?: number;
  /** What Page Up / Page Down and Shift + arrow move by. base-ui's 10 by default. */
  largeStep?: number;
  /** Controlled value. */
  value?: number;
  /** Uncontrolled starting value. */
  defaultValue?: number;
  /** Fires on every change — each step of a drag. */
  onValueChange?: (value: number) => void;
  /**
   * Fires once a change is settled — the drag released, the key pressed.
   * Where a change costs something (a write, a request), listen here.
   */
  onValueCommitted?: (value: number) => void;
  /**
   * How a value is DRAWN: the readout, and both ends. Required — a duration
   * and a count are written differently, and the system does not guess.
   */
  formatValue: (value: number) => string;
  /**
   * How a value is HEARD (`aria-valuetext`). Falls back to `formatValue`.
   * Pass it when the drawn form reads badly aloud — `1:30` is announced as a
   * time of day.
   */
  valueText?: (value: number) => string;
  /**
   * A word drawn before the minimum's value at the start of the track
   * („Min.“). Optional: the value alone already labels the end.
   */
  minLabel?: string;
  /** The same, before the maximum's value at the end of the track. */
  maxLabel?: string;
  accent?: SliderAccent;
  disabled?: boolean;
  /** Identifies the value when a form is submitted. */
  name?: string;
  className?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider({
    label, labelHidden = false, labelStep = 'label-lg', min, max, step = 1, largeStep,
    value, defaultValue, onValueChange, onValueCommitted, formatValue, valueText,
    minLabel, maxLabel, accent = 'primary', disabled = false, name, className,
  }, ref) {
    if (process.env.NODE_ENV !== 'production' && !(max > min)) {
      console.warn(`Slider "${label}": max (${max}) must be greater than min (${min}).`);
    }

    return (
      <BaseSlider.Root
        ref={ref}
        min={min}
        max={max}
        step={step}
        largeStep={largeStep}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next)}
        onValueCommitted={(next) => onValueCommitted?.(next)}
        disabled={disabled}
        name={name}
        thumbAlignment="edge"
        className={[
          'musy-slider',
          accent !== 'primary' ? `musy-slider--${accent}` : '',
          className ?? '',
        ].filter(Boolean).join(' ')}
      >
        <div className="musy-slider__head">
          {/* THE SEGMENTED CONTROL'S LEGEND, BY CLASS. Not a copy of its
              declarations: `.musy-radio-group__legend` plus the step is what
              draws that legend, so drawing this label with it is the only way
              the two cannot drift apart. It is a <div> named by base-ui, not a
              <legend> — there is no fieldset around one value. */}
          <BaseSlider.Label
            className={labelHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}
            data-type-step={labelHidden ? undefined : labelStep}
          >
            {label}
          </BaseSlider.Label>
          <BaseSlider.Value className="musy-slider__value" data-type-step={labelStep}>
            {(_formatted, values) => formatValue(values[0] ?? min)}
          </BaseSlider.Value>
        </div>

        {/* The sunken track is a plain box AROUND base-ui's Control, not the
            Control itself. base-ui places an edge-aligned thumb by measuring
            the Control and positioning inside the Track; padding on the
            Control would make those two boxes differ, and the thumb would
            overshoot both ends by a fraction of the padding. */}
        <div className="musy-slider__track">
          <BaseSlider.Control className="musy-slider__control">
            <BaseSlider.Track className="musy-slider__lane">
              <BaseSlider.Indicator className="musy-slider__indicator" />
              <BaseSlider.Thumb
                className="musy-slider__thumb"
                getAriaValueText={(_formatted, v) => (valueText ?? formatValue)(v)}
              />
            </BaseSlider.Track>
          </BaseSlider.Control>
        </div>

        {/* THE ENDS. In the reading order after the control, and not hidden:
            `aria-valuemin`/`max` carry raw numbers no screen reader turns into
            "1:30", so these two are the only place the range is said in words.
            Each sits under the thumb's resting place at its end. */}
        <div className="musy-slider__ends" data-type-step="label-md">
          <span className="musy-slider__end">
            {minLabel && <span className="musy-slider__end-word">{minLabel} </span>}
            {formatValue(min)}
          </span>
          <span className="musy-slider__end">
            {maxLabel && <span className="musy-slider__end-word">{maxLabel} </span>}
            {formatValue(max)}
          </span>
        </div>
      </BaseSlider.Root>
    );
  }
);
