/**
 * IconButton — Batch B (controls).
 *
 * Docs text below comes from the component's own header comment and from
 * docs/07-components.md §7.2. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu, UserRound, X, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../src/IconButton';
import { bothThemes, Row, Stack } from './_decorators';

/* The prototype's own NAVBAR control — ghost variant, `primary` size (44px),
   label "Open menu". See PROTOTYPE-USAGE.md, "IconButton — 10 usages". */

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Button + Tooltip (`@base-ui/react/button`, `/tooltip`).',
          'APG pattern: Button.',
          '',
          'A single icon-only action, named once.',
          '',
          '**The accessible name is authored ONCE, in `label`**, and reused verbatim as',
          'the tooltip string — so the two can never disagree. `label` is required by',
          'the type: an icon-only control with no accessible name is a 4.1.2 failure and',
          'the API should make that unwritable.',
          '',
          'The tooltip is base-ui’s, not hand-rolled CSS: it portals, so it cannot be',
          'clipped by a scroll container, and it collision-flips near a viewport edge.',
          'Both were real defects in the native version. base-ui opens a tooltip on',
          'hover AND focus by default, which is what 1.4.13 requires — hover-only fails.',
          'The popup is `aria-hidden`: it duplicates the trigger’s accessible name, so',
          'announcing it would double it.',
          '',
          'The tooltip is removed entirely at `(hover: none)` / `(pointer: coarse)` — a',
          'touch-triggered tooltip lands under the finger and the `aria-label` already',
          'names the control.',
          '',
          '`size="min"` (24px) carries a mandatory `--sp-2` margin so 2.5.8’s spacing',
          'exception applies; it is permitted inline in prose only. Loading is announced',
          'through a `role="status"` string, never by the spinner alone.',
          '',
          '**Variant follows §7.4’s rule**: at most one `primary` per unit per state, and',
          'it is the action that carries the person onward. An icon-only control is',
          'rarely that action — it names a side route, a dismissal or a mode — which is',
          'why `ghost` is this component’s default and `primary` is the rare case here.',
          '',
          '**What it is NOT.** Not a menu trigger, not a toggle, and not a link — an icon',
          'that navigates is an `<a>`.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## IconButton — inherited base-ui Button props cannot be filtered out of the docs table',
          'Where: `src/IconButton.tsx:24` (`extends Omit<React.ComponentPropsWithoutRef<typeof Button>, \'children\' | \'className\' | \'render\'>`), `.storybook/main.ts`',
          'What I checked: Level 1, the component source. react-docgen cannot follow an',
          '`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the',
          'whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this',
          'session may not touch.',
          'What I did: hand-wrote `argTypes` for the component’s own props plus the two',
          'inherited ones a story genuinely needs (`disabled`, `onClick`). Did not add a',
          '`propFilter`.',
          'Why: config is off limits and the brief says to log it rather than fight the',
          'inference.',
          'What I need from Ben: **a `propFilter` in `.storybook/main.ts`** so the inherited',
          'DOM props stop appearing. Applies equally to CtaButton and Switch.',
          '',
          '## IconButton — stories do not mount `MusyTooltipProvider`',
          'Where: `src/IconButton.tsx:94`',
          'What I checked: Level 1. The header says to mount it ONCE near the app root;',
          'base-ui’s `Tooltip.Root` works without a provider, so the stories render and the',
          'tooltip opens — only the shared 400ms open delay and the grouping behaviour are',
          'missing.',
          'What I did: rendered the bare component, as every other story file does. Did not',
          'add a provider to the decorators, which are groundwork and shared.',
          'Why: adding a provider to `_decorators.tsx` would change a shared module for one',
          'component.',
          'What I need from Ben: nothing, just flagging — the nav-bar grouping case is not',
          'exercised by any story.',
          '',
          '## IconButton — `variant="primary"` and `size="primary"` mean two different things on one element',
          'Where: `src/IconButton.tsx:50-52`',
          'What I checked: Level 1. `size === \'primary\'` is rewritten to the class',
          '`primary-size`, so the element carries `musy-icon-btn--primary',
          'musy-icon-btn--primary-size`. Level 2, PROTOTYPE-USAGE confirms the prototype',
          'writes `musy-icon-btn--primary-size`.',
          'What I did: wrote the stories against the props as declared.',
          'Why: the rename is deliberate and the ladder (`min`/`primary`/`comfort`/`guided`)',
          'is shared with CtaButton on purpose.',
          'What I need from Ben: nothing, just flagging — reading a rendered IconButton’s',
          'class list, "primary" appears twice and means variant once and target once.',
          '',
          '## IconButton — `loadingLabel` defaults to German while every caption around it is English',
          'Where: `src/IconButton.tsx:48` (`loadingLabel = \'Wird geladen\'`)',
          'What I checked: Level 1, the default. Level 2, PROTOTYPE-USAGE: the prototype is',
          'English throughout and never uses `loading` at all.',
          'What I did: the `Loading` story uses the component’s own German default and does',
          'not override it.',
          'Why: overriding it in a story would hide the inconsistency.',
          'What I need from Ben: nothing new — this is the session-level language question',
          'already logged in Step 1; recording that it bites here.',
        ].join('\n'),
      },
    },
  },
  args: {
    glyph: Menu,
    label: 'Open menu',
  },
  argTypes: {
    glyph: { control: false, description: 'The Lucide glyph the button carries.' },
    label: {
      control: 'text',
      description:
        'Accessible name AND tooltip text. Required — an icon-only control with no name is a 4.1.2 failure.',
    },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Fill posture. Defaults to ghost.',
    },
    size: {
      control: 'inline-radio',
      options: ['min', 'primary', 'comfort', 'guided'],
      description: 'Target rung: 24 / 44 / 56 / 64px. Defaults to primary.',
    },
    tooltip: {
      control: 'boolean',
      description:
        'Show the tooltip. Off for controls whose meaning is obvious in context (a close X in a sheet header).',
    },
    loading: { control: 'boolean', description: 'Hides the glyph, reveals the spinner, sets aria-busy and disables the button.' },
    loadingLabel: {
      control: 'text',
      description: 'Announced while loading. German default: the app is German-primary.',
    },
    disabled: { control: 'boolean', description: 'Inherited from base-ui Button. A disabled button stays focusable.' },
    onClick: { action: 'click' },
    className: { control: false },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults — `ghost` at `primary` (44px), the prototype's own
 *  NAVBAR posture, with the prototype's copy. */
export const Default: Story = {};

/** All three fill postures. `ghost` is the default and the one the prototype
 *  reaches for most; `primary` is the Listen-step transport control. */
export const Variants: Story = {
  render: (args) => (
    <Row label="variant">
      <IconButton {...args} variant="primary" label="Play" glyph={Play} />
      <IconButton {...args} variant="secondary" label="Previous slide" glyph={ChevronLeft} />
      <IconButton {...args} variant="ghost" label="Next slide" glyph={ChevronRight} />
    </Row>
  ),
};

/** The four target rungs: 24 / 44 / 56 / 64px. `min` sits further from its
 *  neighbours because its `--sp-2` margin is baked into the stylesheet. */
export const Sizes: Story = {
  render: (args) => (
    <Row label="size">
      <IconButton {...args} size="min" label="min — 24px" />
      <IconButton {...args} size="primary" label="primary — 44px" />
      <IconButton {...args} size="comfort" label="comfort — 56px" />
      <IconButton {...args} size="guided" label="guided — 64px" />
    </Row>
  ),
};

/** `guided` on the Listen-step play control — the one place the prototype uses
 *  it, where the user may be across the room. */
export const Guided: Story = {
  args: { variant: 'primary', size: 'guided', glyph: Play, label: 'Play' },
};

/** Tooltip off. For a control whose meaning is obvious in context — the close X
 *  in a sheet header. The `label` still carries the accessible name. */
export const WithoutTooltip: Story = {
  args: { tooltip: false, glyph: X, label: 'Close' },
};

/** Glyph hidden, spinner revealed, `aria-busy` set and the button disabled.
 *  The state is announced through the `role="status"` string, which is the
 *  component's own German default. */
export const Loading: Story = { args: { loading: true } };

/** Disabled. base-ui keeps it focusable, so a keyboard user can still reach the
 *  control and find out why it is unavailable. */
export const Disabled: Story = { args: { disabled: true } };

/** Every variant crossed with disabled — the `-disabled` fill and
 *  `-on-disabled` foreground differ per variant. */
export const DisabledVariants: Story = {
  render: (args) => (
    <Stack>
      <Row label="disabled">
        <IconButton {...args} variant="primary" disabled label="Play" glyph={Play} />
        <IconButton {...args} variant="secondary" disabled label="Previous slide" glyph={ChevronLeft} />
        <IconButton {...args} variant="ghost" disabled label="Next slide" glyph={ChevronRight} />
      </Row>
    </Stack>
  ),
};

/** The longest label in the prototype. The button does not grow — the string
 *  lives in the accessible name and the tooltip, never in the box. */
export const LongLabel: Story = {
  args: { glyph: UserRound, label: 'Open profile and settings' },
};
