/**
 * ButtonGroup — stories. Shape per stories/CONVENTIONS.md, matching the
 * exemplar stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.4a. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { ButtonGroup } from '../src/ButtonGroup';
import { CtaButton } from '../src/CtaButton';
import { Switch } from '../src/Switch';
import { bothThemes, fixedWidth, Stack, Row } from './_decorators';

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
          '**One primary per row, and it is the way on** — §7.4’s rule, and this is',
          'where it is usually spent. The action that carries the person onward is',
          '`primary`; Back, Cancel and every alternative route are `secondary` or',
          '`ghost`, whatever their likelihood. A row whose state has no way onward — a',
          'step that has not been finished yet — simply has no primary in it, which is',
          'also why the primary comes FIRST in the markup: DOM order is priority order',
          'once the group stacks.',
          '',
          '**The gap is the relationship.** Two alternatives — Discard · Save, Back ·',
          'Continue — read as one control pair and sit at `--space-gap-inline` (L6),',
          'which is the default. A group holding controls of different **kinds**, there',
          'because the step ends and not because they are choices between each other,',
          'is L2’s "controls inside one molecule" and takes `relation="molecule"`:',
          '`--space-gap-stack`, in the row and in the stacked column alike. Which of',
          'the two a row holds is the caller’s to say — it is the only one who knows.',
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
          'What I checked: Level 1. The props are `children`, `align`, `relation`,',
          '`className` and nothing else — no `...rest`, no `render`. Most of the set',
          '(Icon, Logo,',
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
      description: '2–3 CTA Buttons — or, with relation="molecule", the controls a step ends with. Among alternatives the primary comes first in the markup, because DOM order is priority order once the group stacks; in a molecule it is reading order and the way on comes last.',
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'center', 'end'],
      description: 'Row alignment at --bp-md and up. Ignored once stacked.',
    },
    relation: {
      control: 'inline-radio',
      options: ['alternatives', 'molecule'],
      description: 'What the children are to each other, which is what the gap ladder keys on: two alternatives at --space-gap-inline (default), controls inside one molecule at --space-gap-stack.',
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

/** Both gaps, and the second one is the listening step's sheet: a mute switch
 *  beside the way on. They are not alternatives — pressing one is not
 *  declining the other — so the row spends one rung more between them. */
export const Relations: Story = {
  render: (args) => (
    <Stack>
      <Row label="relation: alternatives (default) — --space-gap-inline">
        <ButtonGroup {...args} align="end" />
      </Row>
      <Row label="relation: molecule — --space-gap-stack">
        <ButtonGroup align="end" relation="molecule">
          <Switch
            label="Mute the sounds"
            checked={false}
            onCheckedChange={() => {}}
            onGlyph={VolumeX}
            offGlyph={Volume2}
          />
          <CtaButton variant="primary">Start reflection</CtaButton>
        </ButtonGroup>
      </Row>
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

/**
 * `stacked="hug"` — trailing on a wide screen, and still trailing on a phone.
 *
 * The one way out of full width below `--bp-md`, added 2026-10-12. Narrow the
 * viewport to see what it is for: the default stretches every action across
 * the column, which is right at the END of a step and wrong for a group that
 * merely sits beside the way on — two full-width buttons there read as two
 * equal commitments.
 *
 * It is also what lets `align` survive the stack. Hugging buttons have an
 * alignment to have, so `end` keeps meaning `end` in both directions instead
 * of being ignored once the row becomes a column.
 *
 * Compare with `LongLabels` directly above: same `align="end"`, default
 * `stacked="fill"`.
 */
export const StackedHug: Story = {
  args: {
    align: 'end',
    stacked: 'hug',
    children: (
      <>
        <CtaButton variant="outline" wrap>Die Frage funktioniert für mich nicht</CtaButton>
        <CtaButton variant="primary" wrap>Wenn du bereit bist, beginne zu reflektieren</CtaButton>
      </>
    ),
  },
};

/** `purpose="continue-only"` — THE ORDER AXIS, 2026-10-16.
 *
 *  Ben: *"the primary action is always bottom right, the secondary action
 *  left next to it, the tertiary action left next to it."* For a group whose
 *  every control is a way ON from here — nothing in it acts on the page
 *  behind it.
 *
 *  DOM ORDER IS UNCHANGED and is still priority order: primary, secondary,
 *  tertiary, exactly as written below. The reversal is `row-reverse`, so a
 *  keyboard and a screen reader meet the primary first while the eye meets it
 *  last. Tab through this story to see the two disagree on purpose.
 *
 *  `align` is ignored here — the trailing edge is part of what the variant
 *  means, so a group cannot ask for both and have one silently win.
 *
 *  The reflect step's incomplete dialog is the only consumer today, by
 *  instruction. */
export const ContinueOnly: Story = {
  args: {
    purpose: 'continue-only',
    children: (
      <>
        <CtaButton variant="primary">Entdecke deine Gefühle</CtaButton>
        <CtaButton variant="outline">Weiter bearbeiten</CtaButton>
        <CtaButton variant="ghost">Trotzdem speichern</CtaButton>
      </>
    ),
  },
};

/** The same variant with two actions, which is the commoner shape. */
export const ContinueOnlyPair: Story = {
  args: {
    purpose: 'continue-only',
    children: (
      <>
        <CtaButton variant="primary">Ich bin fertig</CtaButton>
        <CtaButton variant="outline">Weiteres Gefühl festhalten</CtaButton>
      </>
    ),
  },
};

/** BELOW --bp-md THE COLUMN REVERSES TOO, which is a deliberate exception to
 *  this component's own rule that the stacked order is DOM order, top to
 *  bottom. "Always bottom right" has no right once there is no row, so the
 *  primary becomes the bottom button — directly above the thumb.
 *
 *  Put to Ben as a conflict with the existing rule and chosen with it named.
 *  The old rule is not wrong; it belongs to `purpose="actions"`.
 *
 *  Narrow pane, so the stack is visible without resizing the window. */
export const ContinueOnlyStacked: Story = {
  decorators: [fixedWidth(360)],
  args: {
    purpose: 'continue-only',
    children: (
      <>
        <CtaButton variant="primary">Entdecke deine Gefühle</CtaButton>
        <CtaButton variant="outline">Weiter bearbeiten</CtaButton>
        <CtaButton variant="ghost">Trotzdem speichern</CtaButton>
      </>
    ),
  },
};
