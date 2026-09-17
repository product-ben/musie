/**
 * Lightbox — Layer 2
 * base-ui: Dialog (Root / Trigger / Portal / Backdrop / Popup / Title /
 * Description / Close).
 * APG pattern: Modal Dialog (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 *
 * base-ui owns everything that is easy to get wrong and invisible when it is:
 * focus is moved into the popup on open and RESTORED to the trigger on close,
 * the background is made inert, the page scroll is locked, Escape closes, and
 * the popup is portaled so no ancestor's overflow can clip it. None of that is
 * re-implemented here.
 *
 * What this component owns is the frame: scrim, position, motion, and a close
 * control. What it FRAMES is arbitrary — the reference case is a Content Box,
 * which is why the stylesheet drops the box's own border inside the popup
 * rather than this component drawing a second one.
 *
 * Named Lightbox, not Dialog or Modal, because the app's mental model is
 * "bring one thing forward". A confirm-or-cancel decision is a different
 * component with a mandatory action row; this one may be dismissable and
 * nothing else.
 */
import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Icon } from './Icon';

export interface LightboxProps {
  /**
   * The control that opens it. Rendered through Dialog.Trigger, so the trigger
   * keeps its own semantics and gets aria-haspopup / aria-expanded for free —
   * pass a CtaButton or an IconButton, not a div.
   */
  trigger: React.ReactElement;
  /**
   * Accessible name. REQUIRED: a modal with no name announces as "dialog" and
   * leaves a screen-reader user with no idea what came forward (4.1.2). When
   * the framed content already renders the title visually, pass the same string
   * and set `titleHidden` so it is not shown twice.
   */
  title: string;
  titleHidden?: boolean;
  /** Optional short description, announced with the title. */
  description?: string;
  /** The framed content. A ContentBox is the reference case. */
  children: React.ReactNode;
  /** Controlled open state. Omit for an uncontrolled lightbox. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Label for the close control. Defaults to German, like the rest of the set's
   * user-facing strings.
   */
  closeLabel?: string;
  /**
   * Remove the close button and the click-outside dismissal. Use ONLY when the
   * lightbox is blocking on a decision the framed content itself resolves —
   * otherwise you have built a trap (2.1.2).
   */
  mandatory?: boolean;
  className?: string;
}

export function Lightbox({
  trigger, title, titleHidden = false, description, children,
  open, onOpenChange, closeLabel = 'Schließen', mandatory = false, className,
}: LightboxProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal={mandatory}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="musy-lightbox__backdrop" />
        <div className="musy-lightbox__positioner">
          <Dialog.Popup className={['musy-lightbox__popup', className ?? ''].filter(Boolean).join(' ')}>
            <Dialog.Title
              className={titleHidden ? 'musy-sr-only' : 'musy-lightbox__headline'}
              data-type-step={titleHidden ? undefined : 'heading-md'}
            >
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="musy-sr-only">{description}</Dialog.Description>
            )}
            {children}
            {!mandatory && (
              <Dialog.Close className="musy-lightbox__close" aria-label={closeLabel}>
                <Icon glyph={X} size="md" />
              </Dialog.Close>
            )}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
