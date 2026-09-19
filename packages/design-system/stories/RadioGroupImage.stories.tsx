/**
 * RadioGroupImage — image-and-text radio group.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.7. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroupImage } from '../src/RadioGroupImage';
import { Stack, asset, fixedWidth } from './_decorators';

/* Storybook serves /assets. The prototype points every option at the same
   placeholder artwork and authors a distinct alt for each. */
const IMAGE = asset('assets/web/method-card.png');

/* ABOUT YOU — the prototype's only usage of this component, verbatim. */
const OPTIONS = [
  { value: 'by-myself', label: 'By myself', image: IMAGE, imageAlt: 'Placeholder artwork for using Musie by yourself' },
  { value: 'with-a-group', label: 'With a group', image: IMAGE, imageAlt: 'Placeholder artwork for using Musie with a group' },
  { value: 'with-my-partner', label: 'With my partner', image: IMAGE, imageAlt: 'Placeholder artwork for using Musie with your partner' },
  { value: 'with-a-patient', label: 'With a patient', image: IMAGE, imageAlt: 'Placeholder artwork for using Musie with a patient' },
];

const meta = {
  title: 'Components/RadioGroupImage',
  component: RadioGroupImage,
  decorators: [fixedWidth(393)],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: RadioGroup + Radio + Fieldset. Same primitives and the same',
          'selection semantics as RadioGroupText. APG pattern: Radio Group.',
          '',
          '**Purpose.** Pick exactly one option where the image is how the option is',
          'recognised — the onboarding "who are you here as?" screen.',
          '',
          '**Deliberately a separate component** (brief §9). Three behaviours differ and',
          'each one is a policy rather than a style: the grid binds to Layer 1’s column',
          'table, `imageAlt` is **required per item** in the type, and the label is',
          '**never** clamped. Collapsing them into one component with an optional image',
          'prop would force one of the two truncation policies to lose.',
          '',
          '**`imageAlt` is required** because these images carry meaning — they are how a',
          'pre-literate or low-literacy user tells the options apart — so `alt=""` is not',
          'reachable through this API. The check is `aria-hidden`; the radio’s checked',
          'state is what is announced.',
          '',
          '**Selection** moves into a floating check over the media, so a short label',
          'does not shift when selected. Disabled additionally drops the media to',
          '`opacity: 0.5` — the only opacity value in the pass, and it is on decorative',
          'media, not on text.',
          '',
          '**Image ratio** is 1 / 1, read from the Figma card (152px wide, 150px media).',
          '',
          '**Card floor — 196px** (`--musy-card-min`, shared with RadioCards). The column',
          'count yields before the card does, and it answers to the CONTAINER, not the',
          'viewport: one auto-fit rule caps the grid at four columns and floors the track',
          'at 196px, so the count is correct inside a theme panel or a sidebar, where a',
          'media query would resolve the desktop grid and overflow. Token gap G4. Stories',
          'are therefore rendered in a fixed-width container.',
          '',
          '**No `guided` prop:** a card’s target is its whole footprint, already far past',
          '64px.',
          '',
          '**What it is NOT.** Not a gallery, not a card grid with links, not a',
          'multi-select.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## RadioGroupImage — the docs give a viewport breakpoint table, the CSS is container-driven',
          'Where: `src/musy-components.css:889-896` vs docs/07-components.md §7.7',
          '"Responsive behaviour"',
          'What I checked: Level 3, the docs, give a table keyed to Layer 1’s breakpoints:',
          '2 columns at base, 3 at `--bp-md` 768, 4 at `--bp-lg` 1024. Level 1, the CSS,',
          'has no media query at all: `.musy-radio-card-group` is one auto-fit rule,',
          '`repeat(auto-fit, minmax(min(100%, max(--musy-card-min, (100% - 3 gaps) / 4)),',
          '1fr))`, and the comment above it says a viewport-keyed media query "cannot see"',
          'the containers this sits in. The component header agrees with the CSS.',
          'What I did: used `fixedWidth(393)` on the meta and a `Tablet` story at 834, so',
          'the column count in each story is the count that container really produces.',
          'Why: CONVENTIONS §6 says fixedWidth is for a layout that answers to its',
          'container, and this one does, even though it names only RadioCards.',
          'What I need from Ben: nothing to decide — §7.7’s breakpoint table describes an',
          'implementation that no longer exists and should be replaced by the auto-fit',
          'rule. The column counts it promises are not what renders.',
          '',
          '## RadioGroupImage — `className` lands on the inner grid, not on the root',
          'Where: `src/RadioGroupImage.tsx:73-79`',
          'What I checked: Level 1. `Fieldset.Root` gets a hardcoded `"musy-radio-group"`',
          'and the consumer’s `className` is appended to the inner',
          '`div.musy-radio-card-group` instead. RadioGroupText, built on the same',
          'primitives, puts `className` on the root. RadioCards behaves like this one.',
          'What I did: no story passes `className`, so nothing is documented that would',
          'later be wrong.',
          'What I need from Ben: **a decision.** Two of the three radio components send',
          '`className` somewhere different from the first, and a consumer cannot tell',
          'which from the prop name. Whichever is right, all three should agree.',
          '',
          '## RadioGroupImage — the prototype never uses `disabled`; it routes to a lightbox',
          'Where: PROTOTYPE-USAGE.md, "RadioGroupImage — 1 usage"',
          'What I checked: Level 2. Only `by-myself` is implemented; the other three open',
          'the "Not implemented yet" lightbox rather than being disabled.',
          'What I did: wrote `Disabled` and `OptionDisabled` anyway, as API coverage, and',
          'left the prototype’s own four options unmodified in every other story.',
          'Why: the props exist and the brief asks for those states; the stories document',
          'the component, not the screen.',
          'What I need from Ben: nothing, just flagging — do not read `OptionDisabled` as',
          'a recommendation for the ABOUT YOU screen.',
          '',
          '## RadioGroupImage — no `guided`, unlike RadioGroupText',
          'Where: `src/RadioGroupImage.tsx:41-53` (props) vs `src/RadioGroupText.tsx:48`',
          'What I checked: Level 1 confirms the prop is absent. Level 3, §7.7 Props, says',
          'so on purpose: "No `guided` prop: a card’s target is its whole footprint,',
          'already far past 64px."',
          'What I did: no `Guided` story. Documented the reason in the description.',
          'Why: the omission is explained by the docs, so it is a decision, not a gap.',
          'What I need from Ben: nothing, just flagging that the three radio components',
          'have three different prop sets.',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'about-you',
    legend: 'And who are you here as?',
    options: OPTIONS,
    value: 'by-myself',
  },
  argTypes: {
    name: { control: 'text', description: 'Identifies the field when a form is submitted.' },
    legend: { control: 'text', description: 'The group’s accessible name, rendered as a real <legend>.' },
    hint: { control: 'text', description: 'Optional supporting sentence under the legend.' },
    options: {
      control: false,
      description: 'Each item adds image and imageAlt, both required. Alt text is authored PER ITEM — alt="" is not reachable through this API.',
    },
    value: { control: 'text', description: 'Controlled selection.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the new value.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Solved accent family. `accent` is the default; `accent-alt` is for contexts where warnings are common.',
    },
    disabled: { control: 'boolean', description: 'Disables the whole group.' },
    error: { control: 'text', description: 'Validation message. Renders a Message in error variant below the group.' },
    emptyLabel: { control: 'text', description: 'Empty state, shown instead of the cards when options is empty.' },
    className: { control: false },
  },
} satisfies Meta<typeof RadioGroupImage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults at the 393px phone reference — two columns. The
 *  prototype passes `accent`; `primary` is the default. */
export const Default: Story = {};

/** All three accent families. The prototype's one usage is
 *  `accent`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <RadioGroupImage {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <RadioGroupImage {...args} name="a-p1" accent="accent" legend="accent: accent" />
      <RadioGroupImage {...args} name="a-p2" accent="accent-alt" legend="accent: accent-alt" />
    </Stack>
  ),
};

/** With the optional hint under the legend. */
export const WithHint: Story = {
  args: { hint: 'Musie uses this to narrow down the Methods it offers you.' },
};

/** Nothing selected. Valid: the group carries no default until the user picks. */
export const NoSelection: Story = { args: { value: undefined } };

/** `emptyLabel` replaces the cards and spans the grid. Shown with the
 *  component's own default, which is German. */
export const Empty: Story = { args: { options: [], value: undefined } };

/** Whole group disabled. Disabled additionally drops the media to 50%. */
export const Disabled: Story = { args: { disabled: true } };

/** A single option disabled, the rest live. */
export const OptionDisabled: Story = {
  args: {
    options: [
      OPTIONS[0],
      OPTIONS[1],
      OPTIONS[2],
      { ...OPTIONS[3], disabled: true },
    ],
  },
};

/** `[data-invalid]` on the fieldset, `aria-invalid` per card, and an error
 *  Message below the group. */
export const WithError: Story = {
  args: { value: undefined, error: 'Pick one to continue.' },
};

/** The same group in an 834px container — the tablet reference. The column
 *  count comes from the container, not the viewport. */
export const Tablet: Story = { decorators: [fixedWidth(834)] };
