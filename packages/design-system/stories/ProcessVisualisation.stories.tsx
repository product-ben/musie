/**
 * ProcessVisualisation — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * ZERO PROTOTYPE USAGE. The prototype uses a carousel for the onboarding
 * sequence instead, which has no component, and this component's CSS section
 * is marked RETIRED. These stories are written from the component source and
 * docs/07-components.md §7.8 only. See OPEN-QUESTIONS.md.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info, Layers, Headphones, PenLine } from 'lucide-react';
import { ProcessVisualisation } from '../src/ProcessVisualisation';
import type { ProcessStep } from '../src/ProcessVisualisation';
import { bothThemes } from './_decorators';

/* The four METHOD FLOW step names the prototype does record, via
   InteractiveWizard. The GLYPHS are not recorded anywhere and `glyph` is a
   required prop — logged in OPEN-QUESTIONS.md. */
const STEPS: ProcessStep[] = [
  { glyph: Info, title: 'Intro' },
  { glyph: Layers, title: 'Select Card' },
  { glyph: Headphones, title: 'Listen' },
  { glyph: PenLine, title: 'Reflect' },
];

/* `body` is optional and no source carries copy for it. These sentences are
   story-only filler so the with/without pair exists — logged. */
const STEPS_WITH_BODY: ProcessStep[] = [
  { glyph: Info, title: 'Intro', body: 'What this Method is and how long it takes.' },
  { glyph: Layers, title: 'Select Card', body: 'Scan the card you are drawn to.' },
  { glyph: Headphones, title: 'Listen', body: 'Play the track behind the card.' },
  { glyph: PenLine, title: 'Reflect', body: 'Answer in your own words.' },
];

const meta = {
  title: 'Components/ProcessVisualisation',
  component: ProcessVisualisation,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Show the four stages of a Musy session, in order, without inviting a tap.',
          '',
          'base-ui: `Separator` for the divider line. No APG pattern exists — it is not',
          'interactive, not a widget, not a navigation structure, so base-ui has no',
          'primitive for the whole. Semantic HTML: `<ol>`, because the steps are ordered',
          'and the order IS the content. Separator is the one part base-ui does own: it',
          'renders the correct role and orientation for a decorative rule, which is easy',
          'to get wrong by hand. Each step’s title is a real heading (`<h3>`) so the steps',
          'appear in the document outline.',
          '',
          '**Not a carousel, not a stepper, not a progress indicator** — nothing here',
          'tracks where the user currently is. It has no "current step" state; that would',
          'make it a progress indicator, which is a different component with different',
          'semantics (`aria-current`).',
          '',
          '**No state matrix, and this is deliberate.** The component is not interactive,',
          'so default is the only state: no hover, no active, no focus (nothing is',
          'focusable), no disabled, no loading, no error.',
          '',
          '**Vertical at every breakpoint.** The brief specifies vertical stepping with',
          'arrow dividers and no carousel; a horizontal variant at `--bp-lg` would need a',
          'different divider and is not built.',
          '',
          'The arrows are `aria-hidden`: the `<ol>` already conveys sequence and position,',
          'so announcing an arrow between every step is pure noise. The visible ordinal',
          '("Schritt 1") is kept on by default because in the group setting it is what',
          'someone points at while reading aloud — redundant for AT, load-bearing for',
          'humans.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## ProcessVisualisation — the CSS section is RETIRED, the component is exported, and the docs are `[OPEN]`',
          'Where: `src/musy-components.css:1235-1237` vs `src/index.ts:39-40` vs §7.8',
          'What I checked: Level 1, the CSS header reads "PROCESS VISUALISATION — RETIRED ·',
          'Superseded by 8 · Carousel. Kept only so the v0.1 clickdummy still renders; no',
          'new screen should reach for it." Level 1 again, `index.ts` still exports the',
          'component and both its types. Level 2, PROTOTYPE-USAGE.md: zero usages, and the',
          'onboarding sequence uses a Carousel instead. Level 3, §7.8 is headed `[OPEN]`',
          'and reads as a live component with a full anatomy, prop table and a11y notes.',
          'What I did: wrote the stories from the source and §7.8 only, and flagged the',
          'contradiction here rather than in the component description.',
          'Why: three sources give three different statuses and none of them is mine to',
          'change.',
          'What I need from Ben: **a decision.** Either retire the export too, or un-retire',
          'the CSS — and note that the thing that superseded it, Carousel, has ~200 lines',
          'of CSS and no component at all, so retiring this leaves the onboarding sequence',
          'with nothing.',
          '',
          '## ProcessVisualisation — no source records which glyph each step takes',
          'Where: `stories/ProcessVisualisation.stories.tsx`, the `STEPS` constant',
          'What I checked: Level 1, `glyph` is required per step and typed `LucideIcon`.',
          'Level 2, zero prototype usage, so there is no glyph to copy; PROTOTYPE-USAGE.md',
          'records "METHOD FLOW … step glyphs" only as sizes. Level 3, §7.8’s anatomy shows',
          'an Icon at `lg` and names none.',
          'What I did: used the four METHOD FLOW step names the prototype does record —',
          'Intro, Select Card, Listen, Reflect — with the plainest Lucide glyph for each',
          '(`Info`, `Layers`, `Headphones`, `PenLine`).',
          'Why: the step *names* are sourced; the glyphs are not, and a required prop has to',
          'be filled with something.',
          'What I need from Ben: **confirmation of the glyph set**, if this component',
          'survives its retirement.',
          '',
          '## ProcessVisualisation — `body` has no copy in any source',
          'Where: `stories/ProcessVisualisation.stories.tsx`, the `STEPS_WITH_BODY` constant',
          'What I checked: Level 2, zero prototype usage. Level 3, §7.8 shows',
          '`p.musy-process__body` in the anatomy and gives no copy for it.',
          'What I did: wrote one short sentence per step, marked in the story’s JSDoc as',
          'story-only filler, and kept `Default` to titles alone so the sourced copy stands',
          'by itself.',
          'Why: `body` is an optional slot and CONVENTIONS §3 requires a with/without pair;',
          'there was nothing to copy.',
          'What I need from Ben: **real copy**, if this component survives its retirement.',
          '',
          '## ProcessVisualisation — `ordinalPrefix` defaults to German while the rest of Batch D defaults to English',
          'Where: `src/ProcessVisualisation.tsx:42` (`ordinalPrefix = \'Schritt\'`)',
          'What I checked: Level 1. `MusicPlayer`, `TrackButton`, `RecordButton` and',
          '`PhotoUpload` all default to English and say so in their comments; this one says',
          '"Schritt". Level 2, the prototype is English and does not use the component at',
          'all.',
          'What I did: `Default` shows "Schritt 1"; `EnglishOrdinals` passes',
          '`ordinalPrefix="Step"`.',
          'Why: the default is the component’s, and the override is the only way to show the',
          'prop.',
          'What I need from Ben: nothing new — this is the session-level language question,',
          'named for this component.',
          '',
          '## ProcessVisualisation — the title heading level is hardcoded `<h3>`',
          'Where: `src/ProcessVisualisation.tsx:65`',
          'What I checked: Level 1, `<h3>` is a literal; `titleStep` changes the type step,',
          'not the level. Level 3, §7.8: "Each step’s title is a real heading (`<h3>` by',
          'default) so the steps appear in the document outline" — "by default" implies a',
          'prop that does not exist.',
          'What I did: nothing.',
          'Why: adding a prop is a design decision.',
          'What I need from Ben: **a decision.** Dropped inside a ContentBox whose headline',
          'is already an h3, the outline breaks.',
          '',
          '## ProcessVisualisation — §7.8 says the dividers carry `role="presentation"`; the source sets only `aria-hidden`',
          'Where: `src/ProcessVisualisation.tsx:70-76` vs §7.8 a11y notes',
          'What I checked: Level 1, the divider `<li>` has `aria-hidden="true"` and no',
          '`role`. Level 3, the docs say "`aria-hidden` with `role="presentation"`".',
          'What I did: nothing.',
          'Why: `aria-hidden` alone already removes it, so the outcome matches; only the',
          'docs overstate.',
          'What I need from Ben: nothing, just flagging.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Method steps',
    steps: STEPS,
  },
  argTypes: {
    label: { control: 'text', description: 'Accessible name for the list.' },
    steps: { control: false, description: 'One entry per step: a required Lucide `glyph`, a `title`, and an optional `body`.' },
    showOrdinals: { control: 'boolean', description: 'Show "Schritt 1" style ordinals above each title. On by default: the visible number is what a group reading together points at.' },
    ordinalPrefix: { control: 'text', description: 'Localised ordinal prefix. Default `\'Schritt\'`.' },
    titleStep: { control: 'text', description: 'Type step for the step title. Default `heading-sm`.' },
    bodyStep: { control: 'text', description: 'Type step for the step body. Default `body-md`.' },
    className: { control: false },
  },
} satisfies Meta<typeof ProcessVisualisation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: four steps, ordinals on with the German prefix, titles
 *  at `heading-sm`, arrow dividers between every pair. Titles only — no source
 *  carries body copy. */
export const Default: Story = {};

/** With the optional `body` sentence under each title. The copy here is
 *  story-only filler; §7.8 shows the slot but gives no copy — see Build notes. */
export const WithBody: Story = { args: { steps: STEPS_WITH_BODY } };

/** `showOrdinals={false}`. The ordinal is redundant for AT and load-bearing for
 *  humans, so turning it off costs the group setting, not the accessible one. */
export const WithoutOrdinals: Story = { args: { showOrdinals: false, steps: STEPS_WITH_BODY } };

/** `ordinalPrefix` localised to English. The component's default is German
 *  while the rest of §7.18–§7.22 defaults to English — see Build notes. */
export const EnglishOrdinals: Story = { args: { ordinalPrefix: 'Step' } };

/** `titleStep` and `bodyStep` at other steps. They change the type step only;
 *  the heading level stays `<h3>`. */
export const TypeSteps: Story = {
  args: { steps: STEPS_WITH_BODY, titleStep: 'heading-md', bodyStep: 'body-lg' },
};

/** Two steps — one divider. The floor at which the arrow appears at all. */
export const TwoSteps: Story = { args: { steps: STEPS.slice(0, 2) } };

/** One step — no divider is rendered, because dividers only go *between*
 *  steps. */
export const SingleStep: Story = { args: { steps: STEPS.slice(0, 1) } };

/** Long titles and bodies. Titles take `--measure-heading`, bodies
 *  `--measure-body`, so the run length stays readable as the container widens. */
export const LongContent: Story = {
  args: {
    steps: [
      {
        glyph: Info,
        title: 'A step title long enough to wrap across more than one line at the heading measure',
        body: 'A supporting sentence long enough to run past the body measure and show where the paragraph wraps rather than continuing across the full width of the container it is placed in.',
      },
      ...STEPS_WITH_BODY.slice(1),
    ],
  },
};
