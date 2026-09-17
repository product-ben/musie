/**
 * RadioGroupText — text-only radio group.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.6. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroupText } from '../src/RadioGroupText';
import { bothThemes, Stack } from './_decorators';

/* The prototype's own three situations, verbatim — ABOUT YOU and METHOD
   RECOMMENDATION. See PROTOTYPE-USAGE.md. */
const OPTIONS = [
  { value: 'feel', label: 'Feel my feelings' },
  { value: 'start-day', label: 'Get the day started' },
  { value: 'relax', label: 'Relax during a busy day' },
];

/* SETTINGS · Language — the prototype's second text group, verbatim. */
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
];

const meta = {
  title: 'Components/RadioGroupText',
  component: RadioGroupText,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: RadioGroup + Radio + Fieldset. APG pattern: Radio Group.',
          '',
          '**Purpose.** Pick exactly one option from a short list of text choices.',
          '',
          '`Radio.Root` **is** the row: it is the focusable element and it carries',
          '`[data-checked]` / `[data-unchecked]` / `[data-disabled]`, so the whole 56px',
          'row is the target with no hidden-input trickery. Roving arrow-key focus and',
          'the single-tab-stop behaviour come from RadioGroup. `Fieldset.Root` renders',
          '**as** the RadioGroup (base-ui’s documented composition), so the group gets a',
          'real `<legend>` without a second wrapper element.',
          '',
          '**Selection is carried by three cues** — tinted fill, a step from',
          '`--border-width-regular` to `--border-width-thick`, and a check glyph in the',
          'marker. Strip the hue and the state is still readable (1.4.1).',
          '',
          '**Truncation.** The label clamps at 2 lines. The component MEASURES whether',
          'the clamp actually cut anything and, if it did, drops the clamp for that',
          'option rather than hiding meaning-bearing text. There is no ellipsis-only',
          'path, because an ellipsis on a meaning-bearing option is a choice the user',
          'cannot read.',
          '',
          '**Responsive behaviour.** Single column at every breakpoint — a two-column',
          'text radio group makes the reading order ambiguous. Rows are',
          '`--target-comfort` (56px) by default rather than 44px, because this is the',
          'most-tapped control in the onboarding flow; `guided` raises it to 64px.',
          '',
          '**What it is NOT.** Not a select, not a multi-select (that is a checkbox',
          'group), and not the image variant (7.7), which is separate by design.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## RadioGroupText — the prototype records no legend for its situations group',
          'Where: PROTOTYPE-USAGE.md, "RadioGroupText — 4 usages", rows ABOUT YOU and',
          'METHOD RECOMMENDATION',
          'What I checked: Level 2. The reduction lists the three option labels verbatim',
          'but writes the legend as "(situations)". Rows 3 and 4 (SETTINGS) DO carry',
          'verbatim legends — "Here as" with the hint "Musie uses this to narrow down the',
          'Methods it offers you." — and row 3 lists no options, which reads as the same',
          'three.',
          'What I did: used the SETTINGS pair verbatim — legend "Here as", that hint, and',
          'the three situation options — as the meta args. `legend` is required, so a',
          'story cannot omit it.',
          'Why: every string is then the prototype’s own; nothing is authored here.',
          'What I need from Ben: nothing, just flagging — confirm the ABOUT YOU legend if',
          'this group is ever documented as a screen rather than as a component.',
          '',
          '## RadioGroupText — the docs anatomy shows an input + label, the component renders a button',
          'Where: `src/RadioGroupText.tsx:97-104` vs docs/07-components.md §7.6 Anatomy',
          'What I checked: Level 1, the source: `Radio.Root` with `nativeButton` and',
          '`render={<button type="button" />}`, className `musy-radio__body`. Level 3, the',
          'docs anatomy block: `div.musy-radio` wrapping `input.musy-radio__input` +',
          '`label.musy-radio__body`. The state matrix then says focus-visible comes "from',
          '`:focus-visible` on the input". There is no input.',
          'What I did: wrote the stories against the source and described the behaviour,',
          'not the anatomy.',
          'Why: Level 1 is the authority on the API.',
          'What I need from Ben: nothing to decide, but §7.6’s anatomy and state matrix',
          'are stale and will mislead the next reader.',
          '',
          '## RadioGroupText — the empty state is not associated with the group',
          'Where: `src/RadioGroupText.tsx:93-95`',
          'What I checked: Level 1. When `options` is empty the component renders',
          '`<p className="musy-radio-group__hint">{emptyLabel}</p>` with no `id`, and',
          '`aria-describedby` on the RadioGroup only ever lists the `hint` and `error`',
          'ids. So the empty message is visible text inside the fieldset but is not part',
          'of the group’s description, and it borrows the hint’s styling.',
          'What I did: wrote the `Empty` story and left the behaviour alone.',
          'Why: this is a component change, not a story change.',
          'What I need from Ben: **a decision** — whether the empty message should be in',
          '`aria-describedby`, and whether it should have its own class rather than',
          'reusing `musy-radio-group__hint`. RadioGroupImage and RadioCards do give theirs',
          'a dedicated class (`__empty`) alongside the hint class; this one does not.',
          '',
          '## RadioGroupText — the Empty story shows the German default `emptyLabel`',
          'Where: `src/RadioGroupText.tsx:60` (`emptyLabel = \'Keine Optionen verfügbar\'`)',
          'What I checked: Level 1 declares German. Level 2, the prototype, is English',
          'throughout and never reaches an empty group.',
          'What I did: the `Empty` story passes no `emptyLabel`, so the German default is',
          'what shows.',
          'Why: overriding it in a story would hide the inconsistency. This is the',
          'per-component face of the session-level language entry in OPEN-QUESTIONS.md.',
          'What I need from Ben: nothing new — see "Session — prototype copy is English".',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'here-as',
    legend: 'Here as',
    hint: 'Musie uses this to narrow down the Methods it offers you.',
    options: OPTIONS,
    value: 'feel',
  },
  argTypes: {
    name: { control: 'text', description: 'Identifies the field when a form is submitted.' },
    legend: { control: 'text', description: 'The group’s accessible name, rendered as a real <legend>.' },
    hint: { control: 'text', description: 'Optional supporting sentence under the legend.' },
    options: { control: false, description: 'The choices. Each needs value and label; disabled is per option.' },
    value: { control: 'text', description: 'Controlled selection.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the new value.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent-placeholder1', 'accent-placeholder2'],
      description: 'Solved accent family. Literal placeholder names per Decision 3.',
    },
    guided: { control: 'boolean', description: 'Raise each row to --target-guided.' },
    disabled: { control: 'boolean', description: 'Disables the whole group.' },
    error: {
      control: 'text',
      description: 'Validation message. Renders a Message in error variant below the group and marks every row’s boundary, so the error is not colour-only.',
    },
    emptyLabel: { control: 'text', description: 'Empty state, shown instead of the rows when options is empty.' },
    className: { control: false },
  },
} satisfies Meta<typeof RadioGroupText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's own copy. The prototype always
 *  passes `accent-placeholder1`; `primary` is the component's default. */
export const Default: Story = {};

/** All three accent families. Every prototype usage is `accent-placeholder1`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <RadioGroupText {...args} name="a-primary" accent="primary" legend="accent: primary (default)" />
      <RadioGroupText {...args} name="a-p1" accent="accent-placeholder1" legend="accent: accent-placeholder1" />
      <RadioGroupText {...args} name="a-p2" accent="accent-placeholder2" legend="accent: accent-placeholder2" />
    </Stack>
  ),
};

/** `guided` raises each row from --target-comfort (56px) to --target-guided
 *  (64px). The prototype never uses it on this component. */
export const Guided: Story = { args: { guided: true, legend: 'guided — 64px rows' } };

/** Without the optional hint. The legend carries the whole question. */
export const WithoutHint: Story = { args: { hint: undefined } };

/** The prototype's second text group — SETTINGS · Language, two options. */
export const TwoOptions: Story = {
  args: {
    name: 'language',
    legend: 'Language',
    hint: 'German arrives in the next iteration.',
    options: LANGUAGE_OPTIONS,
    value: 'en',
  },
};

/** Nothing selected. Valid: the group carries no default until the user picks. */
export const NoSelection: Story = { args: { value: undefined } };

/** `emptyLabel` replaces the rows. Shown with the component's own default,
 *  which is German. */
export const Empty: Story = { args: { options: [], value: undefined } };

/** Whole group disabled. */
export const Disabled: Story = { args: { disabled: true } };

/** A single option disabled, the rest live. */
export const OptionDisabled: Story = {
  args: {
    options: [
      { value: 'feel', label: 'Feel my feelings' },
      { value: 'start-day', label: 'Get the day started' },
      { value: 'relax', label: 'Relax during a busy day', disabled: true },
    ],
  },
};

/** `[data-invalid]` puts --feedback-error-border on every row and renders an
 *  error Message below the group. */
export const WithError: Story = {
  args: { value: undefined, error: 'Pick one to continue.' },
};

/** The truncation case. The label clamps at two lines; the component measures
 *  whether the clamp cut anything and drops it for that option if it did. */
export const LongLabel: Story = {
  args: {
    legend: 'a label past the two-line clamp',
    options: [
      ...OPTIONS,
      {
        value: 'long',
        label: 'Settle down after a long day of meetings, messages and other people’s deadlines, and find my way back to my own attention',
      },
    ],
  },
};
