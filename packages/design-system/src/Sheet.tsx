/**
 * Sheet — Layer 2
 *
 * A full-screen surface you page through one screen at a time, downwards.
 *
 * ── WHY THIS IS A COMPONENT AND NOT A PATTERN IN A SCREEN ─────────────────
 * L14.3: a pattern that recurs is a component request. The listen step's
 * `/listen?focus` view has been an app-level arrangement inside
 * `Lightbox surface="immersive"` since 2026-10-07 — `.musie-immersive` in
 * `apps/web/src/shell.css`, written as a permitted L14 pattern with a note
 * saying that a second screen wanting the column is a component request. The
 * digital-cards walk is that second screen (`DIGITAL-CARDS.md` §10.1).
 *
 * But recurrence is the weaker half of the argument. The stronger half is that
 * **the paging cannot live in a screen at all**:
 *
 *   THE SCROLL CONTAINER IS `.musy-lightbox__body`, which belongs to Lightbox.
 *     A screen setting `scroll-snap-type` on it would be reaching into another
 *     component's geometry (rule 1, 10-layout.md L7).
 *   `useScrollSnap` CANNOT HELP. It owns the mode on `<html>`, for sections in
 *     normal document flow where the document IS the scroller. Inside a modal
 *     surface the document is not the scroller and must not be told it is.
 *   THE FOOT IS MEASURED AGAINST THE SHEET, not against the page. Lightbox
 *     sizes its popup against a `position: fixed` positioner so it follows the
 *     SMALL viewport on iOS — the browser's bottom bar is already accounted
 *     for. A screen anchoring its own foot would re-derive that number and get
 *     it wrong on exactly one device.
 *
 * So this file owns a scroller of its own, nested inside the one Lightbox
 * gives it: `.musy-sheet` fills the body, the body never overflows, and the
 * inner `<ol>` is what scrolls. Two scrollers sound like one too many and are
 * not — the outer one exists for content taller than the viewport, which is
 * the case this component deliberately does not have.
 *
 * ── THE FRAME IS STILL LIGHTBOX'S, AND ALL OF IT ──────────────────────────
 * Scrim, edge-to-edge surface, the clip that grows out of the opening control,
 * focus moved in and restored, inertness, scroll lock, Escape, the portal.
 * This composes `surface="immersive"` rather than reimplementing any of it,
 * and `origin` is passed straight through so the sheet still grows out of the
 * button that opened it.
 *
 * ── ONE GESTURE IS ONE PAGE ───────────────────────────────────────────────
 * `scroll-snap-stop: always`, which is Ben's decision of 2026-09-22 for both
 * carousels after a flick sailed through the one view whose job was to
 * interrupt. The same reasoning is sharper here: a page you are asked to
 * breathe with is not a page a thumb should be able to skim past.
 *
 * ── THE CONSUMER OWNS THE INDEX; THIS OWNS THE SCROLLER ───────────────────
 * The split §7.8 Carousel and §7.21 Music Player already make. A sheet holding
 * its own index could not express "the CTA appears once the last page has been
 * reached", which is a fact about the session rather than about the sheet.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────
 * No horizontal mode. `Carousel` is the sideways one and its entire design —
 * the 27px peek, the nudge, the grab cursor, the 0.9 scale — exists to say
 * *there are more of these, sideways*. A full-bleed picture moving vertically
 * shares its `Dots` and one declaration, and nothing else.
 */
import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Dots } from './Dots';
import { IconButton } from './IconButton';
import { Lightbox } from './Lightbox';
import type { LightboxOrigin } from './Lightbox';

export interface SheetPage {
  /** Stable identity. The React key. */
  id: string;
  /** The page's whole screen. Laid out at the sheet's full height. */
  content: React.ReactNode;
}

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Accessible name, announced and never drawn — `titleHidden` is always
   * passed to Lightbox. A full-screen picture with a caption over it is the
   * product labelling its own furniture; what the sheet is about is the first
   * page's own copy.
   */
  title: string;
  /** Rule 7: passed, never inherited. Lightbox's default is German. */
  closeLabel: string;
  /** The rect this grew out of. Straight through to Lightbox. */
  origin?: LightboxOrigin | null;
  /** One entry per screen, in reading order. */
  pages: readonly SheetPage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Rule 7, and 4.1.2: a row of unnamed dots is a row of nothing. */
  dotLabel: (position: number, total: number) => string;
  nextLabel: string;
  previousLabel: string;
  /**
   * The foot — whatever this sheet offers besides moving between pages, at the
   * block end, inline start of the paging controls.
   *
   * COMPUTED BY THE CONSUMER FROM THE INDEX, which is the same split as the
   * index itself: "a wide button on the first page, nothing in the middle, and
   * a way on at the end" is a decision about this flow, not about sheets.
   */
  foot?: React.ReactNode;
  className?: string;
}

/**
 * Which page the scroller has settled on — the nearest whole page to where it
 * stopped.
 *
 * Rounded rather than floored: a snap can land a fraction of a pixel short of
 * its target (sub-pixel layout, a scrollbar appearing), and flooring that
 * reports the page above the one filling the screen.
 */
function nearestPage(scroller: HTMLElement): number {
  const page = scroller.clientHeight;
  if (page === 0) return 0;
  return Math.round(scroller.scrollTop / page);
}

export function Sheet({
  open, onOpenChange, title, closeLabel, origin = null,
  pages, index, onIndexChange, dotLabel, nextLabel, previousLabel,
  foot, className,
}: SheetProps) {
  const scrollerRef = React.useRef<HTMLOListElement>(null);
  const total = pages.length;

  /**
   * MOVE THE SCROLLER WHEN THE INDEX MOVES FROM OUTSIDE — and only then.
   *
   * The guard is not a tidy-up. Without it the pair oscillates: a scroll
   * reports an index, the index prop comes back, the effect scrolls to it, the
   * scroll reports again. Comparing against where the scroller actually IS
   * makes the effect a no-op for the one case that caused the loop.
   */
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    if (nearestPage(scroller) === index) return;
    /* `behavior: 'auto'`, and that is the stylesheet's decision rather than a
       preference: section 8 of `musy-components.css` records that a smooth
       scroll is silently dropped under reduced motion, which would leave the
       dots and the viewport disagreeing about which page is current. */
    scroller.scrollTo({ top: index * scroller.clientHeight, behavior: 'auto' });
  }, [index, open]);

  /**
   * THE SCROLL SETTLE. `scrollend` where it exists — Chrome, Firefox and
   * Safari 18 — and a timeout where it does not, because iOS below 18 is in
   * this product's actual audience and a sheet that never reports its page is
   * a sheet whose dots lie.
   */
  const settle = React.useRef<number | undefined>(undefined);
  const report = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    const landed = nearestPage(scroller);
    if (landed !== index && landed >= 0 && landed < total) onIndexChange(landed);
  }, [index, onIndexChange, total]);

  const onScroll = React.useCallback(() => {
    /* `typeof` rather than `'onscrollend' in window`: the `in` form narrows
       `window` itself, which leaves the other branch typed `never` and the
       timeout unreachable. The property is `null` where the event exists and
       absent where it does not, so `typeof` separates the two. */
    const native = typeof (window as { onscrollend?: unknown }).onscrollend !== 'undefined';
    if (native) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(report, 120);
  }, [report]);

  React.useEffect(() => () => window.clearTimeout(settle.current), []);

  const move = (to: number) => {
    if (to < 0 || to >= total) return;
    onIndexChange(to);
  };

  /**
   * KEYS, BECAUSE A SNAPPING SCROLLER IS NOT KEYBOARD-OPERABLE ON ITS OWN.
   * A focused scroll container answers the arrow keys natively, but a native
   * arrow press scrolls by a line and then snaps back to where it started, so
   * the page never changes. Handled here, one page per press, which is also
   * what the two chevrons do.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLOListElement>) => {
    const keys: Record<string, number | undefined> = {
      ArrowDown: index + 1, PageDown: index + 1,
      ArrowUp: index - 1, PageUp: index - 1,
      Home: 0, End: total - 1,
    };
    const to = keys[event.key];
    if (to === undefined) return;
    event.preventDefault();
    move(to);
  };

  /**
   * THE PAGING CONTROLS APPEAR ONCE THE FIRST PAGE IS BEHIND YOU.
   *
   * On the first page the sheet offers one thing — going in — and the foot
   * says it in words. Two chevrons beside that wide button would be a second
   * way to do the same thing and a first way to do something there is no
   * reason to do yet.
   *
   * **`previous` is ENABLED on the second page** — Ben, 2026-10-13, asked and
   * answered. It was specified as disabled, and the brief and the gesture
   * disagreed: a thumb can always scroll back to the first page, so a disabled
   * button was the half that was wrong. The first page is also the one screen
   * in the sheet somebody may need twice, because it carries the instruction.
   */
  const paging = total > 1 && index > 0;

  return (
    <Lightbox
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      titleHidden
      closeLabel={closeLabel}
      surface="immersive"
      origin={origin}
    >
      {/* ONE ELEMENT, because the immersive surface gives its only child the
          full height to arrange and leaves the arranging to the caller. */}
      <div className={['musy-sheet', className ?? ''].filter(Boolean).join(' ')}>
        <ol
          ref={scrollerRef}
          className="musy-sheet__pages"
          /* Focusable, so the keys above have somewhere to land. A scroll
             container is focusable in Firefox by default and is not elsewhere;
             declaring it makes the behaviour the same everywhere. */
          tabIndex={0}
          onScroll={onScroll}
          onScrollEnd={report}
          onKeyDown={onKeyDown}
        >
          {pages.map((page, i) => (
            <li
              key={page.id}
              className="musy-sheet__page"
              /* Which of how many, for a reader who cannot see the dots. */
              aria-label={dotLabel(i + 1, total)}
            >
              {page.content}
            </li>
          ))}
        </ol>

        {total > 1 && (
          <Dots
            className="musy-sheet__dots"
            total={total}
            index={index}
            label={dotLabel}
            onSelect={move}
          />
        )}

        {(foot !== undefined || paging) && (
          <div className="musy-sheet__foot">
            {/* The consumer's own actions first in the DOM, so tab order runs
                from what this sheet is for to how you move inside it (L6). */}
            {foot}
            {paging && (
              <div className="musy-sheet__paging">
                <IconButton
                  variant="secondary"
                  glyph={ChevronUp}
                  label={previousLabel}
                  onClick={() => move(index - 1)}
                />
                <IconButton
                  variant="secondary"
                  glyph={ChevronDown}
                  label={nextLabel}
                  disabled={index === total - 1}
                  onClick={() => move(index + 1)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Lightbox>
  );
}
