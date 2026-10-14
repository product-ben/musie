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
import type { DotsTone } from './Dots';
import { IconButton } from './IconButton';
import { Lightbox } from './Lightbox';
import type { LightboxOrigin } from './Lightbox';

export interface SheetPage {
  /** Stable identity. The React key. */
  id: string;
  /** The page's whole screen. Laid out at the sheet's full height. */
  content: React.ReactNode;
  /**
   * THIS PAGE IS A PICTURE, EDGE TO EDGE — so the position row drawn over it
   * switches to its white tone (`Dots`, `tone="onMedia"`).
   *
   * Per PAGE and not per sheet, because a walk can be both: the card sheet
   * opens on copy over a surface and then shows five full-bleed cards, and a
   * green row over artwork is exactly what that variant exists to stop.
   */
  media?: boolean;
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
  /**
   * ── THE HEADER, AND IT IS THE REASON THIS SLOT EXISTS ───────────────────
   *
   * Pinned to the top of the sheet, in the same place in every variant —
   * paged or single, with a foot or without, over a picture or over copy.
   *
   * Ben, 2026-10-14: *"the header section should always be top aligned and the
   * next button on the bottom right of the screen. The position of these
   * elements must not change in the different modes."* That is a promise one
   * component can keep and two cannot, which is why the listen step's own
   * sheet stopped being an app-level column on the same day.
   */
  header?: React.ReactNode;
  /**
   * PAGED MODE. One entry per screen, in reading order. Omit it and the sheet
   * draws `children` as a single body instead — no dots, no chevrons, and the
   * header and the foot exactly where they are here.
   */
  pages?: readonly SheetPage[];
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Rule 7, and 4.1.2: a row of unnamed dots is a row of nothing. Required
   *  in paged mode; unused without pages. */
  dotLabel?: (position: number, total: number) => string;
  nextLabel?: string;
  previousLabel?: string;
  /** The single body, for a sheet with no pages. Ignored when `pages` is given. */
  children?: React.ReactNode;
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
  header, pages, index = 0, onIndexChange, dotLabel, nextLabel, previousLabel,
  children, foot, className,
}: SheetProps) {
  const scrollerRef = React.useRef<HTMLOListElement>(null);
  const paged = pages !== undefined && pages.length > 0;
  const total = pages?.length ?? 0;

  /**
   * ── MOVING BETWEEN PAGES IS ANIMATED — Ben, 2026-10-14 ──────────────────
   * The chevrons and the dots scroll the sheet rather than cutting to the next
   * page, which is what makes the two states read as one surface moving.
   *
   * REDUCED MOTION IS ASKED, NOT ASSUMED, and this is the one place in the
   * package that has to ask in JavaScript: `scroll-behavior` is a CSS property
   * and would be the tidy answer, but a `scrollTo` with an explicit `behavior`
   * overrides it — so the media query has to be read where the call is made.
   * Layer 1 cannot help; `--motion-*` is a duration, and this is a mode.
   *
   * `matchMedia` is read at the moment of the scroll rather than cached, so a
   * preference changed mid-session takes effect on the next press.
   */
  const scrollBehavior = (): ScrollBehavior => (
    typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
  );

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
    /* THE DOTS CANNOT DISAGREE WITH THE VIEWPORT WHILE THIS RUNS, which is the
       objection to animating a snap scroller: the consumer already holds the
       new index, the row is drawn from it, and the scroll is what catches up.
       The settle handler's own guard then finds them equal and does nothing. */
    scroller.scrollTo({ top: index * scroller.clientHeight, behavior: scrollBehavior() });
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
    if (landed !== index && landed >= 0 && landed < total) onIndexChange?.(landed);
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
    onIndexChange?.(to);
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
  const paging = paged && total > 1 && index > 0;

  /**
   * ── THE FORWARD CHEVRON IS PRIMARY UNTIL THE SHEET'S OWN CTA LIGHTS UP ──
   * §7.8 Carousel's rule, applied unchanged and for its own reason: while
   * going on is the only thing to do, the forward control is the loudest thing
   * on the screen and says so; the moment the screen offers a way OUT, the
   * chevrons step out of its way. Ben, 2026-10-14, after the card sheet made
   * the quiet version look like chrome.
   *
   * `previousVariant` IS DERIVED, NEVER PASSED — one rung below whatever the
   * forward control is, so back can never be louder than forward. The same
   * line Carousel draws.
   */
  const stepsAside = foot !== undefined && foot !== null && foot !== false;
  const nextVariant = stepsAside ? 'secondary' : 'primary';
  const previousVariant = stepsAside ? 'ghost' : 'secondary';

  /* The row's tone follows the page under it, so a walk that starts on copy
     and continues over artwork changes tone as it moves. */
  const tone: DotsTone = pages?.[index]?.media === true ? 'onMedia' : 'default';

  return (
    <Lightbox
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      titleHidden
      closeLabel={closeLabel}
      surface="immersive"
      origin={origin}
      /* THE CLASS LANDS ON THE POPUP, which is the only way to reach the
         CLOSE CONTROL: it is Lightbox's, positioned against the popup, and
         therefore outside this sheet's own element. On a dark field its
         `--on-surface` ink is all but invisible — Ben, 2026-10-14 — so the
         tone has to travel one level further out than `data-media` does. */
      className={tone === 'onMedia' ? 'musy-sheet-host musy-sheet-host--media' : 'musy-sheet-host'}
    >
      {/* ONE ELEMENT, because the immersive surface gives its only child the
          full height to arrange and leaves the arranging to the caller. */}
      <div
        className={['musy-sheet', className ?? ''].filter(Boolean).join(' ')}
        /* The whole sheet knows whether the page under the chrome is a
           picture: the field below is painted from it, the dots take their
           white tone from it, and the paging controls re-tint for it. One
           attribute so the three cannot disagree. */
        data-media={tone === 'onMedia' ? 'true' : undefined}
      >
        {/* ── THE FIELD — the sheet's own surface, out to the edges ─────────
            A picture that is not cropped always leaves bars, and the bars have
            to be part of the same surface or the sheet reads as a photograph
            pasted onto a page. This is that surface.

            IT REACHES PAST ITS OWN BOX ON PURPOSE. Lightbox insets this
            sheet by `--space-inset-sheet` on both axes — the popup's
            `padding-inline` and the immersive body's `padding-block` are the
            same token — so a background painted here would stop short of the
            viewport by exactly that. The negative inset undoes it, and nothing
            clips it: measured 2026-10-14, the body's PADDING box is the full
            viewport and no ancestor carries a transform, a filter or
            containment.

            `aria-hidden` and no content: it is paint. */}
        <div className="musy-sheet__field" aria-hidden="true" />
        {header !== undefined && <div className="musy-sheet__header">{header}</div>}

        {!paged ? (
          /* SINGLE BODY. The same box the pages would have filled, so the
             header above it and the foot below it do not move when a sheet
             stops being a walk and becomes one screen. */
          <div className="musy-sheet__body">{children}</div>
        ) : (
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
          {(pages ?? []).map((page, i) => (
            <li
              key={page.id}
              className="musy-sheet__page"
              /* Which of how many, for a reader who cannot see the dots. */
              aria-label={dotLabel?.(i + 1, total)}
            >
              {page.content}
            </li>
          ))}
        </ol>
        )}

        {paged && total > 1 && dotLabel !== undefined && (
          <Dots
            className="musy-sheet__dots"
            total={total}
            index={index}
            label={dotLabel}
            onSelect={move}
            tone={tone}
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
                  variant={previousVariant}
                  glyph={ChevronUp}
                  label={previousLabel ?? ''}
                  onClick={() => move(index - 1)}
                />
                <IconButton
                  variant={nextVariant}
                  glyph={ChevronDown}
                  label={nextLabel ?? ''}
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
