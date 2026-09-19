/**
 * RecordButton — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment in
 * src/RecordButton.tsx and from docs/07-components.md §7.22. Nothing is
 * invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecordButton } from '../src/RecordButton';
import { bothThemes, Stack } from './_decorators';

/* A FIXED literal meter. The component draws `levels` exactly as given, so a
   randomised array would make a story that differs on every render. Newest
   last; 16 values, so the default 12 bars take the last 12. */
const LEVELS = [
  0.12, 0.34, 0.21, 0.58, 0.44, 0.71, 0.39, 0.86,
  0.52, 0.28, 0.63, 0.47, 0.91, 0.35, 0.22, 0.66,
];

const meta = {
  title: 'Components/RecordButton',
  component: RecordButton,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          '§7.19 Voice Note’s capture step, collapsed into ONE control: the primary CTA.',
          'Two states on one target — ready ⇄ recording — and every switch resets the',
          'clock, so there is no third "recorded" state to explain.',
          '',
          '**Composed on §7.4 CTA Button, not a new button.** Same target ladder',
          '(44 / 56 / 64), same six-state model, same pill. Two extra parts: the meter',
          '(`.musy-rec__meter`) and the readout (`.musy-rec__time`).',
          '',
          '**The state is not carried by hue.** The button stays primary while live —',
          'swapping to the error family would paint a working control as a failure, and',
          '§19’s red-while-live belongs to a surface, not to the screen’s main action.',
          'Three cues change instead: the glyph (mic → stop), the label (ready →',
          'recording, from the locale catalogue) and the meter, which only exists while',
          'recording. It survives',
          'greyscale and forced colours (1.4.1).',
          '',
          '**The meter is decorative, the counter is not.** Bars are `aria-hidden` and take',
          '`currentColor`, so they follow the button’s ink in every variant. What a',
          'screen-reader user gets is the readout — seconds in, seconds left, in a',
          '`role="status"` region. The bar **count is fixed**: a meter that changes bar',
          'count with the signal reads as a layout bug rather than as a level, so a',
          'missing level is a floor, not a gap.',
          '',
          '**Fully controlled, and no media.** The component draws `levels`; it never calls',
          '`getUserMedia`, never encodes, and does not hold the 60-second timer. The app',
          'that owns the recorder owns both — which is what lets one component drive a',
          'real recorder and a simulated one with no prototype branch inside the design',
          'system. Every story here is therefore reachable with no microphone attached.',
          '',
          '**`hug` is the behaviour, not a floor.** A control that hugs its label when',
          'ready and takes the column while recording tells you which state it is in',
          'before you have read the label. The meter is the elastic part: when the column',
          'is narrower than the live content the bars clip from the leading edge, which is',
          'the oldest end of the signal, and the label only ellipsizes once the meter is',
          'gone.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## RecordButton — `onLimit` is documented but is not a prop',
          'Where: `src/RecordButton.tsx:29-31` header comment, and §7.22 "Fully controlled,',
          'and no media"',
          'What I checked: Level 1. `RecordButtonProps` declares `state elapsed maxSeconds',
          'levels bars onToggle variant size disabled block readyLabel recordingLabel',
          'status className` — no `onLimit`. Level 3, §7.22’s props table also omits it,',
          'while its prose names it twice.',
          'What I did: nothing; no story references it.',
          'Why: the prop does not exist.',
          'What I need from Ben: **a decision.** Either the sentence means "the app calls',
          'its own handler", in which case both the header and §7.22 should stop naming a',
          'prop, or `onLimit` is missing.',
          '',
          '## RecordButton — the live clock is inside the button’s accessible name',
          'Where: `src/RecordButton.tsx:105-115`',
          'What I checked: Level 1. `.musy-rec__time` is not `aria-hidden`, and the',
          '`role="status"` span is a child of the `<Button>`. Name-from-contents therefore',
          'folds "0:12 −0:48" *and* "Recording, 0:12 in, 0:48 left" into the button’s own',
          'name, which changes once a second. Level 3, §7.22 says "one button, one',
          'accessible name" and that the meter is hidden so "a screen reader never walks',
          'twelve empty spans" — the readout gets no such treatment.',
          'What I did: nothing. Noted, not fixed.',
          'Why: fixing it means editing the component.',
          'What I need from Ben: **a decision** — an a11y finding, not a story problem.',
          '',
          '## RecordButton — an empty `levels` array draws 12 bars at 10%, not a flat row',
          'Where: `src/RecordButton.tsx:52-53` (prop doc) vs `:96-98`',
          'What I checked: Level 1. The prop doc says "`bars` flat bars when the array is',
          'empty". The render floors each bar at `Math.max(0.1, v)`, so a missing level is',
          '10% of the meter box.',
          'What I did: passed a fixed literal `LEVELS` array in every recording story, so',
          'the meter renders identically on every render.',
          'Why: the brief forbids a random array, and a literal is the only deterministic',
          'option.',
          'What I need from Ben: nothing, just flagging — "flat" reads as 0%, the floor is 10%.',
        ].join('\n'),
      },
    },
  },
  args: {
    state: 'ready',
  },
  argTypes: {
    state: {
      control: 'inline-radio',
      options: ['ready', 'recording'],
      description: 'ready ⇄ recording. Required; every switch resets the clock.',
    },
    elapsed: { control: 'number', description: 'Seconds spoken so far. Owned by the consumer; reset on every switch.' },
    maxSeconds: { control: 'number', description: 'Hard ceiling. The consumer stops at it and calls onLimit.' },
    levels: { control: false, description: 'Live amplitudes, 0…1, newest last. One bar each; `bars` flat bars when the array is empty (permission pending, or a muted mic).' },
    bars: { control: 'number', description: 'How many bars the meter draws. Fixed count — a missing level is a floor, not a gap.' },
    onToggle: { action: 'toggle', description: 'Fires on every press; the consumer flips `state`.' },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Button family. The state is never carried by hue, so this stays put across ready and recording.',
    },
    size: {
      control: 'inline-radio',
      options: ['primary', 'comfort', 'guided'],
      description: 'Raises the TARGET, not the type step — §7.4’s ladder.',
    },
    disabled: { control: 'boolean', description: 'Disables the button. Meter and readout follow the ink via currentColor.' },
    block: { control: 'boolean', description: 'Fills the inline axis where the CTA does; the extra room goes to the meter.' },
    readyLabel: { control: 'text', description: 'Copy. Defaults to the locale catalogue — “Jetzt aufnehmen” in German, “Record Now” in English.' },
    recordingLabel: { control: 'text', description: 'Copy. Defaults to the locale catalogue — “Aufnahme läuft” / “Recording”.' },
    status: { control: false, description: 'Spoken status: ("12", "48") → "…".' },
    className: { control: false },
  },
} satisfies Meta<typeof RecordButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, in the `ready` state: primary solid, Mic glyph, the
 *  catalogue's ready label, no meter and no readout. The preview is lang="de"
 *  and no MusyLocaleProvider is mounted, so that label is "Jetzt aufnehmen".
 *  The button hugs its label here. */
export const Default: Story = {};

/** All three button families, ready and recording. The variant does not change
 *  with the state — the glyph, the label and the meter do. */
export const Variants: Story = {
  render: (args) => (
    <Stack>
      <RecordButton {...args} variant="primary" />
      <RecordButton {...args} variant="accent" />
      <RecordButton {...args} variant="accent-alt" />
      <RecordButton {...args} variant="primary" state="recording" elapsed={12} levels={LEVELS} />
      <RecordButton {...args} variant="accent" state="recording" elapsed={12} levels={LEVELS} />
      <RecordButton {...args} variant="accent-alt" state="recording" elapsed={12} levels={LEVELS} />
    </Stack>
  ),
};

/** §7.4's target ladder: 44 / 56 / 64. At comfort and guided the button holds
 *  §7.4's base inline padding (`--sp-5`) rather than the wider `--sp-6` those
 *  rungs normally take, and the glyph steps from `md` to `lg`. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <RecordButton {...args} size="primary" />
      <RecordButton {...args} size="comfort" />
      <RecordButton {...args} size="guided" />
    </Stack>
  ),
};

/** `ready` — Mic glyph, the catalogue's ready label, no meter, no readout. No
 *  microphone and no permission is involved: the state is a prop. */
export const Ready: Story = { args: { state: 'ready' } };

/** `recording` — Square glyph, the catalogue's recording label, live meter,
 *  `0:12 · −0:48`.
 *  `levels` is a fixed literal array, so the meter is identical on every
 *  render. */
export const Recording: Story = {
  args: { state: 'recording', elapsed: 12, levels: LEVELS },
};

/** Close to the 60-second ceiling. The component does not hold the timer — the
 *  app stops at `maxSeconds` and returns the button to `ready`, which resets
 *  the clock. */
export const RecordingNearLimit: Story = {
  args: { state: 'recording', elapsed: 57, levels: LEVELS },
};

/** An empty `levels` array — permission pending, or a muted mic. The bar count
 *  is fixed, so the meter is `bars` bars at the floor rather than a gap. */
export const RecordingWithoutLevels: Story = {
  args: { state: 'recording', elapsed: 3, levels: [] },
};

/** A different bar count. The count is fixed per render, never derived from the
 *  length of `levels`. */
export const BarCount: Story = {
  render: (args) => (
    <Stack>
      <RecordButton {...args} bars={6} />
      <RecordButton {...args} bars={12} />
      <RecordButton {...args} bars={24} />
    </Stack>
  ),
  args: { state: 'recording', elapsed: 12, levels: LEVELS },
};

/** `block` fills the inline axis where the CTA does, and the extra room goes to
 *  the meter. */
export const Block: Story = {
  render: (args) => (
    <Stack>
      <RecordButton {...args} block />
      <RecordButton {...args} block state="recording" elapsed={12} levels={LEVELS} />
    </Stack>
  ),
};

/** §7.4's disabled primary. Meter and readout follow the ink via
 *  `currentColor`, so neither needs a rule of its own. */
export const Disabled: Story = { args: { disabled: true } };

/** Disabled while live — the meter and readout are still drawn, in the
 *  disabled ink. */
export const DisabledWhileRecording: Story = {
  args: { state: 'recording', elapsed: 12, levels: LEVELS, disabled: true },
};

/** A shorter ceiling than the 60-second default. The readout shows both
 *  figures, where §7.21 shows only the countdown: a speaker needs to know they
 *  are being recorded *and* how much room is left. */
export const ShortLimit: Story = {
  args: { state: 'recording', elapsed: 8, maxSeconds: 15, levels: LEVELS },
};

/** Copy overrides — the same German the catalogue now ships, passed by hand,
 *  which is what a per-call override looks like. §7.22 notes the known limit:
 *  German runs ~30% longer, and a long `recordingLabel` is what pushed the
 *  readout out of a 310px column. */
export const CopyOverrides: Story = {
  args: {
    state: 'recording',
    elapsed: 12,
    levels: LEVELS,
    readyLabel: 'Jetzt aufnehmen',
    recordingLabel: 'Aufnahme läuft',
    status: (i, left) => `Aufnahme, ${i} aufgenommen, ${left} verbleibend`,
  },
};
