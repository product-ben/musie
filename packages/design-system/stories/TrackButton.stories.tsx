/**
 * TrackButton — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * TrackButton and MusicPlayer are both exported from src/MusicPlayer.tsx and
 * get one story file each, per CONVENTIONS §1.
 *
 * Docs text below is taken from the component's own header comment in
 * src/MusicPlayer.tsx and from docs/07-components.md §7.21. Nothing is
 * invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackButton } from '../src/MusicPlayer';
import { CtaButton } from '../src/CtaButton';
import { bothThemes, Stack } from './_decorators';

/* "Your track" is §7.21's own example accessible name ("Pause, Your track").
   The prototype records that the label IS the track name but never carries the
   string. See OPEN-QUESTIONS.md. */
const TRACK = 'Your track';

/* A 3:45 track. Transport state is DERIVED from position/duration/playing —
   there is no `state` prop — so `ended` is reached by position === duration. */
const DURATION = 225;

const meta = {
  title: 'Components/TrackButton',
  component: TrackButton,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'The whole player inside one button. Glyph + action label + MM:SS countdown.',
          'For a track offered inline, in prose or in a wizard panel, where a second row',
          'of chrome would outweigh the thing it controls. The other half of §7.21 is',
          '`MusicPlayer`, for when the listener needs to move around inside the track.',
          '',
          '**Composition, not a new button.** §7.4 CTA Button with one extra part',
          '(`.musy-mbtn__time`), so it inherits the whole button state model rather than',
          're-deriving it.',
          '',
          '**Fully controlled, and no media.** The component owns the transport UI and',
          'nothing else: no `<audio>`, no fetch, no timer. The consuming app holds the',
          'media element and feeds `position` back.',
          '',
          '**The label names the action, not the track.** A fixed label is the safer',
          'default, but the flows this button exists for withhold the track name on',
          'purpose, which left the label with nothing true to say. So the visible label',
          'is the verb — "Start Listening" / "Pause" / "Replay" — and `label` (the track)',
          'moves into the accessible name, where it still disambiguates two players on',
          'one screen.',
          '',
          '**The readout counts down.** The only question a first-time listener has is',
          'how long they are committing to.',
          '',
          '**Ended is a state.** At the end the glyph becomes RotateCcw rather than',
          'reverting to Play, so "it finished" and "it never started" are not the same',
          'picture (1.4.1 — the glyph differs, not only the fill).',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## TrackButton — renders a spinner it can never show',
          'Where: `src/MusicPlayer.tsx:105` (`<span className="musy-spinner" aria-hidden="true" />`)',
          'What I checked: Level 1. `TrackButtonProps` declares no `loading` prop and the',
          'component never sets `data-loading`. Level 1 again, `src/musy-components.css:266`:',
          '`.musy-btn:not([data-loading]) .musy-spinner { display: none; }`. Level 3, §7.21',
          'says TrackButton "inherits the whole button state model — hover, active, focus,',
          'disabled, **loading**".',
          'What I did: wrote no Loading story, because there is no prop for one.',
          'Why: a story cannot reach a state the API does not expose.',
          'What I need from Ben: **a decision.** Either add `loading` to `TrackButtonProps`',
          'as §7.21 promises, or drop the dead span.',
          '',
          '## TrackButton — `variant` defaults to `secondary`, but the prototype’s main control is primary + guided',
          'Where: `src/MusicPlayer.tsx:78` vs PROTOTYPE-USAGE.md, "TrackButton — 2 usages"',
          'What I checked: Level 1, the default is `\'secondary\'`. Level 2, the prototype',
          'writes the base `musy-btn` (primary) at `guided` for the main listen control and',
          '`secondary` at the default size for the compact one.',
          'What I did: `Default` shows the declared default; `PrototypeListenStep` shows',
          'primary + guided.',
          'Why: stories document what is, and the prototype’s intent is documented beside it.',
          'What I need from Ben: nothing, just flagging.',
          '',
          '## TrackButton / MusicPlayer — one calls the colour prop `variant`, the other `accent`',
          'Where: `src/MusicPlayer.tsx:71` vs `:121`',
          'What I checked: Level 1. `TrackButtonProps.variant` is `\'primary\' |',
          '\'secondary\' | \'accent\' | \'accent-alt\'`;',
          '`MusicPlayerProps.accent` is `\'primary\' | \'accent\' |',
          '\'accent-alt\'`. Two components in one file, overlapping value sets,',
          'different prop names.',
          'What I did: used each name as declared.',
          'Why: renaming either is a design decision.',
          'What I need from Ben: nothing, just flagging — but it is a trap for anyone',
          'swapping one for the other.',
          '',
          '## MusicPlayer / TrackButton — the prototype never records the track’s name',
          'Where: PROTOTYPE-USAGE.md, "MusicPlayer — 1 usage"',
          'What I checked: Level 2 says "Title is the track name" but does not carry the',
          'string; the Listen step’s ContentList has a "Track" row with no value',
          'recorded. Level 3, §7.21’s a11y note spells an example accessible name,',
          '"Pause, Your track".',
          'What I did: used **"Your track"** as `title` and `label` in every story.',
          'Why: it is the only track string either source actually contains; inventing a',
          'song title would be inventing copy.',
          'What I need from Ben: nothing, just flagging.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: TRACK,
    duration: DURATION,
  },
  argTypes: {
    label: { control: 'text', description: 'The track. Announced, not shown — the visible label is the action.' },
    duration: { control: 'number', description: 'Track length in seconds.' },
    position: { control: 'number', description: 'Playback head in seconds, owned by the consumer.' },
    playing: { control: 'boolean', description: 'Whether the consumer’s media element is playing.' },
    onTogglePlay: { action: 'togglePlay', description: 'Fires when the button is pressed before the track has ended.' },
    onRestart: { action: 'restart', description: 'Called instead of onTogglePlay once the track has ended.' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'accent-alt', 'ghost'],
      description: 'Button family. Defaults to `secondary`. `ghost` is for a transport that must not be the loudest thing on its screen.',
    },
    hideTimer: {
      control: 'boolean',
      description: 'Drop the MM:SS readout — and with it the number in the accessible name. Only where something ELSE on screen already carries the time; a transport that does not say how long it is asking for is what this component was built to avoid.',
    },
    size: {
      control: 'inline-radio',
      options: ['min', 'primary', 'guided', 'comfort'],
      description: '--target-guided (64px) for assisted use.',
    },
    disabled: { control: 'boolean', description: 'Disables the button.' },
    playLabel: { control: 'text', description: 'Copy. Defaults to the locale catalogue’s track wording — “Jetzt anhören” in German, “Start Listening” in English.' },
    pauseLabel: { control: 'text', description: 'Copy. Defaults to the locale catalogue — “Pause” in both.' },
    restartLabel: { control: 'text', description: 'Copy. Defaults to the locale catalogue — “Noch einmal” / “Replay”.' },
    className: { control: false },
  },
} satisfies Meta<typeof TrackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: `variant="secondary"`, `size="primary"`, position 0 and
 *  not playing — so the derived transport state is `paused`. The visible label
 *  is "Start Listening"; the accessible name appends the track. */
export const Default: Story = {};

/** All five button families. The prototype uses the base primary for the main
 *  listen control and `secondary` for the compact one; `ghost` arrived on
 *  2026-10-07 for the listen step's full-screen sheet, where the filled
 *  control is the way ON and the transport only pauses what is already
 *  playing. */
export const Variants: Story = {
  render: (args) => (
    <Stack>
      <TrackButton {...args} variant="primary" />
      <TrackButton {...args} variant="secondary" />
      <TrackButton {...args} variant="accent" />
      <TrackButton {...args} variant="accent-alt" />
      <TrackButton {...args} variant="ghost" />
    </Stack>
  ),
};

/** §7.4's target ladder: 44 / 56 / 64. The size raises the target and the glyph
 *  step, never the type step. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <TrackButton {...args} size="min" />
      <TrackButton {...args} size="primary" />
      <TrackButton {...args} size="comfort" />
      <TrackButton {...args} size="guided" />
    </Stack>
  ),
};

/** `paused` — Play glyph, "Start Listening", the countdown showing what is left. */
export const Paused: Story = { args: { position: 72, playing: false } };

/** `playing` — Pause glyph, "Pause". */
export const Playing: Story = { args: { position: 72, playing: true } };

/** `ended` — RotateCcw glyph, "Replay", countdown at 00:00. Reached by
 *  `position === duration`; there is no `state` prop. `onRestart` is called
 *  instead of `onTogglePlay` from here. */
export const Ended: Story = { args: { position: DURATION, playing: false } };

/** Disabled, from §7.4's inherited state model. */
export const Disabled: Story = { args: { position: 72, disabled: true } };

/** The prototype's two usages, together: the main listen control (primary,
 *  `guided`) and the compact one (`secondary`, default size). */
export const PrototypeListenStep: Story = {
  render: (args) => (
    <Stack>
      <TrackButton {...args} variant="primary" size="guided" />
      <TrackButton {...args} variant="secondary" />
    </Stack>
  ),
  args: { position: 72 },
};

/** Copy overrides. The visible label is always the action, never the track.
 *  These are the catalogue's own German words, passed explicitly — the story
 *  is demonstrating that a per-call prop still wins over the catalogue. */
export const CopyOverrides: Story = {
  args: {
    position: 72,
    playLabel: 'Jetzt anhören',
    pauseLabel: 'Pause',
    restartLabel: 'Noch einmal',
  },
};

/**
 * ── `hideTimer` ────────────────────────────────────────────────────────────
 * The countdown is this control's best idea, and the reason to turn it off is
 * narrow: a screen that is ALREADY counting, larger and for a different
 * reason. The listen step's full-screen sheet shows the minimum the exercise
 * asks for in display type; the transport's own remaining-track time beside it
 * is two clocks disagreeing in one glance.
 *
 * THE BUTTON HUGS AGAIN when it is off. `min-inline-size: 18ch` and
 * `justify-content: flex-start` both exist FOR the readout — one reserves a
 * column so the digits do not resize the button, the other makes the pair read
 * as two columns — so with no readout they are dropped and it is an ordinary
 * CTA Button around its label.
 *
 * The number leaves the ACCESSIBLE NAME with it, which is the point: the
 * readout is plain text inside the button, so a hidden-but-announced time
 * would be read to one person and not another.
 */
export const TimerHidden: Story = {
  args: { position: 72, playing: true, hideTimer: true },
};

/** The two side by side, which is the only way the width difference reads. */
export const TimerShownAndHidden: Story = {
  render: (args) => (
    <Stack>
      <TrackButton {...args} />
      <TrackButton {...args} hideTimer />
    </Stack>
  ),
  args: { position: 72, playing: true },
};

/** How the listen step's sheet draws it: ghost, no readout, because the sheet
 *  counts the exercise's minimum in display type directly above. */
export const InTheListeningSheet: Story = {
  args: { position: 72, playing: true, variant: 'ghost', hideTimer: true },
};


/**
 * ── THE `min` RUNG, BESIDE A `min` CTA ─────────────────────────────────────
 * The two stand in the same row and have to agree, so they are shown that way:
 * both come to 36px by their own construction rather than by a copied number
 * (see `.musy-btn--min`'s note in the stylesheet).
 *
 * It arrived for the listen step's sheet, where the transport sits beside the
 * countdown rather than standing on its own. Where a transport IS the control
 * on offer, `primary` is the floor — 36px is below what 2.5.8 wants of a lone
 * target.
 */
export const MinRungBesideACta: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <TrackButton {...args} size="min" variant="ghost" hideTimer />
      <CtaButton size="min" variant="secondary">Weiter</CtaButton>
    </div>
  ),
  args: { position: 72, playing: true },
};
