/**
 * Feelings Scale — stories. Shape per stories/CONVENTIONS.md, matching the
 * exemplar stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowDown, ArrowUp, Minus, Smile, Meh, Frown, Laugh } from 'lucide-react';
import { FeelingsScale } from '../src/FeelingsScale';
import { bothThemes, Row, Stack } from './_decorators';

/** The three the session asks for, lowest first. */
const POINTS = [
  { value: 'worse', label: 'Schlechter als vorher', glyph: ArrowDown },
  { value: 'same', label: 'Genau wie vorher', glyph: Minus },
  { value: 'better', label: 'Besser als vorher', glyph: ArrowUp },
];

const meta = {
  title: 'Components/Feelings Scale',
  component: FeelingsScale,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'One question about how somebody feels, answered on an **ordered** set of points.',
          '',
          '**Why this is not a Segmented Control.** §15 is specified for "two to four',
          'options, each with an icon AND text, all visible at once", which describes this',
          'component’s anatomy exactly — and describes nothing about what it means. The two',
          'differ in the only place that matters:',
          '',
          '- A segmented control **switches** something. Its options are alternatives, they',
          '  have no order, and reordering them changes nothing. Stack and List could trade',
          '  places tomorrow.',
          '- A scale **measures** something. Its points are ordered, the order *is* the',
          '  information, and reordering them is a different question. Worse–Same–Better',
          '  read in any other sequence is not the same instrument.',
          '',
          'That is why the selected point is not "the segment that is lit" but a position on',
          'an axis, why the axis is drawn, and why `points` is documented as ordered rather',
          'than as a set.',
          '',
          '**It is a radio group, like its siblings.** base-ui `Fieldset` + `RadioGroup`, the',
          'same construction §7.7, §13 and §15 all use: one answer, arrow keys between',
          'points, the legend naming the question. The ordering is carried by the DOM order,',
          'which is also what a screen reader walks — so the axis is decoration over a',
          'sequence that is already true, not a picture standing in for one.',
          '',
          '**Three to five points.** Two is a choice and belongs in a segmented control or a',
          'switch; past five the labels stop fitting side by side.',
          '',
          '**No default copy, deliberately.** Every word is the consumer’s. The siblings',
          'carry an `emptyLabel` that falls back to the German catalogue, and that fallback',
          'is exactly the leak CLAUDE.md rule 7 warns about.',
          '',
          '**Selection is carried three ways** — fill, a thickened edge, and the label going',
          'to full ink. None of the three is colour alone (1.4.1).',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-10-09. Delete once answered._',
          '_This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'session-feeling',
    legend: 'Wie fühlst du dich jetzt?',
    points: POINTS,
  },
  argTypes: {
    name: { control: 'text', description: 'The radio group’s name.' },
    legend: { control: 'text', description: 'The question. A scale with no question is a row of buttons.' },
    legendHidden: { control: 'boolean', description: 'Keep the legend for the accessible name, drop it from the page.' },
    points: { control: false, description: 'The points, in order, lowest first. Three to five.' },
    value: { control: 'text', description: 'The selected point’s value.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the selected point’s value.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'The shared radio accent union — `primary` unless the screen says otherwise.',
    },
    disabled: { control: 'boolean', description: 'Disables every point.' },
    className: { control: false },
  },
} satisfies Meta<typeof FeelingsScale>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: three points, nothing selected. */
export const Default: Story = {};

/** Answered. The selected point takes fill, a thicker edge and full-ink label. */
export const Selected: Story = { args: { value: 'better' } };

/** The three accents. Only the selected mark changes — conflict B25 neutralises
 *  selected-state edges across the radio components, accent modifiers included. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <Row label="accent: primary (default)"><FeelingsScale {...args} name="s-a" accent="primary" /></Row>
      <Row label="accent: accent"><FeelingsScale {...args} name="s-b" accent="accent" /></Row>
      <Row label="accent: accent-alt"><FeelingsScale {...args} name="s-c" accent="accent-alt" /></Row>
    </Stack>
  ),
  args: { value: 'same' },
};

/** The legend kept for the accessible name and dropped from the page, for a
 *  screen whose own heading already asks the question. */
export const LegendHidden: Story = { args: { legendHidden: true, value: 'same' } };

/** Disabled, from the inherited radio state model. */
export const Disabled: Story = { args: { value: 'same', disabled: true } };

/** One point disabled — the others stay reachable. */
export const PointDisabled: Story = {
  args: {
    points: [
      POINTS[0],
      { ...POINTS[1], disabled: true },
      POINTS[2],
    ],
  },
};

/** Five points, the ceiling. Past this the labels stop fitting side by side. */
export const FivePoints: Story = {
  args: {
    points: [
      { value: '1', label: 'Viel schlechter', glyph: Frown },
      { value: '2', label: 'Schlechter', glyph: ArrowDown },
      { value: '3', label: 'Gleich', glyph: Meh },
      { value: '4', label: 'Besser', glyph: Smile },
      { value: '5', label: 'Viel besser', glyph: Laugh },
    ],
    value: '4',
  },
};

/** The longest labels the session asks for, at the narrowest width the app
 *  draws — the case where the balance of the label text actually matters. */
export const LongLabels: Story = {
  render: (args) => (
    <div style={{ inlineSize: '340px' }}>
      <FeelingsScale {...args} />
    </div>
  ),
  args: { value: 'worse' },
};
