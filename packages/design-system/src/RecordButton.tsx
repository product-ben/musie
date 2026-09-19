/**
 * Record Button — Layer 2 · §7.22
 * §7.19 Voice Note's capture step, collapsed into ONE control: the primary
 * CTA. Two states on one target — ready ⇄ recording — and every switch resets
 * the clock, so there is no third "recorded" state to explain.
 *
 * COMPOSED ON §7.4 CTA BUTTON, NOT A NEW BUTTON. Same target ladder
 * (44 / 56 / 64), same six-state model, same pill. Two extra parts: the meter
 * (`.musy-rec__meter`) and the readout (`.musy-rec__time`).
 *
 * THE STATE IS NOT CARRIED BY HUE. The button stays primary while live —
 * swapping to the error family would paint a working control as a failure, and
 * §19's red-while-live belongs to a surface, not to the screen's main action.
 * Three cues change instead: the glyph (mic → stop), the label ("Record Now" →
 * "Recording") and the meter, which only exists while recording. It
 * survives greyscale and forced colours (1.4.1).
 *
 * THE METER IS DECORATIVE, THE COUNTER IS NOT. Bars are aria-hidden and take
 * currentColor, so they follow the button's ink in every variant. What a
 * screen-reader user gets is the readout — seconds in, seconds left, in a
 * `role="status"` region. The same split §19 made between its pulsing dot and
 * its live time.
 *
 * FULLY CONTROLLED, AND NO MEDIA. The component draws `levels`; it never calls
 * getUserMedia, never encodes, and does not hold the 60-second timer. The app
 * that owns the recorder owns both, and calls `onLimit` when `maxSeconds` is
 * reached — which is what lets one component drive a real recorder and a
 * simulated one with no prototype branch inside the design system.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Mic, Square } from 'lucide-react';
import { Icon } from './Icon';

export type RecordButtonState = 'ready' | 'recording';

/** m:ss. Tabular figures in CSS keep the pair from twitching once a second. */
export function recordClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface RecordButtonProps {
  state: RecordButtonState;
  /** Seconds spoken so far. Owned by the consumer; reset on every switch. */
  elapsed?: number;
  /** Hard ceiling. The consumer stops at it and calls `onLimit`. */
  maxSeconds?: number;
  /** Live amplitudes, 0…1, newest last. One bar each; `bars` flat bars when
   *  the array is empty (permission pending, or a muted mic). */
  levels?: number[];
  bars?: number;
  onToggle?: () => void;
  variant?: 'primary' | 'accent' | 'accent-alt';
  /** Raises the TARGET, not the type step — §7.4's ladder. */
  size?: 'primary' | 'comfort' | 'guided';
  disabled?: boolean;
  block?: boolean;
  /** Copy. English defaults; the consumer localises. */
  readyLabel?: string;
  recordingLabel?: string;
  /** Spoken status: ("12", "48") → "…". */
  status?: (inSeconds: string, leftSeconds: string) => string;
  className?: string;
}

export function RecordButton({
  state, elapsed = 0, maxSeconds = 60, levels = [], bars = 12,
  onToggle, variant = 'primary', size = 'primary', disabled = false, block = false,
  readyLabel = 'Record Now',
  recordingLabel = 'Recording',
  status = (i, left) => `Recording, ${i} in, ${left} left`,
  className,
}: RecordButtonProps) {
  const recording = state === 'recording';
  const left = Math.max(0, maxSeconds - elapsed);

  /* Always `bars` bars: a meter that changes bar COUNT with the signal reads as
     a layout bug, not as a level. A missing level is a floor, not a gap. */
  const meter = Array.from({ length: bars }, (_, i) => levels[levels.length - bars + i] ?? 0);

  return (
    <Button
      className={[
        'musy-btn', `musy-btn--${variant}`, 'musy-rec',
        size === 'primary' ? '' : `musy-btn--${size}`,
        block ? 'musy-btn--block' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-state={state}
      disabled={disabled}
      onClick={onToggle}
    >
      <Icon glyph={recording ? Square : Mic} size={size === 'primary' ? 'md' : 'lg'} />
      <span className="musy-btn__label">{recording ? recordingLabel : readyLabel}</span>

      {recording && (
        <>
          <span className="musy-rec__meter" aria-hidden="true">
            {meter.map((v, i) => (
              <span
                key={i}
                className="musy-rec__bar"
                /* Percentage of the meter box, floored so a silent bar is still
                   a bar. Live data, which is why it is inline. */
                style={{ blockSize: `${Math.round(Math.min(1, Math.max(0.1, v)) * 100)}%` }}
              />
            ))}
          </span>
          <span className="musy-rec__time">
            <span>{recordClock(elapsed)}</span>
            <span>{`−${recordClock(left)}`}</span>
          </span>
          <span className="musy-sr-only" role="status">
            {status(recordClock(elapsed), recordClock(left))}
          </span>
        </>
      )}
    </Button>
  );
}
