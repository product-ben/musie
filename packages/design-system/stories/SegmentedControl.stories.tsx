/**
 * SegmentedControl — the EXEMPLAR story. Every other story file matches this
 * shape; see stories/CONVENTIONS.md.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.25. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mic, Pencil, Camera, Headphones } from 'lucide-react';
import { SegmentedControl } from '../src/SegmentedControl';
import { bothThemes, Stack } from './_decorators';

/* The prototype's own three options, verbatim — METHOD FLOW · Reflect,
   "How would you like to answer?". See PROTOTYPE-USAGE.md. */
const OPTIONS = [
  { value: 'voice', label: 'Record audio', glyph: Mic },
  { value: 'write', label: 'Write answer', glyph: Pencil },
  { value: 'photo', label: 'Take photo', glyph: Camera },
];

const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: RadioGroup + Radio (+ Fieldset when the group is labelled).',
          'APG pattern: Radio Group.',
          '',
          '**Not Tabs.** The choice here is an answer the surrounding form carries,',
          'not navigation between panels; `role="tablist"` would promise a tab/panel',
          'relationship that does not exist, and it would take the option out of the',
          'form. Roving arrow keys and the single tab stop come from RadioGroup',
          'either way, so the accessible behaviour is the same and the semantics are',
          'honest.',
          '',
          'Two to four options, each with an icon **and** text, all visible at once.',
          'Past four, segments get too narrow for a German label to survive and the',
          'right component is RadioGroupText or a Select.',
          '',
          '**Truncation.** Labels ellipse at one line. CSS truncation does not touch',
          'the accessibility tree, so the full label is still announced — which is',
          'why the icon is REQUIRED per option rather than optional: it is the cue',
          'that survives a clipped label for a sighted user. Below ~30rem of',
          'CONTAINER width the label stacks under the icon and gets the segment\'s',
          'full width, which recovers far more characters than shrinking the type.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'reflect-mode',
    legend: 'How would you like to answer?',
    options: OPTIONS,
    value: 'voice',
  },
  argTypes: {
    name: { control: 'text', description: 'Identifies the field when a form is submitted.' },
    legend: { control: 'text', description: 'The group’s accessible name. Rendered as a visible <legend> unless legendHidden — never dropped.' },
    legendHidden: { control: 'boolean', description: 'Hide the legend visually. It stays in the accessible name.' },
    options: { control: false, description: '2–4 options. Each needs value, label and a required Lucide glyph.' },
    value: { control: 'text', description: 'Controlled selection.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the new value.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent-placeholder1', 'accent-placeholder2'],
      description: 'Solved accent family. Literal placeholder names per Decision 3.',
    },
    guided: { control: 'boolean', description: 'Raise each segment to --target-guided (64px).' },
    disabled: { control: 'boolean', description: 'Disables the whole group.' },
    className: { control: false },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's own copy. */
export const Default: Story = {};

/** All three accent families. The prototype uses `accent-placeholder1`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <SegmentedControl {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <SegmentedControl {...args} name="a-p1" accent="accent-placeholder1" legend="accent: accent-placeholder1" />
      <SegmentedControl {...args} name="a-p2" accent="accent-placeholder2" legend="accent: accent-placeholder2" />
    </Stack>
  ),
};

/** `guided` raises every segment to --target-guided (64px) for assisted use. */
export const Guided: Story = { args: { guided: true, legend: 'guided — 64px targets' } };

/** The legend stays in the accessible name; only its visible rendering goes. */
export const LegendHidden: Story = { args: { legendHidden: true } };

/** Whole group disabled. */
export const Disabled: Story = { args: { disabled: true, legend: 'disabled group' } };

/** A single option disabled, the rest live. */
export const OptionDisabled: Story = {
  args: {
    legend: 'one option disabled',
    options: [
      { value: 'voice', label: 'Record audio', glyph: Mic },
      { value: 'write', label: 'Write answer', glyph: Pencil },
      { value: 'photo', label: 'Take photo', glyph: Camera, disabled: true },
    ],
  },
};

/** The floor of the specified range. Two options is legal; one is not. */
export const TwoOptions: Story = {
  args: {
    legend: 'two options — the floor',
    options: [
      { value: 'voice', label: 'Record audio', glyph: Mic },
      { value: 'write', label: 'Write answer', glyph: Pencil },
    ],
  },
};

/** The ceiling. Past four, the component warns in development and the right
 *  component is RadioGroupText or a Select. */
export const FourOptions: Story = {
  args: {
    legend: 'four options — the ceiling',
    options: [
      ...OPTIONS,
      { value: 'listen', label: 'Listen again', glyph: Headphones },
    ],
  },
};

/** Nothing selected. Valid: the group carries no default until the user picks. */
export const NoSelection: Story = { args: { value: undefined, legend: 'no selection' } };
