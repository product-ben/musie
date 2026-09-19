/**
 * Music Player — Layer 2 · §7.21
 * Two variations of one job: give a Method's track a control the listener can
 * trust.
 *
 *   TrackButton — the whole player inside one button. Glyph + action label +
 *                 MM:SS
 *                 countdown. For a track offered inline, in prose or in a
 *                 wizard panel, where a second row of chrome would outweigh
 *                 the thing it controls.
 *   MusicPlayer — a 64px --target-guided play control plus a scrubber, for
 *                 when the listener needs to move around inside the track.
 *
 * FULLY CONTROLLED, AND NO MEDIA. Both components own the transport UI and
 * nothing else: no <audio>, no fetch, no timer. The consuming app holds the
 * media element and feeds `position` back — the same split that lets §19 Voice
 * Note drive a real recorder and a simulated one with no branch inside the
 * design system.
 *
 * WHY THE COUNTDOWN COUNTS DOWN. The only question a first-time listener has
 * is how long they are committing to. A count-up answers it only for someone
 * already holding the duration in their head.
 *
 * ENDED IS A STATE. At the end the glyph becomes RotateCcw rather than
 * reverting to Play, so "it finished" and "it never started" are not the same
 * picture (1.4.1 — the glyph differs, not only the fill).
 *
 * The scrubber is base-ui `Slider`, which renders role="slider", the value
 * attributes, arrow keys and Home/End. Hand-rolled scrub handles get all four
 * wrong, and get them wrong invisibly.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Slider } from '@base-ui/react/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';

export type MusicTransport = 'paused' | 'playing' | 'ended';

/** MM:SS. Padded, so a countdown never changes width as it crosses a minute. */
export function trackClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function transportOf(playing: boolean, position: number, duration: number): MusicTransport {
  if (position >= duration && duration > 0) return 'ended';
  return playing ? 'playing' : 'paused';
}

/**
 * THE LABEL NAMES THE ACTION, NOT THE TRACK. A fixed label is the safer
 * default, but the flows this button exists for withhold the track name on
 * purpose, which left the label with nothing true to say. So the visible label
 * is the verb — play / pause / replay, from the locale catalogue — and `label`
 * (the track) moves into the accessible name, where it still disambiguates two
 * players on one screen.
 */
export interface TrackButtonProps {
  /** The track. Announced, not shown — the visible label is the action. */
  label: string;
  /** Track length in seconds. */
  duration: number;
  /** Playback head in seconds, owned by the consumer. */
  position?: number;
  playing?: boolean;
  onTogglePlay?: () => void;
  /** Called instead of onTogglePlay once the track has ended. */
  onRestart?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'accent-alt';
  /** --target-guided (64px) for assisted use. */
  size?: 'primary' | 'guided' | 'comfort';
  disabled?: boolean;
  /** The three transport words. Each defaults to the locale catalogue's
   *  TRACK wording — "Jetzt anhören" invites, where the player's "Abspielen"
   *  is a transport control. */
  playLabel?: string;
  pauseLabel?: string;
  restartLabel?: string;
  className?: string;
}

export function TrackButton({
  label, duration, position = 0, playing = false,
  onTogglePlay, onRestart,
  variant = 'secondary', size = 'primary', disabled = false,
  playLabel, pauseLabel, restartLabel,
  className,
}: TrackButtonProps) {
  const t = useMusyText();
  const state = transportOf(playing, position, duration);
  const glyph = state === 'playing' ? Pause : state === 'ended' ? RotateCcw : Play;
  const action = state === 'playing' ? (pauseLabel ?? t.trackPause)
    : state === 'ended' ? (restartLabel ?? t.trackRestart)
    : (playLabel ?? t.trackPlay);

  return (
    <Button
      className={[
        'musy-btn', `musy-btn--${variant}`, 'musy-mbtn',
        size === 'primary' ? '' : `musy-btn--${size}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-state={state}
      disabled={disabled}
      onClick={state === 'ended' ? (onRestart ?? onTogglePlay) : onTogglePlay}
    >
      <Icon glyph={glyph} size="md" />
      {/* Visible: the action. Announced: the action and the track. */}
      <span className="musy-btn__label">{action}</span>
      <span className="musy-sr-only">{`, ${label}`}</span>
      {/* Remaining, not elapsed — see the file header. */}
      <span className="musy-mbtn__time">{trackClock(Math.max(0, duration - position))}</span>
      <span className="musy-spinner" aria-hidden="true" />
    </Button>
  );
}

export interface MusicPlayerProps {
  /** Track name. Truncates rather than wrapping — the row is one line high. */
  title: string;
  duration: number;
  position?: number;
  playing?: boolean;
  onTogglePlay?: () => void;
  onRestart?: () => void;
  /** Scrub. Fires with the new position in seconds. */
  onSeek?: (seconds: number) => void;
  accent?: 'primary' | 'accent' | 'accent-alt';
  disabled?: boolean;
  /** The transport words and the scrubber's name. Each defaults to the locale
   *  catalogue's PLAYER wording. */
  playLabel?: string;
  pauseLabel?: string;
  restartLabel?: string;
  seekLabel?: string;
  className?: string;
}

export function MusicPlayer({
  title, duration, position = 0, playing = false,
  onTogglePlay, onRestart, onSeek,
  accent = 'primary', disabled = false,
  playLabel, pauseLabel, restartLabel, seekLabel,
  className,
}: MusicPlayerProps) {
  const t = useMusyText();
  const state = transportOf(playing, position, duration);
  const glyph = state === 'playing' ? Pause : state === 'ended' ? RotateCcw : Play;
  const action = state === 'playing' ? (pauseLabel ?? t.playerPause)
    : state === 'ended' ? (restartLabel ?? t.playerRestart)
    : (playLabel ?? t.playerPlay);

  return (
    <div
      className={[
        'musy-mplayer',
        accent === 'primary' ? '' : `musy-mplayer--${accent}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-state={state}
      data-disabled={disabled ? '' : undefined}
    >
      <Button
        className="musy-icon-btn musy-icon-btn--primary musy-icon-btn--guided"
        aria-label={`${action}: ${title}`}
        disabled={disabled}
        onClick={state === 'ended' ? (onRestart ?? onTogglePlay) : onTogglePlay}
      >
        <Icon glyph={glyph} size="lg" />
      </Button>

      <div className="musy-mplayer__main">
        <span className="musy-mplayer__title">{title}</span>
        <Slider.Root
          value={Math.min(position, duration)}
          max={duration}
          disabled={disabled}
          onValueChange={(v) => onSeek?.(Array.isArray(v) ? v[0] : v)}
        >
          <Slider.Control className="musy-mplayer__slider">
            <Slider.Track className="musy-mplayer__control">
              <span className="musy-mplayer__track" />
              <Slider.Indicator className="musy-mplayer__fill" />
              <Slider.Thumb className="musy-mplayer__thumb" aria-label={seekLabel ?? t.playerSeek} />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <div className="musy-mplayer__times">
          <span>{trackClock(position)}</span>
          {/* Minus sign: the right-hand figure is what is LEFT, not the end
              timestamp — the two are easy to confuse at a glance. */}
          <span>{`−${trackClock(Math.max(0, duration - position))}`}</span>
        </div>
      </div>
    </div>
  );
}
