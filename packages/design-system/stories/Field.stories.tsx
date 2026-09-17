/**
 * Field — Batch B (controls).
 *
 * Docs text below comes from the component's own header comment and from
 * docs/07-components.md §7.16. Nothing is invented.
 *
 * Every state here comes from props. Field is controlled through `value` +
 * `onValueChange`, and a story that shows a filled field passes `value`.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field } from '../src/Field';
import { bothThemes, Stack } from './_decorators';

/* The prototype's own reflect-step field — multiline, label "Your written
   answer", description "Nothing leaves your device until you share it."
   See PROTOTYPE-USAGE.md, "Field — 4 usages". */
const PRIVACY_NOTE = 'Nothing leaves your device until you share it.';

const meta = {
  title: 'Components/Field',
  component: Field,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Field (`@base-ui/react/field`).',
          'APG: **no pattern of its own** — a field is a label/control/help/error assembly,',
          'and the pattern lives in the native control it wraps. base-ui’s `Field` owns',
          'exactly the parts that are easy to get wrong by hand: the label↔control',
          'association, `aria-describedby` wiring for description AND error, and the',
          'validity data-attributes (`data-valid` / `data-invalid` / `data-touched` /',
          '`data-dirty` / `data-filled` / `data-disabled`) that the stylesheet targets.',
          '',
          'Ask for one typed answer — a name, an email address, a written reflection.',
          '',
          '**One component, two controls.** `multiline` swaps `<input>` for `<textarea>` via',
          'the same Field.Control part — it is the same field with a different measure, not',
          'a second component. A native control is REQUIRED here: base-ui renders it and the',
          'stylesheet dresses the part base-ui rendered. Nothing is re-implemented. Guided',
          'textarea height is **two comfort rows** (`calc(--target-comfort * 2)`): derived,',
          'not picked.',
          '',
          '**DOM ORDER IS LOAD-BEARING: label → control → error → valid → description.**',
          'A message that just appeared sits next to the control that caused it, rather than',
          'below a hint the user already read.',
          '',
          '**VALIDITY IS NEVER PAINTED BEFORE IT IS EARNED.** The success border and the',
          'success line are gated on `data-touched`, so an untouched empty field is neutral',
          'rather than green, and the validity properties carry **no transition** — a fading',
          'border shows a stale state mid-flight.',
          '',
          '**The value goes through `Field.Control`, not `Field.Root` — fixed defect.** This',
          'component passed `value`, `defaultValue` and `onValueChange` to base-ui’s',
          '`Field.Root`, which accepts none of the three in `@base-ui/react` 1.7.0. They',
          'landed on a `<div>` and were silently ignored, so a pre-filled or controlled field',
          'rendered EMPTY. It type-errors under a strict tsc, which is how it was found. The',
          'control is the thing that holds a value; drive it there. The public API is',
          'unchanged.',
          '',
          '`filled` (`[data-filled]`) is **not a validity state** — it only says the control',
          'carries a value, so the treatment is deliberately quiet. `error`’s presence **is**',
          'the invalid state.',
          '',
          'A visible label is required by the type — a placeholder is not a label (3.3.2),',
          'and the placeholder disappears exactly when the user needs it. The required marker',
          'is decorative; the real signal is the control’s own `required`, which base-ui',
          'reflects. The error carries the same visually-hidden status word as Message, so a',
          'field-level error and a page-level one teach the same thing.',
          '',
          '**There is no loading state.** §7.16: "N/A. A field awaiting a save is the',
          'consuming app’s state: disable it and render a Message."',
          '',
          '**What it is NOT.** Not a search bar, not a combobox, not a form. It holds one',
          'question.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Field — the documented controlled-value defect (gaps §6) is FIXED; the two docs disagree about it',
          'Where: `src/Field.tsx:88-96`, `docs/12-component-gaps.md` §6,',
          '`docs/07-components.md` §7.16',
          'What I checked: Level 1, the source: `value`, `defaultValue` and `onChange` sit on',
          '`BaseField.Control`, exactly the fix §6 prescribes. Level 3 is split — §7.16',
          'already describes it as a **fixed defect**, but `12-component-gaps.md` §6 still',
          'states it in the present tense and is still headed `[DEFECT]`.',
          'What I did: wrote `Filled`, `Multiline` and every error story as controlled —',
          '`value` plus `onValueChange` — since the value now reaches the control.',
          'Why: the source is Level 1 and the source is fixed.',
          'What I need from Ben: **close `12-component-gaps.md` §6** or mark it resolved; as',
          'written it tells the next reader the component is broken when it is not.',
          '',
          '## Field — `value` and `defaultValue` are both forwarded to the same control',
          'Where: `src/Field.tsx:91-92`',
          'What I checked: Level 1 only. Both props are passed through to the rendered',
          '`<input>`/`<textarea>` unconditionally. A consumer who sets both gets React’s',
          'controlled/uncontrolled warning; a consumer who sets neither is fine, because both',
          'are `undefined`.',
          'What I did: every story passes one or the other, never both.',
          'Why: it is only a defect at the call site, and guarding it inside the component',
          'would be a change I may not make.',
          'What I need from Ben: nothing, just flagging — worth one line in the props table.',
          '',
          '## Field — the header comment is garbled where the defect fix was written into it',
          'Where: `src/Field.tsx:19-22`',
          'What I checked: Level 1. The sentence "the validity properties carry no transition',
          '—" runs straight into "VALUE GOES THROUGH Field.Control, NOT Field.Root" with no',
          'break, so the first sentence never finishes. §7.16 carries both thoughts intact and',
          'separate.',
          'What I did: took the docs text for that clause from the intact §7.16 wording. Did',
          'not touch the source comment.',
          'Why: CONVENTIONS §7 sources docs text from the header first, but the header is',
          'unreadable at exactly that point.',
          'What I need from Ben: **one edit to the comment** — the fix note was pasted into',
          'the middle of the previous sentence.',
          '',
          '## Field — no `readOnly` styling exists, so the ReadOnly story looks identical to Default',
          'Where: `src/Field.tsx:97` (prop forwarded to the control); `src/musy-components.css`',
          'has no `:read-only` and no `[readonly]` rule anywhere',
          'What I checked: Level 1, the prop is real and reaches the control. Level 3, §7.16’s',
          'state matrix has rows for default, hover, focus, filled, invalid, valid, disabled',
          'and loading — and **no row for read-only**.',
          'What I did: kept the `ReadOnly` story, because the prop exists and the behaviour',
          '(uneditable, still focusable, still announced) is real even though the picture does',
          'not change.',
          'Why: a prop with no visual treatment is worth seeing as a prop with no visual',
          'treatment.',
          'What I need from Ben: **a decision.** Either the state matrix gains a read-only row',
          'and the stylesheet a rule, or `readOnly` comes off the API.',
          '',
          '## Field — `validMessage` cannot be shown from props alone in a reliable way',
          'Where: `src/Field.tsx:108-118`',
          'What I checked: Level 1. The success line renders only inside `BaseField.Validity`',
          'when `validity.value !== \'\'` **and** `validity.validity.valid`, and §7.16 adds that',
          'the success *border* is additionally gated on `data-touched` — which no prop can',
          'set.',
          'What I did: wrote a `WithValidMessage` story that passes a non-empty `value`',
          'together with `validMessage`. Whether the line paints on first render depends on',
          'base-ui’s internal validity bookkeeping, not on the args.',
          'Why: CONVENTIONS §5 forbids the alternative, which is to click the field inside the',
          'story.',
          'What I need from Ben: nothing, just flagging — this is the one documented state of',
          'Field that a props-only story may not be able to prove.',
          '',
          '## Field — no way to pass `autoComplete`, `inputMode`, `maxLength` or an `aria-*` attribute',
          'Where: `src/Field.tsx:38-60` — `FieldProps` is a closed interface and the component',
          'spreads no rest props onto `Field.Control`',
          'What I checked: Level 1. Unlike IconButton, CtaButton and Switch, `FieldProps`',
          'extends nothing — the batch brief’s "these components extend an Omit of',
          'ComponentPropsWithoutRef" is true of the other three and **not** of Field. Level 2:',
          'the prototype’s END screen field is `type="email"`, which is exactly the field that',
          'wants `autoComplete="email"`.',
          'What I did: the `Email` story sets `type="email"` and nothing else.',
          'Why: there is no prop for it.',
          'What I need from Ben: **a decision** — whether `FieldProps` should pass the',
          'remaining input attributes through.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Your written answer',
  },
  argTypes: {
    label: { control: 'text', description: 'Visible label. Required — a placeholder is not a label (3.3.2).' },
    name: { control: 'text', description: 'Identifies the field when a form is submitted.' },
    multiline: { control: 'boolean', description: 'Swaps the control for a <textarea>. Same part, one modifier.' },
    type: {
      control: 'select',
      options: ['text', 'email', 'tel', 'url', 'search', 'password'],
      description: 'The input type. Ignored when multiline.',
    },
    value: { control: 'text', description: 'Controlled value. Driven through Field.Control, not Field.Root.' },
    defaultValue: { control: 'text', description: 'Uncontrolled initial value.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the control’s new value.' },
    placeholder: { control: 'text', description: 'A hint inside the control. Never a substitute for the label.' },
    description: {
      control: 'text',
      description: 'Persistent help. Announced through base-ui’s aria-describedby wiring.',
    },
    error: { control: 'text', description: 'Error text. Presence puts the field in the invalid state.' },
    validMessage: { control: 'text', description: 'Success line. Only ever shown once the field has been touched.' },
    required: { control: 'boolean', description: 'Renders the decorative marker and sets the control’s own required.' },
    disabled: { control: 'boolean', description: 'Disables the whole field.' },
    readOnly: { control: 'boolean', description: 'Forwarded to the control.' },
    rows: { control: 'number', description: 'Rows on the <textarea>. Only meaningful with multiline.' },
    errorWord: {
      control: 'text',
      description: 'Screen-reader status word before the error text (1.4.1, matches Message).',
    },
    id: { control: 'text' },
    className: { control: false },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults — a single-line text control, untouched and therefore
 *  neutral rather than green. */
export const Default: Story = {};

/** The persistent help line, with the prototype's own reflect-step copy. It
 *  sits below the error by design: DOM order is label → control → error →
 *  valid → description. */
export const WithDescription: Story = {
  args: { description: PRIVACY_NOTE },
};

/** Controlled and filled. `[data-filled]` is **not** a validity state — it only
 *  says the control carries a value, so the treatment is deliberately quiet. */
export const Filled: Story = {
  args: {
    value: 'The card I picked was the one about noticing my shoulders.',
    description: PRIVACY_NOTE,
  },
};

/** `multiline` swaps `<input>` for `<textarea>` through the same Field.Control
 *  part — the same field at a different measure. This is the prototype's
 *  reflect step. */
export const Multiline: Story = {
  args: { multiline: true, rows: 4, description: PRIVACY_NOTE },
};

/** Multiline, controlled and filled. */
export const MultilineFilled: Story = {
  args: {
    multiline: true,
    rows: 4,
    value: 'The card I picked was the one about noticing my shoulders. I sat with it for the whole track.',
    description: PRIVACY_NOTE,
  },
};

/** A placeholder is a hint, never a label — it disappears exactly when the user
 *  needs it, which is why `label` is required by the type. */
export const WithPlaceholder: Story = {
  args: { placeholder: 'Write as much or as little as you like' },
};

/** Every `type` the component declares. `multiline` ignores all of them. */
export const Types: Story = {
  render: (args) => (
    <Stack>
      <Field {...args} type="text" label="type: text (default)" />
      <Field {...args} type="email" label="type: email" />
      <Field {...args} type="tel" label="type: tel" />
      <Field {...args} type="url" label="type: url" />
      <Field {...args} type="search" label="type: search" />
      <Field {...args} type="password" label="type: password" />
    </Stack>
  ),
};

/** The prototype's END-screen field. `type="email"` is the only type the
 *  prototype uses. */
export const Email: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    name: 'email',
    description: 'Only the answer you just gave is sent. Nothing else from your session.',
  },
};

/** `required` renders the decorative `*` and sets the control's own `required`.
 *  The marker is `aria-hidden`; the real signal is the attribute, which base-ui
 *  reflects to assistive tech. */
export const Required: Story = {
  args: { label: 'Email address', type: 'email', required: true },
};

/** The presence of `error` **is** the invalid state. The error sits directly
 *  under the control, above the description, and carries `role="alert"` plus a
 *  visually-hidden status word. This is the prototype's only error state. */
export const WithError: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    value: 'ldamn@',
    error: 'Enter a complete email address.',
    description: 'Only the answer you just gave is sent. Nothing else from your session.',
  },
};

/** `errorWord` is the screen-reader status word before the error text. It
 *  matches Message, so a field-level error and a page-level one teach the same
 *  thing. */
export const ErrorWordOverridden: Story = {
  args: {
    label: 'E-Mail-Adresse',
    type: 'email',
    value: 'ldamn@',
    error: 'Gib eine vollständige E-Mail-Adresse ein.',
    errorWord: 'Fehler',
  },
};

/** An error on the multiline control. The textarea takes the thick error border
 *  in the same place the input does. */
export const MultilineWithError: Story = {
  args: {
    multiline: true,
    rows: 4,
    value: 'a',
    error: 'Write at least a sentence, or choose another way to answer.',
    description: PRIVACY_NOTE,
  },
};

/** The success line, with a non-empty controlled value. Validity is never
 *  painted before it is earned: the success border is gated on `data-touched`,
 *  which no prop can set, so this story may render the field neutral. */
export const WithValidMessage: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    value: 'ldamn@nitz.com',
    validMessage: 'That address looks right.',
  },
};

/** `error` and `validMessage` together. The success line is suppressed while the
 *  field is invalid — the two can never appear at once. */
export const ErrorBeatsValidMessage: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    value: 'ldamn@',
    error: 'Enter a complete email address.',
    validMessage: 'That address looks right.',
  },
};

/** Disabled. The border drops to `--border-subtle`, the control to
 *  `--interactive-primary-disabled`, and the label and description to
 *  `--on-surface-disabled`. */
export const Disabled: Story = {
  args: { disabled: true, value: 'ldamn@nitz.com', description: PRIVACY_NOTE },
};

/** `readOnly`. The control is uneditable, still focusable and still announced.
 *  The stylesheet carries no read-only rule, so the picture is unchanged from
 *  `Filled` — see the build notes. */
export const ReadOnly: Story = {
  args: { readOnly: true, value: 'ldamn@nitz.com', description: PRIVACY_NOTE },
};

/** The longest label and description the prototype could carry, in German. The
 *  description is capped at `--measure-body`; the control is `width: 100%` and
 *  takes its measure from the container, because a field narrower than its
 *  container reads as broken rather than as considered. */
export const LongCopy: Story = {
  args: {
    label: 'Deine schriftliche Antwort auf die Reflexionsfrage',
    description:
      'Nichts verlässt dein Gerät, bis du es teilst. Auch die Aufnahme bleibt lokal, bis du dich ausdrücklich dafür entscheidest, sie zu senden.',
    multiline: true,
    rows: 3,
  },
};
