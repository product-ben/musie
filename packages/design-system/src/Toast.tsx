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
 * ── SWIPE TO DISMISS, AND THE FOUR TONES — 2026-09-30 ─────────────────────
 * A toast is fixed over the content, so the one thing a thumb can do with it
 * without aiming is push it away. §7.24's row swipe already taught this app's
 * thumbs the gesture and the distance, so this is the SAME gesture with the
 * same numbers — slop, axis decision, half-the-width commit — and not a second
 * dialect of it. What it does NOT copy is the parked panel: there is nothing
 * behind a toast to reveal, so a swipe either dismisses or springs back.
 *
 * It exists only where `onDismiss` does. A toast with no dismiss is one the
 * consumer wants to control the lifetime of, and swiping it away would be the
 * component overruling that.
 *
 * A MOUSE IS NOT A THUMB, same as §7.24: the cursor has the dismiss button.
 *
 * `warning` and `error` join `success` because a failure is now reported here
 * rather than inline — VoiceTranscript's errors moved on 2026-09-30, and a
 * Message that pushes the transcript down to say the microphone stopped is
 * exactly the layout shift §7.10's own source warns about. The glyphs and the
 * status words are §7.10's records, read from the same catalogue, so the two
 * components cannot drift about what an error looks like or is called.
 *
 * `live` gains `assertive` for them. The header's "NEVER role=alert" was
 * written about an UNDO OFFER and is still right about one: an offer is not
 * urgent. A recording that has stopped is, and the consumer says which it has.
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
import { CircleCheck, CircleX, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { CtaButton } from './CtaButton';
import { useMusyText } from './locale';
import type { MusyStatusKey } from './locale';

export type ToastLive = 'polite' | 'off' | 'assertive';

/**
 * ── THE SWIPE · the numbers, borrowed rather than chosen ──────────────────
 * All three are §7.24's, and deliberately not re-tuned. A thumb that has
 * learned to throw a statement card away should not have to learn a second
 * distance to throw a toast away.
 */
const SWIPE_SLOP_PX = 12;
const SWIPE_COMMIT_RATIO = 0.5;

/** What one swipe knows about itself while the finger is still down. */
interface ToastSwipe {
  x: number;
  y: number;
  /** `undecided` until the slop is cleared; `y` means the page won and we are
   *  out of this gesture for good. */
  axis: 'undecided' | 'x' | 'y';
  /** Measured once, at `pointerdown`. */
  width: number;
  /** Mirrored off state: `pointerup` can land in the same task as the last
   *  `pointermove`, and a dismissal must not be decided against a render that
   *  has not happened. §7.24 records the same trap. */
  travelled: number;
}

/** What the toast is reporting. `neutral` is this component as it shipped. */
export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';

/** §7.10's glyphs, so the two feedback components cannot disagree about what
 *  a warning looks like. `neutral` has no glyph and never had one. */
const GLYPH: Record<Exclude<ToastTone, 'neutral'>, LucideIcon> = {
  success: CircleCheck, warning: TriangleAlert, error: CircleX,
};

/** Icon-only status is a 1.4.1 failure, so each tone also carries a WORD, from
 *  the same catalogue keys §7.10 reads. */
const STATUS_WORD_KEY: Record<Exclude<ToastTone, 'neutral'>, MusyStatusKey> = {
  success: 'statusSuccess', warning: 'statusWarning', error: 'statusError',
};

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

  /**
   * ── THE SWIPE · the gesture ──────────────────────────────────────────────
   *
   * `offset` is where the toast is, in pixels, negative as it leaves; it is
   * the only thing the stylesheet reads. `swiping` is the finger being down,
   * and it is what turns the transition OFF, because a toast that eases
   * toward the finger lags behind it and a gesture that lags is one people
   * let go of. §7.24 states the same two reasons for the same two pieces of
   * state.
   */
  const [offset, setOffset] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);
  const gesture = React.useRef<ToastSwipe | null>(null);

  const swipeable = Boolean(onDismiss);

  /**
   * ONE AT A TIME, AND IT REPLACES — so a new label is a NEW toast wearing the
   * old one's element, and it must not inherit where the last one was pushed
   * to. Without this a toast dismissed by a swipe and immediately replaced
   * arrives already off-screen, which reads as it never having appeared.
   */
  React.useEffect(() => {
    gesture.current = null;
    setOffset(0);
    setSwiping(false);
  }, [label]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeable) return;
    /* A MOUSE IS NOT A THUMB: the cursor has the dismiss button, and a hidden
       horizontal drag would mostly surprise people mid-text-selection. */
    if (event.pointerType === 'mouse') return;
    /* The two controls speak for themselves. A thumb that came down on Undo
       meant Undo. */
    if ((event.target as Element).closest('.musy-btn, .musy-toast__dismiss')) return;

    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      axis: 'undecided',
      width: event.currentTarget.getBoundingClientRect().width,
      travelled: 0,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g === null || g.axis === 'y') return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (g.axis === 'undecided') {
      /* WHICHEVER CLEARS THE SLOP FIRST WINS, and a tie goes to the page —
         §7.24's rule, because a toast sits over content somebody may be
         scrolling and joining a scroll halfway through makes it jump. */
      if (Math.abs(dy) > SWIPE_SLOP_PX && Math.abs(dy) >= Math.abs(dx)) {
        g.axis = 'y';
        return;
      }
      if (Math.abs(dx) <= SWIPE_SLOP_PX) return;
      g.axis = 'x';
      setSwiping(true);
      /* Captured only once the axis is settled, so a tap that never moved
         still reaches whatever it landed on. */
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    /* LEFT ONLY, and never further than its own width. The slop is added back
       so it starts from under the finger rather than jumping the twelve pixels
       that were spent deciding. */
    const travelled = Math.min(0, Math.max(-g.width, dx + SWIPE_SLOP_PX));
    g.travelled = -travelled;
    setOffset(travelled);
  };

  const endSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (g === null || g.axis !== 'x') return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setSwiping(false);
    /* Past half its own width, it goes. Nothing is parked open: there is
       nothing behind a toast to reveal, so the only two outcomes are gone and
       back. The offset is NOT reset on the committing branch — `label` going
       null is what unmounts it, and resetting first would snap it back into
       view for the frame before that happens. */
    if (g.travelled >= g.width * SWIPE_COMMIT_RATIO) {
      onDismiss?.();
      return;
    }
    setOffset(0);
  };

  /** The browser taking the pointer back — a scroll winning, a call arriving.
   *  Nothing was decided, so nothing is committed. */
  const cancelSwipe = () => {
    gesture.current = null;
    setSwiping(false);
    setOffset(0);
  };

  /* AFTER the hooks, never before: an early return above them would change the
     hook order on the render where a toast appears. */
  if (!label) return null;

  const toned = tone !== 'neutral';
  const glyph = toned ? GLYPH[tone] : null;

  return (
    <div
      id={id}
      className={[
        'musy-toast',
        toned ? `musy-toast--${tone}` : '',
        placement === 'top' ? 'musy-toast--top' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      role={live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined}
      aria-live={live === 'off' ? undefined : live}
      /* The stylesheet reads these three and nothing else about the gesture. */
      data-swipeable={swipeable ? 'true' : undefined}
      data-swiping={swiping ? 'true' : undefined}
      /* `--musy-toast-swipe-progress` is 0…1 of the way to the commit point.
         The stylesheet fades with it: movement alone says "this is moving",
         and the fade is what says "this is leaving". Computed here because
         only the gesture knows the width it is measured against. */
      style={
        offset === 0
          ? undefined
          : ({
              '--musy-toast-swipe-x': `${offset}px`,
              '--musy-toast-swipe-progress': Math.min(
                1,
                (gesture.current === null || gesture.current.width === 0
                  ? 0
                  : -offset / (gesture.current.width * SWIPE_COMMIT_RATIO)),
              ),
            } as React.CSSProperties)
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endSwipe}
      onPointerCancel={cancelSwipe}
    >
      {/* Decorative: the status WORD beside it is what carries the tone to a
          screen reader, so the meaning never depends on an icon's alt text.
          §7.10 makes the same split with the same two elements. */}
      {glyph && (
        <span className="musy-toast__icon">
          <Icon glyph={glyph} size="md" />
        </span>
      )}

      <p className="musy-toast__text" data-type-step="body-sm">
        {toned && (
          <span className="musy-sr-only">{statusWord ?? t[STATUS_WORD_KEY[tone]]}: </span>
        )}
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
