/**
 * Toast — Batch E. Written against the component in isolation; the prototype
 * never uses it (PROTOTYPE-USAGE.md), so every story comes from the source
 * header and docs/07-components.md §7.23.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from '../src/Toast';
import { bothThemes } from './_decorators';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Confirm an action that has already happened, and offer the one way to',
          'reverse it, without moving the content the user is looking at.',
          '',
          '**Not a Message,** and the difference is not styling. A Message is part of',
          'the flow and pushes layout when it appears, which is wrong for a',
          'confirmation arriving while the user is reading something else.',
          '',
          '**One at a time, and it replaces.** No queue, no stacking, no collapsing',
          'into "2 items deleted". The undo model this serves is *undo the last',
          'thing*, which is exactly what a single toast says — and two stacked toasts',
          'on a 393px screen cover the control the user was aiming at. The stated',
          'consequence: an earlier action\'s offer leaves the screen while its own',
          'window is still open, and is recoverable only until that window lapses.',
          '',
          '`role="status"`, **never** `role="alert"`. An undo offer is not urgent, and',
          'assertive cuts across whatever the screen reader is already saying.',
          '',
          '**No timer.** `label` going null is what removes it, so the consumer\'s own',
          'undo window is the single source of truth. A second timer inside the',
          'component could only disagree with it.',
          '',
          'Layer 1 ships `--z-toast` ranked above `--z-sheet`, with the stated reason',
          'that a "session saved" confirmation must be visible over an open sheet — a',
          'layer with no consumer in the released set until this component.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '**Toast — `dismissLabel` defaults to German while the component\'s own copy',
          'is otherwise caller-supplied.** Default is `\'Meldung schließen\'`, the same',
          'string Message uses. The prototype is English throughout and never uses',
          'Toast. Stories show the component default unchanged; see the session-level',
          'language entry in OPEN-QUESTIONS.md.',
          '',
          '**Toast — where it is positioned, answered 2026-09-26.** The note that used',
          'to sit here said the component "is not positioned by the component" and that',
          'a story therefore renders it inline. Half of that was always wrong —',
          '`.musy-toast` is `position: fixed` in §23 of the stylesheet, so a story does',
          'render it where the app does — and the other half is now a prop: `placement`',
          'picks the edge, and the stories below are decorated to make the fixed',
          'placement visible rather than pretending it is inline.',
          '',
          '**`--musy-toast-inset-block-start` is a hook, not a leak.** `--z-toast`',
          'outranks `--z-sticky` by Layer 1’s own design, so a `top` toast paints over a',
          'consuming app’s sticky header — and only the app knows how tall its header',
          'is. The component publishes the property and falls back to a token, so an app',
          'that says nothing still gets a correct toast; the hook buys clearance, never',
          'correctness.',
          '',
          '**Toast — no `id` is wired to anything.** `id` is accepted and spread onto',
          'the root, but nothing in the component references it and there is no',
          '`aria-describedby` relationship for it to serve.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Statement deleted',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'What happened. `null` renders nothing — the consumer’s state is the visibility, and its undo window is the timer.',
    },
    action: { control: false, description: 'Exactly one. Two actions means this is a dialog, not a toast.' },
    onDismiss: { action: 'dismiss', description: 'Renders the dismiss control when supplied.' },
    live: {
      control: 'inline-radio',
      options: ['polite', 'off'],
      description: "Announced while it is up. 'off' for a toast that repeats a change the user has already been told about some other way.",
    },
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'success'],
      description: '`success` draws a check glyph, the success feedback fill and a screen-reader status word — so the meaning survives without the colour.',
    },
    placement: {
      control: 'inline-radio',
      options: ['bottom', 'top'],
      description: 'Which edge it is fixed to. `top` is top-centre on a phone and top-trailing from --bp-md up.',
    },
    statusWord: {
      control: 'text',
      description: 'Overrides the announced status word. `\'\'` drops it — for a label that already IS the status. Ignored when `tone` is `neutral`.',
    },
    dismissLabel: { control: 'text', description: 'Accessible name for the dismiss control.' },
    id: { control: false },
    className: { control: false },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Label only. No action, no dismiss — the minimum the component renders. */
export const Default: Story = {};

/** The reference case: one action, which is the undo offer. */
export const WithUndo: Story = {
  args: {
    label: 'Statement deleted',
    action: { label: 'Undo', onAction: () => {} },
  },
};

/** A dismiss control appears only when `onDismiss` is supplied. */
export const WithDismiss: Story = {
  args: { label: 'Session saved', onDismiss: () => {} },
};

/** Both parts. The dismiss is a bare base-ui Button dressed by
 *  `.musy-toast__dismiss`, not an Icon Button, so no tooltip appears under a
 *  thumb and the two dismiss affordances in the system stay identical. */
export const WithUndoAndDismiss: Story = {
  args: {
    label: 'Statement deleted',
    action: { label: 'Undo', onAction: () => {} },
    onDismiss: () => {},
  },
};

/** `live="off"` for a toast that repeats a change the user has already been
 *  told about some other way. The live region is dropped entirely. */
export const LiveOff: Story = {
  args: { label: 'Draft saved', live: 'off', action: { label: 'Undo', onAction: () => {} } },
};

/** `label={null}` renders nothing at all. This is how the consumer hides it —
 *  the component has no timer and no internal visibility state. */
export const Hidden: Story = { args: { label: null } };

/** The text is `body-sm` and wraps. At 393px the row is text, one ghost action
 *  and a dismiss, so a long label is the case the layout has to survive. */
export const LongLabel: Story = {
  args: {
    label: 'Your reflection was removed from this session and will not be shared',
    action: { label: 'Undo', onAction: () => {} },
    onDismiss: () => {},
  },
};

/** The dismiss label is overridable; the default is German. */
export const DismissLabelOverridden: Story = {
  args: { label: 'Session saved', onDismiss: () => {}, dismissLabel: 'Dismiss message' },
};

/**
 * SUCCESS — the fill is not the message.
 *
 * Three things carry the tone without colour: the check glyph, the sentence
 * itself, and a screen-reader status word ("Erfolg: " / "Success: ") that the
 * component puts in front of the text. Inspect the element to see the third.
 */
export const Success: Story = {
  args: {
    label: 'Im Tagebuch findest du einen Eintrag für jede beendete Übung',
    tone: 'success',
    onDismiss: () => {},
  },
};

/**
 * SUCCESS, AT THE TOP — the diary's case.
 *
 * `placement="top"` is top-centre on a phone and top-trailing from `--bp-md`
 * up. Resize the frame across 768px to see it move; it is one modifier and one
 * media query, with no width hardcoded to decide which.
 *
 * The entrance travels the other way too — a toast arriving at the top comes
 * from above it, which is a second keyframe rather than a negated token at the
 * call site.
 */
export const SuccessTopRight: Story = {
  args: {
    label: 'Im Tagebuch findest du einen Eintrag für jede beendete Übung',
    tone: 'success',
    placement: 'top',
    onDismiss: () => {},
  },
  decorators: [
    /* The toast is `position: fixed`, so it needs a frame with height to be
       seen in the right place rather than pinned to the docs viewport. */
    (Story) => (
      <div style={{ position: 'relative', minHeight: '18rem' }}>
        <Story />
      </div>
    ),
  ],
};

/** `statusWord=""` drops the announced word, for a label that already IS the
 *  status. Badge's own escape hatch, and for the same reason: "Erfolg:
 *  Gespeichert" says the same thing twice. */
export const SuccessWithoutStatusWord: Story = {
  args: { label: 'Gespeichert', tone: 'success', statusWord: '', onDismiss: () => {} },
};

/** A success toast still takes an action, and the degradation order is
 *  unchanged: at the `--measure-heading` cap the TEXT gives, never the action
 *  or the dismiss. */
export const SuccessWithUndo: Story = {
  args: {
    label: 'Im Tagebuch findest du einen Eintrag für jede beendete Übung',
    tone: 'success',
    action: { label: 'Rückgängig', onAction: () => {} },
    onDismiss: () => {},
  },
};
