/**
 * Toast — Layer 2 · §7.23
 * base-ui: Button (dismiss only — base-ui's own Toast is a queued, portaled,
 * auto-dismissing pattern, which is deliberately not this).
 *
 * Confirm an action that has already happened, and offer the one way to reverse
 * it, without moving the content the user is looking at.
 *
 * NOT §7.10 MESSAGE, and the difference is not styling. §7.10's own source says
 * it. A Message is part of the flow and pushes layout when it appears, which is
 * wrong for a confirmation arriving while the user is reading something else.
 *
 * THE LAYER ALREADY EXISTED. Layer 1 ships --z-toast ranked above --z-sheet,
 * with the stated reason that "a session saved confirmation must be visible
 * over an open sheet" — a layer with no consumer in the released set until now.
 *
 * ONE AT A TIME, AND IT REPLACES. No queue, no stacking, no collapsing into
 * "2 items deleted". The undo model this serves is *undo the last thing*, which
 * is exactly what a single toast says — and two stacked toasts on a 393px
 * screen cover the control the user was aiming at. The consequence, stated so
 * it is a choice rather than a surprise: an earlier action's offer leaves the
 * screen while its own window is still open, and is recoverable only until that
 * window lapses.
 *
 * role="status", NEVER role="alert". An undo offer is not urgent, and assertive
 * cuts across whatever the screen reader is already saying.
 *
 * NO TIMER. `label` going null is what removes it, so the consumer's own undo
 * window is the single source of truth. A second timer inside the component
 * could only disagree with it — the same split §7.19 and §7.22 make with the
 * recorder.
 *
 * Dismiss follows §7.10's precedent: a bare base-ui Button dressed by
 * .musy-toast__dismiss, not an Icon Button, so the three dismiss affordances in
 * the system stay identical and no tooltip appears under a thumb.
 *
 * ── TONE AND PLACEMENT — 2026-09-26 ───────────────────────────────────────
 * Two props, both defaulted to what this component already did, because the
 * one caller in the product (VoiceTranscript's undo offer) must not move a
 * pixel for a change made on another screen's behalf.
 *
 * `tone="success"` takes the feedback family Layer 1 already ships. THE FILL
 * IS NOT THE MESSAGE (1.4.1): it draws a check glyph, the sentence says what
 * happened, and a screen-reader status word goes in front of the text — the
 * same three-way redundancy §7.10 uses, through the same catalogue keys. A
 * caller whose label already IS the status passes `statusWord=""` and drops
 * the duplication, exactly as Badge allows.
 *
 * `placement="top"` flips the fixed insets: top and centred on a phone,
 * top-TRAILING from --bp-md up. The stylesheet holds both, because which edge
 * a fixed element takes is geometry and geometry lives in the CSS.
 *
 * WHAT THIS COMPONENT CANNOT KNOW is how tall the consuming app's header is.
 * --z-toast outranks --z-sticky, by Layer 1's own design, so a top toast paints
 * OVER a sticky header unless something says how far down to start. So the
 * component publishes one custom property — --musy-toast-inset-block-start —
 * and the app sets it. That is a contract this component offers, not a screen
 * reaching into geometry it does not own: the fallback is a token, and an app
 * that says nothing gets a correct toast.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { CircleCheck, X } from 'lucide-react';
import { Icon } from './Icon';
import { CtaButton } from './CtaButton';
import { useMusyText } from './locale';

export type ToastLive = 'polite' | 'off';

/** What the toast is reporting. `neutral` is this component as it shipped. */
export type ToastTone = 'neutral' | 'success';

/** Which edge it is fixed to. `bottom` is this component as it shipped. */
export type ToastPlacement = 'bottom' | 'top';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastProps {
  /** What happened. `null` renders nothing — the consumer's state is the
   *  visibility, and its undo window is the timer. */
  label: string | null;
  /** Exactly one. Two actions means this is a dialog, not a toast. */
  action?: ToastAction;
  onDismiss?: () => void;
  /** Announced while it is up. 'off' for a toast that repeats a change the
   *  user has already been told about some other way. */
  live?: ToastLive;
  /**
   * `success` draws a check glyph, the success feedback fill, and a
   * screen-reader status word — so the meaning survives without the colour.
   */
  tone?: ToastTone;
  /**
   * Which edge it is fixed to. `top` is top-centre on a phone and
   * top-trailing from --bp-md up. See the header for
   * --musy-toast-inset-block-start, which is how an app with a sticky header
   * says how far down `top` starts.
   */
  placement?: ToastPlacement;
  /** Overrides the announced status word. `''` drops it — for a label that
   *  already IS the status. Ignored when `tone` is `neutral`, which has none. */
  statusWord?: string;
  dismissLabel?: string;
  id?: string;
  className?: string;
}

export function Toast({
  label,
  action,
  onDismiss,
  live = 'polite',
  tone = 'neutral',
  placement = 'bottom',
  statusWord,
  dismissLabel,
  id,
  className,
}: ToastProps) {
  const t = useMusyText();
  if (!label) return null;

  const success = tone === 'success';

  return (
    <div
      id={id}
      className={[
        'musy-toast',
        success ? 'musy-toast--success' : '',
        placement === 'top' ? 'musy-toast--top' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      role={live === 'polite' ? 'status' : undefined}
      aria-live={live === 'off' ? undefined : live}
    >
      {/* Decorative: the status WORD beside it is what carries the tone to a
          screen reader, so the meaning never depends on an icon's alt text.
          §7.10 makes the same split with the same two elements. */}
      {success && (
        <span className="musy-toast__icon">
          <Icon glyph={CircleCheck} size="md" />
        </span>
      )}

      <p className="musy-toast__text" data-type-step="body-sm">
        {success && <span className="musy-sr-only">{statusWord ?? t.statusSuccess}: </span>}
        {label}
      </p>

      {action && (
        <CtaButton variant="ghost" onClick={action.onAction}>
          {action.label}
        </CtaButton>
      )}

      {onDismiss ? (
        <Button className="musy-toast__dismiss" onClick={onDismiss} aria-label={dismissLabel ?? t.dismissMessage}>
          <Icon glyph={X} size="md" />
        </Button>
      ) : null}
    </div>
  );
}
