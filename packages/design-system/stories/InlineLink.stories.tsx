/**
 * InlineLink — stories. Shape per stories/CONVENTIONS.md.
 *
 * Docs text below is taken from the component's own header comment. Nothing
 * is invented.
 *
 * WHY HALF OF THESE STORIES ARE A SENTENCE WITH A HOLE IN IT: the component
 * inherits every type property from its parent, so rendering it on its own
 * would show the one thing it is not for. Each story puts it in a real
 * context — an `h1`, a paragraph — because that is the only way to see
 * whether it took the right type.
 *
 * ROUTER NOTE. The navigable story uses a bare `<a href>`. The design system
 * must not import react-router; `render` is the boundary that keeps it out.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUpRight, ChevronLeft, ChevronRight, EllipsisVertical, SlidersHorizontal } from 'lucide-react';
import { InlineLink } from '../src/InlineLink';
import { Stack, bothThemes } from './_decorators';

const meta = {
  title: 'Components/InlineLink',
  component: InlineLink,
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Button, drawn as a link inside something else — a sentence, a',
          'heading, a label.',
          '',
          '**It inherits its type, and that is the whole component.** Family, size,',
          'weight, line height and tracking all come from the parent, so the same',
          'element is display type inside an `h1` and body type inside a `p`. It sets',
          'three things of its own: the colour, the optional glyph, and the states.',
          '',
          '**That is why it is not `CtaButton size="min"`.** A button declares its own',
          'type step by design — it is a box with a label in it — and a box with a label',
          'in it cannot sit inside a sentence without breaking the line it sits in. The',
          'two components are opposites about the same question.',
          '',
          '**It is a `<button>` by default, and it is named for how it looks.** Its first',
          'call site opens a sheet, which is a button; a link that navigates is',
          '`render={<a href=… />}`, inherited from base-ui’s Button exactly as CtaButton',
          'inherits it. The consumer picks the semantics; the component cannot know',
          'which it is.',
          '',
          '**1.4.1, and the rule is in the component.** A link inside a block of text must',
          'not be told apart by colour alone (technique F73). With a `trailingIcon` the',
          'glyph is the resting cue and the underline waits for hover and focus; without',
          'one the link underlines at rest. The modifier is set from the presence of the',
          'prop, so there is no prop a call site can get wrong.',
          '',
          '**Target size.** 2.5.8’s inline exception covers a target in a sentence or a',
          'block of text, which is the only place this belongs. No `min-height` is set,',
          'deliberately: one would break the line box it sits in.',
          '',
          '**What it is NOT.** Not a CTA, not a standalone control, not a nav item —',
          '`LinkList` is the list of destinations and `CtaButton` is the action.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'relax',
    trailingIcon: EllipsisVertical,
  },
  argTypes: {
    children: { control: 'text', description: 'The link’s text. Inherits every type property from where it sits.' },
    trailingIcon: {
      control: false,
      description: 'The glyph after the text. NOT decoration — its presence is what lets the underline wait for hover, because it is the non-colour cue 1.4.1 asks for.',
    },
    onClick: { action: 'click' },
    className: { control: false },
  },
} satisfies Meta<typeof InlineLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * THE CALL SITE IT WAS BUILT FOR — /exercises' `h1`.
 *
 * The goal is the subject of the sentence and the control that changes it, so
 * there is no chip beside the heading and nothing to go and find. Note the
 * glyph does NOT grow with the heading: it says "this opens something", and
 * scaled to the display step it would read as a second headline.
 */
export const InAHeading: Story = {
  render: (args) => (
    /* Typed inline from Layer 1 rather than with a class, because there is no
       heading utility in this stylesheet — headings are typed by the
       component that owns them, and /exercises types this one with
       `.musie-placeholder`. The four tokens are that rule's. */
    <h1
      style={{
        margin: 0,
        fontFamily: 'var(--type-heading-lg-family)',
        fontSize: 'var(--type-heading-lg-size)',
        fontWeight: 'var(--type-heading-lg-weight)',
        lineHeight: 'var(--type-heading-lg-line)',
      }}
    >
      {'2 exercises to '}
      <InlineLink {...args} />
    </h1>
  ),
};

/** The same element in body copy, where it takes body type. One component,
 *  two sizes, no prop. */
export const InASentence: Story = {
  render: (args) => (
    <p style={{ margin: 0 }}>
      {'Every session is remembered in your diary. You can '}
      <InlineLink {...args}>change what it is for</InlineLink>
      {' at any point.'}
    </p>
  ),
};

/**
 * WITH AND WITHOUT THE GLYPH, which is the 1.4.1 decision made visible.
 *
 * The second one underlines at rest because it has no other non-colour cue.
 * That is the component's rule, not the caller's.
 */
export const GlyphAndBare: Story = {
  render: (args) => (
    <Stack>
      <p style={{ margin: 0 }}>
        {'With a glyph: '}
        <InlineLink {...args} />
        {' — underlines on hover.'}
      </p>
      <p style={{ margin: 0 }}>
        {'Without one: '}
        <InlineLink {...args} trailingIcon={undefined} />
        {' — underlined at rest.'}
      </p>
    </Stack>
  ),
};

/** A real link, through base-ui's `render`. The element becomes an `<a>` and
 *  keeps every one of the component's own states. */
export const AsAnAnchor: Story = {
  args: { trailingIcon: ArrowUpRight },
  render: (args) => (
    <p style={{ margin: 0 }}>
      {'Read the '}
      <InlineLink {...args} render={<a href="#/about" />}>privacy note</InlineLink>
      {'.'}
    </p>
  ),
};

/**
 * Hover and focus, forced. `data-force` is how this set shows a state without
 * a pointer — the same mechanism the buttons and the radio cards use.
 */
export const States: Story = {
  render: (args) => (
    <Stack>
      <p style={{ margin: 0 }}>
        {'Rest: '}
        <InlineLink {...args} />
      </p>
      <p style={{ margin: 0 }}>
        {'Hover: '}
        <InlineLink {...args} data-force="hover" />
      </p>
      <p style={{ margin: 0 }}>
        {'Active: '}
        <InlineLink {...args} data-force="active" />
      </p>
      <p style={{ margin: 0 }}>
        {'Disabled: '}
        <InlineLink {...args} disabled />
      </p>
    </Stack>
  ),
};

/** Both themes — the colour is `--accent-1-text`, which is solved ≥ 4.5:1 in
 *  each of them rather than being one value seen twice. */
export const Themes: Story = {
  decorators: [bothThemes],
  render: (args) => (
    <p style={{ margin: 0 }}>
      {'2 exercises to '}
      <InlineLink {...args} />
    </p>
  ),
};

/**
 * WITH ACTIONS — the /exercises headline, whole.
 *
 * Two icon controls beside the link, which the component draws rather than
 * taking as a node: an action here has to look like it belongs to the word,
 * and the obvious thing to reach for — `IconButton` — brings a box and
 * breaks the line.
 *
 * THEY ARE SIBLINGS OF THE LINK'S BUTTON, never children. A `<button>` inside
 * a `<button>` is invalid HTML and a 4.1.2 failure, so passing `actions`
 * wraps both in a `musy-ilink-group` span; without them the component renders
 * the bare button it always did.
 *
 * The chevrons are the quieter half of the pair on purpose: the link is what
 * the sentence is about and what opens the sheet, so it keeps the link colour
 * and these take ink until hovered.
 */
export const WithActions: Story = {
  args: {
    children: 'relax',
    trailingIcon: SlidersHorizontal,
    actions: [
      { id: 'previous', glyph: ChevronLeft, label: 'Previous goal', onClick: () => {} },
      { id: 'next', glyph: ChevronRight, label: 'Next goal', onClick: () => {} },
    ],
  },
  render: (args) => (
    <h1
      style={{
        margin: 0,
        fontFamily: 'var(--type-heading-lg-family)',
        fontSize: 'var(--type-heading-lg-size)',
        fontWeight: 'var(--type-heading-lg-weight)',
        lineHeight: 'var(--type-heading-lg-line)',
      }}
    >
      {'Good morning. Here are three exercises to '}
      <InlineLink {...args} />
    </h1>
  ),
};
