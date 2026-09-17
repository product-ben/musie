/**
 * Hint — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.24. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock, Layers, Volume2 } from 'lucide-react';
import { Hint } from '../src/Hint';
import { Icon } from '../src/Icon';
import { bothThemes, Row, Stack } from './_decorators';

/* The prototype's own three hints, verbatim — METHOD RECOMMENDATION, three
   Hint-wrapped facts inside each Radio Card. See PROTOTYPE-USAGE.md. */
const FACTS = [
  { text: '2–12 minutes', glyph: Clock },
  { text: 'Needs your Mindfulness Cards deck', glyph: Layers },
  { text: 'Sound on — headphones recommended', glyph: Volume2 },
];

const meta = {
  title: 'Components/Hint',
  component: Hint,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A hover bubble for something that is NOT a control: explain one glyph, figure',
          'or abbreviation where there is no control to hang a tooltip on.',
          '',
          '**Why not §7.2’s tooltip.** That one belongs to an Icon Button and takes its',
          'string from the button’s own aria-label, so the string is authored once. A',
          'Hint has no owner to borrow from, and it usually sits INSIDE a control — a',
          'glyph in a Radio Card — where a second focusable element would be illegal and',
          'a second tab stop unwelcome.',
          '',
          '**So the bubble is a pointer shortcut, never the only copy.** The same string',
          'is always rendered as visually-hidden text inside the trigger, which keeps it',
          'clear of 1.4.13: nothing appears on hover that is not already in the',
          'accessible name. Coarse pointers drop the bubble entirely — the same call',
          '§7.2 makes, because a touch-triggered bubble sits under the finger.',
          '',
          'Not base-ui Tooltip: that primitive assumes a focusable trigger and gives it',
          'aria-describedby. Here there is nothing focusable to describe.',
          '',
          'The bubble shares §7.2’s appearance block verbatim — one bubble look in the',
          'system, authored once.',
          '',
          '**What it is NOT.** Not a popover (no click, no focus, no interactive content',
          'inside), not a disclosure, not a way to hide something the user needs.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Hint — the bubble cannot be shown in a story, only hovered',
          'Where: src/musy-components.css:334-335, src/Hint.tsx:22-28',
          'What I checked: Level 1. The bubble is revealed by',
          '`@media (hover: hover) and (pointer: fine) { .musy-tip:hover > … }`, with a',
          'second selector `.musy-tip[data-force~="hover"]` that exists precisely to',
          'force it open. The component accepts `text`, `children` and `className` and',
          'nothing else, so a story cannot set `data-force` — and `className` cannot,',
          'because the hook is an attribute selector, not a class.',
          'What I did: shipped the states as they are and said in each story description',
          'that the reviewer has to hover. No story shows the open bubble.',
          'Why: setting the attribute would mean wrapping or cloning the element, which',
          'is a component change; the alternative is a story that silently documents',
          'nothing.',
          'What I need from Ben: **a decision.** `data-force` is already in the',
          'stylesheet; a `className`-independent way to reach it (a passthrough, or',
          'honouring `data-force` as a prop) would make this component reviewable.',
          '',
          '## Hint — the text is announced twice if its children are already named',
          'Where: src/Hint.tsx:33-35',
          'What I checked: Level 1. Hint always renders the string twice: once as',
          '`.musy-sr-only` for AT and once in the aria-hidden bubble. That is correct',
          'when the children are decorative. Level 2, the prototype always wraps a bare',
          'glyph. Level 3, §7.24 says the bubble is "never the only copy" but never says',
          'the children must be decorative.',
          'What I did: every story passes a decorative Icon (no `label`), matching the',
          'prototype.',
          'Why: an Icon with a `label` inside a Hint would announce the fact and then the',
          'hint text, which is the double announcement §7.15 explicitly avoids elsewhere.',
          'What I need from Ben: nothing, just flagging — worth one sentence in §7.24 so',
          'the constraint is written down.',
          '',
          '## Hint — `children` is required but is not typed as required content',
          'Where: src/Hint.tsx:26',
          'What I checked: Level 1. `children: React.ReactNode` accepts `undefined`, so',
          '`<Hint text="…" />` typechecks and renders a bubble attached to nothing.',
          'What I did: did not write a story for it; every story passes a glyph.',
          'Why: an empty trigger is not a state the component is meant to have, and a',
          'story for it would read as permission.',
          'What I need from Ben: nothing, just flagging.',
          '',
          '## Hint — docs section 7.24 is used twice',
          'Where: docs/07-components.md:817 ("## 7.24 Draggable List") and',
          'docs/07-components.md:1381 ("## 7.24 Hint"); src/Hint.tsx:2 claims "§7.24"',
          'What I checked: Level 3. Two different components carry the same section',
          'number, and src/index.ts:71 refers to "§7.24’s float spacer", which is the',
          'Draggable List reading, while Hint.tsx’s own header says §7.24 as well.',
          'What I did: cited §7.24 in Hint’s docs text, since that is what the component',
          'header claims.',
          'Why: the component source is the authority on itself.',
          'What I need from Ben: **a renumbering.** One of the two sections is wrong, and',
          'any cross-reference to §7.24 is currently ambiguous.',
        ].join('\n'),
      },
    },
  },
  args: {
    text: '2–12 minutes',
    children: <Icon glyph={Clock} size="sm" />,
  },
  argTypes: {
    text: {
      control: 'text',
      description: 'The explanation. Shown on hover AND rendered visually-hidden for AT.',
    },
    children: {
      control: false,
      description: 'The glyph, figure or word the hint explains.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof Hint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's own first card fact. Hover with a
 *  fine pointer to see the bubble; the same string is always present as
 *  visually-hidden text. */
export const Default: Story = {};

/** The prototype's three facts, as they sit inside one Radio Card. Each wraps a
 *  decorative glyph — the text in the Hint is the only copy. */
export const CardFacts: Story = {
  render: () => (
    <Row label="three facts — hover each one">
      {FACTS.map((fact) => (
        <Hint key={fact.text} text={fact.text}>
          <Icon glyph={fact.glyph} size="sm" />
        </Hint>
      ))}
    </Row>
  ),
};

/** The children can be a figure or a word rather than a glyph — §7.24's purpose
 *  line names all three. */
export const AroundAFigure: Story = {
  args: {
    text: '2–12 minutes',
    children: <span>2–12 min</span>,
  },
};

/** A glyph and a figure side by side inside the same trigger. `.musy-tip` is an
 *  inline-flex, so the two align on their centres. */
export const GlyphAndFigure: Story = {
  args: {
    text: 'Sound on — headphones recommended',
    children: (
      <>
        <Icon glyph={Volume2} size="sm" />
        <span>Sound on</span>
      </>
    ),
  },
};

/** The longest string in the prototype's own set. The bubble is
 *  `white-space: nowrap`, so a long hint makes a wide bubble rather than a
 *  wrapped one. */
export const LongText: Story = {
  args: {
    text: 'Needs your Mindfulness Cards deck',
    children: <Icon glyph={Layers} size="sm" />,
  },
};

/** Inside running text, which is the "abbreviation" case in §7.24's purpose
 *  line. */
export const InRunningText: Story = {
  render: (args) => (
    <Stack>
      <p>
        Nine paper cards, one feeling each.{' '}
        <Hint {...args} text="2–12 minutes">
          <Icon glyph={Clock} size="sm" />
        </Hint>{' '}
        Scan the card you relate to and listen to the track behind it.
      </p>
    </Stack>
  ),
};
