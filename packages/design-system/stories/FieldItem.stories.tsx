/**
 * FieldItem — Batch B (controls). Exported from src/Field.tsx.
 *
 * Docs text below comes from the component's own doc comment and from
 * docs/07-components.md §7.16. Nothing is invented.
 *
 * The prototype never uses FieldItem — see PROTOTYPE-USAGE.md, "Components with
 * no prototype usage at all". The copy here is borrowed from the prototype's
 * SETTINGS screen, which is the one real settings row in the system.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moon, Sun } from 'lucide-react';
import { FieldItem } from '../src/Field';
import { Switch } from '../src/Switch';
import { bothThemes } from './_decorators';

const meta = {
  title: 'Components/FieldItem',
  component: FieldItem,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Field.Item — **a control that sits BESIDE its label**, description under both.',
          '',
          '**The 44px target is the ROW, not the control**, which is what makes it',
          'one-handed.',
          '',
          '`control` takes the control that sits beside the label — a Switch, checkbox or',
          'radio. `htmlFor` must match the control’s own id, so the label targets the real',
          'element.',
          '',
          'The row is a two-column grid: the control, then the label, with the description',
          'under the label rather than under the control.',
          '',
          '**What it is NOT.** Not a Field — it holds a control that is already labelled by',
          'its state, not a typed answer.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## FieldItem — `disabled` styles the label but does not disable the control',
          'Where: `src/Field.tsx:140-160`',
          'What I checked: Level 1. `disabled` only sets `data-disabled` on the `<label>` and',
          'the description `<p>`; the `control` node is rendered untouched, so the switch',
          'inside a "disabled" FieldItem is still fully operable. Level 3, §7.16, describes',
          'FieldItem in one sentence and does not mention `disabled` at all.',
          'What I did: the `Disabled` story sets `disabled` on the FieldItem **and** on the',
          'Switch it contains, so the row is honest.',
          'Why: showing `disabled` alone would document a row that looks disabled and is not.',
          'What I need from Ben: **a decision.** Either the prop is renamed to say it is',
          'presentational, or it is documented as "set this on both".',
          '',
          '## FieldItem — the stylesheet styles a `.musy-field__error` child the component can never render',
          'Where: `src/musy-components.css:2908-2909`, `src/Field.tsx` `FieldItemProps`',
          'What I checked: Level 1. `.musy-field__item > .musy-field__error` is given a grid',
          'column, but `FieldItemProps` has no `error` prop and `FieldItem` renders no error',
          'element. Level 3 says nothing about a FieldItem error.',
          'What I did: nothing; there is no story that can reach it.',
          'Why: adding an `error` prop would be a design decision.',
          'What I need from Ben: nothing, just flagging — either dead CSS or a prop that was',
          'planned and dropped.',
          '',
          '## FieldItem — pairing it with Switch produces two labels for one control',
          'Where: `src/Switch.tsx:88-90` and `src/Field.tsx` `FieldItem`',
          'What I checked: Level 1. `Switch` always renders its own `<label htmlFor>`;',
          '`FieldItem` renders a second `<label htmlFor>` for the control it is given. Level',
          '3, §7.16, names Switch as FieldItem’s example control. Nothing reconciles the two.',
          'What I did: the Switch stories pass `labelHidden` to the Switch so only one label',
          'is visible. Both labels still point at the same control and both are still in the',
          'accessible name.',
          'Why: `labelHidden` is the only prop that reduces the duplication without editing a',
          'component.',
          'What I need from Ben: **a decision.** Either Switch needs a way to render no label',
          'at all, or FieldItem should not be documented as taking a Switch.',
          '',
          '## FieldItem — no prototype usage, so the copy in its stories is borrowed',
          'Where: `stories/PROTOTYPE-USAGE.md`, "Components with no prototype usage at all"',
          'What I checked: Level 2 lists `FieldItem` and `FieldGroup` as unused by the',
          'prototype. Level 3, §7.16, gives only the one-line description.',
          'What I did: used the SETTINGS "Dark mode" switch from the prototype’s Switch usage',
          'as the control, since that is the one real settings row in the system, and kept the',
          'copy to strings that already exist.',
          'Why: it is the nearest existing copy; inventing a new label would be a design',
          'decision.',
          'What I need from Ben: nothing, just flagging that the labels are borrowed.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Dark mode',
    htmlFor: 'fielditem-dark-mode',
    control: (
      <Switch
        id="fielditem-dark-mode"
        label="Dark mode"
        labelHidden
        accent="accent-placeholder1"
        onGlyph={Moon}
        offGlyph={Sun}
        checked
      />
    ),
  },
  argTypes: {
    control: {
      control: false,
      description: 'The control that sits BESIDE the label — a Switch, checkbox or radio.',
    },
    label: { control: 'text', description: 'The row’s visible label.' },
    htmlFor: {
      control: 'text',
      description: 'Must match the control’s own id, so the label targets the real element.',
    },
    description: { control: 'text', description: 'Help text under the label.' },
    disabled: { control: 'boolean', description: 'Marks the label and description as disabled.' },
    className: { control: false },
  },
} satisfies Meta<typeof FieldItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Switch beside its label. The Switch carries `labelHidden` so the row shows
 *  one label rather than two — see the build notes. */
export const Default: Story = {};

/** With a description under both. The description sits in the label's column,
 *  not the control's. */
export const WithDescription: Story = {
  args: { description: 'Musie follows this setting instead of your system theme.' },
};

/** The control in its off state. The row is the target, not the 32px track. */
export const ControlOff: Story = {
  args: {
    control: (
      <Switch
        id="fielditem-dark-mode"
        label="Dark mode"
        labelHidden
        accent="accent-placeholder1"
        onGlyph={Moon}
        offGlyph={Sun}
        checked={false}
      />
    ),
  },
};

/** A native checkbox instead of a Switch — §7.16 names "a Switch, checkbox or
 *  radio". A checkbox renders no label of its own, so `htmlFor` is the only
 *  association and the row shows exactly one label. */
export const WithCheckbox: Story = {
  args: {
    label: 'Send me the reflection by email',
    htmlFor: 'fielditem-email-copy',
    control: <input type="checkbox" id="fielditem-email-copy" defaultChecked />,
  },
};

/** A native radio. */
export const WithRadio: Story = {
  args: {
    label: 'By myself',
    htmlFor: 'fielditem-by-myself',
    control: <input type="radio" id="fielditem-by-myself" name="fielditem-here-as" defaultChecked />,
  },
};

/** Disabled. `disabled` on FieldItem only greys the label and description — the
 *  control has to be disabled separately, so this story sets both. */
export const Disabled: Story = {
  args: {
    disabled: true,
    description: 'Musie follows this setting instead of your system theme.',
    control: (
      <Switch
        id="fielditem-dark-mode"
        label="Dark mode"
        labelHidden
        accent="accent-placeholder1"
        onGlyph={Moon}
        offGlyph={Sun}
        checked
        disabled
      />
    ),
  },
};

/** `disabled` on the row alone, which is what the prop actually does: the label
 *  and description grey out and the switch stays operable. Kept so the defect
 *  in the build notes is visible rather than described. */
export const DisabledLabelOnly: Story = {
  args: {
    disabled: true,
    description: 'The switch beside this greyed-out label is still operable.',
  },
};

/** A long label and description. The grid gives the label column the remaining
 *  measure; the control keeps its own size. */
export const LongCopy: Story = {
  args: {
    label: 'Begleitgeräusche während der Hörübung automatisch stummschalten',
    description:
      'Nichts verlässt dein Gerät, bis du es teilst. Diese Einstellung gilt für alle Methoden.',
  },
};
