/**
 * CodeField — one box per digit.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * NOTE ON WHAT THESE STORIES CANNOT SHOW. Per CONVENTIONS.md §5 a story carries
 * no state, so typing into these boxes does not move them — each story
 * documents a state rather than simulating an entry. The three behaviours that
 * matter most here are therefore NOT demonstrable on this page: paste-fills-
 * everything, advance-on-type, and complete-without-a-button. They need a
 * browser and a real controlled parent. See Build notes.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CodeField } from '../src/CodeField';
import { bothThemes } from './_decorators';

/* The app's own two lengths — the access code somebody was given, and the
   sign-in code that arrives by email. */
const SIGN_IN_LENGTH = 6;
const ACCESS_LENGTH = 4;

const boxLabel = (position: number, total: number) => `Digit ${position} of ${total}`;

const meta = {
  title: 'Components/CodeField',
  component: CodeField,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'APG: no pattern of its own. A labelled group of single-character text',
          'inputs, so the semantics come from `role="group"` plus the native',
          'controls inside it.',
          '',
          'One box per digit. Used at two lengths and nowhere else so far: **four**',
          'for the access code somebody was given, **six** for the sign-in code that',
          'arrives by email. Nothing about the two uses differs but the number,',
          'which is why this is one component with a `length` rather than two.',
          '',
          '**It is hand-rolled, and that is not a preference.** base-ui 1.7 has no',
          'one-time-code pattern, so there is no part to dress here the way `Field`',
          'dresses `Field.Control`. What it does have is the lesson: Field\'s',
          'docblock records base-ui rendering a label, an input and a description',
          'with ids and nothing referencing anything, caught only by an end-to-end',
          'walk. So every association here is written out by hand.',
          '',
          '**The accessible name is the group\'s, not six nameless boxes.** Each',
          'input carries `aria-label` with its own position and the group carries',
          'the real label. Without the group name a screen reader announces "edit',
          'text, edit text, edit text"; without the per-box position the person',
          'cannot tell which box they are in.',
          '',
          '**Paste fills from the start, wherever you pasted.** A paste is not',
          'inserted at the caret — it is the whole code, and it lands from box one.',
          'The same path catches autofill: iOS and Android hand a one-time code to',
          'the field as a single input event carrying every character at once, so',
          'more than one character per change is a normal case here, not a guard',
          'against something weird.',
          '',
          '**It completes itself.** `onComplete` fires the moment the last box',
          'fills, and the screen using it has no button. It fires from the edge —',
          'the change that made the value whole — rather than from an effect on',
          '`value`, which would re-fire on every render that kept the value full.',
          '',
          '**No gaps, ever.** `value` is a left-packed string, so box N holds',
          'character N and there is no way to express "box four is filled and box',
          'two is not". Clicking an empty box past the end redirects focus to the',
          'first empty one.',
          '',
          '**Every string is passed** (CLAUDE.md rule 7). `label` and `boxLabel` are',
          'required and nothing here has a default, so nothing here can leak a',
          'German string into an English screen.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding. Delete once answered._',
          '',
          '**This page cannot prove the three behaviours that matter.** Stories carry',
          'no state (CONVENTIONS.md §5), so paste-fills-everything, advance-on-type',
          'and complete-without-a-button are all invisible here — every story below',
          'documents a resting state. They need a browser and a controlled parent,',
          'and until one has walked them, those behaviours are written rather than',
          'verified.',
          '',
          '**`autoComplete="one-time-code"` is unverified on a real device.** It is',
          'on the first box only, because the platforms fill the whole field from',
          'one hook and repeating it makes some of them offer the code once per box.',
          'Whether iOS actually offers the code above the keyboard can only be',
          'answered by an iPhone with a real email in it.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    length: {
      description: 'How many boxes. Four for the access code, six for the sign-in code.',
      control: 'inline-radio',
      options: [ACCESS_LENGTH, SIGN_IN_LENGTH],
    },
    value: {
      description:
        'The digits entered so far, left-packed and never longer than `length`. '
        + 'Anything that is not a digit is ignored rather than rendered.',
      control: 'text',
    },
    onValueChange: {
      description: 'Called with the new left-packed value on every change.',
      control: false,
    },
    onComplete: {
      description:
        'Called once, on the change that filled the last box. The code screen has '
        + 'no submit control — this is what proceeds.',
      action: 'onComplete',
    },
    label: {
      description: "The group's accessible name. Required; there is no default (rule 7).",
      control: 'text',
    },
    boxLabel: {
      description:
        "Builds each box's own accessible name from its 1-based position, so a "
        + 'screen reader can say which box it is in.',
      control: false,
    },
    description: {
      description: 'Help text under the boxes, announced with the group.',
      control: 'text',
    },
    errorMessage: {
      description:
        'Shown and announced when set. Setting it also marks every box invalid — '
        + 'the error belongs to the code, not to one digit of it.',
      control: 'text',
    },
    disabled: { description: 'Disables every box.', control: 'boolean' },
    autoFocus: { description: 'Focus the first empty box on mount.', control: 'boolean' },
    id: { description: 'Base id for the label, description and error ids.', control: 'text' },
  },
  args: {
    length: SIGN_IN_LENGTH,
    value: '',
    label: 'Enter your code',
    boxLabel,
    /* REQUIRED prop — a code field that publishes nothing is not a code field
       — so it is an arg rather than an `argTypes` action. `fn()` keeps it in
       the Actions panel, which is what an `action:` entry would have given.
       Same device QrScanner uses for its four handlers, for the same reason. */
    onValueChange: fn(),
  },
} satisfies Meta<typeof CodeField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Six empty boxes — what the code screen opens on. */
export const Default: Story = {};

/** The other length: four boxes, for the access code handed out by Ben or Lucy. */
export const AccessCode: Story = {
  args: {
    length: ACCESS_LENGTH,
    label: 'Access code',
    description: 'The four digits you were given.',
  },
};

/** Mid-entry. Boxes fill left to right and never leave a gap. */
export const PartiallyFilled: Story = {
  args: { value: '472' },
};

/**
 * Full. In the app this state barely exists — `onComplete` fires on the
 * keystroke that produced it, so the screen has usually already moved on.
 */
export const Complete: Story = {
  args: { value: '472916' },
};

/** A refused code. Every box carries the error, because the code was wrong — not one digit of it. */
export const WithError: Story = {
  args: {
    value: '472916',
    errorMessage: 'That code is not right. Check it and try again.',
  },
};

/** While the code is being checked. Disabled rather than removed, so the layout does not jump. */
export const Disabled: Story = {
  args: { value: '472916', disabled: true },
};

/**
 * With help text under the boxes. The description is announced with the group,
 * so it is read once rather than once per box.
 */
export const WithDescription: Story = {
  args: {
    description: 'We sent six digits to hallo@musie.org. Paste anywhere — it fills every box.',
  },
};
