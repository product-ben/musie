/**
 * DraggableList — Batch E. No prototype usage (PROTOTYPE-USAGE.md), so every
 * story comes from the component's own header and docs/07-components.md §7.24.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DraggableList } from '../src/DraggableList';
import { bothThemes } from './_decorators';

/* Statements of the length the component is specified for — the reference
   screen's case is a spoken reflection, captured one statement per box. */
const ITEMS = [
  { id: 's1', text: 'I noticed my shoulders were up around my ears the whole morning.' },
  { id: 's2', text: 'The track made me slow down before I noticed I was rushing.' },
  { id: 's3', text: 'I want to come back to this one.' },
];

const meta = {
  title: 'Components/DraggableList',
  component: DraggableList,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'No new primitives: Content Box, Icon Button, CTA Button, Toast and an',
          '`<ol>`, arranged per Layer 3 L3, L4, L5, L6, L9 and L13.',
          '',
          '**What makes it a component rather than a composition is the state**',
          '**machine.** Twelve states, and three pairs of them are mutually exclusive',
          'in a way that is easy to get wrong by hand: an item cannot be editing AND',
          'open, editing AND draggable, or a merge target AND a drop target.',
          '`dropMode` is ONE value, never two, and the controls disappear while',
          'editing. That invariant is the component\'s, not the consumer\'s.',
          '',
          '**The list is the editing surface.** No separate edit mode, no toolbar,',
          'nothing opens in a dialog. Editing replaces the row\'s *content*, not the',
          'row: the Content Box stays and its interior swaps for Field\'s parts and an',
          'action row.',
          '',
          '**The text leads in the DOM and floats a spacer (L4).** The controls are',
          'positioned into the gap it leaves. Floating the controls themselves is one',
          'rule shorter and wrong: a float only operates from the front of the flow,',
          'so it would put both buttons ahead of the sentence they act on for a screen',
          'reader, on every item in the list.',
          '',
          '**Combining is direction-aware, and direction comes from list position,**',
          'not from the gesture. Dragging an item down prepends its text; dragging up',
          'appends it. Either way the merged text reads in the order the items appear',
          'on screen, which is what the user is looking at.',
          '',
          '**Undo is the consumer\'s.** This reports the change; whoever owns the data',
          'owns the snapshot and the window.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '**DraggableList — the drag, merge and edit states cannot be reached from**',
          '**props.** `draggingId`, `dropTarget`, `openMenuId` and the per-row',
          '`editing` flag are all internal `useState`. Every state this component',
          'exists to manage — dragging, the drop indicator, the merge target, the open',
          'action menu, the editor with its dirty/clean Save — is unreachable from a',
          'story, and CONVENTIONS §5 forbids faking one with local state. What is',
          'documented here is the resting list, the empty box and the two waiting',
          'states. **This is the largest documentation gap in the batch.** It needs',
          'either a play function (an addon, so config) or props to drive the machine.',
          '',
          '**RESOLVED in C.10 — `DropHints` is exported from `src/index.ts`.** It',
          'used to be exported from the module but missing from the barrel, so a',
          'consumer could not name the type of the public `dropHints` prop. The',
          'prop is also `Partial<DropHints>` now, so one hint can be overridden',
          'without restating all four. (reference/INVENTORY.md §3 still says',
          'otherwise.)',
          '',
          '**RESOLVED in C.10 — the default strings are no longer English-only,**',
          '**and the split across components is gone.** `emptyHeadline`,',
          '`emptyText`, `listeningLabel`, `hearingLabel`, `itemNoun`, `label` and',
          'all four `dropHints` now fall back to the locale catalogue in',
          '`src/locale.ts` rather than to English literals. Every prop still',
          'overrides its catalogue entry.',
          '',
          '**RESOLVED in C.10 — the row action copy HAS props now, through the**',
          '**catalogue.** This block used to read "the row action copy has no prop',
          'at all", and that is now factually false: "Discard", "Save", "Delete"',
          'and "Edit", the handle and chevron `aria-label`s and every keyboard',
          'live-region announcement come from `useMusyText()`. Kept rather than',
          'deleted because it was true when written and the fix is worth seeing.',
          '',
          '**DraggableList — a11y, noticed in passing, not chased.** The source says',
          'the keyboard equivalents (Space lifts, arrows move, M merges, Escape',
          'cancels) are "SPECIFIED AND UNVERIFIED … never tested with a screen',
          'reader". They are also the only way to reach the drag states without a',
          'pointer, and this session could not exercise them either.',
          '',
          '**DraggableList — `dense` defaults to false, against L8.** The header',
          'records this as a deliberate departure logged as conflict B23: L8 grants a',
          'per-item size exception that made a merge re-size text the user had just',
          'combined. Flagging only, since the component and the docs already disagree',
          'in writing.',
        ].join('\n'),
      },
    },
  },
  args: {
    items: ITEMS,
  },
  argTypes: {
    items: { control: false, description: 'Each item needs a stable `id` — reordering has to survive re-render, and an index cannot.' },
    editable: { control: 'boolean', description: 'False while the source is still producing items — nothing is editable mid-capture, so no item renders a control.' },
    onEdit: { action: 'edit' },
    onCombine: { action: 'combine' },
    onMove: { action: 'move' },
    onDelete: { action: 'delete' },
    pending: { control: 'boolean', description: 'Shows the waiting box — heard something, no content back yet.' },
    partial: { control: 'text', description: 'Shows the hearing box, carrying the partial text.' },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5, 6], description: 'Heading level for each item’s hidden headline. Pass it — the box cannot know where it sits (1.3.1).' },
    emptyHeadline: { control: 'text' },
    emptyText: { control: 'text' },
    listeningLabel: { control: 'text', description: 'The waiting state’s copy.' },
    hearingLabel: { control: 'text', description: 'The hearing state’s copy.' },
    itemNoun: { control: 'text', description: 'What one item is called, for every control’s accessible name. Defaults to the locale catalogue — “Aussage” / “statement”.' },
    label: { control: 'text', description: 'Accessible name for the list itself. Defaults to the locale catalogue — “Transkript” / “Transcript”.' },
    dropHints: { control: false, description: 'The drag hint’s wording, any subset of it. Each hint defaults to the locale catalogue, as do the four row controls and every keyboard announcement — none of which had a prop before C.10.' },
    dense: { control: 'boolean', description: 'Opt into L8’s dense-list exception as L8 states it: body-sm at 80 characters or fewer, body-md above. Default false — see Build notes.' },
    className: { control: false },
  },
} satisfies Meta<typeof DraggableList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three captured statements, editable. Each row is a Content Box with a drag
 *  handle and a chevron; the text leads in the DOM. */
export const Default: Story = {};

/** `editable={false}` — nothing is editable mid-capture, so no item renders a
 *  control at all. */
export const NotEditable: Story = { args: { editable: false } };

/** The empty state: a dashed, sunken box, headline hidden. Empty, waiting and
 *  hearing are one box in three states so the page does not change shape when
 *  content starts arriving (L10). */
export const Empty: Story = { args: { items: [] } };

/** Waiting — heard something, nothing back yet. Three dots; under reduced
 *  motion the pulse is dropped entirely rather than shortened, because Layer 1
 *  collapses every duration to 1ms, which on a loop strobes. */
export const Pending: Story = { args: { items: [], pending: true } };

/** Hearing — the same box, now carrying the partial transcript. */
export const Partial: Story = {
  args: { items: [], partial: 'I noticed my shoulders were up around my—' },
};

/** Items already present while more are still arriving. */
export const PendingWithItems: Story = { args: { pending: true } };

/** `dense` restores L8's per-item behaviour: `body-sm` at 80 characters or
 *  fewer, `body-md` above. Off by default — see Build notes. */
export const Dense: Story = {
  args: {
    dense: true,
    items: [
      { id: 'd1', text: 'Short one.' },
      { id: 'd2', text: 'This statement runs past eighty characters, which is where L8 puts the threshold, so it takes body-md instead.' },
    ],
  },
};

/** One item. The list still renders as an `<ol>`, so the count reaches
 *  assistive tech rather than being drawn. */
export const SingleItem: Story = { args: { items: [ITEMS[0]] } };

/** A long statement, which is what the float in L4 has to survive: the text is
 *  a plain block and the controls sit in the gap its spacer leaves. */
export const LongStatement: Story = {
  args: {
    items: [
      {
        id: 'l1',
        text: 'I kept thinking about the conversation from Tuesday and how I did not say the thing I actually meant, and the track gave me enough room to notice that I was still turning it over instead of letting it go.',
      },
    ],
  },
};

/** `itemNoun` renames the thing in every control's accessible name. */
export const CustomItemNoun: Story = {
  args: { itemNoun: 'note', label: 'Notes' },
};

/** The empty state's copy, overridden. */
export const CustomEmptyCopy: Story = {
  args: {
    items: [],
    emptyHeadline: 'Nothing here yet',
    emptyText: 'Anything you say will appear here, one box at a time.',
  },
};
