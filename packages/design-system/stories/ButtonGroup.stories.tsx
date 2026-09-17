/**
 * ButtonGroup — stories. Shape per stories/CONVENTIONS.md, matching the
 * exemplar stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.4a. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft } from 'lucide-react';
import { ButtonGroup } from '../src/ButtonGroup';
import { CtaButton } from '../src/CtaButton';
import { bothThemes, Stack, Row } from './_decorators';

/* The prototype's own wizard action row — METHOD FLOW, align="end". The
   primary action comes FIRST in the markup, because DOM order is priority
   order once the group stacks. See PROTOTYPE-USAGE.md. */
const WIZARD_ACTIONS = (
  <>
    <CtaButton variant="primary">Continue</CtaButton>
    <CtaButton variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
  </>
);

const meta = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'The two or three actions a screen or step ends with, as one part.',
          '',
          '**Not a new button, and not a toolbar.** No roving focus, no segmented',
          'selection, no shared border radius: the children are ordinary §7.4 CTA',
          'Buttons and each one keeps its own target, focus ring and state matrix. The',
          'group owns exactly one thing — how the row behaves when it stops fitting.',
          '',
          '**Why it exists.** A row of --target-guided buttons is already about 2×20ch.',
          'Below --bp-md it either wraps into a ragged staircase or squeezes the',
          'labels, and every screen was solving that again with its own inline flex',
          'rules. Here the rule is written once: below --bp-md the group stacks and',
          'every action goes full width, in DOM order — **which is also priority order,',
          'so the primary action must come first in the markup.** `align` is ignored',
          'once stacked.',
          '',
          '**What it is NOT.** Not a toolbar (no `role`, no arrow-key navigation), not a',
          'segmented control, not a split button, not a sticky action bar — pinning the',
          'group to the viewport edge is the screen’s decision, not the group’s.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## ButtonGroup — the stacked state cannot be shown by any story',
          'Where: src/musy-components.css:3666 (`@media (max-width: 767.98px)`)',
          'What I checked: Level 1. The stacking rule is a VIEWPORT media query, not a',
          'container query, so it answers to the Storybook preview iframe and not to the',
          'pane the story renders in. `fixedWidth()` in stories/_decorators.tsx narrows',
          'the container and therefore changes nothing here.',
          'What I did: used `bothThemes` and documented the rule in prose; the `Stacked`',
          'state has no story.',
          'Why: the only honest way to show it is to resize the preview, and adding a',
          'viewport addon would be a config change, which is out of scope.',
          'What I need from Ben: nothing, just flagging — but note that the component’s',
          'one and only responsibility is the state its stories cannot show.',
          '',
          '## ButtonGroup — the default `align` contradicts layout rule L6',
          'Where: src/ButtonGroup.tsx:26 (`align = ’start’`)',
          'What I checked: Level 1, the component defaults to `start`. Level 2, the',
          'prototype uses the component twice and passes `end` and `center` — never the',
          'default. Level 3, docs/10-layout.md L6: "A primary CTA is right-aligned to its',
          'parent. A Continue button always is."',
          'What I did: nothing. The `Default` story shows `align="start"` as declared.',
          'Why: the default is the component’s, and stories document what is, not what',
          'should be. This repeats the Step 1 entry rather than replacing it.',
          'What I need from Ben: **a decision.** Every real use overrides the default.',
          '',
          '## ButtonGroup — "2–3 actions" is documented but not enforced anywhere',
          'Where: src/ButtonGroup.tsx:19-24, docs/07-components.md §7.4a anatomy',
          'What I checked: Level 1. `children` is a bare ReactNode: there is no count',
          'prop, no runtime check and no development warning. Level 3 states 2–3 in both',
          'the purpose line and the anatomy block. SegmentedControl, by contrast, warns',
          'in development when it is given more than four options.',
          'What I did: covered two and three actions, and added a `FourActions` story',
          'showing what the component currently allows.',
          'Why: the story documents the real surface; adding a warning would be a',
          'component change.',
          'What I need from Ben: **a decision.** Either 2–3 is a real constraint and the',
          'component should say so the way SegmentedControl does, or the docs should stop',
          'asserting it.',
          '',
          '## ButtonGroup — no rest-prop passthrough',
          'Where: src/ButtonGroup.tsx:19-24',
          'What I checked: Level 1. The props are `children`, `align`, `className` and',
          'nothing else — no `...rest`, no `render`. Most of the set (Icon, Logo,',
          'ContentBox) takes base-ui’s `render`; this one does not.',
          'What I did: nothing. No story needs it.',
          'Why: it is an API observation, not a blocker for this component.',
          'What I need from Ben: nothing, just flagging — an `id` or a `data-*` hook on',
          'the row is currently impossible without wrapping it in another element.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: WIZARD_ACTIONS,
  },
  argTypes: {
    children: {
      control: false,
      description: '2–3 CTA Buttons. The primary action comes first in the markup, because DOM order is priority order once the group stacks.',
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'center', 'end'],
      description: 'Row alignment at --bp-md and up. Ignored once stacked.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: `align="start"`. The prototype never uses this value —
 *  both of its groups pass `end` or `center`. */
export const Default: Story = {};

/** Every alignment the component declares. `end` is the wizard's action row;
 *  `center` is the prototype's other use. */
export const Alignments: Story = {
  render: (args) => (
    <Stack>
      <Row label="align: start (default)"><ButtonGroup {...args} align="start" /></Row>
      <Row label="align: center"><ButtonGroup {...args} align="center" /></Row>
      <Row label="align: end — the wizard action row"><ButtonGroup {...args} align="end" /></Row>
    </Stack>
  ),
};

/** The ceiling of the documented range. Priority order, top to bottom once
 *  stacked: primary, then secondary, then ghost. */
export const ThreeActions: Story = {
  args: {
    align: 'end',
    children: (
      <>
        <CtaButton variant="primary">Complete Exercise with this card</CtaButton>
        <CtaButton variant="secondary">Scan a different card</CtaButton>
        <CtaButton variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </>
    ),
  },
};

/** Four actions. Past the documented 2–3 the component neither warns nor caps —
 *  see the build notes. */
export const FourActions: Story = {
  args: {
    children: (
      <>
        <CtaButton variant="primary">Continue</CtaButton>
        <CtaButton variant="secondary">Show details &amp; player</CtaButton>
        <CtaButton variant="ghost">Not right now</CtaButton>
        <CtaButton variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </>
    ),
  },
};

/** Two `guided` (64px) buttons — the row the stacking rule was written for: at
 *  this size the pair is about 2×20ch. The prototype uses `guided` only in the
 *  Listen step. */
export const GuidedTargets: Story = {
  args: {
    align: 'end',
    children: (
      <>
        <CtaButton variant="primary" size="guided">Start Reflection</CtaButton>
        <CtaButton variant="secondary" size="guided">Track details &amp; Player</CtaButton>
      </>
    ),
  },
};

/** A disabled primary beside a live ghost. The group owns no state of its own —
 *  each child keeps its own state matrix. */
export const DisabledAction: Story = {
  args: {
    children: (
      <>
        <CtaButton variant="primary" disabled>Continue</CtaButton>
        <CtaButton variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </>
    ),
  },
};

/** A loading primary beside a live ghost, for the same reason. */
export const LoadingAction: Story = {
  args: {
    children: (
      <>
        <CtaButton variant="primary" loading>Finish session</CtaButton>
        <CtaButton variant="ghost" leadingIcon={ArrowLeft}>Back</CtaButton>
      </>
    ),
  },
};

/** The longest labels in the system, wrapped. Two German compounds are what the
 *  stacking rule exists to survive. */
export const LongLabels: Story = {
  args: {
    align: 'end',
    children: (
      <>
        <CtaButton variant="primary" wrap>Complete Exercise with this card</CtaButton>
        <CtaButton variant="secondary" wrap>Photo of your handwritten notes</CtaButton>
      </>
    ),
  },
};
