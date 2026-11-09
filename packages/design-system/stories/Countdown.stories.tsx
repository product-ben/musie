/**
 * Countdown — the minimum an exercise asks for.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.27. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Countdown } from '../src/Countdown';
import { bothThemes } from './_decorators';

/* The harp experiment's own two captions (harp/261104-1443, `cdRender`):
   the floor before it is reached, and the sentence once it is. */
const CAPTION = 'mindestens spielen für diese Übung';
const CAPTION_DONE = 'Super, dass du dich 1:30 Minuten fokussiert hast. Spiel gern weiter.';

const meta = {
  title: 'Components/Countdown',
  component: Countdown,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Composes TrackButton (§7.21) — `ghost`, `min`, `hideTimer`. No base-ui',
          'primitive of its own: a figure, a control and a sentence.',
          '',
          '**Purpose.** The minimum an exercise asks for, as the largest thing on the',
          'screen it is on. The listen step’s focus sheet drew it as app CSS',
          '(`.musie-immersive__clock`), the harp experiment copied that markup by',
          'hand, and the instruments are the third screen to want it — L14.3: a',
          'pattern that recurs is a component request.',
          '',
          '**Fully controlled, and no timer.** This draws the clock and owns no',
          'interval. The screen holds the time and hands over `remainingSeconds` and',
          '`state`, so one component serves a countdown driven by a track’s position',
          'and one driven by a wall clock.',
          '',
          '**Three parts, three jobs.** THE FIGURE is MM:SS in display type,',
          '`role="timer"` — whose implicit `aria-live` is off, so it is read when',
          'somebody looks and is not announced four times a second. At 00:00 it goes',
          'quiet (`data-done`). THE CONTROL starts, pauses, resumes and restarts; it is',
          'TrackButton, ghost and `min`, without its own readout. THE CAPTION carries',
          'the meaning the figure cannot: that the number is a floor and not a length.',
          '',
          '**What is heard.** Start, pause and the end are each announced, in a polite',
          'live region that is always mounted. The screen passes `announcement`;',
          'without one, the catalogue’s three words stand in. Nothing is announced',
          'for `unstarted`.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-11-09. Delete once answered.',
          'This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    remainingSeconds: 90,
    state: 'unstarted',
    caption: CAPTION,
  },
  argTypes: {
    remainingSeconds: { control: { type: 'number', min: 0, step: 1 }, description: 'What is left, in seconds. Fractions round UP; 0 or less is done.' },
    state: {
      control: 'inline-radio',
      options: ['unstarted', 'running', 'paused', 'ended'],
      description: 'Where the countdown stands — the control’s glyph and word follow it.',
    },
    onToggle: { action: 'toggle', description: 'The one control’s press, in every state: start, pause, resume, restart.' },
    caption: { control: 'text', description: 'The sentence under the figure. Required: the figure alone reads as how long is LEFT.' },
    playLabel: { control: 'text', description: 'The control’s word while `unstarted`. Defaults to the catalogue’s “Starten”.' },
    resumeLabel: { control: 'text', description: 'The control’s word while `paused`. Defaults to `playLabel` when given, else “Weiter”.' },
    pauseLabel: { control: 'text', description: 'The control’s word while `running`. Defaults to “Pause”.' },
    restartLabel: { control: 'text', description: 'The control’s word once `ended`. Defaults to “Noch einmal”.' },
    trackLabel: { control: 'text', description: 'What the control moves, appended to its accessible name after the action — “Starten, Countdown”.' },
    announcement: {
      control: 'text',
      description: 'Text for the polite live region, announced when it CHANGES. Omitted, the catalogue’s words for running / paused / ended are announced. Empty announces nothing.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: the required three and nothing else, so every word on
 *  the control is the catalogue's — which are the harp's own. */
export const Default: Story = {};

/** Before the first press — or, on the instruments, the first note. The full
 *  minimum, the play glyph and „Starten“. The live region is empty: nothing
 *  has happened yet that needs saying. */
export const Unstarted: Story = {
  args: { state: 'unstarted', remainingSeconds: 90 },
};

/** Counting. The control is a pause now, and the live region has said
 *  „Countdown läuft“ once — the figure itself stays silent. */
export const Running: Story = {
  args: { state: 'running', remainingSeconds: 71 },
};

/** Stopped part of the way. The play glyph is back with the harp's other word,
 *  „Weiter“: taking a countdown up again is not starting it. */
export const Paused: Story = {
  args: { state: 'paused', remainingSeconds: 42 },
};

/** At 00:00. The figure goes quiet (`data-done`), the glyph becomes restart,
 *  and the caption is the sentence that says what the number meant. */
export const Ended: Story = {
  args: { state: 'ended', remainingSeconds: 0, caption: CAPTION_DONE },
};
