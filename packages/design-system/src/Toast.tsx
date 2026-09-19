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
 * .musy-toast__dismiss, not an Icon Button, so the two dismiss affordances in
 * the system stay identical and no tooltip appears under a thumb.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { X } from 'lucide-react';
import { Icon } from './Icon';
import { CtaButton } from './CtaButton';
import { useMusyText } from './locale';

export type ToastLive = 'polite' | 'off';

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
  dismissLabel?: string;
  id?: string;
  className?: string;
}

export function Toast({
  label,
  action,
  onDismiss,
  live = 'polite',
  dismissLabel,
  id,
  className,
}: ToastProps) {
  const t = useMusyText();
  if (!label) return null;

  return (
    <div
      id={id}
      className={['musy-toast', className ?? ''].filter(Boolean).join(' ')}
      role={live === 'polite' ? 'status' : undefined}
      aria-live={live === 'off' ? undefined : live}
    >
      <p className="musy-toast__text" data-type-step="body-sm">
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
