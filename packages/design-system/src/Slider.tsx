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
 *   · the values under the track are set like an unchosen segment's word —
 *     label-md.
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
 * ── THE VALUE STANDS UNDER THE THUMB ──────────────────────────────────────
 * Ben, 2026-11-26, the same day: the current value moved out of the label row
 * into the row under the track, on the min's and max's line, and it FOLLOWS
 * THE THUMB rather than standing still between them. At rest it is a bare
 * figure like the two ends; while the slider is being moved it sits in a
 * sunken pill, so the figure that is changing is the one that looks
 * different. "Being moved" is a drag, and keyboard focus on the thumb — the
 * arrow keys move it in single presses, with no drag to mark.
 *
 * It is placed by the same arithmetic base-ui places an edge-aligned thumb
 * with — half a thumb in, plus the travel times the fraction — so the CSS
 * puts it under the thumb's centre at every width with no measuring. What
 * does need measuring is the one thing CSS cannot know: whether it now
 * covers an end value. That end fades out while it does; at the minimum the
 * two are the same figure in the same place, and only one is seen.
 *
 * ── EVERY STRING ON SCREEN IS THE CALLER'S ────────────────────────────────
 * The current value and both ends are the value as `formatValue` writes it,
 * and there is no default: a duration is `1:30`, a count is `3`, and guessing
 * between them would be the system choosing copy (rule 7 of the repo). What a
 * screen reader hears is `valueText`, which falls back to the same string —
 * pass it whenever the drawn form reads badly aloud. `1:30` is announced as a
 * time of day; „1 Minute 30 Sekunden“ is not.
 *
 * The current value is base-ui's <output>, which keeps `aria-live="off"`: the
 * thumb already announces its value as it moves, and a live region would say
 * every step of a drag a second time.
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
   * legend; `label-md` as one field among several in a form.
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
  /** Uncontrolled starting value. `min` when neither is given. */
  defaultValue?: number;
  /** Fires on every change — each step of a drag. */
  onValueChange?: (value: number) => void;
  /**
   * Fires once a change is settled — the drag released, the key pressed.
   * Where a change costs something (a write, a request), listen here.
   */
  onValueCommitted?: (value: number) => void;
  /**
   * How a value is DRAWN: the current value under the thumb, and both ends.
   * Required — a duration and a count are written differently, and the
   * system does not guess.
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

/** Do two boxes share any horizontal extent? Direction-blind, so RTL holds. */
const overlapsInline = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left;

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider({
    label, labelHidden = false, labelStep = 'label-lg', min, max, step = 1, largeStep,
    value, defaultValue, onValueChange, onValueCommitted, formatValue, valueText,
    minLabel, maxLabel, accent = 'primary', disabled = false, name, className,
  }, ref) {
    if (process.env.NODE_ENV !== 'production' && !(max > min)) {
      console.warn(`Slider "${label}": max (${max}) must be greater than min (${min}).`);
    }

    /* WHERE THE VALUE STANDS follows the value, and the value is `value` when
       the slider is controlled. Uncontrolled, base-ui holds its own and this
       mirrors it from `onValueChange` — the one piece of state here, the same
       bargain SegmentedControl makes for its description. */
    const [ownValue, setOwnValue] = React.useState(defaultValue ?? min);
    const current = value ?? ownValue;
    const fraction = max > min ? Math.min(1, Math.max(0, (current - min) / (max - min))) : 0;

    /* WHICH END IS COVERED. The only measurement in the component: the CSS
       already places the current value, but how wide three formatted strings
       come out is the font's business. Re-measured when the value moves and
       when the row is resized. */
    const scaleRef = React.useRef<HTMLDivElement>(null);
    const minRef = React.useRef<HTMLSpanElement>(null);
    const maxRef = React.useRef<HTMLSpanElement>(null);
    const currentRef = React.useRef<HTMLOutputElement>(null);
    const [covered, setCovered] = React.useState({ min: false, max: false });

    const minText = formatValue(min);
    const maxText = formatValue(max);
    const currentText = formatValue(current);

    React.useLayoutEffect(() => {
      const scale = scaleRef.current;
      const measure = () => {
        const cur = currentRef.current?.getBoundingClientRect();
        const lo = minRef.current?.getBoundingClientRect();
        const hi = maxRef.current?.getBoundingClientRect();
        if (!cur || !lo || !hi) return;
        const next = { min: overlapsInline(cur, lo), max: overlapsInline(cur, hi) };
        setCovered((prev) => (prev.min === next.min && prev.max === next.max ? prev : next));
      };
      measure();
      if (!scale || typeof ResizeObserver !== 'function') return undefined;
      const observer = new ResizeObserver(measure);
      observer.observe(scale);
      return () => observer.disconnect();
    }, [fraction, minText, maxText, currentText, minLabel, maxLabel]);

    return (
      <BaseSlider.Root
        ref={ref}
        min={min}
        max={max}
        step={step}
        largeStep={largeStep}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setOwnValue(next);
          onValueChange?.(next);
        }}
        onValueCommitted={(next) => onValueCommitted?.(next)}
        disabled={disabled}
        name={name}
        thumbAlignment="edge"
        className={[
          'musy-slider',
          accent !== 'primary' ? `musy-slider--${accent}` : '',
          className ?? '',
        ].filter(Boolean).join(' ')}
        style={{ '--musy-slider-fraction': fraction } as React.CSSProperties}
      >
        {/* THE SEGMENTED CONTROL'S LEGEND, BY CLASS. Not a copy of its
            declarations: `.musy-radio-group__legend` plus the step is what
            draws that legend — its gap to the track included — so drawing
            this label with it is the only way the two cannot drift apart. It
            is a <div> named by base-ui, not a <legend>: there is no fieldset
            around one value. */}
        <BaseSlider.Label
          className={labelHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}
          data-type-step={labelHidden ? undefined : labelStep}
        >
          {label}
        </BaseSlider.Label>

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

        {/* THE VALUES. In the reading order after the control, and not hidden:
            `aria-valuemin`/`max` carry raw numbers no screen reader turns into
            "1:30", so these are the only place the range is said in words. A
            covered end fades rather than leaving the tree — it is still true.
            The scale inside is the lane's width exactly, so a fraction of it
            is a fraction of the thumb's travel. */}
        <div className="musy-slider__values" data-type-step="label-md">
          <div className="musy-slider__scale" ref={scaleRef}>
            <span ref={minRef} className="musy-slider__end" data-covered={covered.min ? '' : undefined}>
              {minLabel && <span className="musy-slider__end-word">{minLabel} </span>}
              {minText}
            </span>
            <span ref={maxRef} className="musy-slider__end" data-covered={covered.max ? '' : undefined}>
              {maxLabel && <span className="musy-slider__end-word">{maxLabel} </span>}
              {maxText}
            </span>
            <BaseSlider.Value ref={currentRef} className="musy-slider__current">
              {() => currentText}
            </BaseSlider.Value>
          </div>
        </div>
      </BaseSlider.Root>
    );
  }
);
