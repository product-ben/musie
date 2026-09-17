/**
 * Voice Note — Layer 2 · §7.19
 * Capture one spoken answer. In the reference flow this is the DEFAULT
 * reflection mode, which is why it is a first-class component and not a
 * button that opens something else.
 *
 * No APG pattern, and base-ui has no recorder. The parts that base-ui DOES own
 * are used: `Button` for every control, and `Progress` for the playback
 * position, which renders the correct `role="progressbar"` and value
 * attributes — easy to get wrong by hand and invisible when it is wrong.
 *
 * FULLY CONTROLLED, AND NO MEDIA ACCESS. The component owns the state MACHINE
 * and its presentation; it never calls getUserMedia. Recording, encoding and
 * permission handling belong to the consuming app, which is what lets the same
 * component drive a real recorder and a simulated one without a prototype
 * branch inside the design system.
 *
 * Three states, and they are a cycle: idle → recording → recorded → idle.
 *
 * ANNOUNCEMENT, NOT ANIMATION. The pulsing dot is decorative; the elapsed time
 * sits in a `role="status"` region, so "recording" survives for a screen-reader
 * user and for anyone who cannot see the dot (1.4.1). Under reduced motion the
 * pulse is dropped entirely rather than shortened — Layer 1's 1ms would strobe.
 *
 * Composed on Field's parts (§7.16): label, description and error are
 * `.musy-field__*`. Only the control surface is new.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Progress } from '@base-ui/react/progress';
import { Mic, Square, Play, Pause, Trash2, CircleX } from 'lucide-react';
import { Icon } from './Icon';

export type VoiceNoteState = 'idle' | 'recording' | 'recorded';

export interface VoiceNoteProps {
  /** Visible label. Required. */
  label: string;
  state: VoiceNoteState;
  /** Seconds elapsed while recording. */
  elapsed?: number;
  /** Seconds of the captured note. */
  duration?: number;
  /** Playback head, in seconds. */
  position?: number;
  playing?: boolean;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
  onTogglePlay?: () => void;
  onDelete?: () => void;
  description?: string;
  error?: string;
  disabled?: boolean;
  /** Copy. English defaults; the consumer localises. */
  idleText?: string;
  recordLabel?: string;
  stopLabel?: string;
  playLabel?: string;
  pauseLabel?: string;
  deleteLabel?: string;
  recordingWord?: string;
  errorWord?: string;
  id?: string;
  className?: string;
}

/** m:ss. Tabular figures in CSS keep the row from twitching once per second. */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function VoiceNote({
  label, state, elapsed = 0, duration = 0, position = 0, playing = false,
  onRecordStart, onRecordStop, onTogglePlay, onDelete,
  description, error, disabled = false,
  idleText = 'Answer out loud — you can delete it and start again.',
  recordLabel = 'Record answer',
  stopLabel = 'Stop recording',
  playLabel = 'Play answer',
  pauseLabel = 'Pause answer',
  deleteLabel = 'Delete answer',
  recordingWord = 'Recording',
  errorWord = 'Error',
  id, className,
}: VoiceNoteProps) {
  const reactId = React.useId();
  const rootId = id ?? `voice-${reactId}`;

  return (
    <div
      className={['musy-field', 'musy-voice', className ?? ''].filter(Boolean).join(' ')}
      data-disabled={disabled ? '' : undefined}
    >
      <span className="musy-field__label" id={`${rootId}-label`} data-disabled={disabled ? '' : undefined}>
        {label}
      </span>

      <div
        className="musy-voice__control"
        data-state={state}
        data-disabled={disabled ? '' : undefined}
        role="group"
        aria-labelledby={`${rootId}-label`}
        aria-describedby={description ? `${rootId}-desc` : undefined}
      >
        {state === 'idle' && (
          <>
            <Button
              className="musy-icon-btn musy-icon-btn--primary musy-icon-btn--primary-size"
              aria-label={recordLabel}
              disabled={disabled}
              onClick={onRecordStart}
            >
              <Icon glyph={Mic} size="md" />
            </Button>
            <p className="musy-voice__text">{idleText}</p>
          </>
        )}

        {state === 'recording' && (
          <>
            <Button
              className="musy-icon-btn musy-icon-btn--primary musy-icon-btn--primary-size"
              aria-label={stopLabel}
              disabled={disabled}
              onClick={onRecordStop}
            >
              <Icon glyph={Square} size="md" />
            </Button>
            <div className="musy-voice__live">
              <span className="musy-voice__dot" aria-hidden="true" />
              <span className="musy-voice__status" role="status">
                {recordingWord} {clock(elapsed)}
              </span>
            </div>
          </>
        )}

        {state === 'recorded' && (
          <>
            <Button
              className="musy-icon-btn musy-icon-btn--primary musy-icon-btn--primary-size"
              aria-label={playing ? pauseLabel : playLabel}
              disabled={disabled}
              onClick={onTogglePlay}
            >
              <Icon glyph={playing ? Pause : Play} size="md" />
            </Button>
            <div className="musy-voice__playback">
              <Progress.Root
                className="musy-voice__bar"
                value={duration > 0 ? Math.min(100, (position / duration) * 100) : 0}
                aria-label={label}
              >
                <Progress.Track className="musy-voice__track">
                  <Progress.Indicator className="musy-voice__fill" />
                </Progress.Track>
              </Progress.Root>
              <span className="musy-voice__time">{clock(position)} / {clock(duration)}</span>
            </div>
            <Button
              className="musy-icon-btn musy-icon-btn--ghost musy-icon-btn--primary-size"
              aria-label={deleteLabel}
              disabled={disabled}
              onClick={onDelete}
            >
              <Icon glyph={Trash2} size="md" />
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="musy-field__error" role="alert">
          <Icon glyph={CircleX} size="sm" />
          <span><span className="musy-sr-only">{errorWord}: </span>{error}</span>
        </div>
      )}

      {description && (
        <p className="musy-field__description" id={`${rootId}-desc`} data-disabled={disabled ? '' : undefined}>
          {description}
        </p>
      )}
    </div>
  );
}
