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
 *
 * ── A ROW THAT DESCENDS — `drillDown`, 2026-10-16 ─────────────────────────
 * An option can carry a trailing arrow meaning *choosing this asks the next
 * question*. It is still a radio: within the level on screen, choosing it IS
 * a choice, and the consequence happens to be that the group is replaced.
 * `DrillDown` is the component that does the replacing; this one only knows
 * how to draw the affordance.
 *
 * THE MARKER STAYS ON EVERY ROW — Ben, 2026-10-16: the arrow is *"added on
 * the right side of the box so that it's still easy for users to scan"*. One
 * list, one visual rhythm; the arrow is what differs, not the row's anatomy.
 *
 * AND IT IS NOT DECORATION. `drillDownLabel` is appended to the row's
 * accessible name, so a descending row and a terminal row are told apart
 * without sight. Rule 7: it is passed, never defaulted.
 *
 * ── ACTIVATION IS NOT CHANGE — `onOptionActivate`, 2026-10-16 ────────────
 * `onValueChange` is base-ui's, and base-ui's is a native radio `change`: a
 * row that is ALREADY checked fires nothing when it is clicked again. Read
 * in `@base-ui/react/radio/root/RadioRoot.js`, not assumed.
 *
 * That is correct for a form and wrong for a list you ACT on. The feelings
 * sheet pre-checks *einfach nur {x}* on arrival and expects a tap on it to
 * mean "yes, that one" — which under `onValueChange` alone is the one row in
 * the list that does nothing.
 *
 * So this fires on the ROW being activated: a click, and Enter or Space,
 * because `Radio.Root` renders a real `<button>`. Arrow keys move the
 * checked value and do NOT activate, which is the other half of the win —
 * a keyboard user can browse a drill-down with the arrows without each stop
 * along the way navigating them somewhere.
 *
 * Both fire on a click of an unchecked row, `onValueChange` first. A
 * consumer that wants "what the user chose" wants this one.
 *
 * THE ARROW NARROWS THE LABEL BOX, which is the one thing here that interacts
 * with the truncation above: a long German label now has less room before it
 * clamps. The measurement already covers it — the effect runs after layout
 * and `options` is in its deps — but it is why the arrow is laid out with an
 * auto margin rather than by giving the label a width.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { ArrowRight, Check } from 'lucide-react';
import { Icon } from './Icon';
import { Message } from './Message';
import { useMusyText } from './locale';

export type RadioAccent = 'primary' | 'accent';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  /**
   * This row DESCENDS: draws the trailing → and says so to a screen reader.
   * The marker is unchanged — see the header for why it stays.
   */
  drillDown?: boolean;
  /**
   * Rule 7 — what the → means, appended to this row's accessible name.
   * Required when `drillDown` is set, and warned about in development when
   * it is missing.
   *
   * DO NOT REPEAT THE LABEL in it. The row announces as
   * `${label}, ${drillDownLabel}`, so *weitere Gefühle* gives "Optimistisch,
   * weitere Gefühle" where *weiter zu Optimistisch* would say the word twice.
   */
  drillDownLabel?: string;
}

export interface RadioGroupTextProps {
  /** Identifies the field when a form is submitted. */
  name: string;
  legend: string;
  /**
   * Hide the legend visually. It stays in the accessible name — an unnamed
   * radio group announces as a bare set of options (1.3.1, 4.1.2), so this
   * never removes it.
   *
   * For the case where something ABOVE has already asked the question:
   * /exercises puts "Was möchtest du heute erreichen?" in its ContentBox
   * headline, on one row with the box's close control, and a visible legend
   * underneath would be the same question twice.
   *
   * ADDED 2026-10-08, and it is a gap being closed rather than a new idea:
   * `RadioCards` and `SegmentedControl` have carried this prop, under this
   * name and with this behaviour, since they were built. This component was
   * the only one of the three that could not do it.
   */
  legendHidden?: boolean;
  /** Optional supporting sentence under the legend. */
  hint?: string;
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /**
   * A row was ACTIVATED — clicked, or Enter/Space on it — whether or not
   * that changed the value. See the header for why this is not the same
   * event as `onValueChange`, and when you want it instead.
   */
  onOptionActivate?: (value: string) => void;
  accent?: RadioAccent;
  /** Raise each row to --target-guided. */
  guided?: boolean;
  disabled?: boolean;
  /** Validation message. Renders a Message in error variant below the group
   *  and marks every row's boundary, so the error is not colour-only. */
  error?: string;
  /** Empty state, shown instead of the rows when options is empty. Defaults
   *  to the locale catalogue's wording. */
  emptyLabel?: string;
  className?: string;
}

export function RadioGroupText({
  name, legend, legendHidden = false, hint, options, value, onValueChange,
  onOptionActivate,
  accent = 'primary', guided = false, disabled = false,
  error, emptyLabel, className,
}: RadioGroupTextProps) {
  const t = useMusyText();
  const hintId = React.useId();
  const errorId = React.useId();

  /* Rule 7's own failure mode, caught where it happens rather than in review:
     a descending row with no `drillDownLabel` is an arrow that means nothing
     to anyone who cannot see it. Same shape as FeelingsScale's point-count
     warning — development only, never thrown. */
  if (process.env.NODE_ENV !== 'production') {
    const unnamed = options.filter((o) => o.drillDown && !o.drillDownLabel);
    if (unnamed.length > 0) {
      console.warn(
        `RadioGroupText "${name}": ${unnamed.length} drillDown option(s) with no `
        + 'drillDownLabel — the → is then invisible to a screen reader. '
        + `First: "${unnamed[0].label}".`
      );
    }
  }

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
      <Fieldset.Legend className={legendHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}>
        {legend}
      </Fieldset.Legend>
      {hint && <p id={hintId} className="musy-radio-group__hint">{hint}</p>}

      {options.length === 0 ? (
        <p className="musy-radio-group__hint">{emptyLabel ?? t.optionsEmpty}</p>
      ) : options.map((opt) => (
        <Radio.Root
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          nativeButton
          render={<button type="button" />}
          /* ACTIVATION, not change — see the header. On the Root rather than
             on the inner input: the Root IS the button, so this catches the
             click and the Enter/Space that a button turns into one. */
          onClick={() => onOptionActivate?.(opt.value)}
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
          {opt.drillDown && (
            <>
              {/* The name, before the glyph: a row announces as
                  "Optimistisch, weitere Gefühle". */}
              {opt.drillDownLabel && (
                <span className="musy-sr-only">{`, ${opt.drillDownLabel}`}</span>
              )}
              <span className="musy-radio__drill" aria-hidden="true">
                <Icon glyph={ArrowRight} size="sm" />
              </span>
            </>
          )}
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
