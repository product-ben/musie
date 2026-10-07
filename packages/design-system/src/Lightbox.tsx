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
 *
 * ── TWO FRAMES, AND ONLY THE FRAME DIFFERS ─────────────────────────────────
 * `surface="panel"` is the default and is everything above: a box centred over
 * a scrim with the screen it came from visible around it.
 *
 * `surface="immersive"` fills the viewport instead, and it is a VARIANT rather
 * than a second component because everything hard about a modal is identical in
 * both — focus moved in and restored, the background made inert, the scroll
 * locked, Escape, the portal. What changes is the frame, which is the one thing
 * this component owns.
 *
 * It exists for the opposite job: not bringing one thing forward over a screen,
 * but REPLACING that screen for as long as it is open. The listen step's
 * full-screen listening view is the reference case — a track, a countdown and
 * nothing else, because the point of it is that nothing else is on screen.
 *
 * And it can be told WHERE IT CAME FROM. Given `origin` — the opening
 * control's rect, measured at the press — the sheet is clipped to that rect on
 * its first frame and the clip opens to the full viewport, so the button does
 * not summon a screen, it becomes one. See `origin` for why that is a clip and
 * not a transform.
 */
import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';

/**
 * Where an immersive surface GROWS FROM — the rect of the control that opened
 * it, in viewport coordinates, which is exactly what
 * `getBoundingClientRect()` returns.
 *
 * STRUCTURALLY A `DOMRect`, deliberately: a caller passes the measurement
 * straight through rather than unpacking it, and the four edges are the four
 * this needs. The width and height a DOMRect also carries are redundant here —
 * `clip-path: inset()` takes edges — and asking for them would let a caller
 * hand over a rect whose numbers disagree with each other.
 */
export interface LightboxOrigin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

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
  /**
   * THE FRAME, AND THERE ARE TWO OF THEM.
   *
   *   `panel` — the default, and everything this component was: a Content
   *     Box-sized popup centred over a scrim, with the screen it came from
   *     visible around it. For bringing ONE THING forward.
   *
   *   `immersive` — the whole viewport, edge to edge, no border and no radius.
   *     For a screen that REPLACES the one it came from for as long as it is
   *     open, which is a different job: the listen step's full-screen listening
   *     view is the reference case, where the point is that nothing else is on
   *     screen while a track plays.
   *
   * A VARIANT RATHER THAN A SECOND COMPONENT, because everything that is hard
   * about a modal is identical in both: focus moved in and restored, the
   * background made inert, the scroll locked, Escape, the portal. Only the
   * frame differs — which is the one thing this component owns.
   *
   * It is also why the app does not style a `panel` popup into a full-screen
   * one from outside: that is reaching into a component's own geometry, and the
   * fix for "the system cannot do what a screen needs" goes into the system
   * (docs/10-layout.md L14, and L7).
   */
  surface?: 'panel' | 'immersive';
  /**
   * THE RECT AN `immersive` SURFACE GROWS OUT OF — the control that opened it.
   *
   * Given, the sheet is clipped to that rect on the first frame and the clip
   * opens to the full viewport: the button does not summon a screen, it BECOMES
   * one. `clip-path` rather than a transform, and that is the whole reason this
   * is a clip: a transform from a 200x44 button to a 393x852 viewport scales
   * non-uniformly, so every word inside arrives stretched. A clip moves nothing
   * — the sheet is laid out at full size from the first frame and simply is not
   * all visible yet.
   *
   * OMITTED OR NULL, it opens from the centre of the viewport, which is the
   * honest shape for a sheet that no control opened — a route, or a press this
   * component was never told about. Ignored by `panel`, which has its own
   * motion.
   *
   * MEASURE IT AT THE PRESS, not on mount: the page may have scrolled, and a
   * rect is viewport-relative. A stale one opens the sheet out of a button that
   * is no longer there, which looks like a glitch rather than like a bug.
   */
  origin?: LightboxOrigin | null;
  className?: string;
}

export function Lightbox({
  trigger, title, titleHidden = false, description, children,
  open, onOpenChange, finalFocus, closeLabel, mandatory = false,
  surface = 'panel', origin = null, className,
}: LightboxProps) {
  const t = useMusyText();

  /**
   * THE FOUR EDGES, HANDED TO THE STYLESHEET AS CUSTOM PROPERTIES.
   *
   * Four numbers that are not known until a finger lands cannot live in a
   * stylesheet, and the shape they describe is a keyframe's — so the keyframe
   * reads them from here and does the arithmetic itself. `right` and `bottom`
   * go across as the rect's own edges rather than as insets from the far side,
   * because `inset()` resolves a percentage against the reference box and the
   * reference box IS the viewport: `calc(100% - 213px)` is the inset, written
   * where it belongs, and this component never has to read `window`.
   *
   * Rounded, because a sub-pixel start edge is a sub-pixel the compositor
   * resolves differently from the layout — and nobody can see a half pixel at
   * the first frame of a 340ms clip.
   *
   * `undefined` for a panel, so the default frame carries no stray variables.
   */
  const originVars = surface === 'immersive' && origin !== null
    ? ({
      '--musy-lightbox-origin-top': `${Math.round(origin.top)}px`,
      '--musy-lightbox-origin-right': `${Math.round(origin.right)}px`,
      '--musy-lightbox-origin-bottom': `${Math.round(origin.bottom)}px`,
      '--musy-lightbox-origin-left': `${Math.round(origin.left)}px`,
    } as React.CSSProperties)
    : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal={mandatory}>
      {/* Rendered ONLY when there is something to render it with. An always-on
          Dialog.Trigger wrapping nothing is a node in the DOM claiming to open
          a dialog it did not open. */}
      {trigger !== undefined && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal>
        <Dialog.Backdrop className="musy-lightbox__backdrop" data-surface={surface} />
        {/* `data-surface` on the positioner as well as on the popup, because
            the two frames want different things of it: a panel is inset and
            centred and scrolls the whole popup into view, and an immersive
            sheet is none of those. The attribute is on both rather than
            selected through a descendant, so neither rule depends on the
            other's element still being its parent. */}
        <div className="musy-lightbox__positioner" data-surface={surface}>
          <Dialog.Popup
            className={['musy-lightbox__popup', className ?? ''].filter(Boolean).join(' ')}
            data-surface={surface}
            style={originVars}
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
