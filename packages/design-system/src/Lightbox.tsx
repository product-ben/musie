/**
 * Lightbox — Layer 2
 * base-ui: Dialog (Root / Trigger / Portal / Backdrop / Popup / Title /
 * Description / Close).
 * APG pattern: Modal Dialog (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 *
 * base-ui owns everything that is easy to get wrong and invisible when it is:
 * focus is moved into the popup on open and restored on close, the background
 * is made inert, the page scroll is locked, Escape closes, and the popup is
 * portaled so no ancestor's overflow can clip it. None of that is
 * re-implemented here.
 *
 * What this component owns is the frame: scrim, position, motion, and a close
 * control. What it FRAMES is arbitrary — the reference case is a Content Box,
 * which is why the stylesheet drops the box's own border inside the popup
 * rather than this component drawing a second one.
 *
 * ── TWO WAYS IN, AND THEY OWE THE CALLER DIFFERENT THINGS ──────────────────
 * A lightbox is opened by a CONTROL or by NAVIGATION, and `trigger` is what
 * tells the two apart.
 *
 *   BY A CONTROL — pass `trigger`. It is rendered through `Dialog.Trigger`, so
 *   it keeps its own semantics and gets aria-haspopup / aria-expanded for
 *   free, base-ui owns the open state unless `open` is also passed, and on
 *   close FOCUS GOES BACK TO THAT CONTROL. The caller owes nothing else.
 *
 *   BY NAVIGATION — omit `trigger` and drive `open` yourself. THE URL IS THE
 *   TRIGGER: a route-driven lightbox has no opening element, and rendering a
 *   hidden dummy one to satisfy the type would put a stray node in the DOM and
 *   lie about what opened the dialog. In exchange the caller owes the RETURN:
 *   with no trigger there is nothing obvious to send focus back to, and focus
 *   landing on <body> is how a keyboard or screen-reader user loses their
 *   place in a list they were halfway down. See `finalFocus`.
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
import { useMusyText } from './locale';

export interface LightboxProps {
  /**
   * The control that opens it. Rendered through Dialog.Trigger, so the trigger
   * keeps its own semantics and gets aria-haspopup / aria-expanded for free —
   * pass a CtaButton or an IconButton, not a div.
   *
   * OPTIONAL, because a lightbox opened by navigation has no such element: the
   * route is what opened it. Omit it, drive `open`, and read `finalFocus`.
   */
  trigger?: React.ReactElement;
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
   * Where focus goes when the lightbox closes. base-ui's own prop, passed
   * straight through, so a ref, `false` (move nothing) or a function of the
   * closing interaction all behave exactly as base-ui documents them.
   *
   * WHEN IT IS NOT GIVEN, base-ui falls back to the element focus came from —
   * the `trigger` when there is one, otherwise whatever happened to be focused
   * as the lightbox mounted. That fallback is right for a trigger and only
   * LUCKY without one: a lightbox opened by a link in a list gets that link
   * back because the list is still mounted behind the scrim, but a lightbox
   * reached by a typed URL or a cold deep-link has nothing behind it and focus
   * lands on <body>. A trigger-less caller that cannot accept that names the
   * element itself here.
   */
  finalFocus?: React.ComponentProps<typeof Dialog.Popup>['finalFocus'];
  /**
   * Label for the close control. Defaults to the locale catalogue's word
   * (src/locale.ts), which is German unless the app mounts
   * <MusyLocaleProvider> with something else.
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
  open, onOpenChange, finalFocus, closeLabel, mandatory = false, className,
}: LightboxProps) {
  const t = useMusyText();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal={mandatory}>
      {/* Rendered ONLY when there is something to render it with. An always-on
          Dialog.Trigger wrapping nothing is a node in the DOM claiming to open
          a dialog it did not open. */}
      {trigger !== undefined && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal>
        <Dialog.Backdrop className="musy-lightbox__backdrop" />
        <div className="musy-lightbox__positioner">
          <Dialog.Popup
            className={['musy-lightbox__popup', className ?? ''].filter(Boolean).join(' ')}
            finalFocus={finalFocus}
          >
            <Dialog.Title
              className={titleHidden ? 'musy-sr-only' : 'musy-lightbox__headline'}
              data-type-step={titleHidden ? undefined : 'heading-md'}
            >
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="musy-sr-only">{description}</Dialog.Description>
            )}
            {/* THE SCROLLER IS IN HERE, NOT ON THE POPUP — and the close button
                is why. It was absolutely positioned inside a popup that was
                itself the scroll container, which pins it to the PADDING BOX
                rather than to the viewport of that box: scroll a long lightbox
                and the X travels up and out of sight, leaving Escape and the
                scrim as the only ways out. The stylesheet claimed the opposite
                ("scrolls internally rather than pushing its close button
                off-screen"), and that was true of the popup's height and not
                of the control.

                So the popup is now a flex column that never scrolls, this is
                the part that does, and the X stays in the corner it was
                always drawn in. The title stays outside it too, which is the
                same decision said twice: what names the dialog and what closes
                it are both always on screen. */}
            <div className="musy-lightbox__body">{children}</div>
            {!mandatory && (
              <Dialog.Close className="musy-lightbox__close" aria-label={closeLabel ?? t.close}>
                <Icon glyph={X} size="md" />
              </Dialog.Close>
            )}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
