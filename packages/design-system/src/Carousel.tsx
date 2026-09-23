/**
 * Carousel — Layer 2 · §7.8
 * One step of a sequence at a time, neighbours peeking, so a five-step
 * explainer costs one screen instead of a scroll.
 *
 * REPLACES §7.8 Process Visualisation, which is retired (B.1, answered
 * 2026-09-19). The ~200 lines of `.musy-carousel` CSS have been in
 * `musy-components.css` since the first pass with no component behind them;
 * this is that component, and NOT ONE LINE OF CSS WAS WRITTEN FOR IT. Every
 * class, every data attribute and every geometry decision below is what
 * section 8 of the stylesheet already describes.
 *
 * APG: Carousel (basic — no auto-rotation, so no rotation control is owed).
 * Semantic HTML: `<ol>`, because the order is the content; the scroll container
 * IS the `<ol>` and each `<li>` is a slide labelled "n of m".
 *
 * ── THE APP OWNS THE INDEX; THIS OWNS THE SCROLLER ─────────────────────────
 * Fully controlled, the same split §7.21 Music Player and §7.22 Record Button
 * make: the consumer holds `index` and is told when it should change, and the
 * component owns the DOM the index is drawn on. That split has a practical
 * edge here — D.1's CTA unlocks on the furthest slide ever SEEN, which is a
 * fact about the session rather than about the carousel, and a component
 * holding its own index could not express it.
 *
 * Scrolling is native — `scroll-snap` plus `overflow`, so touch drag and
 * trackpad swipe work with no script. Two things are scripted, and only two:
 * which slide is nearest the centre after a scroll settles (reported through
 * `onIndexChange`), and a `scrollTo` when `index` changes from outside.
 *
 * ── ONE SWIPE IS ONE SLIDE, AND THAT IS A THIRD CSS DECLARATION ────────────
 * `scroll-snap-type: x mandatory` promises only that a scroll LANDS on a snap
 * point, never which one, so a flick's momentum used to carry three or four
 * slides. `scroll-snap-stop: always` on each slide forbids a gesture passing a
 * snap point at all. Still no script: the settle handler below sees one step
 * where it used to see a jump, and `seenMax` in a consuming screen finally
 * means what it says.
 *
 * ── NO SMOOTH SCROLL, AND THAT IS THE STYLESHEET'S DECISION ────────────────
 * Section 8 says it: a smooth scroll animation is silently dropped wherever
 * reduced motion is in force, which would leave the dots and the viewport
 * disagreeing about which slide is current. Programmatic changes land
 * instantly and the card's scale carries the transition.
 *
 * ── THE PEEKING CARD IS A POINTER SHORTCUT, NOT A TAB STOP ─────────────────
 * Tapping a neighbouring card moves to it, because that is the gesture people
 * try first — but the card is a `<div>`, not a `<button>`. The dots are the
 * accessible, focusable control for the same action, and a second set of tab
 * stops announcing the same five destinations is noise. The stylesheet only
 * gives the off-centre cards a pointer cursor for the same reason.
 */
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useMusyText } from './locale';

export interface CarouselSlide {
  /** Stable identity. The React key. */
  id: string;
  /** The slide's one line. Rendered as a real heading. */
  title: string;
  /** The glyph inside the badge. Decorative — the title carries the meaning. */
  glyph: LucideIcon;
}

export interface CarouselProps {
  /**
   * Names the whole carousel. Required (4.1.2): the region carries
   * `aria-roledescription="carousel"`, and a carousel with no name announces
   * as "carousel" and nothing else.
   */
  label: string;
  slides: CarouselSlide[];
  /** The centred slide, by position. Controlled — see the file header. */
  index: number;
  /**
   * Fires with the position the carousel has settled on, or been sent to.
   *
   * Optional, like every other callback in this package — and, like them, a
   * carousel without it is inert: `index` never moves, so the layout effect
   * pulls a native swipe straight back to where the consumer still says it is.
   * That is what "fully controlled" costs, and it is the same bargain
   * RadioCards and InteractiveWizard already make.
   */
  onIndexChange?: (index: number) => void;
  /**
   * Heading level for each slide's title. Never guessed (1.3.1) — the correct
   * level depends on what sits above the carousel, which it cannot know. The
   * same rule ContentBox and Timeline apply.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * The trailing control's variant. `primary` by default, and a screen hands
   * it down to `secondary` once its own CTA has unlocked: two filled primaries
   * on one screen compete, and the prototype does exactly this at the last
   * slide.
   */
  nextVariant?: 'primary' | 'secondary';
  accent?: 'primary' | 'accent' | 'accent-alt';
  /** Copy. Each defaults to the locale catalogue (src/locale.ts). */
  previousLabel?: string;
  nextLabel?: string;
  /** ("3", "5", "…") → the slide's own accessible name. */
  slideLabel?: (position: number, total: number, title: string) => string;
  /** The word riding inside the active dot. Defaults to "Step 3" / "Schritt 3". */
  dotLabel?: (position: number) => string;
  /** The dot button's accessible name. */
  dotAriaLabel?: (position: number, total: number) => string;
  className?: string;
}

/** How long after the last scroll event the position is taken as settled. */
const SETTLE_MS = 90;

export function Carousel({
  label, slides, index, onIndexChange,
  headingLevel = 3, nextVariant = 'primary', accent = 'primary',
  previousLabel, nextLabel, slideLabel, dotLabel, dotAriaLabel,
  className,
}: CarouselProps) {
  const t = useMusyText();
  const H = `h${headingLevel}` as 'h3';
  const total = slides.length;

  const viewport = React.useRef<HTMLOListElement>(null);
  /**
   * What the SCROLLER last reported, mirrored on a ref.
   *
   * Without it the two directions fight: `scrollTo` fires scroll events, the
   * settle handler reads the position it was just sent to, and reports an
   * index change nobody asked for. Comparing against what the DOM is known to
   * be showing makes the report idempotent.
   */
  const shown = React.useRef(index);

  /** The slide nearest the viewport's centre. */
  const centred = React.useCallback((): number => {
    const element = viewport.current;
    if (element === null) return 0;
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-carousel-slide]'));
    const middle = element.scrollLeft + element.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    cards.forEach((card, i) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    return best;
  }, []);

  /* Report where a drag or a swipe left us, once it has settled. Debounced
     rather than run per event: mid-flick every frame is a different slide, and
     reporting each one would walk the consumer's state through slides the user
     never stopped at. */
  React.useEffect(() => {
    const element = viewport.current;
    if (element === null) return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = centred();
        if (next === shown.current) return;
        shown.current = next;
        onIndexChange?.(next);
      }, SETTLE_MS);
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      element.removeEventListener('scroll', onScroll);
    };
  }, [centred, onIndexChange]);

  /* The other direction: the consumer moved the index, so move the scroller.
     Guarded on `shown`, so this never runs for a change the scroller itself
     just reported — which would be a scroll loop. */
  React.useLayoutEffect(() => {
    const element = viewport.current;
    if (element === null) return;
    if (index === shown.current) return;
    const card = element.querySelectorAll<HTMLElement>('[data-carousel-slide]')[index];
    if (card === undefined) return;
    shown.current = index;
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2 });
  }, [index]);

  const go = React.useCallback((to: number) => {
    const clamped = Math.max(0, Math.min(total - 1, to));
    if (clamped === index) return;
    onIndexChange?.(clamped);
  }, [index, onIndexChange, total]);

  /* Arrow keys on the scroller itself. `tabindex="-1"` keeps it out of the tab
     order — it is a scroll container, not a control — while still letting a
     click into it land somewhere that handles arrows. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLOListElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
  };

  return (
    <div
      className={[
        'musy-carousel',
        accent !== 'primary' ? `musy-carousel--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <ol
        ref={viewport}
        className="musy-carousel__viewport"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {slides.map((slide, i) => (
          <li
            key={slide.id}
            className="musy-carousel__slide"
            /* The stylesheet selects on this, not on an index class, and it
               is what `centred()` queries for. */
            data-carousel-slide={i}
            /* Paired explicit values rather than an add/remove toggle: an
               attribute that comes and goes does not always invalidate style,
               which is the convention every radio component here follows. */
            data-current={i === index ? 'true' : 'false'}
            role="group"
            aria-roledescription="slide"
            aria-label={(slideLabel ?? t.carouselSlide)(i + 1, total, slide.title)}
          >
            {/* A div, not a button — see the file header. */}
            <div className="musy-carousel__card" onClick={() => go(i)}>
              <span className="musy-carousel__badge">
                {/* No `label`, so Icon marks itself aria-hidden: the title
                    beside it is the name, and the slide already has one. */}
                <Icon glyph={slide.glyph} size="xl" />
              </span>
              <H className="musy-carousel__title">{slide.title}</H>
            </div>
          </li>
        ))}
      </ol>

      <div className="musy-carousel__controls">
        <IconButton
          glyph={ChevronLeft}
          label={previousLabel ?? t.carouselPrevious}
          variant="secondary"
          size="primary"
          disabled={index <= 0}
          onClick={() => go(index - 1)}
        />

        <div className="musy-carousel__dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className="musy-carousel__dot"
              /* 'false', not undefined: the stylesheet's selected rules key off
                 [aria-current="true"], and the hover rule off :not() of it. */
              aria-current={i === index ? 'true' : 'false'}
              aria-label={(dotAriaLabel ?? t.carouselGoTo)(i + 1, total)}
              onClick={() => go(i)}
            >
              <span className="musy-carousel__dot-mark">
                {/* The label rides inside the active pill and is hidden from
                    AT: the button's own aria-label already says where it
                    goes, and announcing both would say the ordinal twice. */}
                <span className="musy-carousel__dot-label" aria-hidden="true">
                  {(dotLabel ?? t.carouselDot)(i + 1)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <IconButton
          glyph={ChevronRight}
          label={nextLabel ?? t.carouselNext}
          variant={nextVariant}
          size="primary"
          disabled={index >= total - 1}
          onClick={() => go(index + 1)}
        />
      </div>
    </div>
  );
}
