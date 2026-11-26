/**
 * Slider — matches stories/CONVENTIONS.md and the SegmentedControl exemplar.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * STATE: the stories pass `defaultValue`, not `value`. The component then
 * holds its own value, so the thumb can be dragged in Storybook while the
 * story itself holds no state (CONVENTIONS §5).
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from '../src/Slider';
import { SegmentedControl } from '../src/SegmentedControl';
import { User, Users } from 'lucide-react';
import { bothThemes, Stack } from './_decorators';

/* The exercise length the slider was built for: 1:30 up to the length of the
   piece. 8:12 stands in for a piece; the app passes the real one. */
const MIN = 90;
const MAX = 492;

/** M:SS — the app's own form of a duration (SessionListen's clock). */
const clock = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** What a screen reader hears instead of "1:30", which reads as a time. */
const spoken = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  const minutes = `${m} ${m === 1 ? 'Minute' : 'Minuten'}`;
  return s === 0 ? minutes : `${minutes} ${s} ${s === 1 ? 'Sekunde' : 'Sekunden'}`;
};

const meta = {
  title: 'Components/Slider',
  component: Slider,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Slider — Root, Label, Value, Control, Track, Indicator, Thumb.',
          'APG pattern: Slider.',
          '',
          'ONE value on a continuous range, chosen by dragging, pressing the track',
          'or the arrow keys. Built for how long an exercise runs: in user testing',
          'some people found an exercise too long and some too short, so the length',
          'became something the person sets — from 1:30 up to the length of the',
          'piece that plays.',
          '',
          '**The segmented control\'s primitives, not the music player\'s** (Ben,',
          '2026-11-26). The label is the segmented control\'s legend — the same',
          'class and the same `[data-type-step]`. The track is `.musy-seg__track`:',
          'sunken, `--sp-1` of padding, `--radius-control`, a lane',
          '`--target-primary` high. The chosen part is the chosen segment — raised',
          'fill, primary-on-subtle ink — stretched from the start to the thumb. The',
          'values under the track are set like an unchosen segment\'s word.',
          '',
          '**The current value stands under the thumb**, on the line of the min and',
          'max, and follows it (Ben, 2026-11-26). At rest it is a bare figure; while',
          'the slider is being moved — a drag, or keyboard focus on the thumb — it',
          'sits in a sunken pill. An end value it covers fades out; at the minimum',
          'the two are the same figure in the same place. Drag the thumb to see it.',
          '',
          '**It moves freely and settles on a step** (Ben, 2026-11-26). The thumb',
          'follows the finger without steps; let go, it glides onto the nearest',
          'step. The value is always on a step: `onValueChange` reports the step the',
          'thumb would settle on, the figure shows it during the drag, and the arrow',
          'keys move step to step. `max` is a step of its own when the range is not',
          'a multiple — 7:30, 8:00, 8:12.',
          '',
          '**The thumb sits inside the track** (`thumbAlignment="edge"`). At the',
          'minimum the raised part is exactly one segment\'s square.',
          '',
          '**Every string on screen is the caller\'s.** The current value and both ends',
          'are the value as `formatValue` writes it, and there is no default.',
          'What a screen reader hears is `valueText`, which falls back to the same',
          'string — pass it whenever the drawn form reads badly aloud.',
          '',
          '**No `size` and no `guided`, yet.** The `min` rung would put a drag',
          'control at 24px; `guided` has no caller.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          'One entry in stories/OPEN-QUESTIONS.md, resolved: Ben chose the',
          'segmented control\'s track over the music player\'s thin rail',
          '(2026-11-26).',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Wie lange möchtest du üben?',
    min: MIN,
    max: MAX,
    step: 30,
    defaultValue: 270,
    formatValue: clock,
    valueText: spoken,
  },
  argTypes: {
    label: { control: 'text', description: 'The slider’s accessible name, drawn above the track. Rendered visibly unless labelHidden — never dropped.' },
    labelHidden: { control: 'boolean', description: 'Hide the label visually. It stays the slider’s accessible name.' },
    labelStep: { control: 'inline-radio', options: ['label-lg', 'label-md'], description: 'The label’s type step. label-lg by default, as the segmented control’s legend; label-md as one field among several.' },
    min: { control: 'number', description: 'The lowest value. Drawn at the start of the track via formatValue.' },
    max: { control: 'number', description: 'The highest value. Drawn at the end of the track via formatValue.' },
    step: { control: 'number', description: 'The steps a value settles on, counted from min. The thumb moves freely while held and glides onto the nearest step when let go. 1 by default.' },
    largeStep: { control: 'number', description: 'What Page Up / Page Down and Shift + arrow move by, rounded to whole steps. Four steps by default.' },
    value: { control: false, description: 'Controlled value.' },
    defaultValue: { control: 'number', description: 'Uncontrolled starting value. `min` when neither is given.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the step the value would settle on, each time that step changes.' },
    onValueCommitted: { action: 'valueCommitted', description: 'Fires with the step the value settled on — the thumb let go, the key pressed.' },
    formatValue: { control: false, description: 'How a value is DRAWN: the current value under the thumb, and both ends. Required.' },
    valueText: { control: false, description: 'How a value is HEARD (aria-valuetext). Falls back to formatValue.' },
    minLabel: { control: 'text', description: 'A word drawn before the minimum’s value at the start of the track. Optional.' },
    maxLabel: { control: 'text', description: 'The same, before the maximum’s value at the end of the track.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent'],
      description: 'Solved accent family — the readout’s and the grip’s ink. `primary` by default.',
    },
    disabled: { control: 'boolean', description: 'Disables the slider.' },
    name: { control: 'text', description: 'Identifies the value when a form is submitted.' },
    className: { control: false },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The exercise length: 1:30 to the length of the piece. Drag it: the thumb
 * moves freely, the figure counts in 30 s steps, and on release the thumb
 * glides onto the step the figure showed. 8:12 is a step of its own.
 */
export const Default: Story = {};

/** Both accent families. Only the current value's and the grip's ink changes. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <Slider {...args} label="accent: primary (default)" />
      <Slider {...args} label="accent: accent" accent="accent" />
    </Stack>
  ),
};

/** `labelStep`: label-lg by default, label-md as one field among several —
 *  the segmented control's two legend steps. */
export const LabelSteps: Story = {
  render: (args) => (
    <Stack>
      <Slider {...args} label="label-lg — the question (default)" />
      <Slider {...args} label="label-md — one field among several" labelStep="label-md" />
    </Stack>
  ),
};

/** Words before the end values. Optional: the values alone already label the ends. */
export const WithEndWords: Story = { args: { minLabel: 'Min.', maxLabel: 'Max.' } };

/** The label stays the accessible name; the track moves up into its place. */
export const LabelHidden: Story = { args: { labelHidden: true } };

/**
 * The two ends of the range. At the minimum the raised part is one segment's
 * square, and the current value stands where the min does — so the min fades
 * and one figure is seen. The same at the maximum.
 */
export const AtTheEnds: Story = {
  render: (args) => (
    <Stack>
      <Slider {...args} label="at the minimum" defaultValue={MIN} />
      <Slider {...args} label="at the maximum" defaultValue={MAX} />
    </Stack>
  ),
};

/** Whole slider disabled. */
export const Disabled: Story = { args: { disabled: true } };

/**
 * Beside the control it was drawn from — the session intro's order, a
 * segmented control's question and then this one. Same legend, same track,
 * same chosen fill.
 */
export const WithSegmentedControl: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-gap-group)' }}>
      <SegmentedControl
        name="play-mode"
        legend="Zusammenspiel"
        value="with_musie"
        options={[
          { value: 'with_musie', label: 'Ich spiele mit Musie', glyph: Users },
          { value: 'solo', label: 'Ich spiele allein', glyph: User },
        ]}
      />
      <Slider {...args} />
    </div>
  ),
};

/** The longest label: it wraps, as the segmented control's legend does. */
export const LongLabel: Story = {
  args: { label: 'Wie lange möchtest du dir heute für diese Übung Zeit nehmen?' },
};
