/**
 * MusicPlayer — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment in
 * src/MusicPlayer.tsx and from docs/07-components.md §7.21. Nothing is
 * invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MusicPlayer } from '../src/MusicPlayer';
import { bothThemes, Stack } from './_decorators';

/* "Your track" is §7.21's own example accessible name ("Pause, Your track").
   The prototype records that the title IS the track name but never carries the
   string. See OPEN-QUESTIONS.md. */
const TRACK = 'Your track';

/* A 3:45 track. Transport state is DERIVED from position/duration/playing —
   there is no `state` prop — so `ended` is reached by position === duration. */
const DURATION = 225;

const meta = {
  title: 'Components/MusicPlayer',
  component: MusicPlayer,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A 64px `--target-guided` play control plus a scrubber, for when the',
          'listener needs to move around inside the track. The other half of §7.21',
          'is `TrackButton`, which is the whole player inside one button.',
          '',
          '**Fully controlled, and no media.** The component owns the transport UI and',
          'nothing else: no `<audio>`, no fetch, no timer. The consuming app holds the',
          'media element and feeds `position` back — the same split that lets §19 Voice',
          'Note drive a real recorder and a simulated one with no branch inside the',
          'design system.',
          '',
          '**The readout counts down.** The only question a first-time listener has is',
          'how long they are committing to. A count-up answers it only for someone',
          'already holding the duration in their head. The remaining figure is prefixed',
          'with a minus so it cannot be misread as the end timestamp.',
          '',
          '**Ended is a state.** At the end the glyph becomes RotateCcw rather than',
          'reverting to Play, so "it finished" and "it never started" are not the same',
          'picture (1.4.1 — the glyph differs, not only the fill).',
          '',
          'The scrubber is base-ui `Slider`, which renders `role="slider"`, the value',
          'attributes, arrow keys and Home/End. Hand-rolled scrub handles get all four',
          'wrong, and get them wrong invisibly. The rail is `--sp-1`, but the grabbable',
          'area is `--target-primary` (44px): this is the only **drag** control in the',
          'system — the one place a small target costs most.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## MusicPlayer — `accent` never reaches the transport button',
          'Where: `src/MusicPlayer.tsx:152-158`',
          'What I checked: Level 1. The wrapper takes `musy-mplayer--${accent}`, but the',
          'play control’s class list is the literal string `\'musy-icon-btn',
          'musy-icon-btn--primary musy-icon-btn--guided\'`. Level 3, §7.21’s token list',
          'names `--interactive-accent-placeholder1/2`, and the CSS only sets',
          '`--musy-mplayer-accent` on the wrapper.',
          'What I did: wrote an `Accents` story showing all three anyway.',
          'Why: the accent does change the fill, the thumb and the border, so the story',
          'is honest; it simply does not change the button.',
          'What I need from Ben: **a decision.** Either the transport is deliberately',
          'always primary, or `accent` should be threaded into it.',
          '',
          '## MusicPlayer — the transport state is derived, and `ended` is unreachable at `duration={0}`',
          'Where: `src/MusicPlayer.tsx:44-47`',
          'What I checked: Level 1. `transportOf` returns `\'ended\'` only when',
          '`position >= duration && duration > 0`; there is no `state` prop, so',
          '`MusicTransport` is exported as a type nobody can pass in.',
          'What I did: reached `ended` by passing `position === duration`.',
          'Why: it is the only route the API offers.',
          'What I need from Ben: nothing, just flagging — `MusicTransport` being exported',
          'but not accepted is the odd part.',
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
    title: TRACK,
    duration: DURATION,
  },
  argTypes: {
    title: { control: 'text', description: 'Track name. Truncates rather than wrapping — the row is one line high.' },
    duration: { control: 'number', description: 'Track length in seconds.' },
    position: { control: 'number', description: 'Playback head in seconds, owned by the consumer.' },
    playing: { control: 'boolean', description: 'Whether the consumer’s media element is playing.' },
    onTogglePlay: { action: 'togglePlay', description: 'Fires when the transport button is pressed before the track has ended.' },
    onRestart: { action: 'restart', description: 'Called instead of onTogglePlay once the track has ended.' },
    onSeek: { action: 'seek', description: 'Scrub. Fires with the new position in seconds.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent-placeholder1', 'accent-placeholder2'],
      description: 'Solved accent family. Literal placeholder names per Decision 3.',
    },
    disabled: { control: 'boolean', description: 'Disables the transport button and the scrubber.' },
    playLabel: { control: 'text', description: 'Copy. English default: "Play".' },
    pauseLabel: { control: 'text', description: 'Copy. English default: "Pause".' },
    restartLabel: { control: 'text', description: 'Copy. English default: "Play again".' },
    seekLabel: { control: 'text', description: 'Accessible name for the scrubber thumb. Default "Playback position" — the prototype’s own value.' },
    className: { control: false },
  },
} satisfies Meta<typeof MusicPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: accent `primary`, position 0, not playing — so the
 *  derived transport state is `paused` at the head of the track. */
export const Default: Story = {};

/** All three accent families. The prototype uses the default `primary`.
 *  The accent reaches the fill, the thumb and the border, but not the
 *  transport button — see Build notes. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <MusicPlayer {...args} accent="primary" title="accent: primary (default)" />
      <MusicPlayer {...args} accent="accent-placeholder1" title="accent: accent-placeholder1" />
      <MusicPlayer {...args} accent="accent-placeholder2" title="accent: accent-placeholder2" />
    </Stack>
  ),
  args: { position: 72 },
};

/** `paused` — Play glyph, fill at the current position. */
export const Paused: Story = { args: { position: 72, playing: false } };

/** `playing` — Pause glyph, fill advances. Only the fill transitions
 *  (`--motion-toggle`); the thumb must not lag the finger holding it. */
export const Playing: Story = { args: { position: 72, playing: true } };

/** `ended` — Restart glyph, fill full. Reached by `position === duration`;
 *  there is no `state` prop. Restarting plays from zero, because that is what
 *  the glyph promised. */
export const Ended: Story = { args: { position: DURATION, playing: false } };

/** `--border-subtle`, `--interactive-primary-disabled`, accent and text to
 *  `--on-surface-disabled`, thumb not focusable. */
export const Disabled: Story = { args: { position: 72, disabled: true } };

/** Disabled while the consumer's media is still playing — the glyph stays
 *  Pause, because the state is derived from `playing`, not from `disabled`. */
export const DisabledWhilePlaying: Story = {
  args: { position: 72, playing: true, disabled: true },
};

/** The title truncates rather than wrapping, so the row stays one line high
 *  and the transport never reflows away from the thumb. */
export const LongTitle: Story = {
  args: {
    title: 'A track title long enough that the single-line row has to clip it rather than wrap',
    position: 72,
  },
};

/** Copy overrides. Every visible string except the title is replaceable;
 *  `seekLabel` is the scrubber thumb's accessible name. */
export const CopyOverrides: Story = {
  args: {
    position: 72,
    playLabel: 'Abspielen',
    pauseLabel: 'Pause',
    restartLabel: 'Erneut abspielen',
    seekLabel: 'Wiedergabeposition',
  },
};
