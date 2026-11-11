/**
 * InlineButton — stories. Shape per stories/CONVENTIONS.md.
 *
 * Docs text below is taken from the component's own header comment and from
 * §28b of musy-components.css. Nothing is invented.
 *
 * WHY EVERY STORY IS A SENTENCE OR A HEADING WITH A HOLE IN IT: the component
 * inherits every type property from its parent, so rendering it on its own
 * would show the one thing it is not for.
 *
 * THE COPY IS THE APP'S, verbatim from `apps/web/src/i18n/de.ts`, so each story
 * is one of the real call sites: /exercises' headline, the reflect step's
 * question, the legal links, the sign-in gate's code step.
 *
 * ROUTER NOTE. The navigable story uses a bare `<a href>`. The design system
 * must not import react-router; `render` is the boundary that keeps it out.
 */
import type * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListFilter } from 'lucide-react';
import { InlineButton } from '../src/InlineButton';
import { Stack, bothThemes } from './_decorators';

/* Typed inline from Layer 1 rather than with a class, because there is no
   heading utility in this stylesheet — headings are typed by the component
   or screen that owns them. These are `heading-lg`'s five tokens, the step
   /exercises' `h1` uses. */
const headingLg: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--type-heading-lg-family)',
  fontSize: 'var(--type-heading-lg-size)',
  fontWeight: 'var(--type-heading-lg-weight)',
  lineHeight: 'var(--type-heading-lg-line)',
  letterSpacing: 'var(--type-heading-lg-tracking)',
};

const meta = {
  title: 'Components/InlineButton',
  component: InlineButton,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Button. A value inside a sentence or a heading that opens a choice —',
          'the goal word in /exercises’ `h1`, which opens the sheet that changes it.',
          'InlineLink’s successor (Ben, 2026-11-11): it keeps that component’s reasoning',
          'and changes its look.',
          '',
          '**It inherits its type, and that is still the whole component.** Family, size,',
          'weight, line height and tracking come from the parent, so the same element is',
          'display type inside an `h1` and body type inside a `p`. That is why it is not',
          '`Button size="min"`: a box with a label in it cannot sit inside a sentence',
          'without breaking the line it sits in.',
          '',
          '**The look (Figma *Ready to build*).** Text in `--on-surface`, the heading’s own',
          'ink. A persistent underline under text **and** glyph, `--border-width-thick` in',
          '`--border-strong` (3.63:1 light, 4.73:1 dark) — with the text in the heading’s',
          'colour, the bar is the non-colour cue 1.4.1 asks for. An optional trailing',
          '`glyph`: 16px, centred in a 24px box, `--sp-1` after the text.',
          '',
          '**One target.** Text, glyph and underline are one `<button>`. A link that',
          'navigates is `render={<a href=… />}` with `nativeButton={false}`.',
          '',
          '**`inset`.** `inline` (default): 4px of inline padding and a −4px inline margin,',
          'so the text lines up with the words around it and the underline overhangs by 4px',
          'each side. `none`: neither, for a value with no text to its left or right. The',
          'component cannot see its neighbours, so the call site says.',
          '',
          '**States** are not drawn in Figma; they are derived from InlineLink’s. Hover:',
          'the bar takes the text’s ink. Active: text, glyph and bar in `--accent-1-text`.',
          'Focus: the shared ring. Disabled: `--on-surface-disabled`, and the bar goes quiet',
          '(`--border-subtle`) and stays.',
          '',
          '**Target size.** 2.5.8’s inline exception covers a target in a sentence or a',
          'block of text, which is the only place this belongs.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-11-11. Delete once answered._',
          '_This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'entspannen',
    glyph: ListFilter,
  },
  argTypes: {
    children: { control: 'text', description: 'The value’s text. Inherits every type property from where it sits.' },
    glyph: {
      control: false,
      description: 'A trailing glyph — 16px, centred in a 24px box, `--sp-1` after the text. Optional: the underline is the 1.4.1 cue, not the glyph.',
    },
    inset: {
      control: 'inline-radio',
      options: ['inline', 'none'],
      description: '`inline`: 4px inline padding and a −4px inline margin, so the text lines up and the underline overhangs. `none`: neither — no text to its left or right.',
    },
    onClick: { action: 'click' },
    className: { control: false },
  },
} satisfies Meta<typeof InlineButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * THE CALL SITE IT WAS BUILT FOR — /exercises' `h1`, frame A: the goal inline
 * in the sentence, with `ListFilter`. The default inset keeps "entspannen"
 * where the sentence put it while the underline overhangs by 4px.
 */
export const InAHeading: Story = {
  render: (args) => (
    <h1 style={headingLg}>
      {'Lass uns zusammen '}
      <InlineButton {...args} />
    </h1>
  ),
};

/**
 * FRAME B — the goal alone on the last line, so `inset="none"`: no padding and
 * no overhang, and the underline starts where the line does ("If no text left
 * or right: padding = 0").
 */
export const OnItsOwnLine: Story = {
  args: { children: 'Achtsamkeit üben', inset: 'none' },
  render: (args) => (
    <h1 style={headingLg}>
      {'Lass uns zusammen'}
      <br />
      <InlineButton {...args} />
    </h1>
  ),
};

/** Body copy, no glyph — the reflect step's question at the end of its
 *  sentence. The same element as above at a different size, with no prop. */
export const InASentence: Story = {
  args: { children: 'Was soll das bringen?', glyph: undefined },
  render: (args) => (
    <p style={{ margin: 0, maxInlineSize: 'var(--measure-body)' }}>
      {'Atme erstmal tief ein und aus. Jetzt fühlst du die Gefühle, die aufgekommen sind, verarbeitest die Gedanken und kommst wieder in der echten Welt an. '}
      <InlineButton {...args} />
    </p>
  ),
};

/**
 * A real link, through base-ui's `render` — the legal links. The element
 * becomes an `<a>` and keeps every one of the component's own states.
 * `nativeButton={false}`, or base-ui warns that an anchor lost the button
 * semantics it expected.
 */
export const AsAnAnchor: Story = {
  args: { glyph: undefined },
  render: (args) => (
    <p style={{ margin: 0 }}>
      <InlineButton {...args} render={<a href="#/impressum" />} nativeButton={false}>
        Impressum
      </InlineButton>
      {' · '}
      <InlineButton {...args} render={<a href="#/datenschutz" />} nativeButton={false}>
        Datenschutz
      </InlineButton>
    </p>
  ),
};

/**
 * IN A FLEX COLUMN — the sign-in gate's code step, two values with nothing
 * beside them. A column stretches its items by default; this one is never
 * wider than its words, so each underline stops where its text does.
 */
export const InAColumn: Story = {
  args: { glyph: undefined, inset: 'none' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-gap-stack)' }}>
      <InlineButton {...args} type="button">Neues Einmal-Passwort schicken</InlineButton>
      <InlineButton {...args} type="button">Andere Adresse verwenden</InlineButton>
    </div>
  ),
};

/**
 * Every state, forced. `data-force` is how this set shows a state without a
 * pointer — the same mechanism the buttons and the radio cards use.
 */
export const States: Story = {
  render: (args) => (
    <Stack>
      <p style={headingLg}>
        {'Rest: '}
        <InlineButton {...args} />
      </p>
      <p style={headingLg}>
        {'Hover: '}
        <InlineButton {...args} data-force="hover" />
      </p>
      <p style={headingLg}>
        {'Active: '}
        <InlineButton {...args} data-force="active" />
      </p>
      <p style={headingLg}>
        {'Focus: '}
        <InlineButton {...args} data-force="focus" />
      </p>
      <p style={headingLg}>
        {'Disabled: '}
        <InlineButton {...args} disabled />
      </p>
    </Stack>
  ),
};
