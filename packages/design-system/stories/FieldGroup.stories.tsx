/**
 * FieldGroup — Batch B (controls). Exported from src/Field.tsx.
 *
 * Docs text below comes from the component's own doc comment and from
 * docs/07-components.md §7.16. Nothing is invented.
 *
 * The prototype never uses FieldGroup — see PROTOTYPE-USAGE.md, "Components
 * with no prototype usage at all". The fields inside these stories are the
 * prototype's own Field usages, unchanged.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moon, Sun } from 'lucide-react';
import { FieldGroup, Field, FieldItem } from '../src/Field';
import { Switch } from '../src/Switch';
import { bothThemes } from './_decorators';

const PRIVACY_NOTE = 'Nothing leaves your device until you share it.';

const meta = {
  title: 'Components/FieldGroup',
  component: FieldGroup,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A run of fields, rendered as a `<fieldset>` with its native border, padding and',
          'margin removed.',
          '',
          '**The gap between two fields is the STACK gap, never the related gap** — a label',
          'must never read as belonging to the field above it.',
          '',
          '`legend` renders a `<legend>`. Omit it only when the group has a heading beside',
          'it.',
          '',
          '**What it is NOT.** Not a form, and not a layout primitive — it owns one gap and',
          'one accessible grouping.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## FieldGroup — `legend` is documented as visible and is hardcoded visually hidden',
          'Where: `src/Field.tsx:176` (`<legend className="musy-sr-only">`) vs the prop’s own',
          'doc comment at `src/Field.tsx:167` ("Renders a `<legend>`. Omit only when the group',
          'has a heading beside it.")',
          'What I checked: Level 1 contradicts itself inside one file — the comment implies a',
          'visible legend, and the JSX always applies `musy-sr-only`. Level 3, §7.16,',
          'describes FieldGroup in one sentence and does not mention the legend at all. Level',
          '2 has no usage.',
          'What I did: the `WithLegend` story sets `legend` and its note says the legend is',
          'screen-reader-only.',
          'Why: the JSX is what runs.',
          'What I need from Ben: **a decision.** Either the comment is wrong, or FieldGroup',
          'needs a `legendHidden` prop like SegmentedControl’s, which is the pattern the rest',
          'of the system uses.',
          '',
          '## FieldGroup — no group-level `disabled` and no group-level `error`',
          'Where: `src/Field.tsx:164-180`',
          'What I checked: Level 1. `FieldGroupProps` is `legend`, `children` and `className`',
          'and nothing else — a `<fieldset>` with no `disabled`, although the native element',
          'supports it and disabling a run of fields together is the usual reason to reach for',
          'one. Level 3 adds nothing.',
          'What I did: wrote `Default`, `WithLegend`, a mixed story and a disabled story that',
          'disables each child field individually. No group-level disabled or error story,',
          'because the props do not exist.',
          'Why: adding one would mean inventing a prop.',
          'What I need from Ben: nothing, just flagging.',
          '',
          '## FieldGroup — no prototype usage, so the contents of its stories are borrowed',
          'Where: `stories/PROTOTYPE-USAGE.md`, "Components with no prototype usage at all"',
          'What I checked: Level 2 lists `FieldGroup` and `FieldItem` as unused by the',
          'prototype. Level 3, §7.16, gives one sentence.',
          'What I did: filled the group with the prototype’s own Field usages — the reflect',
          'step’s "Your written answer" and the END screen’s "Email address" — unchanged.',
          'Why: it is the nearest existing copy; inventing new fields would be a design',
          'decision.',
          'What I need from Ben: nothing, just flagging that the contents are borrowed.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: null,
  },
  argTypes: {
    legend: {
      control: 'text',
      description: 'Renders a <legend>. Omit only when the group has a heading beside it.',
    },
    children: { control: false, description: 'The fields in the run.' },
    className: { control: false },
  },
} satisfies Meta<typeof FieldGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two fields, no legend. The gap between them is the STACK gap, so the second
 *  label cannot read as belonging to the first field. */
export const Default: Story = {
  args: {
    children: (
      <>
        <Field label="Your written answer" multiline rows={3} description={PRIVACY_NOTE} />
        <Field
          label="Email address"
          type="email"
          description="Only the answer you just gave is sent. Nothing else from your session."
        />
      </>
    ),
  },
};

/** With a legend. The `<legend>` is hardcoded `musy-sr-only`, so it names the
 *  group for assistive tech and is never visible — see the build notes. */
export const WithLegend: Story = {
  args: {
    legend: 'Share your reflection',
    children: (
      <>
        <Field label="Your written answer" multiline rows={3} description={PRIVACY_NOTE} />
        <Field
          label="Email address"
          type="email"
          description="Only the answer you just gave is sent. Nothing else from your session."
        />
      </>
    ),
  },
};

/** A single field. Legal, and the gap rule has nothing to do. */
export const OneField: Story = {
  args: {
    legend: 'Share your reflection',
    children: <Field label="Email address" type="email" />,
  },
};

/** A run that mixes Fields with FieldItems — a typed answer above a setting
 *  row. The stack gap applies to both. */
export const MixedWithFieldItems: Story = {
  args: {
    legend: 'Settings',
    children: (
      <>
        <Field label="Email address" type="email" value="ldamn@nitz.com" />
        <FieldItem
          label="Dark mode"
          htmlFor="fieldgroup-dark-mode"
          description="Musie follows this setting instead of your system theme."
          control={
            <Switch
              id="fieldgroup-dark-mode"
              label="Dark mode"
              labelHidden
              accent="accent"
              onGlyph={Moon}
              offGlyph={Sun}
              checked
            />
          }
        />
      </>
    ),
  },
};

/** One field in the run carries an error. The group does not own validity —
 *  the error belongs to the field that caused it. */
export const WithErrorInOneField: Story = {
  args: {
    legend: 'Share your reflection',
    children: (
      <>
        <Field label="Your written answer" multiline rows={3} value="Noticed my shoulders." />
        <Field
          label="Email address"
          type="email"
          value="ldamn@"
          error="Enter a complete email address."
          description="Only the answer you just gave is sent. Nothing else from your session."
        />
      </>
    ),
  },
};

/** Every field disabled. FieldGroup has no `disabled` of its own, so each child
 *  carries it — see the build notes. */
export const AllFieldsDisabled: Story = {
  args: {
    legend: 'Share your reflection',
    children: (
      <>
        <Field label="Your written answer" multiline rows={3} disabled value="Noticed my shoulders." />
        <Field label="Email address" type="email" disabled value="ldamn@nitz.com" />
      </>
    ),
  },
};

/** The longest run the settings screen could carry: required, read-only and
 *  errored fields in one group. */
export const LongRun: Story = {
  args: {
    legend: 'Your account',
    children: (
      <>
        <Field label="Email address" type="email" required value="ldamn@nitz.com" />
        <Field label="Account created" readOnly value="17 September 2026" />
        <Field
          label="Phone number"
          type="tel"
          value="+49 30"
          error="Enter a complete phone number."
        />
        <Field label="Your written answer" multiline rows={3} description={PRIVACY_NOTE} />
      </>
    ),
  },
};
