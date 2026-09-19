/**
 * Lightbox — the modal frame.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.14. Nothing is invented.
 *
 * Every story uses `singlePane`: the popup is portaled to the document root, so
 * two theme panes would fight over one popup. See CONVENTIONS §6.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Lightbox } from '../src/Lightbox';
import { CtaButton } from '../src/CtaButton';
import { ContentBox } from '../src/ContentBox';
import { ContentList } from '../src/ContentList';
import { singlePane } from './_decorators';

/* LIGHTBOX · METHOD DETAIL — the prototype's own rows, verbatim. */
const METHOD_DETAILS = [
  { label: 'You need', content: 'Your physical Mindfulness Cards deck' },
  { label: 'Guideline', content: 'Work with the card you are drawn to, not the one you think you should pick.' },
  { label: 'Duration', content: 'About 15 minutes' },
];

/* The prototype does not record the trigger itself — see Build notes. */
const TRIGGER = <CtaButton variant="secondary">Show details &amp; player</CtaButton>;

const DETAIL_CONTENT = (
  <>
    <ContentList label="Method details" items={METHOD_DETAILS} contentStep="body-md" />
    <CtaButton variant="primary">Start Exercise</CtaButton>
  </>
);

const meta = {
  title: 'Components/Lightbox',
  component: Lightbox,
  decorators: [singlePane],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Dialog (Root / Trigger / Portal / Backdrop / Popup / Title /',
          'Description / Close). APG pattern: Modal Dialog.',
          '',
          '**Purpose.** Bring one thing forward, over the screen it came from.',
          '',
          '**base-ui owns everything that is easy to get wrong and invisible when it is:**',
          'focus is moved into the popup on open and RESTORED to the trigger on close,',
          'the background is made inert, the page scroll is locked, Escape closes, and the',
          'popup is portaled so no ancestor’s `overflow` can clip it. None of that is',
          're-implemented here.',
          '',
          '**What this component owns is the frame:** scrim, position, motion, and a close',
          'control. What it FRAMES is arbitrary — the reference case is a Content Box,',
          'which is why the stylesheet drops the box’s own border inside the popup rather',
          'than this component drawing a second one.',
          '',
          '**Named Lightbox, not Dialog or Modal,** because the app’s mental model is',
          '"bring one thing forward". A confirm-or-cancel decision is a different',
          'component with a mandatory action row; this one may be dismissable and nothing',
          'else.',
          '',
          '**`title` is required by the type:** a modal with no accessible name announces',
          'as "dialog" and leaves a screen-reader user with no idea what came forward',
          '(4.1.2). When the framed content already shows the title, pass the same string',
          'with `titleHidden` rather than dropping it.',
          '',
          '**`trigger` is rendered through `Dialog.Trigger`,** so the trigger keeps its own',
          'semantics and gets `aria-haspopup` / `aria-expanded` for free — pass a',
          'CtaButton or an IconButton, not a div.',
          '',
          '**Two states, and they are base-ui’s:** open and closed. `[data-closed]` runs',
          'the enter animation in reverse at `--motion-exit`, so the exit is faster than',
          'the entrance without a second keyframe set. No hover, active or disabled — a',
          'container has none; its trigger and its contents have their own.',
          '',
          '**What it is NOT.** Not a confirm dialog (that needs a mandatory action row and',
          'a destructive-action rule — a separate component), not a Message (inline, does',
          'not interrupt), not a bottom sheet, not a tooltip.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Lightbox — the prototype records no trigger for either usage',
          'Where: PROTOTYPE-USAGE.md, "Lightbox — 2 usages, both controlled"',
          'What I checked: Level 2 gives both lightboxes’ titles, contents and CTAs, but',
          'nothing about what opens them. Elsewhere it says the ABOUT YOU image radio',
          'routes to the "Not implemented yet" lightbox, which is a radio, not a button —',
          'and `trigger` is a required `ReactElement` rendered through `Dialog.Trigger`,',
          'so a story cannot omit it. Level 1 says only "pass a CtaButton or an',
          'IconButton, not a div".',
          'What I did: used a `secondary` CtaButton reading "Show details & player" — the',
          'prototype’s own copy for the control that opens a method’s detail, borrowed',
          'from METHOD FLOW.',
          'Why: every other option would have meant authoring copy. This borrows a string',
          'the prototype already has for the same job.',
          'What I need from Ben: nothing, just flagging — the trigger in these stories is',
          'illustrative, not a documented pairing.',
          '',
          '## Lightbox — `closeLabel` defaults to German, the prototype renders "Close"',
          'Where: `src/Lightbox.tsx:80` vs PROTOTYPE-USAGE.md, "Lightbox"',
          'What I checked: Level 1 defaults `closeLabel = \'Schließen\'` and its own comment',
          'says "Defaults to German, like the rest of the set’s user-facing strings".',
          'Level 2 says both prototype lightboxes "render a close button with',
          '`aria-label="Close"`".',
          'What I did: every story but one uses the German default; `CloseLabelOverridden`',
          'shows the prototype’s "Close", labelled as the override it is.',
          'Why: the default is the component’s and hiding it would hide the conflict.',
          'What I need from Ben: nothing new — this is the per-component face of the',
          'session-level language entry in OPEN-QUESTIONS.md.',
          '',
          '## Lightbox — `mandatory` does not actually remove every exit',
          'Where: `src/Lightbox.tsx:85` and `:64-68` (the prop’s doc comment)',
          'What I checked: Level 1. `mandatory` does two things: it passes',
          '`disablePointerDismissal` to `Dialog.Root` and it drops the `Dialog.Close`',
          'button. It does NOT pass base-ui’s escape-dismissal option, so **Escape still',
          'closes a mandatory lightbox**. The doc comment warns "otherwise you have built',
          'a trap (2.1.2)" and §7.14 repeats it. With Escape live, it is not a keyboard',
          'trap — but it is a lightbox a mouse-only or touch user cannot dismiss at all,',
          'which is the more serious half and is the half neither text mentions.',
          'What I did: wrote the `Mandatory` story and left the behaviour alone.',
          'Why: changing either the prop or the warning is out of scope.',
          'What I need from Ben: **a decision** on which behaviour is intended. Either the',
          'warning overstates the keyboard risk and understates the pointer one, or',
          '`mandatory` is meant to disable Escape too and does not.',
          '',
          '## Lightbox — `description` can only ever be invisible',
          'Where: `src/Lightbox.tsx:98-100`',
          'What I checked: Level 1. `Dialog.Description` is rendered with a hardcoded',
          '`className="musy-sr-only"`, with no prop to show it. The prop’s own comment',
          'calls it an "Optional short description, announced with the title" and §7.14’s',
          'anatomy shows `.musy-sr-only` too, so this is consistent — but it means the',
          'subtitle the prototype shows on the method-detail lightbox ("For getting aware',
          'of feelings") has to come from the framed content, not from this prop.',
          'What I did: `WithDescription` documents the sr-only prop; the visible subtitle',
          'in `TitleHidden` comes from the ContentBox’s own `text`.',
          'Why: both are correct uses; they are just easy to confuse.',
          'What I need from Ben: nothing, just flagging — `description` reads like a',
          'subtitle prop and is not one.',
          '',
          '## Lightbox — these stories document only the light theme',
          'Where: `stories/_decorators.tsx` (`singlePane`), and this meta',
          'What I checked: Level 1, the decorator: `singlePane` renders one `light` pane.',
          'The popup is portaled to the document root, so it escapes the `[data-theme]`',
          'wrapper entirely and a `bothThemes` story would render one popup, themed by',
          'whatever the document root carries, while both panes claimed it.',
          'What I did: used `singlePane`, as CONVENTIONS §6 names Lightbox for exactly',
          'this.',
          'Why: one honest pane beats two panes disagreeing about one popup.',
          'What I need from Ben: **a decision, eventually.** Lightbox is the one component',
          'in this set whose dark theme nothing reviews. It needs either a themed portal',
          'container or a global theme toolbar — both are config changes, which are off',
          'limits this session.',
        ].join('\n'),
      },
    },
  },
  args: {
    trigger: TRIGGER,
    title: 'Quick Mindfulness Break',
    children: DETAIL_CONTENT,
  },
  argTypes: {
    trigger: {
      control: false,
      description: 'The control that opens it. Rendered through Dialog.Trigger — pass a CtaButton or an IconButton, not a div.',
    },
    title: {
      control: 'text',
      description: 'Accessible name. REQUIRED: a modal with no name announces as "dialog" (4.1.2).',
    },
    titleHidden: {
      control: 'boolean',
      description: 'Hide the title visually when the framed content already renders it. It stays in the accessible name.',
    },
    description: { control: 'text', description: 'Optional short description, announced with the title.' },
    children: { control: false, description: 'The framed content. A ContentBox is the reference case.' },
    open: { control: 'boolean', description: 'Controlled open state. Omit for an uncontrolled lightbox.' },
    onOpenChange: { action: 'openChange', description: 'Fires with the requested open state.' },
    closeLabel: { control: 'text', description: 'Label for the close control. Defaults to German, like the rest of the set’s user-facing strings.' },
    mandatory: {
      control: 'boolean',
      description: 'Remove the close button and the click-outside dismissal. Use ONLY when the lightbox is blocking on a decision the framed content itself resolves.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, uncontrolled: `open` is omitted, so base-ui owns the
 *  state and the trigger opens it. Only the trigger is on screen at rest. */
export const Default: Story = {};

/** Controlled open — `open` is an arg, so the state is inspectable rather than
 *  reached by clicking. The prototype uses both of its lightboxes controlled. */
export const Open: Story = { args: { open: true } };

/** Controlled closed. The trigger is rendered, the popup is not; clicking will
 *  not open it, because the state is the story's, not the component's. */
export const Closed: Story = { args: { open: false } };

/** The framed content already shows the title, so `titleHidden` keeps it in the
 *  accessible name without showing it twice. The framed box drops its own
 *  border inside the popup. */
export const TitleHidden: Story = {
  args: {
    open: true,
    titleHidden: true,
    children: (
      <ContentBox
        headline="Quick Mindfulness Break"
        headlineStep="heading-md"
        text="For getting aware of feelings"
      >
        {DETAIL_CONTENT}
      </ContentBox>
    ),
  },
};

/** `description` is announced with the title and is never visible — it renders
 *  `musy-sr-only`. A visible subtitle belongs to the framed content. */
export const WithDescription: Story = {
  args: {
    open: true,
    description: 'For getting aware of feelings.',
  },
};

/** The prototype's other lightbox — a title, the thing's name, and one
 *  `accent` CTA back to the choice. */
export const MinimalContent: Story = {
  args: {
    open: true,
    title: 'Not implemented yet',
    children: (
      <>
        <p data-type-step="body-md">With a group</p>
        <CtaButton variant="accent">Back to the choice</CtaButton>
      </>
    ),
  },
};

/** `closeLabel` overridden with the prototype's own English string. The
 *  component's default is German. */
export const CloseLabelOverridden: Story = { args: { open: true, closeLabel: 'Close' } };

/** `mandatory` removes the close button and click-outside dismissal. For a
 *  lightbox blocking on a decision the framed content itself resolves —
 *  anywhere else it strands a pointer-only user. See Build notes. */
export const Mandatory: Story = {
  args: {
    open: true,
    mandatory: true,
    title: 'Not implemented yet',
    children: (
      <>
        <p data-type-step="body-md">With a group</p>
        <CtaButton variant="accent">Back to the choice</CtaButton>
      </>
    ),
  },
};
