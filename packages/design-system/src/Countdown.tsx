/**
 * Countdown — Layer 2
 * Composes: TrackButton (§7.21), `ghost`, `min`, `hideTimer`.
 * No base-ui primitive of its own: a figure, a control and a sentence.
 *
 * THE MINIMUM AN EXERCISE ASKS FOR, as the largest thing on the screen it is
 * on — 1:30 in every exercise that has one today. The listen step's focus
 * sheet has drawn it since 2026-10-07 as app CSS (`.musie-immersive__clock`
 * in apps/web/src/shell.css), the harp experiment copied that markup by hand,
 * and the instruments are the third screen to want it. L14.3: a pattern that
 * recurs is a component request. The values below are the app's, moved here
 * as they were.
 *
 * ── FULLY CONTROLLED, AND NO TIMER ───────────────────────────────────────
 * The same split as §7.21 and §7.22: this draws the clock and owns no
 * interval. The screen holds the time — it already knows when the first note
 * sounded or the track started — and hands over `remainingSeconds` and
 * `state`. One component then serves a countdown driven by a track's position
 * and one driven by a wall clock, with no branch in here.
 *
 * ── THREE PARTS, THREE JOBS ──────────────────────────────────────────────
 *   THE FIGURE is MM:SS in display type, `role="timer"`. A timer's implicit
 *     `aria-live` is OFF, so it is there to be read when somebody looks and is
 *     not announced four times a second. At 00:00 it goes quiet (`data-done`):
 *     it has finished its job, and a figure shouting 00:00 keeps the eye on a
 *     number that has stopped meaning anything.
 *   THE CONTROL beside it starts, pauses, resumes and restarts. It is
 *     TrackButton, because it is the same control the listen step already put
 *     there — ghost and `min`, the quiet half of the row, without its own
 *     readout (a second clock beside this one would disagree with it).
 *   THE CAPTION carries the meaning the figure cannot: that the number is a
 *     floor and not a length — and, once it is reached, what that means.
 *
 * ── WHAT IS HEARD ────────────────────────────────────────────────────────
 * Start, pause and the end are each announced, in a polite live region that
 * is always mounted (a region that appears with its text in it is, on most
 * screen readers, not announced at all). The screen passes `announcement`;
 * without one, the catalogue's three words stand in, so the component is not
 * silent just because a screen forgot. Nothing is announced for `unstarted`.
 */
import * as React from 'react';
import { TrackButton } from './MusicPlayer';
import { useMusyText } from './locale';

/**
 * Where the countdown stands. `unstarted` and `paused` both offer to start
 * it, with different words; `ended` offers to start it again.
 */
export type CountdownState = 'unstarted' | 'running' | 'paused' | 'ended';

/**
 * MM:SS, padded, and ROUNDED UP. A countdown that rounds to nearest shows
 * 00:00 for the last half second while it is still running; rounding up keeps
 * 00:00 for the moment it is actually over, which is also the moment
 * `data-done` is set — the figure and the attribute cannot disagree.
 * Padded so the figure never changes width as it crosses a minute.
 */
function countdownClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface CountdownProps {
  /** What is left, in seconds. Fractions round UP; 0 or less is done. */
  remainingSeconds: number;
  /** Where the countdown stands — the control's glyph and word follow it. */
  state: CountdownState;
  /** The one control's press, in every state: start, pause, resume, restart. */
  onToggle?: () => void;
  /**
   * The sentence under the figure. Required: the figure alone reads as how
   * long is LEFT, and what this is, is how much longer is the floor. Pass the
   * other sentence once it is reached.
   */
  caption: string;
  /** The control's word while `unstarted`. Defaults to the catalogue's
   *  "Starten". */
  playLabel?: string;
  /** The control's word while `paused`. Defaults to `playLabel` when that is
   *  given, else the catalogue's "Weiter" — the harp's distinction between
   *  starting a countdown and taking one up again. */
  resumeLabel?: string;
  /** The control's word while `running`. Defaults to "Pause". */
  pauseLabel?: string;
  /** The control's word once `ended`. Defaults to "Noch einmal". */
  restartLabel?: string;
  /**
   * What the control moves, appended to its accessible name after the action
   * — "Starten, Countdown". TrackButton's `label`, under the name the
   * listen step gives it. Defaults to the catalogue's "Countdown".
   */
  trackLabel?: string;
  /**
   * Text for the polite live region, announced when it CHANGES — so pass the
   * sentence for start, for pause and for the end, and the same string twice
   * in a row is not said twice. Omitted, the catalogue's "Countdown läuft" /
   * "pausiert" / "abgelaufen" are announced for `running`, `paused` and
   * `ended`. Pass an empty string to announce nothing.
   */
  announcement?: string;
  className?: string;
}

export function Countdown({
  remainingSeconds, state, onToggle, caption,
  playLabel, resumeLabel, pauseLabel, restartLabel, trackLabel,
  announcement, className,
}: CountdownProps) {
  const t = useMusyText();
  const done = Math.ceil(remainingSeconds) <= 0;

  /* WHAT THE LIVE REGION SAYS. The screen's sentence when it gives one; the
     catalogue's word for the state when it does not. */
  const spoken = announcement ?? (
    state === 'running' ? t.countdownRunning
      : state === 'paused' ? t.countdownPaused
        : state === 'ended' ? t.countdownEnded
          : ''
  );

  /* TRACKBUTTON READS ITS STATE FROM A TRANSPORT — playing, position,
     duration — and this one has a state already. So the transport is stated
     to land on the same glyph: `ended` is a position at the end of a
     one-second track (RotateCcw), `running` is playing (Pause), and both
     `unstarted` and `paused` are a stopped head (Play). The numbers never
     reach the screen: `hideTimer` drops the readout, and the WORD comes from
     the labels below, chosen here per state. */
  const play = state === 'paused'
    ? (resumeLabel ?? playLabel ?? t.countdownResume)
    : (playLabel ?? t.countdownStart);

  return (
    <div className={['musy-countdown', className ?? ''].filter(Boolean).join(' ')} data-state={state}>
      <div className="musy-countdown__meter">
        <p className="musy-countdown__time" role="timer" data-done={done ? 'true' : undefined}>
          {countdownClock(remainingSeconds)}
        </p>
        <TrackButton
          label={trackLabel ?? t.countdownName}
          duration={1}
          position={state === 'ended' ? 1 : 0}
          playing={state === 'running'}
          variant="ghost"
          size="min"
          hideTimer
          onTogglePlay={onToggle}
          onRestart={onToggle}
          playLabel={play}
          pauseLabel={pauseLabel ?? t.countdownPause}
          restartLabel={restartLabel ?? t.countdownRestart}
        />
      </div>
      <p className="musy-countdown__caption">{caption}</p>
      {/* ALWAYS MOUNTED. A live region is heard when its text changes, and a
          region that arrives already holding its text is, on most screen
          readers, not heard at all. */}
      <p className="musy-sr-only" role="status" aria-live="polite">{spoken}</p>
    </div>
  );
}
