/**
 * CtaButton — Batch B (controls).
 *
 * Docs text below comes from the component's own header comment and from
 * docs/07-components.md §7.4. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { CtaButton } from '../src/CtaButton';
import { bothThemes, Row, Stack } from './_decorators';

/* The prototype's own primary CTA — ONBOARDING, "Start a session", default
   size. See PROTOTYPE-USAGE.md, "CtaButton — 28 usages". */

const meta = {
  title: 'Components/CtaButton',
  component: CtaButton,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Button (`@base-ui/react/button`).',
          'APG pattern: Button.',
          '',
          'The primary text action on a screen.',
          '',
          'base-ui’s Button keeps a disabled button **focusable** (`aria-disabled` rather',
          'than the native attribute where appropriate), which is the accessible behaviour',
          'a native `<button disabled>` loses: a keyboard user can still reach the control',
          'and find out why it is unavailable.',
          '',
          'Default target `--target-primary` (44px, brief §5.4). `--target-guided` (64px)',
          'and `--target-comfort` (56px) are size variants (Decision 4) — they raise the',
          'TARGET, not the type step.',
          '',
          '**`size="min"` is the small rung, and it carries a condition.** At',
          '`--target-min` (24px). Layer 1 §5.4 permits 24px for inline controls in prose',
          'and card controls on a fine pointer, and NEVER for a primary action — which is',
          'what a CTA usually is. It exists for the case where a LABELLED button is the',
          'inline control: a "change" beside a value, a dismiss inside a line of text. The',
          'stylesheet bakes in the `--sp-2` margin that earns 2.5.8’s spacing exception, so',
          'the target cannot be made illegal by placing it. Named `min` rather than `small`',
          'so the ladder reads identically on this component and on Icon Button.',
          '',
          '**The two accent variants are NOT a hue swap on primary**: ocher and purple are',
          'light solids and take dark ink, where terracotta is a dark solid and takes light',
          'ink. Each family carries its own solved `-hover` / `-active` / `-on` tokens.',
          'There is still no rule in the system for WHEN to pick an accent over primary —',
          'see conflict B12 and open question 7.',
          '',
          '`leadingIcon` is a leading icon **only**. A trailing icon means "this opens',
          'something else", which is a different component.',
          '',
          'Loading sets `aria-busy` and disables the button — a spinner without `disabled`',
          'invites a double submit — and holds the button’s footprint, so a full-width',
          'mobile CTA does not collapse mid-request. `wrap` releases the label to two lines',
          'rather than overflowing. `block` is offered because full-width-on-mobile is a',
          '*layout* decision; the button does not assume it.',
          '',
          '**What it is NOT.** Not a link (a navigation affordance is an `<a>` styled with',
          'the same classes), not a toggle, not a split button.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## CtaButton — inherited base-ui Button props cannot be filtered out of the docs table',
          'Where: `src/CtaButton.tsx:48` (`extends Omit<React.ComponentPropsWithoutRef<typeof Button>, \'className\'>`), `.storybook/main.ts`',
          'What I checked: Level 1, the component source. react-docgen cannot follow an',
          '`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the',
          'whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this',
          'session may not touch.',
          'What I did: hand-wrote `argTypes` for the component’s own props plus `disabled`',
          'and `onClick`. Did not add a `propFilter`.',
          'Why: config is off limits and the brief says to log it rather than fight the',
          'inference.',
          'What I need from Ben: **a `propFilter` in `.storybook/main.ts`**. Same entry as',
          'IconButton and Switch — one fix covers all three.',
          '',
          '## CtaButton — `render` is NOT omitted from the inherited props, where IconButton omits it',
          'Where: `src/CtaButton.tsx:48` (`Omit<…, \'className\'>`) vs `src/IconButton.tsx:24`',
          '(`Omit<…, \'children\' | \'className\' | \'render\'>`)',
          'What I checked: Level 1 only; neither Level 2 nor Level 3 mentions `render`.',
          'CtaButton therefore accepts base-ui’s `render` prop, which replaces the rendered',
          'element — a consumer can swap the `<button>` for an `<a>` and keep `musy-btn`,',
          'which §7.4 "What it is NOT" explicitly describes ("a navigation affordance is an',
          '`<a>` styled with the same classes"). `children` is also both inherited and',
          'redeclared.',
          'What I did: wrote no story using `render`. Left the API alone.',
          'Why: it may be intentional — §7.4 sanctions the styled-`<a>` case — but the two',
          'sibling buttons disagree and only one says why.',
          'What I need from Ben: **a decision.** Either omit `render` on CtaButton too, or',
          'document it as the sanctioned link escape hatch.',
          '',
          '## CtaButton — `size="min"` carries a baked-in margin, so it cannot be laid out flush',
          'Where: `src/musy-components.css:391` (`.musy-btn--min`), `docs/07-components.md` §7.4',
          'What I checked: Level 1 and Level 3 agree and explain it: the `--sp-2` margin',
          'earns 2.5.8’s spacing exception so the 24px target cannot be made illegal by',
          'placement.',
          'What I did: the `Sizes` story puts `min` in the same row as the other three',
          'rungs, where its margin makes it sit visibly further apart.',
          'Why: that offset is the component’s real behaviour, not a story bug.',
          'What I need from Ben: nothing, just flagging — the gap in the `Sizes` story is',
          'correct and should not be "fixed".',
          '',
          '## CtaButton — nothing says when to reach for an accent variant instead of `primary`',
          'Where: `src/CtaButton.tsx:29-31` header, `docs/07-components.md` §7.4 "Accent variants"',
          'What I checked: Level 1 says outright "There is still no rule in the system for',
          'WHEN to pick an accent over primary — see conflict B12 and open question 7".',
          'Level 2, the prototype, uses `accent-placeholder1` exactly twice, both for',
          '*start over / go back to choosing*, and never uses `accent-placeholder2` at all.',
          'Level 3 repeats the same open question.',
          'What I did: the `Variants` story shows all five; the per-story note records only',
          'the prototype’s observed usage, with no rationale attached.',
          'Why: CONVENTIONS §7 forbids inventing rationale.',
          'What I need from Ben: **the missing rule** (open question 7 / conflict B12).',
          '`accent-placeholder2` currently has no use anywhere in the system.',
          '',
          '## CtaButton — `loadingLabel` defaults to German and `loading` is never used in the prototype',
          'Where: `src/CtaButton.tsx:70` (`loadingLabel = \'Wird geladen\'`)',
          'What I checked: Level 1, the default. Level 2: "`loading` is never used in the',
          'prototype. Neither is `size="min"`, `size="comfort"`, `block`, `wrap`, or',
          '`accent-placeholder2`."',
          'What I did: wrote stories for all of them from the source and §7.4, using the',
          'component’s own German loading default unchanged.',
          'Why: the props exist and the brief asks for every variant and size; the prototype',
          'simply has not reached for them yet.',
          'What I need from Ben: nothing new — the language half is the session-level',
          'question already logged in Step 1.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'Start a session',
  },
  argTypes: {
    children: { control: 'text', description: 'The button label.' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'accent-placeholder1', 'accent-placeholder2'],
      description:
        'Fill family. Literal placeholder names, per Decision 3 — renaming later is a find-replace, not a redesign.',
    },
    size: {
      control: 'inline-radio',
      options: ['min', 'primary', 'comfort', 'guided'],
      description: 'Target rung: 24 / 44 / 56 / 64px. Defaults to primary.',
    },
    leadingIcon: {
      control: false,
      description:
        'Leading icon only. A trailing icon means "this opens something else", which is a different component.',
    },
    loading: { control: 'boolean', description: 'Sets aria-busy, reveals the spinner and disables the button.' },
    loadingLabel: { control: 'text', description: 'Announced while loading.' },
    block: { control: 'boolean', description: 'Fill the inline axis. A layout decision, so the consumer opts in.' },
    wrap: {
      control: 'boolean',
      description:
        'Allow the label to wrap to two lines instead of overflowing. German compounds at 393px need this more often than English does.',
    },
    disabled: { control: 'boolean', description: 'Inherited from base-ui Button. A disabled button stays focusable.' },
    onClick: { action: 'click' },
    className: { control: false },
  },
} satisfies Meta<typeof CtaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults — `primary` at 44px, with the prototype's ONBOARDING
 *  copy. */
export const Default: Story = {};

/** All five variants. The prototype uses `primary` for the one way forward,
 *  `secondary` for a real but lesser action, `ghost` for Back and anything that
 *  does not advance the flow, and `accent-placeholder1` exactly twice — both
 *  times for start over / go back to choosing. `accent-placeholder2` does not
 *  appear in the prototype at all. */
export const Variants: Story = {
  render: (args) => (
    <Stack>
      <Row label="variant: primary">
        <CtaButton {...args} variant="primary">Continue</CtaButton>
      </Row>
      <Row label="variant: secondary">
        <CtaButton {...args} variant="secondary">Simulate scan</CtaButton>
      </Row>
      <Row label="variant: ghost">
        <CtaButton {...args} variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </Row>
      <Row label="variant: accent-placeholder1">
        <CtaButton {...args} variant="accent-placeholder1">Start again</CtaButton>
      </Row>
      <Row label="variant: accent-placeholder2">
        <CtaButton {...args} variant="accent-placeholder2">Start again</CtaButton>
      </Row>
    </Stack>
  ),
};

/** The four target rungs: 24 / 44 / 56 / 64px. They raise the TARGET, not the
 *  type step. `min` sits further from its neighbours because its `--sp-2`
 *  margin is baked into the stylesheet — that offset is the component, not the
 *  story. */
export const Sizes: Story = {
  render: (args) => (
    <Row label="size">
      <CtaButton {...args} size="min">min</CtaButton>
      <CtaButton {...args} size="primary">primary</CtaButton>
      <CtaButton {...args} size="comfort">comfort</CtaButton>
      <CtaButton {...args} size="guided">guided</CtaButton>
    </Row>
  ),
};

/** `guided` (64px) is used only in the Listen step of the prototype, where the
 *  user may be across the room. `--target-guided` also widens the inline
 *  padding so a 64px pill does not read as a circle. */
export const Guided: Story = {
  args: { size: 'guided', children: 'Start Reflection' },
};

/** A leading icon. The prototype sets one on every Back button and on "Let
 *  Musie pick an exercise". The icon steps to `sm` when the size is `min`. */
export const WithLeadingIcon: Story = {
  render: (args) => (
    <Stack>
      <Row label="ghost + leading icon">
        <CtaButton {...args} variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </Row>
      <Row label="ghost + leading icon">
        <CtaButton {...args} variant="ghost" leadingIcon={Sparkles}>Let Musie pick an exercise</CtaButton>
      </Row>
      <Row label="secondary + leading icon">
        <CtaButton {...args} variant="secondary" leadingIcon={Send}>Send reflection</CtaButton>
      </Row>
    </Stack>
  ),
};

/** `block` fills the inline axis. Full-width-on-mobile is a layout decision, so
 *  the consumer opts in. Not used in the prototype. */
export const Block: Story = { args: { block: true, children: 'Complete Exercise with this card' } };

/** `wrap` releases the label to two lines rather than overflowing. German
 *  compounds at 393px need this more often than English does. Not used in the
 *  prototype. */
export const Wrap: Story = {
  args: { wrap: true, children: 'Vollständige Übung mit dieser Karte abschließen' },
};

/** `align="start"` puts the label at the inline start instead of centring it.
 *  For a STACK of full-width buttons — a nav drawer's rows — where five centred
 *  strings do not form a readable column. Only visible alongside `block`, since
 *  alignment needs the button to be wider than its label. `start` rather than
 *  `left` so the stack mirrors in RTL without a second rule. */
export const AlignStart: Story = {
  render: (args) => (
    <Stack>
      <CtaButton {...args} variant="primary">Start a session</CtaButton>
      <CtaButton {...args} block align="start" variant="ghost">Your diary</CtaButton>
      <CtaButton {...args} block align="start" variant="secondary">About you</CtaButton>
      <CtaButton {...args} block align="start" variant="ghost">How Musie works</CtaButton>
    </Stack>
  ),
};

/** Loading hides the label as well as the icon and holds the button's
 *  footprint, so a full-width mobile CTA does not collapse mid-request. The
 *  state is announced through the `role="status"` string. Reduced motion drops
 *  the spin entirely rather than collapsing its duration. */
export const Loading: Story = { args: { loading: true } };

/** Loading across the block case, where holding the footprint matters most. */
export const LoadingBlock: Story = { args: { loading: true, block: true } };

/** Disabled. The prototype disables "Start a session" until the carousel has
 *  been seen and "Continue" until a type is picked. */
export const Disabled: Story = { args: { disabled: true } };

/** Every variant crossed with disabled — each family carries its own `-disabled`
 *  fill and `-on-disabled` ink. */
export const DisabledVariants: Story = {
  render: (args) => (
    <Stack>
      <Row label="disabled">
        <CtaButton {...args} variant="primary" disabled>Continue</CtaButton>
        <CtaButton {...args} variant="secondary" disabled>Simulate scan</CtaButton>
        <CtaButton {...args} variant="ghost" disabled>Back</CtaButton>
      </Row>
      <Row label="disabled — accents">
        <CtaButton {...args} variant="accent-placeholder1" disabled>Start again</CtaButton>
        <CtaButton {...args} variant="accent-placeholder2" disabled>Start again</CtaButton>
      </Row>
    </Stack>
  ),
};

/** The longest label in the prototype, unwrapped. Without `wrap` the label
 *  overflows rather than breaking. */
export const LongLabel: Story = { args: { children: 'Complete Exercise with this card' } };
