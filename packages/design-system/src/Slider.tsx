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
 * ── IT MOVES FREELY AND SETTLES ON A STEP ─────────────────────────────────
 * Ben, 2026-11-26: „stufenlos bewegen, aber immer in 30-Sekunden-Schritten
 * einrasten“. The thumb follows the finger without steps; on release it
 * glides onto the nearest step. `step` is therefore not base-ui's step: the
 * base-ui slider runs on a fine one (a thousandth of the range, below a pixel
 * at any width this will meet) and THIS component owns the steps —
 *
 *   · the VALUE is always on a step. `onValueChange` reports the step the
 *     thumb would settle on, and only when that changes; `onValueCommitted`
 *     the step it settled on. The raw position never leaves the component;
 *   · the FIGURE under the thumb shows that step during the drag too — what
 *     you will get, not where your finger happens to be;
 *   · the KEYS move from step to step. base-ui's own handler would move by
 *     the fine step, so a capture handler on the root takes the keys first
 *     and marks them handled (base-ui skips an event already
 *     `defaultPrevented`);
 *   · `max` is a step of its own when the range is not a multiple: 1:30 to
 *     8:12 in 30s steps ends …7:30, 8:00, 8:12, and the arrow keys walk
 *     exactly that.
 *
 * The glide is a CSS transition, switched off while the thumb is held and
 * switched on only once the person has moved it — base-ui places an
 * edge-aligned thumb after measuring it, and with the transition on from the
 * first render every slider would slide in from the start on mount.
 *
 * ── THE VALUE STANDS UNDER THE THUMB ──────────────────────────────────────
 * Ben, 2026-11-26, the same day: the current value moved out of the label row
 * into the row under the track, on the min's and max's line, and it FOLLOWS
 * THE THUMB rather than standing still between them. At rest it is a bare
 * figure like the two ends; while the slider is being moved it sits in a
 * sunken pill, so the figure that is changing is the one that looks
 * different. "Being moved" is the thumb held — from the press to the release
 * — and keyboard focus on the thumb: the arrow keys move it in single
 * presses, with nothing held to mark.
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
   * The steps a value settles on, counted from `min`. The thumb moves freely
   * while it is held and glides onto the nearest step when let go; an arrow
   * key moves one step. `max` is a step of its own when `max − min` is not a
   * multiple. `1` by default.
   */
  step?: number;
  /**
   * What Page Up / Page Down and Shift + arrow move by, in the value's units
   * — rounded to whole steps, and never less than one. Four steps by default.
   */
  largeStep?: number;
  /** Controlled value. Drawn on the nearest step if it is not on one. */
  value?: number;
  /** Uncontrolled starting value. `min` when neither is given. */
  defaultValue?: number;
  /**
   * Fires with the step the value would settle on, each time that step
   * changes — during a drag as well as on a key.
   */
  onValueChange?: (value: number) => void;
  /**
   * Fires with the step the value settled on — the thumb let go, the key
   * pressed. Where a change costs something (a write, a request), listen here.
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

/**
 * The steps, as indices: `min` is step 0, each `step` above it the next, and
 * `max` the last — its own step when the range is not a multiple, so the
 * steps of 1:30…8:12 by 30 s end 7:30, 8:00, 8:12. Index arithmetic rather
 * than a list, so a fine `step` over a wide range costs nothing.
 */
function stepGrid(min: number, max: number, step: number) {
  const span = Math.max(0, max - min);
  const size = step > 0 ? step : span || 1;
  /* The highest index ON the grid; the epsilon forgives float noise in
     `span / size` that would otherwise drop the last whole step. */
  const lastWhole = Math.floor(span / size + 1e-9);
  const maxIsOwn = span - lastWhole * size > 1e-9;
  const last = lastWhole + (maxIsOwn ? 1 : 0);
  const at = (i: number) => (i >= last ? max : min + i * size);
  /** The step nearest to `v`. */
  const nearest = (v: number) => {
    const c = Math.min(max, Math.max(min, v));
    const k = Math.min(lastWhole, Math.max(0, Math.round((c - min) / size)));
    if (maxIsOwn && Math.abs(max - c) < Math.abs(at(k) - c)) return last;
    return k;
  };
  return { size, last, at, nearest };
}

/** Do two spans share any horizontal extent? Direction-blind, so RTL holds. */
const overlapsInline = (a: { left: number; right: number }, b: { left: number; right: number }) =>
  a.left < b.right && a.right > b.left;

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider({
    label, labelHidden = false, labelStep = 'label-lg', min, max, step = 1, largeStep,
    value, defaultValue, onValueChange, onValueCommitted, formatValue, valueText,
    minLabel, maxLabel, accent = 'primary', disabled = false, name, className,
  }, ref) {
    if (process.env.NODE_ENV !== 'production' && !(max > min)) {
      console.warn(`Slider "${label}": max (${max}) must be greater than min (${min}).`);
    }

    const grid = stepGrid(min, max, step);
    const snap = (v: number) => grid.at(grid.nearest(v));
    /* base-ui's own step: a thousandth of the range — below a pixel on any
       track narrower than 1000px, which is "stufenlos" to a finger. */
    const fineStep = max > min ? (max - min) / 1000 : 1;

    /* THE SETTLED VALUE is `value` when the slider is controlled, and our own
       otherwise — always on a step. THE HELD POSITION is where the finger has
       the thumb, set only between press and release. base-ui is always
       given the held position if there is one, and the settled value if not,
       so letting go is what moves the thumb onto its step. */
    const [ownValue, setOwnValue] = React.useState(() => snap(defaultValue ?? min));
    const settled = value !== undefined ? snap(value) : ownValue;
    const [held, setHeld] = React.useState<number | null>(null);
    const position = held ?? settled;
    const shown = snap(position);
    const fraction = max > min ? Math.min(1, Math.max(0, (position - min) / (max - min))) : 0;

    /* The last step reported, so `onValueChange` fires when the step under
       the finger changes and not on every pixel of a drag. */
    const reportedRef = React.useRef(settled);
    React.useEffect(() => {
      /* A controlled value changed from outside is the new baseline. */
      if (held === null) reportedRef.current = settled;
    }, [settled, held]);
    const report = (next: number) => {
      if (next === reportedRef.current) return;
      reportedRef.current = next;
      onValueChange?.(next);
    };
    const settle = (next: number) => {
      setHeld(null);
      setOwnValue(next);
      report(next);
      onValueCommitted?.(next);
    };

    /* THE GLIDE IS ARMED BY THE FIRST TOUCH. See the header: on from the
       first render, it would slide every thumb in from the start on mount. */
    const [engaged, setEngaged] = React.useState(false);

    /* THE KEYS, step to step. Captured on the root so they arrive before
       base-ui's handler on the input, and marked handled so it stands down. */
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.defaultPrevented) return;
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'range') return;
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const pageSteps = Math.max(1, Math.round((largeStep ?? grid.size * 4) / grid.size));
      const by = event.shiftKey ? pageSteps : 1;
      const from = grid.nearest(settled);
      let to: number | null = null;
      switch (event.key) {
        case 'ArrowUp': to = from + by; break;
        case 'ArrowDown': to = from - by; break;
        case 'ArrowRight': to = from + (rtl ? -by : by); break;
        case 'ArrowLeft': to = from + (rtl ? by : -by); break;
        case 'PageUp': to = from + pageSteps; break;
        case 'PageDown': to = from - pageSteps; break;
        case 'Home': to = 0; break;
        case 'End': to = grid.last; break;
        default: return;
      }
      event.preventDefault();
      setEngaged(true);
      settle(grid.at(Math.min(grid.last, Math.max(0, to))));
    };

    /* WHICH END IS COVERED — the one measurement in the component. The CSS
       already places the current value; how wide three formatted strings come
       out is the font's business. Computed from where the figure is GOING,
       not where it is drawn: mid-glide its box is still on its way, and
       measured there an end would stay lit under the figure that has just
       settled on it. Re-measured when the value moves and on resize. */
    const scaleRef = React.useRef<HTMLDivElement>(null);
    const minRef = React.useRef<HTMLSpanElement>(null);
    const maxRef = React.useRef<HTMLSpanElement>(null);
    const currentRef = React.useRef<HTMLOutputElement>(null);
    const thumbRef = React.useRef<HTMLDivElement>(null);
    const [covered, setCovered] = React.useState({ min: false, max: false });

    const minText = formatValue(min);
    const maxText = formatValue(max);
    const shownText = formatValue(shown);

    React.useLayoutEffect(() => {
      const scale = scaleRef.current;
      const measure = () => {
        const cur = currentRef.current;
        const thumb = thumbRef.current;
        const lo = minRef.current?.getBoundingClientRect();
        const hi = maxRef.current?.getBoundingClientRect();
        if (!scale || !cur || !thumb || !lo || !hi) return;
        const box = scale.getBoundingClientRect();
        const along = thumb.offsetWidth / 2 + (box.width - thumb.offsetWidth) * fraction;
        const centre = getComputedStyle(scale).direction === 'rtl' ? box.right - along : box.left + along;
        const figure = { left: centre - cur.offsetWidth / 2, right: centre + cur.offsetWidth / 2 };
        const next = { min: overlapsInline(figure, lo), max: overlapsInline(figure, hi) };
        setCovered((prev) => (prev.min === next.min && prev.max === next.max ? prev : next));
      };
      measure();
      if (!scale || typeof ResizeObserver !== 'function') return undefined;
      const observer = new ResizeObserver(measure);
      observer.observe(scale);
      return () => observer.disconnect();
    }, [fraction, minText, maxText, shownText, minLabel, maxLabel]);

    return (
      <BaseSlider.Root
        ref={ref}
        min={min}
        max={max}
        step={fineStep}
        value={position}
        onValueChange={(next, details) => {
          /* A press or a drag holds the thumb where the finger is. Anything
             else that reaches here — a form's own input event — settles. */
          if (details.reason === 'drag' || details.reason === 'track-press') {
            setEngaged(true);
            setHeld(next);
            report(snap(next));
          } else {
            settle(snap(next));
          }
        }}
        /* base-ui commits on every release, moved or not — so a held
           position is always let go of here. */
        onValueCommitted={(next) => settle(snap(next))}
        onKeyDownCapture={onKeyDownCapture}
        disabled={disabled}
        name={name}
        thumbAlignment="edge"
        className={[
          'musy-slider',
          accent !== 'primary' ? `musy-slider--${accent}` : '',
          className ?? '',
        ].filter(Boolean).join(' ')}
        data-held={held !== null ? '' : undefined}
        data-engaged={engaged ? '' : undefined}
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
              {/* Heard as the STEP, like the figure: mid-drag the raw
                  position is not a value anybody will get. */}
              <BaseSlider.Thumb
                ref={thumbRef}
                className="musy-slider__thumb"
                getAriaValueText={(_formatted, v) => (valueText ?? formatValue)(snap(v))}
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
              {() => shownText}
            </BaseSlider.Value>
          </div>
        </div>
      </BaseSlider.Root>
    );
  }
);
