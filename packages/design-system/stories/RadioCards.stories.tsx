/**
 * RadioCards — rich, readable radio cards.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.13. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioCards } from '../src/RadioCards';
import { Stack, asset, fixedWidth } from './_decorators';

/* Storybook serves /assets. */
const IMAGE = asset('assets/web/method-card.png');

/* METHOD RECOMMENDATION — the prototype's two cards, verbatim. Only the first
   card has a duration in the prototype, so only it carries `label`. */
const OPTIONS = [
  {
    value: 'mindfulness-break',
    headline: 'Quick Mindfulness Break',
    description: 'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.',
    label: '2–12 minutes',
    image: IMAGE,
    imageAlt: 'The Mindfulness Cards deck laid out on a table',
  },
  {
    value: 'breathing-score',
    headline: 'Breathing Score',
    description: 'A slow score that follows your breath, for settling before anything else.',
    image: IMAGE,
    imageAlt: 'Placeholder artwork for the Breathing Score Method',
  },
];

const meta = {
  title: 'Components/RadioCards',
  component: RadioCards,
  decorators: [fixedWidth(393)],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: RadioGroup + Radio + Fieldset — the same primitives and the same',
          'selection semantics as RadioGroupImage, composed over Content Box’s anatomy.',
          'APG pattern: Radio Group.',
          '',
          '**Purpose.** Choose one of several things the user has to *read* to choose',
          'between — an exercise, a method, a session length with a caveat attached.',
          '',
          '**A third radio component, not a variant.** The content differs in kind: these',
          'cards carry a description, so they are read rather than scanned, and that',
          'inverts the responsive rule. RadioGroupImage’s two-word label survives two-up',
          'at 393px; a headline, two lines of German body and a meta label do not.',
          'Collapsing the two components would force one of the two column tables to',
          'lose. Anatomy comes from Content Box; selection comes from RadioGroupImage;',
          'neither is re-invented.',
          '',
          '**The whole card is the control.** There is no nested link or button: a radio',
          'with an interactive child is a 4.1.2 failure waiting to happen, and the',
          '"learn more" affordance belongs outside the group.',
          '',
          '**Container, not viewport.** The group is an inline-size container: the column',
          'count is an auto-fit floor rule, and the card’s own layout switch is an',
          '`@container` query on GROUP width. Both halves have to agree, or a narrow',
          'panel gets a correct one-up grid holding cards laid out for a desktop',
          'three-up. This component sits in the MVP’s sidebar column, where that is not',
          'hypothetical. Stories are therefore rendered in a fixed-width container.',
          '',
          '**`headingLevel` is never guessed** (1.3.1) — the headline is a real heading at',
          'a level the consumer passes, because the correct level depends on where the',
          'group sits. `imageAlt` is required per item, same rule as RadioGroupImage.',
          '',
          '**Selection carries four cues** — fill, border weight, check glyph, headline',
          'colour — so it survives `prefers-contrast: more` and greyscale with no special',
          'case (1.4.1).',
          '',
          '**What it is NOT.** Not a link grid, not a multi-select, not Radio Group image',
          '(short labels, denser columns).',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## RadioCards — the component header and the CSS disagree about the grid',
          'Where: `src/RadioCards.tsx:16-30` (header comment) vs',
          '`src/musy-components.css:1574-1595` and docs/07-components.md §7.13',
          'What I checked: Level 1, the header comment, says "CARD FLOOR — 196px',
          '(--musy-card-min …), capped at three columns", that the card is "a LIST while',
          'narrow … two-up then three-up as it widens", and that the card’s',
          'list-to-stacked switch is an `@container` query at `--bp-md`. Level 1, the CSS',
          'that actually renders it, says `--musy-rcard-row-min: 480px` and',
          '`repeat(auto-fit, minmax(min(100%, 480px), 1fr))`, with the container query at',
          '480px, not `--bp-md`. Level 3, §7.13, matches the CSS and states the card is a',
          'list row "at every width" and that the group "never" goes three-up; it records',
          'the 196px stacked-card floor as the OLD behaviour that was removed in review.',
          'What I did: wrote the description from the CSS and the docs, kept the parts of',
          'the header comment the CSS still supports (container not viewport, whole card',
          'is the control), and dropped the column numbers entirely rather than repeat',
          'either figure.',
          'Why: the stylesheet is what renders; the header comment was not updated with',
          'the review that changed the rule.',
          'What I need from Ben: **a decision** — the header comment of',
          '`src/RadioCards.tsx` is out of date in three particulars (196px floor, three',
          'columns, `--bp-md` switch) and is the first thing a developer reads.',
          '',
          '## RadioCards — the prototype’s three Hint facts have no prop',
          'Where: PROTOTYPE-USAGE.md, "RadioCards — 2 usages" and "Hint — 3 usages"',
          'What I checked: Level 2. Each prototype card carries three Hint-wrapped facts',
          '(duration, "Needs your Mindfulness Cards deck", "Sound on — headphones',
          'recommended") and the group carries a `dl` legend naming the three glyphs.',
          'Level 3, §7.13’s anatomy block, shows `span.musy-rcard__facts` and',
          '`dl.musy-rcard-legend` as part of the component. Level 1: neither exists in',
          '`RadioCards.tsx`. There is no `facts` prop, no `children`, and no slot; the',
          'optional `label` is the only place a fact could go.',
          'What I did: used `label` for the one fact that fits a single meta line — the',
          'duration — and left the other two out.',
          'Why: inventing a prop is out of scope, and putting three sentences in `label`',
          'would misrepresent what the meta line is for.',
          'What I need from Ben: **a decision.** Either the facts row and the glyph legend',
          'are prototype-only markup and §7.13’s anatomy is wrong, or the component is',
          'missing them. As it stands the documented anatomy cannot be produced by the',
          'component’s API.',
          '',
          '## RadioCards — only one of the prototype’s two cards has a meta label',
          'Where: PROTOTYPE-USAGE.md, "RadioCards" table',
          'What I checked: Level 2 gives a duration ("2–12 minutes") only for Quick',
          'Mindfulness Break. Nothing is recorded for Breathing Score.',
          'What I did: card one carries `label`, card two does not, in every story.',
          'Why: `label` is optional precisely so "a card with nothing to qualify should',
          'not carry an empty line", and this also shows both shapes in one story.',
          'What I need from Ben: nothing, just flagging that the asymmetry is deliberate.',
          '',
          '## RadioCards — `className` lands on the inner grid, not on the root',
          'Where: `src/RadioCards.tsx:118-122`',
          'What I checked: Level 1. `Fieldset.Root` gets a hardcoded `"musy-radio-group"`',
          'and `className` is appended to `div.musy-rcard-group`. RadioGroupImage does the',
          'same; RadioGroupText puts it on the root.',
          'What I did: no story passes `className`.',
          'What I need from Ben: **a decision** — same question as RadioGroupImage. Two of',
          'the three radio components send `className` to a different element than the',
          'first, and nothing in the prop name says so.',
          '',
          '## RadioCards — the docs props table omits `disabled`',
          'Where: docs/07-components.md §7.13 Props vs `src/RadioCards.tsx:80`',
          'What I checked: Level 3’s table lists `name`/`legend`, `hint`, `options`,',
          '`value`/`onValueChange`, `accent`, `headingLevel`, the two type steps, `error`',
          'and `emptyLabel` — no `disabled`. Level 1 declares `disabled = false` and',
          'passes it to the RadioGroup, and the state matrix in the same docs section DOES',
          'describe a disabled state.',
          'What I did: wrote the `Disabled` story from the source.',
          'Why: Level 1 is the authority on the API.',
          'What I need from Ben: nothing to decide, but the props table is incomplete.',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'method',
    legend: 'What would you like to start with now?',
    options: OPTIONS,
    value: 'mindfulness-break',
  },
  argTypes: {
    name: { control: 'text', description: 'Identifies the field when a form is submitted.' },
    legend: { control: 'text', description: 'The group’s accessible name, rendered as a real <legend>.' },
    hint: { control: 'text', description: 'Optional supporting sentence under the legend.' },
    options: {
      control: false,
      description: 'Each card is { value, headline, description, label?, image, imageAlt, disabled? }. imageAlt is required per item.',
    },
    value: { control: 'text', description: 'Controlled selection.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the new value.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent-placeholder1', 'accent-placeholder2'],
      description: 'Solved accent family. Literal placeholder names per Decision 3.',
    },
    headingLevel: {
      control: 'inline-radio',
      options: [2, 3, 4, 5, 6],
      description: 'Heading level for the card headlines — never guessed (1.3.1).',
    },
    headlineStep: {
      control: 'select',
      options: ['display-xl', 'display-lg', 'stage', 'heading-lg', 'heading-md', 'heading-sm', 'body-lg', 'body-md', 'body-sm', 'label-lg', 'label-md'],
      description: 'Type step for the card headline.',
    },
    descriptionStep: {
      control: 'select',
      options: ['display-xl', 'display-lg', 'stage', 'heading-lg', 'heading-md', 'heading-sm', 'body-lg', 'body-md', 'body-sm', 'label-lg', 'label-md'],
      description: 'Type step for the card description.',
    },
    disabled: { control: 'boolean', description: 'Disables the whole group.' },
    error: { control: 'text', description: 'Validation message. Renders a Message in error variant below the group.' },
    emptyLabel: { control: 'text', description: 'Empty state, shown instead of the cards when options is empty.' },
    className: { control: false },
  },
} satisfies Meta<typeof RadioCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults at the 393px phone reference. The prototype passes
 *  `accent-placeholder1`, `heading-sm` and `body-md`; the last two are the
 *  component's own defaults. */
export const Default: Story = {};

/** All three accent families. The prototype's usage is `accent-placeholder1`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <RadioCards {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <RadioCards {...args} name="a-p1" accent="accent-placeholder1" legend="accent: accent-placeholder1" />
      <RadioCards {...args} name="a-p2" accent="accent-placeholder2" legend="accent: accent-placeholder2" />
    </Stack>
  ),
};

/** The headline and description type steps are props. `heading-sm` / `body-md`
 *  are the defaults and are what the prototype uses. */
export const TypeSteps: Story = {
  args: { headlineStep: 'heading-md', descriptionStep: 'body-lg' },
};

/** `headingLevel` decides the real heading element. It is never guessed — the
 *  correct level depends on where the group sits. */
export const HeadingLevelTwo: Story = { args: { headingLevel: 2 } };

/** With the optional hint under the legend. */
export const WithHint: Story = {
  args: { hint: 'You can change this at any point in the session.' },
};

/** Nothing selected. Valid: the group carries no default until the user picks. */
export const NoSelection: Story = { args: { value: undefined } };

/** `emptyLabel` spans the grid. Shown with the component's own default, which
 *  is German. */
export const Empty: Story = { args: { options: [], value: undefined } };

/** Whole group disabled — all three text roles drop to --on-surface-disabled
 *  and the media to 50%. */
export const Disabled: Story = { args: { disabled: true } };

/** A single card disabled, the rest live. */
export const OptionDisabled: Story = {
  args: {
    options: [
      {
        value: 'mindfulness-break',
        headline: 'Quick Mindfulness Break',
        description: 'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.',
        label: '2–12 minutes',
        image: IMAGE,
        imageAlt: 'The Mindfulness Cards deck laid out on a table',
      },
      {
        value: 'breathing-score',
        headline: 'Breathing Score',
        description: 'A slow score that follows your breath, for settling before anything else.',
        image: IMAGE,
        imageAlt: 'Placeholder artwork for the Breathing Score Method',
        disabled: true,
      },
    ],
  },
};

/** `aria-invalid` per card, `[data-invalid]` on the fieldset, and an error
 *  Message below the group. */
export const WithError: Story = {
  args: { value: undefined, error: 'Pick a method to continue.' },
};

/** The same group in an 834px container — the tablet reference. The card's own
 *  layout switch is a container query on the GROUP, so this is the only way to
 *  see the wider anatomy. */
export const Tablet: Story = { decorators: [fixedWidth(834)] };
