/**
 * Field — Layer 2 · §7.16
 * APG: no pattern of its own — a field is a label/control/help/error assembly,
 * and the pattern lives in the native control it wraps. base-ui's `Field` owns
 * the validity data-attributes (`data-valid` / `data-invalid` / `data-touched`
 * / `data-dirty` / `data-filled` / `data-disabled`) that the stylesheet
 * targets.
 *
 * ── IT DOES NOT OWN THE ACCESSIBLE NAME. WE DO, EXPLICITLY ────────────────
 * This docblock used to say base-ui owned "the label↔control association and
 * `aria-describedby` wiring for description AND error", which is what its
 * documentation promises and what the part names imply. MEASURED against a
 * running browser on 2026-09-21, base-ui 1.7 rendered this:
 *
 *   <label id="base-ui-_r_19_">Card code</label>
 *   <input id="base-ui-_r_1a_" placeholder="MC-01">
 *   <p    id="base-ui-_r_1b_">The code is printed beside the QR code…</p>
 *
 * Every part has an id and NOTHING REFERENCES ANYTHING. No `for`, no
 * `aria-labelledby`, no `aria-describedby`. So the accessible name fell
 * through to the PLACEHOLDER — a screen reader announced the example, "MC-01",
 * in place of the label — and the description was not announced at all.
 *
 * This is the same shape of defect as the `value` one recorded below: a
 * base-ui 1.7 part that accepts the intent, renders something plausible, and
 * silently does not do the thing. So the association is written out here by
 * hand and not delegated. Explicit `htmlFor`, explicit control `id`, explicit
 * `aria-describedby` — three attributes that cannot silently stop working,
 * because they are the mechanism rather than a request for one.
 *
 * FOUND BY THE END-TO-END WALK, and only by it: `tsc` cannot see an accessible
 * name, no unit test rendered a DOM, and on screen the field looks perfect.
 * What failed was `getByRole('textbox', { name: 'Card code' })`, which is the
 * assistive-technology view of the same screen.
 *
 * One component, two controls. `multiline` swaps <input> for <textarea> via the
 * same Field.Control part — it is the same field with a different measure, not
 * a second component. A native control is REQUIRED here: base-ui renders it and
 * the stylesheet dresses the part base-ui rendered. Nothing is re-implemented.
 *
 * DOM ORDER IS LOAD-BEARING: label → control → error → valid → description.
 * A message that just appeared sits next to the control that caused it, rather
 * than below a hint the user already read.
 *
 * VALIDITY IS NEVER PAINTED BEFORE IT IS EARNED. The success border and the
 * success line are gated on `data-touched`, so an untouched empty field is
 * neutral rather than green, and the validity properties carry no transition —
 * VALUE GOES THROUGH Field.Control, NOT Field.Root. base-ui 1.7's Field.Root
 * accepts neither `value`, `defaultValue` nor `onValueChange` — they land on a
 * <div> and are silently ignored, so a pre-filled or controlled field rendered
 * EMPTY. It type-errors under a strict tsc, which is how it was found. The
 * control is the thing that holds a value; drive it there.
 */
import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { CircleX, Check } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';

export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'search' | 'password';

export interface FieldProps {
  /** Visible label. Required — a placeholder is not a label (3.3.2). */
  label: string;
  name?: string;
  /** Swaps the control for a <textarea>. Same part, one modifier. */
  multiline?: boolean;
  type?: FieldType;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Persistent help. Announced through base-ui's aria-describedby wiring. */
  description?: string;
  /** Error text. Presence puts the field in the invalid state. */
  error?: string;
  /** Success line. Only ever shown once the field has been touched. */
  validMessage?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  /** Screen-reader status word before the error text (1.4.1, matches Message).
   *  Defaults to the locale catalogue's error word. */
  errorWord?: string;
  className?: string;
  id?: string;
}

export function Field({
  label, name, multiline = false, type = 'text',
  value, defaultValue, onValueChange, placeholder,
  description, error, validMessage,
  required = false, disabled = false, readOnly = false, rows,
  errorWord, className, id,
}: FieldProps) {
  const t = useMusyText();
  const invalid = Boolean(error);

  /* The ids the wiring above is written against. Derived from one `useId` so
     they are stable across renders and unique across however many fields share
     a screen — the reflect step and the scan step are one component twice. */
  const fieldId = React.useId();
  const controlId = `${fieldId}-control`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  /* ERROR FIRST, THEN DESCRIPTION — the same order they sit in the DOM, and
     the order matters: `aria-describedby` is announced in the order given, so
     a message that has just appeared is read before the hint the person
     already read. Undefined rather than an empty string when there is
     neither, because `aria-describedby=""` is a dangling reference. */
  const describedBy =
    [invalid ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <BaseField.Root
      name={name}
      disabled={disabled}
      invalid={invalid}
      className={['musy-field', className ?? ''].filter(Boolean).join(' ')}
      id={id}
    >
      {/* `htmlFor`, natively. Not `aria-labelledby`: a real `for`/`id` pair
          also makes the label CLICKABLE to focus the control, which is a
          pointer affordance people expect and which an aria reference does not
          provide. */}
      <BaseField.Label className="musy-field__label" htmlFor={controlId}>
        {label}
        {/* Decorative: the real signal is the control's own `required`, which
            base-ui reflects to assistive tech. */}
        {required && <span className="musy-field__required" aria-hidden="true">*</span>}
      </BaseField.Label>

      <BaseField.Control
        className={[
          'musy-field__control',
          multiline ? 'musy-field__control--textarea' : '',
        ].filter(Boolean).join(' ')}
        render={multiline ? <textarea rows={rows} /> : <input type={type} />}
        id={controlId}
        aria-describedby={describedBy}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
      />

      {error && (
        <div className="musy-field__error" role="alert" id={errorId}>
          <Icon glyph={CircleX} size="sm" />
          <span><span className="musy-sr-only">{errorWord ?? t.statusError}: </span>{error}</span>
        </div>
      )}

      {validMessage && !invalid && (
        <BaseField.Validity>
          {(validity) =>
            validity.value !== '' && validity.validity.valid ? (
              <div className="musy-field__valid">
                <Icon glyph={Check} size="sm" />
                <span>{validMessage}</span>
              </div>
            ) : null
          }
        </BaseField.Validity>
      )}

      {description && (
        <BaseField.Description className="musy-field__description" id={descriptionId}>
          {description}
        </BaseField.Description>
      )}
    </BaseField.Root>
  );
}

export interface FieldItemProps {
  /** The control that sits BESIDE the label — a Switch, checkbox or radio. */
  control: React.ReactNode;
  label: string;
  /** Must match the control's own id, so the label targets the real element. */
  htmlFor: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** Field.Item — a control beside its label, description under both. The 44px
 *  target is the ROW, not the control, which is what makes it one-handed. */
export function FieldItem({
  control, label, htmlFor, description, disabled = false, className,
}: FieldItemProps) {
  return (
    <div className={['musy-field__item', className ?? ''].filter(Boolean).join(' ')}>
      {control}
      <label
        className="musy-field__label"
        htmlFor={htmlFor}
        data-disabled={disabled ? '' : undefined}
      >
        {label}
      </label>
      {description && (
        <p className="musy-field__description" data-disabled={disabled ? '' : undefined}>
          {description}
        </p>
      )}
    </div>
  );
}

export interface FieldGroupProps {
  /** Renders a <legend>. Omit only when the group has a heading beside it. */
  legend?: string;
  children: React.ReactNode;
  className?: string;
}

/** A run of fields. The gap between two fields is the STACK gap, never the
 *  related gap — a label must never read as belonging to the field above it. */
export function FieldGroup({ legend, children, className }: FieldGroupProps) {
  return (
    <fieldset className={['musy-field-group', className ?? ''].filter(Boolean).join(' ')}>
      {legend && <legend className="musy-sr-only">{legend}</legend>}
      {children}
    </fieldset>
  );
}
