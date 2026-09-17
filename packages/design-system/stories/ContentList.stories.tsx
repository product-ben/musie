/**
 * ContentList — stories. Shape per stories/CONVENTIONS.md, matching the
 * exemplar stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.11. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock } from 'lucide-react';
import { ContentList } from '../src/ContentList';
import type { ContentListItem } from '../src/ContentList';
import { Icon } from '../src/Icon';
import { bothThemes, Stack, Row } from './_decorators';

/* The prototype's own method-detail rows, verbatim — LIGHTBOX · METHOD DETAIL,
   label "Method details". See PROTOTYPE-USAGE.md. */
const METHOD_DETAILS: ContentListItem[] = [
  { label: 'You need', content: 'Your physical Mindfulness Cards deck' },
  {
    label: 'Guideline',
    content: 'Work with the card you are drawn to, not the one you think you should pick.',
  },
  { label: 'Duration', content: 'About 15 minutes' },
];

/* METHOD FLOW · Listen — "Track details". */
const TRACK_DETAILS: ContentListItem[] = [
  { label: 'Track', content: 'Quick Mindfulness Break' },
  { label: 'Artist', content: 'Musie' },
  { label: 'Your card', content: 'The card you are drawn to' },
  {
    label: 'Listening instructions',
    content: 'Work with the card you are drawn to, not the one you think you should pick.',
  },
];

const meta = {
  title: 'Components/ContentList',
  component: ContentList,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A run of label + content pairs — session details, method summaries.',
          '',
          'No APG pattern, and base-ui has no description-list primitive. Semantic HTML:',
          '`<dl>` — each row is a de-emphasised term and its content, which is the',
          'definition of a description list. Not a `<ul>` (the label/content pairing',
          'would be lost) and not a `<table>` (one value column, so nothing to',
          'cross-reference). Row rules use base-ui’s Separator rather than a border, so',
          'the rule carries the right role instead of being invisible to AT by accident.',
          '',
          '`media` is either `{ src, alt }` — **`alt` required**, because these images',
          'sit next to meaning-bearing labels and a decorative image would be a lie — or',
          '`{ node }` for an already-composed element.',
          '',
          '`list: { ordered?, items }` renders the row’s content as a real `<ul>` or',
          '`<ol>`, after `content`, so a row can carry a lead-in line and then a list.',
          'Use **ordered** ONLY when the order is the meaning (steps); an unordered set',
          'of facts is a bullet list.',
          '',
          '**Not interactive — no states.** `empty` is the one non-default state:',
          '`items: []` renders `emptyLabel` as a paragraph instead of an empty `<dl>`.',
          '',
          '**Responsive.** Stacked below --bp-lg; from 1024px the term moves beside its',
          'content in a two-column grid. The switch used to happen at --bp-md and was',
          'moved a breakpoint later in review: at 768px a German label plus a 12rem term',
          'column left the content squeezed beside a wrapped two-line term.',
          '',
          'Per-item media follows Decision 1: static by default, animated only when the',
          'consuming app passes an already-gated node.',
          '',
          '**What it is NOT.** Not a table, not a settings list (rows are not',
          'interactive), not a feed. A bullet or numbered row is still a description-list',
          'row: if there is no label, the consumer wants a plain list, not this',
          'component.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## ContentList — the prototype’s `aria-live="polite"` cannot be expressed',
          'Where: src/ContentList.tsx:34-41 vs stories/PROTOTYPE-USAGE.md, ContentList',
          'table (METHOD FLOW · listen, "Track details", `aria-live="polite"`)',
          'What I checked: Level 1. The props are `label`, `items`, `contentStep`,',
          '`emptyLabel` and `className` — no `...rest`, no `render`, and the `<dl>` is not',
          'given any live-region attribute. Level 2 shows the Listen step’s list',
          'announcing itself as the track changes, which is the only place in the',
          'prototype where a ContentList updates in place.',
          'What I did: shipped `TrackDetails` as a plain list and said in its description',
          'that the prototype marks it polite. No story can add the attribute.',
          'Why: adding a prop is a component change, and wrapping the list in a live',
          'region from a story would document something the component does not do.',
          'What I need from Ben: **a decision.** Either a `live` prop (Message and Toast',
          'already have one) or an explicit note that the consuming app wraps it.',
          '',
          '## ContentList — the empty state loses the list’s accessible name',
          'Where: src/ContentList.tsx:47-49',
          'What I checked: Level 1. `items: []` returns',
          '`<p class="musy-clist__empty">{emptyLabel}</p>` — `label` is not rendered at',
          'all in that branch, so the name that told the user WHICH list is empty is',
          'gone exactly when the content is. Level 3, §7.11 documents the empty branch',
          'but not the dropped label.',
          'What I did: shipped `Empty` and `EmptyWithLabel` (the same `label`, still not',
          'rendered) so the behaviour is visible.',
          'Why: it is real behaviour, and the story documents what is.',
          'What I need from Ben: **a decision.** "Noch keine Einträge" on its own does',
          'not say what has no entries.',
          '',
          '## ContentList — `emptyLabel` defaults to German in an English prototype',
          'Where: src/ContentList.tsx:45 (`emptyLabel = ’Noch keine Einträge’`)',
          'What I checked: Level 1, that is the declared default. Level 2, the prototype',
          'is English throughout and sets `lang="en"` on its root. Level 3,',
          'docs/07-components.md:46 makes `<html lang="de">` an integration requirement.',
          'What I did: the `Empty` story shows the component’s own German default,',
          'unchanged.',
          'Why: overriding it in a story would hide the inconsistency rather than',
          'document it. This repeats the Step 1 session entry rather than replacing it.',
          'What I need from Ben: **a decision on the primary language.**',
          '',
          '## ContentList — `aria-label` on a bare `<dl>` may not be exposed',
          'Where: src/ContentList.tsx:51',
          'What I checked: Level 1. The label is applied as `aria-label` to the `<dl>`.',
          'Level 3, §7.11 calls it "Accessible name for the list" and the a11y note',
          'covers the `dt`/`dd` wrapper divs but not the labelling. `<dl>` has no',
          'implicit ARIA role in HTML-AAM, and `aria-label` on a role-less element is not',
          'reliably exposed.',
          'What I did: nothing — every story passes `label`, as the prototype does.',
          'Why: I cannot test AT from here, and changing the element or adding',
          '`role="list"` would be a component change.',
          'What I need from Ben: **a check with a real screen reader**, and if it does',
          'not announce, either a `role` or a visible heading above the list.',
          '',
          '## ContentList — rows are keyed by array index',
          'Where: src/ContentList.tsx:52 (`key={i}`), and the same for the nested lists',
          'What I checked: Level 1 only. Nothing in §7.11 promises a stable identity, and',
          'the component is not interactive, so nothing here holds state across a',
          'reorder.',
          'What I did: nothing.',
          'Why: harmless for a static list; worth a line only because a consumer that',
          'animates or reorders rows would be surprised.',
          'What I need from Ben: nothing, just flagging.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Method details',
    items: METHOD_DETAILS,
  },
  argTypes: {
    label: { control: 'text', description: 'Accessible name for the list.' },
    items: {
      control: false,
      description: 'Each item has a de-emphasised label and its content, plus optional media and an optional nested list.',
    },
    contentStep: {
      control: 'select',
      options: [
        'display-xl', 'display-lg', 'stage',
        'heading-lg', 'heading-md', 'heading-sm',
        'body-lg', 'body-md', 'body-sm', 'label-lg', 'label-md',
      ],
      description: 'Type step applied to each row’s content.',
    },
    emptyLabel: {
      control: 'text',
      description: 'Rendered as a paragraph instead of an empty <dl> when items is empty.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof ContentList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's own method-detail rows.
 *  `contentStep` is `body-md`, which is what the prototype uses everywhere. */
export const Default: Story = {};

/** METHOD FLOW · Listen, "Track details". The prototype marks this one
 *  `aria-live="polite"` because it updates as the track changes; the component
 *  exposes no way to say so — see the build notes. */
export const TrackDetails: Story = {
  args: { label: 'Track details', items: TRACK_DETAILS },
};

/** Every content step is available, though the prototype uses `body-md` for all
 *  six of its lists. The term column is fixed at body-sm and is not a prop. */
export const ContentSteps: Story = {
  render: (args) => (
    <Stack>
      <Row label="contentStep: body-sm">
        <ContentList {...args} contentStep="body-sm" />
      </Row>
      <Row label="contentStep: body-md (default)">
        <ContentList {...args} contentStep="body-md" />
      </Row>
      <Row label="contentStep: body-lg">
        <ContentList {...args} contentStep="body-lg" />
      </Row>
      <Row label="contentStep: label-md">
        <ContentList {...args} contentStep="label-md" />
      </Row>
    </Stack>
  ),
};

/** A row with image media. `alt` is required: these images sit next to
 *  meaning-bearing labels, so a decorative image would be a lie. */
export const WithImageMedia: Story = {
  args: {
    label: 'Your card',
    items: [
      {
        label: 'Your card',
        content: 'Quick Mindfulness Break',
        media: {
          src: '/assets/web/method-card.png',
          alt: 'The Mindfulness Cards deck laid out on a table',
        },
      },
      ...METHOD_DETAILS,
    ],
  },
};

/** A row with node media, for an already-composed element. Decision 1 applies:
 *  static by default, and an animated node must already be gated by the app. */
export const WithNodeMedia: Story = {
  args: {
    label: 'Method details',
    items: [
      {
        label: 'Duration',
        content: 'About 15 minutes',
        media: { node: <Icon glyph={Clock} size="lg" /> },
      },
      ...METHOD_DETAILS,
    ],
  },
};

/** A bullet list as the row's content: an unordered set of facts. Real `<ul>`
 *  markup, so the count is conveyed to AT rather than drawn. */
export const WithBulletList: Story = {
  args: {
    label: 'Method details',
    items: [
      {
        label: 'You need',
        content: 'Two things before you start:',
        list: {
          items: [
            'Your physical Mindfulness Cards deck',
            'Sound on — headphones recommended',
          ],
        },
      },
    ],
  },
};

/** A numbered list, for the case where the sequence IS the meaning — the
 *  session's four steps. */
export const WithOrderedList: Story = {
  args: {
    label: 'Method steps',
    items: [
      {
        label: 'Session',
        content: 'Four steps, in order:',
        list: {
          ordered: true,
          items: ['Intro', 'Select Card', 'Listen', 'Reflect'],
        },
      },
    ],
  },
};

/** A single row. The Separator only renders between rows, so one row draws no
 *  rule. The prototype's SETTINGS list is this shape. */
export const SingleRow: Story = {
  args: {
    label: 'Your account',
    items: [{ label: 'Email', content: 'ldamn@nitz.com' }],
  },
};

/** The empty state: `items: []` renders `emptyLabel` as a paragraph instead of
 *  an empty `<dl>`. The default is the component's own German string. */
export const Empty: Story = {
  args: { items: [] },
};

/** Empty with a `label` set. The label is not rendered in this branch, so the
 *  list's name is gone exactly when its content is — see the build notes. */
export const EmptyWithLabel: Story = {
  args: { label: 'Your choices so far', items: [] },
};

/** A custom empty string. */
export const EmptyCustomLabel: Story = {
  args: { items: [], emptyLabel: 'Nothing recorded in this session yet' },
};

/** The longest content in the prototype, next to the shortest labels: the
 *  measure tokens cap the line, and the term column wraps rather than squeezing
 *  the content. */
export const LongContent: Story = {
  args: {
    label: 'Method details',
    items: [
      {
        label: 'Guideline',
        content: 'Work with the card you are drawn to, not the one you think you should pick. Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.',
      },
      {
        label: 'Listening instructions',
        content: 'Nothing leaves your device until you share it.',
      },
    ],
  },
};
