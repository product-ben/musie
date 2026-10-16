/**
 * DrillDown — a tree narrowed one level at a time.
 *
 * Written against the source. The tree below is the first two branches of the
 * reflect step's emotion wheel, verbatim from
 * apps/web/src/content/emotionWheel.ts — which is the consumer this was built
 * for, and German because that is the side the app shows.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DrillDown } from '../src/DrillDown';
import type { DrillDownLevel, DrillDownNode } from '../src/DrillDown';
import { RadioCards } from '../src/RadioCards';
import { RadioGroupText } from '../src/RadioGroupText';
import { bothThemes, fixedWidth } from './_decorators';

const WHEEL: DrillDownNode[] = [
  {
    id: 'happy',
    label: 'Glücklich',
    children: [
      {
        id: 'optimistic',
        label: 'Optimistisch',
        children: [
          { id: 'powerful', label: 'Kraftvoll' },
          { id: 'inspired', label: 'Inspiriert' },
        ],
      },
      {
        id: 'trusting',
        label: 'Vertrauensvoll',
        children: [
          { id: 'sensitive', label: 'Feinfühlig' },
          { id: 'intimate', label: 'Vertraut' },
        ],
      },
      { id: 'peaceful', label: 'Friedlich' },
    ],
  },
  {
    id: 'sad',
    label: 'Traurig',
    children: [
      {
        id: 'lonely',
        label: 'Einsam',
        children: [
          { id: 'isolated', label: 'Isoliert' },
          { id: 'abandoned', label: 'Verlassen' },
        ],
      },
      { id: 'vulnerable', label: 'Verletzlich' },
    ],
  },
  { id: 'surprised', label: 'Überrascht' },
];

/* Rule 7 all the way down: every string the component draws is passed. */
const LABELS = {
  stopLabel: (parent: string) => `einfach nur ${parent}`,
  backLabel: (parent: string) => `Zurück zu ${parent}`,
  levelLabel: (parent: string, count: number) => `${parent} — ${count} Gefühle`,
};

/** The slot the one real consumer passes. */
function TextLevel(level: DrillDownLevel) {
  return (
    <RadioGroupText
      name={`drilldown-${level.depth}`}
      legend={level.parent === null ? 'Was spürst du gerade in dir?' : level.parent.label}
      legendHidden
      options={level.options.map((o) => ({
        value: o.value,
        label: o.label,
        disabled: o.disabled,
        drillDown: o.drillDown,
        drillDownLabel: o.drillDown ? 'weitere Gefühle' : undefined,
      }))}
      value={level.value}
      onValueChange={level.onChoose}
      emptyLabel="Keine Gefühle hier"
    />
  );
}

/* A component and not an inline `render`, because it holds state: a hook in
   a function called `render` is `react-hooks/rules-of-hooks`, and the rule is
   right — React identifies components by name. */
function PathReadout(args: React.ComponentProps<typeof DrillDown>) {
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 'var(--space-gap-stack)' }}>
      <DrillDown {...args} onPick={(path) => setPicked(path.map((n) => n.id).join(' › '))} />
      <p data-type-step="body-sm" style={{ margin: 0, color: 'var(--on-surface-muted)' }}>
        {picked === null ? 'nothing picked yet' : `onPick: ${picked}`}
      </p>
    </div>
  );
}

const meta = {
  title: 'Components/DrillDown',
  component: DrillDown,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          '**Purpose.** Find one word in a tree too large to read. Built for the',
          'reflect step’s emotion wheel — 8 primary feelings, 40 below them, 80 below',
          'those — where the whole problem is that reading 128 words is not how',
          'anyone finds the one they mean.',
          '',
          '**It draws no rows.** `children` is a function handed the level to draw, so',
          'this component imports no selection component at all. It owns the stack,',
          'the back row, the stop row, the announcement and the focus move. There is',
          'deliberately **no default slot**: a default would mean importing one',
          'selection component, which is the single thing the slot exists to avoid.',
          '',
          '**Each level is its own question.** The rows are radios with a trailing',
          'arrow (`RadioGroupText`’s `drillDown` option), not plain buttons. Within',
          'the question on screen, choosing *Optimistisch* **is** a choice — its',
          'consequence is that the next question is asked. The arrow carries an',
          'accessible suffix so the two kinds of row are told apart without sight.',
          '',
          '**The stop is the first row, not the last.** From level 2 down the slot is',
          'handed an extra option first: *einfach nur {parent}*. Somebody who has',
          'already found their word should not have to read past six narrower ones to',
          'say so.',
          '',
          '**Nothing is ever pre-checked**, including on the way back up: what was',
          'picked at a level is no longer what is being asked there.',
          '',
          '**Escape is not taken.** It belongs to the surface this sits in — Lightbox,',
          'in the one consumer that exists. Going up a level must never race closing',
          'the sheet, so the back row is the only way up.',
          '',
          '**What the consumer owns.** `onPick` reports the full path and nothing',
          'else. “Show two buttons once something has been picked” is a fact about the',
          'reflect flow, not about drill-downs.',
        ].join('\n'),
      },
    },
  },
  args: {
    nodes: WHEEL,
    ...LABELS,
    children: TextLevel,
    /* Explicit, although argTypes marks it an action: `onPick` is REQUIRED on
       DrillDownProps, so `satisfies Meta<typeof DrillDown>` will not accept a
       meta that only promises one through an action argType. */
    onPick: () => {},
  },
  argTypes: {
    nodes: { control: false, description: 'The tree. A node with no children is a leaf.' },
    onPick: { action: 'pick', description: 'A leaf or a stop row was chosen. The whole path, root first.' },
    children: { control: false, description: 'THE SLOT — a function handed the level to draw.' },
    stopLabel: { control: false, description: 'Rule 7 — the stop row, e.g. “einfach nur Glücklich”.' },
    backLabel: { control: false, description: 'Rule 7 — the back row, e.g. “Zurück zu Glücklich”.' },
    levelLabel: { control: false, description: 'Rule 7 — the live region announcing a new level.' },
    disabledIds: { control: false, description: 'Nodes already held. Leaves only — a branch is never shut.' },
  },
} satisfies Meta<typeof DrillDown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** LEVEL 1. Eight words, no back row, no stop row — there is nothing above to
 *  stop at. Every row descends except the leaves. */
export const Default: Story = {};

/** WHAT A PICK LOOKS LIKE. The path is reported root first, so the consumer
 *  can store the route rather than the word — which is what the feelings
 *  table does, because a label is not a key: *Kraftvoll* appears twice in the
 *  real wheel and *Entzückt* appears twice. */
export const ReportsThePath: Story = {
  render: (args) => <PathReadout {...args} />,
};

/** ALREADY HELD. `disabledIds` disables LEAVES only — holding *Kraftvoll*
 *  must not shut the door on *Optimistisch*, which is the route to the other
 *  word under it. Drill into Glücklich › Optimistisch to see it. */
export const SomeAlreadyHeld: Story = {
  args: { disabledIds: ['powerful', 'peaceful'] },
};

/** A SHALLOW TREE — every node a leaf, so no row descends and no level can be
 *  entered. The back row and the stop row never appear. */
export const Shallow: Story = {
  args: {
    nodes: [
      { id: 'yes', label: 'Ja' },
      { id: 'no', label: 'Nein' },
      { id: 'maybe', label: 'Vielleicht' },
    ],
  },
};

/** AN EMPTY TREE. The component renders its frame and the slot renders its
 *  own empty state — which is the slot's business, not this component's, and
 *  is why there is no `emptyLabel` on `DrillDownProps`. */
export const Empty: Story = { args: { nodes: [] } };

/** A SECOND COMPONENT IN THE SLOT, and this story is the only proof the API
 *  is generic. A slot nothing has ever been swapped in is a slot that does
 *  not work.
 *
 *  `RadioCards` has no `drillDown` option — it is not meant to — so the arrow
 *  is absent and the descending rows say so in their body text instead. That
 *  is the slot working: the frame is unchanged and the rows are entirely the
 *  consumer's. */
export const CardsInTheSlot: Story = {
  args: {
    children: (level: DrillDownLevel) => (
      <RadioCards
        name={`drilldown-cards-${level.depth}`}
        legend={level.parent === null ? 'Was spürst du gerade in dir?' : level.parent.label}
        legendHidden
        headingLevel={3}
        options={level.options.map((o) => ({
          value: o.value,
          headline: o.label,
          description: o.drillDown ? 'Führt zu weiteren Gefühlen' : undefined,
          disabled: o.disabled,
        }))}
        value={level.value}
        onValueChange={level.onChoose}
        emptyLabel="Keine Gefühle hier"
      />
    ),
  },
};

/** AT PHONE WIDTH. Nine rows and a back row in a 360px column, which is the
 *  width the real consumer is read at — the sheet on a phone. */
export const Narrow: Story = { decorators: [fixedWidth(360)] };
