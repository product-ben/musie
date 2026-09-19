/**
 * Timeline — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * COPY NOTE. The prototype has no diary and never uses this component, so
 * there is no prototype copy to lift — see PROTOTYPE-USAGE.md. The strings
 * below are plain demo content.
 *
 * DATE NOTE. Every group label here is a hand-written, already-formatted
 * string. That is the component's contract: it never formats a date, and a
 * story that reached for `Intl.DateTimeFormat` would be documenting a job the
 * consuming app owns.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timeline } from '../src/Timeline';
import type { TimelineGroup } from '../src/Timeline';
import { LinkList } from '../src/LinkList';
import type { LinkListItem } from '../src/LinkList';
import { ContentBox } from '../src/ContentBox';
import { bothThemes } from './_decorators';

const row = (id: string, headline: string, time: string, kind: string): LinkListItem => ({
  id,
  headline,
  meta: (
    <>
      <span>{time}</span>
      <span>{kind}</span>
    </>
  ),
  render: <a href={`#/diary/${id}`} />,
});

/* Two date groups, each holding a LinkList — the arrangement this component
   was built for. `headingLevel={4}` on the rows sits one level under the group
   heading's default 3. */
const DIARY: TimelineGroup[] = [
  {
    id: '2026-09-14',
    label: '14 September',
    children: (
      <LinkList
        label="Entries on 14 September"
        emptyLabel="No entries on this day."
        headingLevel={4}
        items={[
          row('a', 'Quick Mindfulness Break', '09:12', 'Voice note · 1:48'),
          row('b', 'Reading the card I avoided', '21:05', 'Written answer'),
        ]}
      />
    ),
  },
  {
    id: '2026-09-13',
    label: '13 September',
    children: (
      <LinkList
        label="Entries on 13 September"
        emptyLabel="No entries on this day."
        headingLevel={4}
        items={[row('c', 'A walk before the call', '18:40', '2 photos')]}
      />
    ),
  },
];

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Groups a list under headings. Typically by date, but it does not know that:',
          'a group is an id, a label and whatever the consumer puts beneath it.',
          '**Deliberately basic** — Phase G.1 draws the real timeline.',
          '',
          '**It never formats a date.** The consumer passes `label: \'14 September\'`,',
          'already formatted. Formatting a date is locale work: it needs the active',
          'locale, the app’s Intl options, "today" / "yesterday" relative wording and the',
          'German conventions in `docs/GERMAN-UI-WRITING.md` — none of which this package',
          'has or should have. The boundary sits here for the same reason the router',
          'boundary sits at LinkList’s `render` prop.',
          '',
          '**Two components, not one.** Timeline groups; `LinkList` is a list of',
          'destinations. Keeping them apart lets Phase G.1 grow a real timeline — a rail,',
          'a marker per group, sticky headings — without unpicking the diary row, and lets',
          'a screen group something that is not a link list at all.',
          '',
          '`<ol>`, not `<ul>`: the sequence of groups IS the meaning, the same test',
          '`DraggableList` applies to its own `<ol>`. Markers are off per L3 — each group',
          'states its own date, so an ordinal would be noise.',
          '',
          '**No empty state, on purpose.** Zero groups renders nothing. The emptiness',
          'belongs to the list inside, and LinkList’s required `emptyLabel` already owns',
          'that sentence — so this component carries no user-visible string of its own',
          'and has no default copy to leak a language.',
          '',
          '**Spacing.** Groups sit at `--space-gap-group` (32px); inside a group the',
          'heading and its body sit at `--space-gap-stack` (16px). 32 is exactly double',
          '16, which is L2’s doubling check.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-19. Delete once answered.',
          'This is not documentation._',
          '',
          '## Timeline — `headingLevel` is not in the brief’s API, and it had to be',
          'Where: src/Timeline.tsx, TimelineProps',
          'What I checked: the brief specifies `label`, `groups` and `className?` and says',
          '"renders a heading per group". A heading needs a level, and ContentBox’s own',
          'comment says the level is "never guessed" because it depends on where the',
          'component sits. Hardcoding one would guess.',
          'What I did: added `headingLevel?: HeadingLevel`, defaulting to 3 — the same',
          'default and the same type ContentBox already uses.',
          'Why: consistency with the one component in the set that already had this',
          'problem, and it is optional, so a consumer written against the brief’s API',
          'still compiles.',
          'What I need from Ben: **confirmation**, since it is an addition to a specified',
          'API rather than a question about the repo.',
          '',
          '## Timeline — nothing enforces that group order matches the labels',
          'Where: src/Timeline.tsx',
          'What I checked: the element is an `<ol>` because the sequence of groups is the',
          'meaning. The component cannot verify that: it never parses a label, so a',
          'consumer that sorts its groups wrongly gets an `<ol>` asserting an order the',
          'dates contradict.',
          'What I did: nothing. Checking would mean parsing a date, which is the one thing',
          'this component must not do.',
          'Why: the sort belongs to whatever produced the groups — a query’s `order by`,',
          'not a presentation component.',
          'What I need from Ben: nothing, just flagging — the diary screen owes its own',
          'ordering.',
          '',
          '## Timeline — a group is not visually bounded, only headed',
          'Where: src/musy-components.css, the TIMELINE block',
          'What I checked: a group is a heading plus its body at 16px, and the next group',
          'is 32px below. The grouping reads off the gap ladder alone: no rail, no rule,',
          'no surface. That satisfies L2’s doubling check, and L2 also says that when a',
          'grouping is ambiguous "the fix is a divider or a shared surface, never a bigger',
          'gap" — which is a decision this basic version does not take.',
          'What I did: shipped the gaps only, and did not invent a rail or a marker.',
          'Why: the rail is the whole visual idea of a timeline, and it is Phase G.1’s.',
          'What I need from Ben: **Phase G.1 should decide the group boundary** — rail,',
          'divider or shared surface — rather than letting each screen pick one.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Diary by day',
    groups: DIARY,
  },
  argTypes: {
    label: { control: 'text', description: 'Accessible name for the whole run of groups. Required — never defaulted.' },
    groups: {
      control: false,
      description: 'Each group has a stable id, an already-formatted label and the children that sit under it.',
    },
    headingLevel: {
      control: 'select',
      options: [2, 3, 4, 5, 6],
      description: 'Heading level for the group headings. Defaults to 3, matching ContentBox.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: two date groups, each holding a LinkList. The group
 *  headings are level 3 and the rows inside are level 4. */
export const Default: Story = {};

/** A timeline directly under a page title takes level 2, and its rows level 3.
 *  The level is never guessed — it depends on what sits above the timeline. */
export const HeadingLevelTwo: Story = { args: { headingLevel: 2 } };

/** It groups anything, not just LinkLists. The label is still an
 *  already-formatted string and the children are whatever the screen has. */
export const ArbitraryChildren: Story = {
  args: {
    label: 'This session',
    groups: [
      {
        id: 'today',
        label: 'Today',
        children: (
          <ContentBox
            headline="Quick Mindfulness Break"
            headingLevel={4}
            text="Nine paper cards, one feeling each."
          />
        ),
      },
      {
        id: 'earlier',
        label: 'Earlier this week',
        children: (
          <ContentBox
            headline="A walk before the call"
            headingLevel={4}
            text="Work with the card you are drawn to, not the one you think you should pick."
          />
        ),
      },
    ],
  },
};

/** One group. The 32px gap between groups never appears, so the heading and
 *  its body are the whole component. */
export const SingleGroup: Story = { args: { groups: [DIARY[0]] } };

/** A group whose own list is empty. Timeline still draws the heading — the
 *  empty sentence is LinkList's, because `emptyLabel` is where that string
 *  lives. */
export const EmptyGroup: Story = {
  args: {
    groups: [
      {
        id: '2026-09-15',
        label: '15 September',
        children: (
          <LinkList
            label="Entries on 15 September"
            emptyLabel="Nothing written on this day."
            items={[]}
          />
        ),
      },
      ...DIARY,
    ],
  },
};

/** `groups: []` renders nothing at all — not an empty list and not a sentence.
 *  A screen with nothing to show renders an empty LinkList instead, which is
 *  where the empty copy lives. Both panes below are deliberately blank. */
export const NoGroups: Story = { args: { groups: [] } };

/** Edge case: a German group label long enough to wrap. Headings are
 *  balance-wrapped (`--text-wrap-heading`) and capped at `--measure-heading`. */
export const LongLabel: Story = {
  args: {
    label: 'Tagebuch nach Tag',
    groups: [
      {
        id: 'week',
        label: 'Früher in dieser Woche — Montag bis Donnerstag',
        children: (
          <LinkList
            label="Einträge dieser Woche"
            emptyLabel="Noch keine Einträge."
            headingLevel={4}
            items={[row('a', 'Kurz durchatmen', '09:12', 'Sprachnotiz · 1:48')]}
          />
        ),
      },
    ],
  },
};
