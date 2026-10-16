/**
 * Chip — a word the person put there, with a way to take it back out.
 *
 * Written against the component. The words are the reflect step's own, which
 * is its only consumer.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip, ChipRow } from '../src/Chip';
import { bothThemes, fixedWidth } from './_decorators';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          '**Purpose.** Show something the person already chose, and offer the one',
          'way to take it back out.',
          '',
          '**It is not a control, and only its × is.** That is the whole semantic',
          'difference between this and everything near it. A `FilterChips` chip is a',
          'checkbox — pressing it changes a query. A `SegmentedControl` option is a',
          'radio. This is a **noun**: a word already chosen, sitting there being true.',
          'Nothing happens when you press it, so nothing about it may suggest that',
          'something would — no hover, no active state, no pointer cursor, no focus',
          'ring on the chip itself. The remove control is the only interactive thing',
          'in the box.',
          '',
          '**Background only, no border.** An edge is what a control wears to say',
          'where you may press, and this is not a control. It is the one visual',
          'difference from every other chip in the system, and it is carrying meaning',
          'rather than taste.',
          '',
          '**Without `onRemove` it is a `<span>`.** A chip nobody can remove is a',
          'label, and a label needs no button slot and no name for a control that is',
          'not there.',
          '',
          '**`removeLabel` names the thing being removed.** Four chips whose buttons',
          'all say "Remove" are four identical buttons to anybody who cannot see',
          'which one they are on. Development warns when `onRemove` arrives without',
          'it.',
          '',
          '**`ChipRow` owns the gap** — `--space-gap-related`, L2’s rung for atoms',
          'that belong together. Shipped with the component so a screen cannot pick a',
          'different number, which is the argument `ButtonGroup` makes about a row of',
          'actions. It wraps rather than scrolls: a control strip can run off the',
          'side, content cannot.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'Glücklich',
    removeLabel: 'Glücklich entfernen',
  },
  argTypes: {
    children: { control: 'text', description: 'The word.' },
    onRemove: { action: 'remove', description: 'Offer a way to take it out. Omit and the chip is a <span>.' },
    removeLabel: { control: 'text', description: 'Rule 7 — names the thing being removed, not just "Remove".' },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With its ×. Hover the chip: nothing happens. Hover the ×: it responds. */
export const Default: Story = {};

/** No `onRemove`, so no button and no group — a `<span>` with a fill. This is
 *  what the diary entry would use if it drew chips; it draws plain text
 *  instead, for the same reason. */
export const ReadOnly: Story = {
  args: { onRemove: undefined, removeLabel: undefined },
};

/** A long word GROWS the chip; it never clips. A feeling cut in half is a
 *  different feeling. */
export const LongLabel: Story = {
  args: {
    children: 'Zufrieden mit dem, was der Tag gebracht hat',
    removeLabel: 'Zufrieden mit dem, was der Tag gebracht hat, entfernen',
  },
};

/** THE ROW, which is how the reflect step uses it. `as="ul"` because it is a
 *  list to anything that cannot see the gaps between them. */
export const Row: Story = {
  render: (args) => (
    <ChipRow as="ul">
      <Chip {...args} removeLabel="Überfordert entfernen">Überfordert</Chip>
      <Chip {...args} removeLabel="Dankbar entfernen">Dankbar</Chip>
      <Chip {...args} removeLabel="einfach nur Traurig entfernen">einfach nur Traurig</Chip>
    </ChipRow>
  ),
};

/** The row WRAPS at a narrow width rather than scrolling — content that runs
 *  off the side of a reading column is content somebody loses. */
export const RowWraps: Story = {
  decorators: [fixedWidth(320)],
  render: (args) => (
    <ChipRow as="ul">
      <Chip {...args} removeLabel="Überfordert entfernen">Überfordert</Chip>
      <Chip {...args} removeLabel="Dankbar entfernen">Dankbar</Chip>
      <Chip {...args} removeLabel="Hoffnungsvoll entfernen">Hoffnungsvoll</Chip>
      <Chip {...args} removeLabel="einfach nur Traurig entfernen">einfach nur Traurig</Chip>
    </ChipRow>
  ),
};
