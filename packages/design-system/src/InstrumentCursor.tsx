/**
 * InstrumentCursor — Layer 2
 * No base-ui primitive: a dot that stands in for the pointer.
 *
 * THE HARP'S GREEN DOT, for every instrument. Moved here from the harp
 * experiment (`apps/web/public/experiments/harp/261104-1443`, `.musie-cursor`
 * and `moveCursor`) on 2026-11-09, when Ben made it the mouse cursor of the
 * instruments' focus sheet and asked for it to be maintained centrally, like
 * the tap effect (`instrumentTap.ts`). Sized and coloured by
 * `--instrument-cursor-size` and `--instrument-cursor-color` (amendments G5):
 * two `--sp-5` across, `--interactive-primary`, centred on the pointer.
 *
 * ── WHEN IT SHOWS ────────────────────────────────────────────────────────
 * The experiment's rule, unchanged:
 *   · a MOUSE or a PEN over the target — the dot follows it, and the target
 *     hides the system pointer (`cursor: none`) for exactly as long;
 *   · past the target's edge while the target holds that pointer's capture —
 *     a string pulled beyond the canvas is still being played;
 *   · anything else under the pointer — a control laid over the instrument,
 *     the page around it — gets the normal pointer and no dot;
 *   · TOUCH never: a finger is its own cursor;
 *   · the pointer leaving the document hides it.
 * So the target is the element that is PLAYED ON — the canvas — and not a
 * container that also holds controls: over a child of the target the normal
 * pointer comes back, which is what the experiment did over its buttons.
 *
 * ── WHERE THE DOT LIVES ──────────────────────────────────────────────────
 * It renders nothing in place. The dot is a `position: fixed` element
 * appended to the document's body for as long as this is mounted, because a
 * fixed element inside a transformed ancestor is fixed to THAT ancestor, not
 * to the viewport, and inside a clipped one is clipped by it — and the sheet
 * an instrument is played in is a Lightbox, whose popup holds its entrance
 * animation: a transform on the default surface (`musy-lb-in`), a clip-path
 * on the immersive one (`musy-lb-grow`). On the body neither can reach it, so
 * it does not depend on how the sheet is drawn. It takes the target's nearest
 * `data-theme`, so it is green for the theme the instrument is drawn in. It
 * is created rather than portaled so the system does not import `react-dom`,
 * which it does not declare. It moves by `transform` on every pointer event,
 * with no React render in between.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ────────────────────────────────────────
 * No `prefers-reduced-motion` rule: it is a pointer, and it moves only when
 * the person moves. Under FORCED COLOURS it is not drawn and the system
 * pointer stays (musy-components.css): a system colour scheme replaces our
 * colours, and the system pointer is the one it already accounts for.
 * `aria-hidden`: it is the pointer's picture, not content.
 */
import * as React from 'react';

/** On the target while the dot stands in for the pointer. The stylesheet selects on exactly this. */
const HIDES_POINTER = 'data-musy-instrument-cursor';

export interface InstrumentCursorProps {
  /**
   * What the person plays on — the instrument's canvas. The element itself
   * (a callback ref held in state) or a ref object. A ref object is read
   * once, after mount: pass the element instead when it can be replaced
   * while the cursor stays mounted. Null draws nothing.
   */
  target: HTMLElement | null | React.RefObject<HTMLElement | null>;
}

export function InstrumentCursor({ target }: InstrumentCursorProps): null {
  React.useEffect(() => {
    const el = target !== null && 'current' in target ? target.current : target;
    const win = el?.ownerDocument.defaultView;
    if (el === null || win === null || win === undefined) return undefined;
    const doc = el.ownerDocument;

    const dot = doc.createElement('div');
    dot.className = 'musy-instrument-cursor';
    dot.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(dot);

    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      if (on) {
        const theme = el.closest('[data-theme]')?.getAttribute('data-theme');
        if (theme) dot.setAttribute('data-theme', theme);
        else dot.removeAttribute('data-theme');
        dot.setAttribute('data-shown', '');
        el.setAttribute(HIDES_POINTER, '');
      } else {
        dot.removeAttribute('data-shown');
        el.removeAttribute(HIDES_POINTER);
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        show(false);
        return;
      }
      const on = e.target === el || el.hasPointerCapture(e.pointerId);
      if (on) dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      show(on);
    };
    const leave = () => show(false);

    win.addEventListener('pointermove', move, { passive: true });
    win.addEventListener('pointerdown', move, { passive: true });
    doc.documentElement.addEventListener('pointerleave', leave);
    return () => {
      win.removeEventListener('pointermove', move);
      win.removeEventListener('pointerdown', move);
      doc.documentElement.removeEventListener('pointerleave', leave);
      el.removeAttribute(HIDES_POINTER);
      dot.remove();
    };
  }, [target]);

  return null;
}
