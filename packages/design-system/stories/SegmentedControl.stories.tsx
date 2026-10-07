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
          '**Which segments draw their word** is one prop, `labels`, with three',
          'values. `all` is the component as specified. `unchecked` stands the',
          'chosen segment as its glyph alone and leaves every OFF segment its word:',
          'the chosen one is already told three ways — fill, border weight, ink — so',
          'the word is spent on the segment you might press, naming what you would',
          'get rather than where you are. `none` draws the glyphs alone.',
          '',
          '**The label is never dropped** in any of the three. The text is what names',
          'each radio, and without it the group announces as an unnamed set (4.1.2),',
          'so a label the control does not draw is hidden with the `.musy-sr-only`',
          'declarations instead. A presentation switch, never a content one.',
          '',
          '`unchecked` and `none` also both stop the track stretching: a control that',
          'names at most one option is page furniture, so it takes the width of its',
          'own segments rather than the width on offer.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          'Two entries in stories/OPEN-QUESTIONS.md: `iconOnly` — now `labels:',
          'none` — could not shrink to its content while the root carried',
          '`container-type: inline-size`, and the segments still take the user',
          'agent\'s focus ring rather than the system\'s. A third notes that',
          '`labels: unchecked` steps the track\'s width on selection.',
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
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Solved accent family. `accent` is the default; `accent-alt` is for contexts where warnings are common.',
    },
    size: {
      control: 'inline-radio',
      options: ['min', 'primary'],
      description: 'The segment height. `primary` (44px) by default; `min` is the 24px rung, for a control that sits in a row of page furniture rather than in a form.',
    },
    labels: {
      control: 'inline-radio',
      options: ['all', 'unchecked', 'none'],
      description: 'Which segments draw their label. `unchecked` gives the word to the segments that are off; `none` draws the glyphs alone. The text is never dropped — it is hidden with the .musy-sr-only declarations.',
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

/** The two rungs. `guided` is the third and keeps its own boolean. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <SegmentedControl {...args} name="s-primary" size="primary" legend="size: primary — 44px (default)" />
      <SegmentedControl {...args} name="s-min" size="min" legend="size: min — 24px" />
    </Stack>
  ),
};

/**
 * The three label modes, on the two-option toggle each of them is for.
 *
 * `unchecked` is shown twice — once selected either way — because which word
 * is on show is the state, and a story documents a state rather than
 * simulating a session (CONVENTIONS §5). `none` and `unchecked` both stop the
 * track stretching: a control that names at most one option is page furniture,
 * so it takes the width of its own segments instead of the width on offer.
 */
export const Labels: Story = {
  render: (args) => (
    <Stack>
      <SegmentedControl {...args} name="l-all" legend="labels: all (default)" />
      <SegmentedControl {...args} name="l-off-1" labels="unchecked" legend="labels: unchecked — the word is on the segment you might press" />
      <SegmentedControl {...args} name="l-off-2" labels="unchecked" value="write" legend="labels: unchecked — the same control, selected the other way" />
      <SegmentedControl {...args} name="l-none" labels="none" legend="labels: none — glyphs alone, still announced" />
      <SegmentedControl {...args} name="l-off-min" labels="unchecked" size="min" legend="labels: unchecked at the min rung — /exercises' own case" />
      <SegmentedControl {...args} name="l-none-min" labels="none" size="min" legend="labels: none at the min rung" />
    </Stack>
  ),
  args: {
    options: [
      { value: 'voice', label: 'Record audio', glyph: Mic },
      { value: 'write', label: 'Write answer', glyph: Pencil },
    ],
  },
};

/**
 * All three accent families. The prototype uses `accent`, and so does
 * /exercises since 2026-10-08, where the view switch answers in the same
 * ocher as the goal question beside it.
 *
 * ── IN PRACTICE IT CHANGES THE INK AND NOTHING ELSE ──────────────────────
 * The rule at §15 sets a `-border` as well, and **that border is not drawn**:
 * conflict B25 neutralises selected-state edges across this component,
 * RadioGroupText and both radio cards, including the accent modifiers by
 * name. So the only thing an accent family changes on a rendered segmented
 * control is the checked segment's INK. Measured on a real one rather than
 * read off the rule:
 *
 * | pair | light | dark | bar |
 * |---|---|---|---|
 * | checked ink on its own fill | 6.37 | 5.17 | 4.5 · 1.4.3 |
 * | unchecked ink on the track | 5.27 | 6.71 | 4.5 · 1.4.3 |
 * | *(the same two under `primary`)* | 6.37 · 5.27 | 5.17 · 6.71 | — |
 *
 * **The accent is contrast-neutral**: it swaps one dark brown for another and
 * moves nothing by more than a rounding error. That is also why it is a quiet
 * change to look at — do not expect it to read as yellow.
 *
 * Neither pair is in `tokens/_audit.json`: the audit covers this ink on
 * `surface` and on its own tint, but not on the raised surface the checked
 * segment actually paints. Logged in OPEN-QUESTIONS.md.
 *
 * WHAT CARRIES SELECTION, since it is not the edge: the lifted fill and the
 * ink step (B25's own account), plus — in `labels="unchecked"` — the label
 * itself, which is the one cue that survives both the hue and the fill going.
 * The lifted fill alone is 1.22:1 against the track, so it is the structural
 * difference doing the work, not the colour.
 */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <SegmentedControl {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <SegmentedControl {...args} name="a-p1" accent="accent" legend="accent: accent" />
      <SegmentedControl {...args} name="a-p2" accent="accent-alt" legend="accent: accent-alt" />
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
