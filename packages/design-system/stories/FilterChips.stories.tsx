/**
 * FilterChips — two levels, scrolled rather than divided.
 *
 * Docs text below is taken from the component's own header comment and from
 * this component's entries in stories/OPEN-QUESTIONS.md. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, Clock, Heart, Music, Tag, Timer, Users } from 'lucide-react';
import { FilterChips } from '../src/FilterChips';
import { bothThemes, Stack } from './_decorators';

/* The product's own two filterable things — the diary's status (G.1 ships it
   as a one-level SegmentedControl) and a session's length — plus the exercise
   it came from. Level 2 carries glyphs on one dimension only, because the
   glyph is optional there and the set should show that it is. */
const DIMENSIONS = [
  {
    value: 'status',
    label: 'Status',
    glyph: Tag,
    values: [
      { value: 'finished', label: 'Finished' },
      { value: 'unfinished', label: 'Unfinished' },
    ],
  },
  {
    value: 'length',
    label: 'Length',
    glyph: Clock,
    values: [
      { value: 's', label: 'Under 5 min', glyph: Timer },
      { value: 'm', label: '5 to 15 min', glyph: Timer },
      { value: 'l', label: 'Over 15 min', glyph: Timer },
    ],
  },
  {
    value: 'exercise',
    label: 'Exercise',
    glyph: BookOpen,
    values: [
      { value: 'cards', label: 'Mindfulness cards' },
      { value: 'listen', label: 'Listening' },
      { value: 'reflect', label: 'Reflection' },
    ],
  },
];

const meta = {
  title: 'Components/FilterChips',
  component: FilterChips,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: CheckboxGroup + Checkbox at level 2; a plain disclosure button',
          'at level 1 (+ Fieldset when the set is labelled). APG patterns:',
          'Disclosure for the level-1 chip, and a labelled group of checkboxes for',
          'level 2.',
          '',
          '**Two levels, not two components.** Level 1 is the DIMENSION — what is',
          'being filtered on. Pressing it opens that dimension’s level-2 row',
          'underneath, and level 2 is the VALUES, several of which can be on at',
          'once. Only one dimension is open at a time: the level-2 row is one strip',
          'below the whole level-1 row, so two open dimensions would have to share',
          'it.',
          '',
          '**Not a SegmentedControl**, and the difference is the question each asks.',
          'SegmentedControl asks "which one?" and takes an answer the surrounding',
          'form carries — a RadioGroup, two to four options, equal widths. This asks',
          '"which of these, and how many?" — a CheckboxGroup, any number of',
          'dimensions, scrolled rather than divided. The two share their BUILD-UP',
          '(the rungs, the accent families, the chip anatomy) and share no semantics',
          'at all.',
          '',
          '**What is controlled, and what is not.** The selection is controlled,',
          'exactly as SegmentedControl’s is: it is the query the screen runs, and',
          'only the screen can own it. Pass `value` and `onValueChange` or nothing',
          'moves. Which dimension is open is presentation, and this component owns',
          'it unless asked not to — `open` makes it controlled, `defaultOpen` seeds',
          'the internal state, `onOpenChange` reports either way.',
          '',
          '**Nothing truncates.** SegmentedControl ellipses its labels because its',
          'width is divided by the number of options. A chip row scrolls, so width',
          'is the cheap axis here and every label stays whole — which is also why',
          'the glyph is required at level 1 and optional at level 2: a chip can be',
          'cut by the scroller’s trailing edge, and the glyph sits at the leading',
          'edge, so on the dimension it is the part that survives.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding. Delete once answered._',
          '_This is not documentation._',
          '',
          '**FilterChips — a closed chip says IT is filtering, not how much, and a',
          'screen reader is told both.** With its values row closed, an active',
          'level-1 chip carries the tinted fill and the × — so a sighted user reads',
          '"this dimension is filtering" and cannot read "on two of five values"',
          'without opening it again. Every real filter bar paints the count in the',
          'chip: _Duration · 2_. What I did: wrote the count for screen readers only',
          '— `filterSelected(count)`, "2 ausgewählt" / "2 selected", in a',
          '`.musy-sr-only` span inside the chip’s own name — and did NOT paint it.',
          'The brief names one thing on the trailing edge and it is the ×; a number',
          'beside it changes the chip’s anatomy past what was asked for, and it is',
          'the anatomy that would then have to hold at the 36px rung with a glyph, a',
          'label, a count, a chevron and an ×. **What I need from Ben: whether a',
          'closed active chip paints its count.**',
          '',
          '**FilterChips — the four things the brief did not say**, each answered',
          'from what the system had already decided: one dimension open at a time',
          '(the stated geometry leaves no other reading); the chevron stays when the',
          '× arrives (otherwise an active-and-open chip has its fill as the only',
          'open cue, which 1.4.1 rules out); the selection is controlled and the',
          'open chip is not; nothing truncates. **Nothing needed from Ben on these',
          'four.**',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'diary-filter',
    legend: 'Filter your sessions',
    dimensions: DIMENSIONS,
    value: {},
  },
  argTypes: {
    name: { control: 'text', description: 'Identifies the fields when a form is submitted: `${name}-${dimension}`.' },
    legend: { control: 'text', description: 'The set’s accessible name. Rendered as a visible <legend> unless legendHidden — never dropped.' },
    legendHidden: { control: 'boolean', description: 'Hide the legend visually. It stays in the accessible name.' },
    dimensions: { control: false, description: 'Level 1. Any number — the row scrolls, so there is no ceiling and no floor. Each needs value, label, a required Lucide glyph and its values.' },
    value: { control: false, description: 'The selection, controlled. A dimension with nothing selected is absent, never present with an empty array.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the WHOLE next selection, never with one dimension’s slice.' },
    open: { control: 'text', description: 'Which dimension is expanded, or null for none. Pass it to control the disclosure; leave it out and the component owns it.' },
    defaultOpen: { control: 'text', description: 'Seeds the internal open state. Ignored when `open` is passed.' },
    onOpenChange: { action: 'openChange', description: 'Fires with the dimension now expanded, or null.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Solved accent family. `accent-alt` is for contexts where warnings are common.',
    },
    size: {
      control: 'inline-radio',
      options: ['min', 'primary'],
      description: 'The chip height. `primary` (44px) by default; `min` is the 36px rung, for a filter bar that sits in a row of page furniture rather than in a form.',
    },
    emptyLabel: { control: 'text', description: 'What a dimension with no values says. Falls back to the catalogue’s optionsEmpty.' },
    disabled: { control: 'boolean', description: 'Disables every chip in the set.' },
    className: { control: false },
  },
} satisfies Meta<typeof FilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: three dimensions, nothing selected, nothing open. */
export const Default: Story = {};

/** The two rungs. `min` is 36px, the same height a `min` CtaButton and a `min`
 *  SegmentedControl come to — they stand in the same rows and have to agree. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <FilterChips {...args} name="f-primary" size="primary" legend="size: primary — 44px (default)" />
      <FilterChips {...args} name="f-min" size="min" legend="size: min — 36px" />
    </Stack>
  ),
  args: { defaultOpen: 'length', value: { length: ['m'] } },
};

/** All three accent families, each with one dimension filtering so the tinted
 *  selection and the accent edge are both on screen. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <FilterChips {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <FilterChips {...args} name="a-p1" accent="accent" legend="accent: accent" />
      <FilterChips {...args} name="a-p2" accent="accent-alt" legend="accent: accent-alt" />
    </Stack>
  ),
  args: { defaultOpen: 'length', value: { length: ['s', 'm'] } },
};

/** Level 2 open. The tray takes the chip's own sunken fill, so the two read as
 *  one object rather than as a chip with a strip under it. */
export const Open: Story = { args: { open: 'length', legend: 'one dimension open' } };

/**
 * Filtering with the row closed — the state the brief's × is for.
 *
 * The chip carries the tinted fill and the ×; the count is spoken, not painted.
 * That asymmetry is this component's one open question — see the build notes.
 */
export const Active: Story = {
  args: {
    legend: 'two dimensions filtering, both closed',
    value: { length: ['s', 'm'], status: ['finished'] },
  },
};

/** Filtering AND open. The accent fill wins over the open fill, and the open
 *  state is still readable because the chevron's rotation is not a colour. */
export const ActiveAndOpen: Story = {
  args: {
    legend: 'filtering and open',
    open: 'length',
    value: { length: ['s', 'm'] },
  },
};

/** Every value in one dimension ticked, so the check glyph is visible on each.
 *  The glyph is always in the box — hidden, not absent — so ticking a chip
 *  never shifts the chips after it along the row. */
export const AllValuesChecked: Story = {
  args: {
    legend: 'every value ticked',
    open: 'exercise',
    value: { exercise: ['cards', 'listen', 'reflect'] },
  },
};

/** A dimension with no values. The component warns in development; the tray
 *  says so in the same words RadioGroupText and RadioCards use. */
export const EmptyDimension: Story = {
  args: {
    legend: 'a dimension with no values',
    open: 'mood',
    dimensions: [
      ...DIMENSIONS,
      { value: 'mood', label: 'Mood', glyph: Heart, values: [] },
    ],
  },
};

/** The legend stays in the accessible name; only its visible rendering goes. */
export const LegendHidden: Story = { args: { legendHidden: true } };

/** The whole set disabled, with one dimension filtering and one open — a
 *  disabled control shows its state rather than hiding it. */
export const Disabled: Story = {
  args: {
    legend: 'disabled set',
    disabled: true,
    open: 'length',
    value: { length: ['m'] },
  },
};

/** One dimension disabled, the rest live. */
export const DimensionDisabled: Story = {
  args: {
    legend: 'one dimension disabled',
    dimensions: [
      DIMENSIONS[0],
      { ...DIMENSIONS[1], disabled: true },
      DIMENSIONS[2],
    ],
  },
};

/** One value disabled inside an open dimension. */
export const ValueDisabled: Story = {
  args: {
    legend: 'one value disabled',
    open: 'exercise',
    dimensions: [
      DIMENSIONS[0],
      DIMENSIONS[1],
      {
        ...DIMENSIONS[2],
        values: [
          { value: 'cards', label: 'Mindfulness cards' },
          { value: 'listen', label: 'Listening' },
          { value: 'reflect', label: 'Reflection', disabled: true },
        ],
      },
    ],
  },
};

/** The floor. One dimension is a legal filter bar — there is no two-option
 *  minimum of the kind SegmentedControl has, because nothing is being divided. */
export const OneDimension: Story = {
  args: { legend: 'one dimension — the floor', dimensions: [DIMENSIONS[1]] },
};

/** Past the width of the pane, which is what the scroll is for: no ceiling,
 *  and the trailing chip is cut from the right so its glyph survives. */
export const ManyDimensions: Story = {
  args: {
    legend: 'six dimensions — the row scrolls',
    dimensions: [
      ...DIMENSIONS,
      { value: 'mood', label: 'Mood', glyph: Heart, values: [{ value: 'calm', label: 'Calm' }, { value: 'tense', label: 'Tense' }] },
      { value: 'with', label: 'Together with', glyph: Users, values: [{ value: 'alone', label: 'On my own' }, { value: 'partner', label: 'With my partner' }] },
      { value: 'track', label: 'Track', glyph: Music, values: [{ value: 'any', label: 'Any track' }] },
    ],
  },
};

/** The longest labels German will produce, at both levels, so the row scrolls
 *  rather than the labels shrinking or wrapping. */
export const LongLabels: Story = {
  args: {
    legend: 'die längsten Labels, die Deutsch produziert',
    open: 'with',
    dimensions: [
      {
        value: 'with',
        label: 'Gemeinsam mit',
        glyph: Users,
        values: [
          { value: 'alone', label: 'Alleine, ohne Begleitung' },
          { value: 'partner', label: 'Mit meiner Partnerin oder meinem Partner' },
        ],
      },
      { value: 'length', label: 'Sitzungsdauer', glyph: Clock, values: DIMENSIONS[1].values },
    ],
    value: { with: ['partner'] },
  },
};
