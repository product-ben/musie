/**
 * Dialogue (non modal) — Layer 2
 * base-ui: Dialog (Root `modal={false}` / Trigger / Portal / Popup / Title /
 * Description / Close).
 * APG pattern: none of its own. It takes the Modal Dialog pattern's role,
 * naming and focus handoff (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
 * and leaves out exactly what makes that pattern modal: the containment.
 *
 * A panel that comes forward WITHOUT taking the screen away. The page behind
 * stays exactly as usable as it was: nothing is made inert, the scroll is not
 * locked, there is no scrim, and Tab is not trapped — it walks out of the panel
 * and on to whatever follows the control that opened it. What a dialogue still
 * owes a keyboard and a screen reader, base-ui does here as it does for
 * Lightbox: focus moves INTO the panel on open and back to the trigger on
 * close, Escape closes, and the panel is named by its title (role="dialog").
 *
 * ── WHY NOT LIGHTBOX WITH A FLAG ──────────────────────────────────────────
 * Lightbox's whole contract is the modal one — scrim, inert background, scroll
 * lock — and every line of its frame is written for a box centred over a page
 * you cannot touch. This is the opposite promise: you keep playing, reading or
 * scrolling while it is open. The instruments are the first use (Ben,
 * 2026-11-09): the settings come up over the instrument and the instrument
 * still sounds when you touch it, so a change can be HEARD while the panel
 * that made it is still open.
 *
 * ── IT STAYS OPEN UNTIL IT IS CLOSED ──────────────────────────────────────
 * A press outside does NOT dismiss it, and neither does focus leaving it.
 * base-ui's default for a non-modal dialog is to close on both, which is right
 * for a menu and wrong here: the page behind is the reason the panel is
 * non-modal, and a panel that vanished the moment you touched the page would
 * be a modal one with worse manners. So `disablePointerDismissal` is set, and
 * the ways out are the three a person can find on purpose — the close control,
 * Escape, and the trigger again.
 *
 * ── WHERE IT FLOATS ──────────────────────────────────────────────────────
 * A raised panel above the bottom edge, at the start or the end corner
 * (`placement`). The band one `--target-primary` tall above the sheet inset is
 * left free, because that is where the control that opened it stands — the
 * instruments' settings icon at the bottom left — and the panel sits above it
 * rather than over it, so the trigger stays visible and keeps saying
 * `aria-expanded="true"`.
 *
 * PORTALED, like Lightbox, so no ancestor's overflow can clip it. Inside an
 * open Lightbox it is base-ui's NESTED dialog: its portal lands in the
 * parent's, it counts as inside the parent for the parent's focus and
 * outside-press logic, and Escape closes this one first.
 */
import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';

/**
 * Which bottom corner the panel floats in. `bottom-start` is the instruments'
 * case — above a settings icon at the bottom left. Logical, so both mirror in
 * a right-to-left document.
 */
/**
 * Where the panel stands. `bottom-*` above a trigger at the sheet's bottom
 * edge; `top-end` under a trigger at the top trailing edge — the instruments'
 * settings icon beside the sheet's X (Ben, 2026-11-09).
 */
export type DialogueNonModalPlacement = 'bottom-start' | 'bottom-end' | 'top-end';

export interface DialogueNonModalProps {
  /** Controlled open state. Omit for an uncontrolled dialogue the trigger opens. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The control that opens it. Rendered through Dialog.Trigger, so it keeps
   * its own semantics, gets aria-haspopup / aria-expanded for free, and is
   * where focus goes back to on close — pass an IconButton or a CtaButton,
   * not a div.
   *
   * OPTIONAL, exactly as on Lightbox: a dialogue opened by something that is
   * not one element has no trigger to render. Omit it and drive `open`.
   */
  trigger?: React.ReactElement;
  /**
   * Accessible name. REQUIRED: a dialog with no name announces as "dialog"
   * and says nothing about what came up (4.1.2). When the content already
   * shows the name, pass the same string and set `titleHidden`.
   */
  title: string;
  /** Hide the title visually. It stays in the accessible name. */
  titleHidden?: boolean;
  /**
   * One short sentence under the title, announced with it. VISIBLE here,
   * unlike Lightbox's — a panel that stays open beside the page is read at
   * leisure, and a description only a screen reader gets is one a sighted
   * person never learns exists. Hidden with the title when `titleHidden`: a
   * subtitle with no heading above it reads as stray body text.
   */
  description?: string;
  /**
   * Label for the close control. Defaults to the locale catalogue's word
   * (src/locale.ts), which is German unless the app mounts
   * <MusyLocaleProvider> with something else.
   */
  closeLabel?: string;
  /** The panel's content — the instruments' Switch and SegmentedControl. */
  children: React.ReactNode;
  /** Which bottom corner it floats in. `bottom-start` by default. */
  placement?: DialogueNonModalPlacement;
  className?: string;
}

export function DialogueNonModal({
  open, onOpenChange, trigger, title, titleHidden = false, description,
  closeLabel, children, placement = 'bottom-start', className,
}: DialogueNonModalProps) {
  const t = useMusyText();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      /* THE TWO SETTINGS THAT MAKE IT NON-MODAL, and they are base-ui's:
         `modal={false}` — no inert background, no scroll lock, no internal
         backdrop, no focus trap; and `disablePointerDismissal`, which for a
         non-modal dialog ALSO stops focus leaving it from closing it. See
         "IT STAYS OPEN UNTIL IT IS CLOSED" above. */
      modal={false}
      disablePointerDismissal
    >
      {/* Rendered only when there is a trigger — the same rule as Lightbox's:
          an always-on Trigger wrapping nothing is a node claiming to open a
          dialog it did not open. */}
      {trigger !== undefined && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal>
        <Dialog.Popup
          className={['musy-dialogue', className ?? ''].filter(Boolean).join(' ')}
          data-placement={placement}
          data-title-hidden={titleHidden ? '' : undefined}
        >
          <Dialog.Title
            className={titleHidden ? 'musy-sr-only' : 'musy-dialogue__title'}
          >
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description
              className={titleHidden ? 'musy-sr-only' : 'musy-dialogue__description'}
            >
              {description}
            </Dialog.Description>
          )}
          {/* The part that scrolls, if anything does. The title and the close
              control stay outside it, so what names the panel and what closes
              it are always on screen — the decision Lightbox made. */}
          <div className="musy-dialogue__body">{children}</div>
          {/* LAST IN THE DOM, DRAWN IN THE TOP CORNER — Lightbox's order, and
              for the reason that matters most here: base-ui moves focus to the
              FIRST tabbable element on open. With the X first, opening the
              settings landed a keyboard user on "close settings"; with it last
              they land on the first setting, which is what they opened the
              panel for, and the X is the last stop before Tab leaves the
              panel (Escape closes it from anywhere in it). Measured
              2026-11-09: the X-first order put the initial focus ring on the
              close control. */}
          <Dialog.Close className="musy-dialogue__close" aria-label={closeLabel ?? t.close}>
            <Icon glyph={X} size="md" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
