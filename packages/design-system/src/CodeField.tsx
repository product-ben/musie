/**
 * CodeField — Layer 2
 * APG: no pattern of its own. It is a labelled group of single-character text
 * inputs, so the semantics come from `role="group"` plus the native controls
 * inside it.
 *
 * One box per digit. Used at two lengths and nowhere else so far: four for the
 * access code somebody was given, six for the sign-in code that arrives by
 * email. Nothing about the two uses differs but the number, which is why this
 * is one component with a `length` rather than two.
 *
 * ── IT IS HAND-ROLLED, AND THAT IS NOT A PREFERENCE ───────────────────────
 * base-ui 1.7 has no one-time-code pattern, so there is no part to dress here
 * the way `Field` dresses `Field.Control`. What it does have is the lesson:
 * Field's docblock records base-ui rendering a label, an input and a
 * description with ids and NOTHING REFERENCING ANYTHING, caught only by an
 * end-to-end walk. So every association below is written out by hand —
 * explicit `aria-labelledby`, explicit `aria-describedby` — because those are
 * the mechanism rather than a request for one.
 *
 * ── THE ACCESSIBLE NAME IS THE GROUP'S, NOT SIX NAMELESS BOXES ────────────
 * Each input carries `aria-label` with its own position AND the group carries
 * the real label. Without the group name a screen reader announces "edit text,
 * edit text, edit text" and the person never learns what is being asked for;
 * without the per-box position they cannot tell which one they are in.
 *
 * ── PASTE FILLS FROM THE START, WHEREVER YOU PASTED ───────────────────────
 * Ben, 2026-10-20: *"the user should be able to copy and paste the entire code
 * into it, where ever he clicks."* So a paste is not inserted at the caret —
 * it is the whole code, and it lands from box one. Pasting six digits into the
 * fourth box fills all six, because what the person meant is never "put these
 * six characters in slot four".
 *
 * THE SAME PATH CATCHES AUTOFILL. iOS and Android hand a one-time code to the
 * field as a single `input` event carrying every character at once, not as six
 * keystrokes — so a handler that assumed one character per change would take
 * the first digit and drop the rest. `length > 1` is therefore a normal case
 * here, not a guard against something weird.
 *
 * ── IT COMPLETES ITSELF ───────────────────────────────────────────────────
 * `onComplete` fires the moment the last box fills, and the code screen has no
 * button. A CTA after the final keystroke is a control whose only job is to be
 * pressed once, every time, by somebody who has already finished.
 *
 * It fires from the EDGE — the change that made the value whole — rather than
 * from an effect on `value`. An effect would re-fire on every re-render that
 * kept the value full, which is "verify this code" sent two and three times
 * for one entry.
 *
 * ── NO GAPS, EVER ─────────────────────────────────────────────────────────
 * `value` is a left-packed string, so box N holds character N and there is no
 * way to express "box four is filled and box two is not". Clicking an empty
 * box past the end redirects focus to the first empty one instead. Without
 * that, a person could click box four, type a digit, and produce a value whose
 * string position means something different from where they can see it.
 *
 * ── EVERY STRING IS PASSED (CLAUDE.md rule 7) ─────────────────────────────
 * `label` is required and there is no default for it or for any other
 * user-visible text, including the per-box position. The rule exists because
 * this package's defaults are a mix of German and English, and one leaked
 * default makes a screen half-German whatever the locale says. Nothing here
 * can leak, because nothing here has a default to leak.
 */
import * as React from 'react';

export interface CodeFieldProps {
  /** How many boxes. Four for the access code, six for the sign-in code. */
  length: number;
  /**
   * The digits entered so far, left-packed and never longer than `length`.
   * Anything that is not a digit is ignored rather than rendered.
   */
  value: string;
  /** Called with the new left-packed value on every change. */
  onValueChange: (next: string) => void;
  /**
   * Called once, on the change that filled the last box. The code screen has
   * no submit control — this is what proceeds.
   */
  onComplete?: (code: string) => void;
  /** The group's accessible name. Required; there is no default (rule 7). */
  label: string;
  /**
   * Builds each box's own accessible name from its 1-based position, so a
   * screen reader can say which box it is in. Required for the same reason
   * `label` is.
   */
  boxLabel: (position: number, total: number) => string;
  /** Help text under the boxes, announced with the group. */
  description?: string;
  /**
   * Shown and announced when set. Setting it also marks every box invalid —
   * the error belongs to the code, not to one digit of it.
   */
  errorMessage?: string;
  disabled?: boolean;
  /** Focus the first empty box on mount. */
  autoFocus?: boolean;
  id?: string;
}

/** Digits only, left-packed, never longer than `max`. */
function onlyDigits(raw: string, max: number): string {
  return (raw.match(/\d/g) ?? []).join('').slice(0, max);
}

export function CodeField({
  length,
  value,
  onValueChange,
  onComplete,
  label,
  boxLabel,
  description,
  errorMessage,
  disabled = false,
  autoFocus = false,
  id,
}: CodeFieldProps) {
  const reactId = React.useId();
  const baseId = id ?? reactId;
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;

  const boxes = React.useRef<Array<HTMLInputElement | null>>([]);

  /**
   * Which box to focus once the new value has been committed to the DOM.
   *
   * ── FOCUS CANNOT BE MOVED FROM INSIDE THE CHANGE HANDLER ──────────────
   * MEASURED in Chromium against the bench on 2026-10-20, because the first
   * version of this file did exactly that and it did not work:
   *
   *     typing "4" → focused box 0, value "4"   (never advanced)
   *     typing "7" → focused box 1, value "7"   (the 4 was overwritten)
   *
   * This is a CONTROLLED field, so the box the caret should move to is still
   * showing its old value at the moment the handler runs — the render that
   * fills it has not happened yet. Focusing it there races the commit, and
   * the keystroke after it lands in whichever box won.
   *
   * So the intent is recorded here and applied in a layout effect, after the
   * commit, where the DOM is the one the person can see. It is a ref rather
   * than state because wanting to move the caret is not a reason to render.
   */
  const pendingFocus = React.useRef<number | null>(null);

  const clamp = (index: number) => Math.max(0, Math.min(length - 1, index));

  /**
   * Focus a box and leave a CARET in it, never a selection.
   *
   * Ben, 2026-10-20: *"Also show the typing cursor inside the field."* An
   * earlier version called `select()` here so that typing would replace the
   * digit already in the box; that put a highlight where the person expected
   * a blinking cursor, and in an empty box it showed nothing at all. Typing
   * over a filled box is handled in `handleChange` instead, by reading the
   * character they just typed rather than by pre-selecting the one there.
   */
  function focusNow(index: number) {
    const target = boxes.current[clamp(index)];
    if (target === null || target === undefined) return;
    target.focus();
    const end = target.value.length;
    target.setSelectionRange(end, end);
  }

  /* No dependency array: this runs after every commit, and does nothing
     unless a handler asked for a move. */
  React.useLayoutEffect(() => {
    const wanted = pendingFocus.current;
    if (wanted === null) return;
    pendingFocus.current = null;
    focusNow(wanted);
  });

  /* Normalised here rather than trusted from the prop: a caller holding this
     in form state can hand back anything, and a non-digit would otherwise be
     rendered into a box the keyboard cannot produce. */
  const digits = onlyDigits(value, length);
  const invalid = errorMessage !== undefined;

  const describedBy = [
    description === undefined ? null : descriptionId,
    errorMessage === undefined ? null : errorId,
  ].filter((candidate): candidate is string => candidate !== null).join(' ');

  /** Publish, and fire the completion edge if this change filled the last box. */
  function commit(next: string) {
    onValueChange(next);
    if (next.length === length) onComplete?.(next);
  }

  function handleChange(index: number, raw: string) {
    /* `length + 1` rather than `length`: one extra character is what a
       type-over looks like — the box already held a digit, so the input now
       holds two and the SECOND is the one just pressed. */
    const incoming = onlyDigits(raw, length + 1);

    /**
     * AUTOFILL. iOS and Android hand a one-time code to the field as a single
     * input event carrying every character, so this is a normal path, not a
     * guard. Three or more digits can only be a machine; two is a type-over.
     *
     * It REPLACES the whole code rather than filling from this box, which is
     * the same rule paste follows and for the same reason.
     */
    if (incoming.length > 2) {
      const next = incoming.slice(0, length);
      commit(next);
      pendingFocus.current = next.length;
      return;
    }

    /* Cleared with the keyboard rather than with Backspace — a selection
       deleted, or a composition cancelled. */
    if (incoming === '') {
      commit(digits.slice(0, index) + digits.slice(index + 1));
      pendingFocus.current = index;
      return;
    }

    /* The character just pressed is the LAST one, because a box that already
       held a digit now holds two. Reading it this way is what lets the box
       keep a caret instead of a pre-selected digit — see `focusNow`. */
    const typed = incoming.slice(-1);
    const next = onlyDigits(
      digits.slice(0, index) + typed + digits.slice(index + 1),
      length,
    );
    commit(next);
    pendingFocus.current = index + 1;
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      /* Deliberately not left to the input's own deletion: with the box
         already empty there is nothing for the browser to delete, so the
         keypress would do nothing at all and the person would press it again,
         harder. Empty box means "clear the one before and go there". */
      event.preventDefault();
      if (digits.length === 0) return;

      const removeAt = index < digits.length ? index : digits.length - 1;
      commit(digits.slice(0, removeAt) + digits.slice(removeAt + 1));
      pendingFocus.current = removeAt;
      return;
    }

    /* Arrows change no value, so there is no commit to wait for and the move
       happens now. Going through `focusNow` keeps the caret rule in one place. */
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusNow(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusNow(Math.min(index + 1, digits.length));
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    /**
     * THE WHOLE CODE, FROM BOX ONE, whichever box was pasted into.
     *
     * Ben, 2026-10-20: *"Pasting it should always replace the entire code, not
     * just from the field onwards."* So this is a replacement, never a merge
     * and never an insertion at the caret: what somebody pasting six digits
     * meant is never "put these six characters in slot four".
     */
    event.preventDefault();
    const pasted = onlyDigits(event.clipboardData.getData('text'), length);
    if (pasted === '') return;

    commit(pasted);
    pendingFocus.current = pasted.length;
  }

  function handleFocus(index: number) {
    /* No gaps: a click past the end lands on the first empty box instead. */
    if (index > digits.length) focusNow(digits.length);
  }

  return (
    <div className="musy-code-field">
      <span className="musy-code-field__label" id={labelId}>{label}</span>

      <div
        className="musy-code-field__boxes"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={describedBy === '' ? undefined : describedBy}
      >
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(node) => { boxes.current[index] = node; }}
            className="musy-code-field__box"
            value={digits[index] ?? ''}
            onChange={(event) => { handleChange(index, event.target.value); }}
            onKeyDown={(event) => { handleKeyDown(index, event); }}
            onPaste={handlePaste}
            onFocus={() => { handleFocus(index); }}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-label={boxLabel(index + 1, length)}
            autoFocus={autoFocus && index === 0}
            /* `text` rather than `number`: a number input brings spinners,
               accepts `e` and `-`, and reports an empty string for anything it
               considers invalid — which would hide a digit this field had
               already accepted. */
            type="text"
            inputMode="numeric"
            /* iOS and Android read this and offer the code from the
               notification above the keyboard. On the FIRST box only: the
               platforms fill the whole field from one hook, and repeating it
               makes some of them offer the code six times. */
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            /* NO `maxLength`, and that is deliberate rather than forgotten.
               At 1 it does two kinds of damage: a browser truncates an
               AUTOFILLED code to its first character, so the platform hook
               this field exists to support delivers one digit of six; and
               typing over a box that already holds a digit is simply refused,
               which is the behaviour that made the earlier version need
               `select()` and cost the caret. The value is controlled, so a box
               never renders more than its one character anyway. */
          />
        ))}
      </div>

      {/* DOM order matches Field's: the error sits next to the controls that
          caused it, above a description the person has already read. */}
      {errorMessage !== undefined && (
        <span className="musy-code-field__error" id={errorId} role="alert">
          {errorMessage}
        </span>
      )}

      {description !== undefined && (
        <span className="musy-code-field__description" id={descriptionId}>
          {description}
        </span>
      )}
    </div>
  );
}
