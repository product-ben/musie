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
 * ── THREE THINGS SAY IT CAN BE SWIPED, AND NONE OF THEM IS A SENTENCE ─────
 * The 2026-09-25 user testing found that nobody swiped. The cause was
 * measured rather than guessed and it was geometry: at 393px the next card's
 * painted edge sat 8.8px PAST the frame, so the screen offered a dot row and
 * a filled chevron and read, correctly, as a stepper. The narrow-container
 * rule in section 8 carries the arithmetic.
 *
 * The answer is three affordances, no copy — an explainer screen that has to
 * explain its own controls has already lost:
 *
 *   PEEK   27px of the next card, budgeted AFTER the 0.9 scale. Section 8.
 *          Always there, and it is the one that survives reduced motion.
 *   NUDGE  the track drifts one slide-width's worth and settles back, once,
 *          on mount, on a coarse pointer. Below.
 *   GRAB   a real mouse drag, with the cursor that advertises it. Below.
 *
 * ── AND THE CONTROLS' EMPHASIS, WHICH FOLLOWS THE GATE AND NOT THE POINTER ─
 * The three above add a reason to swipe. The fourth thing is subtractive, and
 * it took three goes to land. Briefly, because the middle two are the useful
 * part of the record:
 *
 *   1. `primary` forward throughout. A filled chevron beside a row of dots is
 *      the highest-contrast thing on the screen; the 2026-09-25 testing found
 *      it read as a stepper and nobody swiped.
 *   2. `secondary` on a coarse pointer, whatever the consumer passed. Quieter,
 *      but an outlined 44px circle is still a BOX, and two boxes bracketing
 *      the dots still draw the chrome of a stepper.
 *   3. `ghost` on a coarse pointer. Quiet — and MEASURED ON A PHONE it cost
 *      the flow: with nothing carrying forward momentum, moving through three
 *      slides to unlock the CTA stopped feeling like progress. Ben's call,
 *      from the device, which is the only place that judgement can be made.
 *
 * SO THE EMPHASIS IS NOT A POINTER DECISION AFTER ALL. It is a GATE decision,
 * and the gate belongs to the screen: while going on is the only thing to do,
 * the forward control is `primary` and says so; the moment the screen's own
 * CTA lights up, the chevrons step out of its way. That is what `nextVariant`
 * has always expressed — the consumer was right and the component was
 * overriding it — so the coarse-pointer override is GONE and `ghost` is in
 * the union as the rung below `secondary`.
 *
 * `previousVariant` IS DERIVED, NEVER PASSED: one rung below whatever the
 * forward control is, so back can never be louder than forward. `primary`
 * forward ⇒ `secondary` back; anything quieter ⇒ `ghost` back.
 *
 * WHAT IS STILL A POINTER DECISION: the nudge and the `grab` cursor. Those are
 * about the GESTURE, which genuinely differs by pointer. Emphasis is not.
 *
 * DEMOTED, NEVER HIDDEN, through all three goes, and that part never moved.
 * Hiding the chevrons on touch would leave a thumb with nothing but the dots,
 * which are `--target-min` (24px) against `--target-primary` (44px) — and L5
 * says in as many words that 24px is "comfortable under a cursor and tight
 * under a thumb". Removing the 44px control on exactly the pointer that needs
 * 44px inverts the rule, and on a screen that gates its CTA on reaching the
 * last slide it costs a path to the CTA for the users least able to spare one.
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
import { useCoarsePointer } from './useCoarsePointer';
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
   * The trailing control's variant, on every pointer. `primary` by default —
   * while going on is the only thing to do, the forward control should say so.
   *
   * A SCREEN WITH ITS OWN GATED CTA HANDS THIS DOWN THE MOMENT THE GATE OPENS,
   * and `ghost` is the rung to hand it to: two filled primaries on one screen
   * compete, and `secondary` leaves a box bracketing the dots that still reads
   * as a stepper's chrome. `/`'s explainer passes
   * `seenAll ? 'ghost' : 'primary'` and that pair is the intended use.
   *
   * There is no pointer condition on this any more — see the file header for
   * the two that were tried and why the gate turned out to be the real axis.
   * The leading control is derived from this, one rung down, and is never
   * passed.
   */
  nextVariant?: 'primary' | 'secondary' | 'ghost';
  accent?: 'primary' | 'accent' | 'accent-alt';
  /**
   * The one-shot nudge on mount. On by default, and off is for a carousel
   * that is not the first thing a reader meets — a second one further down a
   * page would be two things moving for no reason.
   *
   * It is already conditional on things this component can see for itself: a
   * coarse pointer (a cursor gets `grab` instead, which is permanent), more
   * than one slide, and starting at the first one. Reduced motion is handled
   * a layer down, in the token the keyframe is built from.
   */
  nudge?: boolean;
  /** Copy. Each defaults to the locale catalogue (src/locale.ts). */
  previousLabel?: string;
  nextLabel?: string;
  /** ("3", "5", "…") → the slide's own accessible name. */
  slideLabel?: (position: number, total: number, title: string) => string;
  /** The dot button's accessible name. */
  dotAriaLabel?: (position: number, total: number) => string;
  className?: string;
}

/** How long after the last scroll event the position is taken as settled. */
const SETTLE_MS = 90;

/** A mouse drag shorter than this is a click on a card, not a swipe. */
const DRAG_SLOP_PX = 6;

export function Carousel({
  label, slides, index, onIndexChange,
  headingLevel = 3, nextVariant = 'primary', accent = 'primary', nudge = true,
  previousLabel, nextLabel, slideLabel, dotAriaLabel,
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

  /**
   * THE NUDGE, latched at mount and spent by the animation that plays it.
   *
   * `index === 0` is read in the lazy initialiser rather than in an effect,
   * so it is the position the carousel ARRIVED at: a consumer restoring
   * somebody mid-run has not just introduced a gesture, and should not be
   * shown one. `onAnimationEnd` on the viewport spends it — the animation is
   * on the `<li>`s and bubbles up, which means the flag is cleared by the
   * thing finishing rather than by a duration written twice.
   */
  const [nudging, setNudging] = React.useState(() => index === 0);
  const coarse = useCoarsePointer();
  const nudgeNow = nudging && nudge && coarse && total > 1;

  /**
   * BACK IS ALWAYS ONE RUNG BELOW FORWARD, derived rather than passed — see
   * the header. There is one emphasis decision on this component and the
   * consumer makes it once; a second prop would let a screen ask for a back
   * control louder than its forward one, which is never right in a sequence.
   *
   * WHATEVER THE RUNG, THE TARGET IS UNTOUCHED: `--target-primary` (44px),
   * the tab stop, the accessible name and the disabled logic are the same at
   * every level. `ghost` drops the fill and the border and nothing else —
   * `--interactive-ghost` is `transparent` and `--interactive-ghost-on` is
   * `--sand-12`, the full-contrast ink, so what identifies the control is the
   * glyph and 1.4.11 never rested on the box that went.
   */
  const forwardVariant = nextVariant;
  const backVariant = forwardVariant === 'primary' ? 'secondary' : 'ghost';

  /**
   * THE MOUSE DRAG. `null` between drags; the pointer's start, the scroller's
   * start, and the index the drag began on, which is what bounds where it may
   * land.
   */
  const drag = React.useRef<{ x: number; left: number; from: number; moved: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  /** Set by a drag that travelled, read by the click that follows it. */
  const swallowClick = React.useRef(false);

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

  /**
   * ── THE MOUSE DRAG ────────────────────────────────────────────────────────
   * MOUSE ONLY, and that is the whole reason it exists. A finger and a
   * trackpad already scroll this natively, with momentum and rubber-banding
   * nobody should reimplement; a mouse has no gesture for a horizontal
   * scroller at all — no wheel axis, and the scrollbar is hidden — so on a
   * desktop the swipe was invisible AND unavailable.
   *
   * The scroller is driven by assigning `scrollLeft`, which is why the CSS
   * turns snapping off for the length of the drag: `mandatory` re-snaps after
   * every assignment, and the track would jump between slides instead of
   * following the hand.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLOListElement>) => {
    /* Cleared here rather than after the click it guards, so a drag that ends
       away from any card cannot poison the next real one. */
    swallowClick.current = false;
    if (event.pointerType !== 'mouse') return;
    const element = viewport.current;
    if (element === null) return;
    drag.current = { x: event.clientX, left: element.scrollLeft, from: index, moved: 0 };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLOListElement>) => {
    const state = drag.current;
    const element = viewport.current;
    if (state === null || element === null) return;
    const travelled = event.clientX - state.x;
    /* The furthest it ever got, not where it ended: a drag out and back is
       still a drag, and must not be delivered as a click on a card. */
    state.moved = Math.max(state.moved, Math.abs(travelled));

    /**
     * CAPTURE AT THE SLOP, NEVER AT POINTERDOWN — and this is the one thing
     * in here that was learned the hard way. While a pointer is captured the
     * browser dispatches the following `click` to the CAPTURING element, so
     * capturing on pointerdown sent every click to the `<ol>` and the card's
     * own handler never ran: tapping a peeking card silently stopped working
     * for anyone using a mouse. Past the slop there is no click left to
     * protect, and capture is what keeps a drag that leaves the carousel from
     * being dropped mid-gesture.
     */
    if (state.moved > DRAG_SLOP_PX && !element.hasPointerCapture(event.pointerId)) {
      element.setPointerCapture(event.pointerId);
    }
    element.scrollLeft = state.left - travelled;
  };

  const endDrag = (event: React.PointerEvent<HTMLOListElement>) => {
    const state = drag.current;
    const element = viewport.current;
    drag.current = null;
    setDragging(false);
    if (state === null || element === null) return;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }

    swallowClick.current = state.moved > DRAG_SLOP_PX;
    /* Under the slop nothing moved worth keeping, and the card's own click
       handler is about to do the right thing. */
    if (!swallowClick.current) return;

    /**
     * ONE DRAG IS ONE SLIDE — `scroll-snap-stop: always` written out in
     * script, because for the length of the drag there is no snapping left to
     * enforce it. Clamped against where the drag STARTED, so a long sweep
     * lands one along rather than wherever it ran out of desk.
     *
     * The scroll happens here, with snapping still off: `setDragging(false)`
     * only reaches the DOM on the next render, by which time the scroller is
     * already on a snap point and re-snapping has nothing to move.
     */
    const landed = Math.max(state.from - 1, Math.min(state.from + 1, centred()));
    const card = element.querySelectorAll<HTMLElement>('[data-carousel-slide]')[landed];
    if (card !== undefined) {
      shown.current = landed;
      element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2 });
    }
    if (landed !== state.from) onIndexChange?.(landed);
  };

  /** A card's tap — unless a drag just ended on top of it. */
  const onCardClick = (to: number) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    go(to);
  };

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
      /* Paired values, like `data-current` below: an attribute that comes and
         goes does not reliably invalidate style. */
      data-nudge={nudgeNow ? 'true' : 'false'}
    >
      <ol
        ref={viewport}
        className="musy-carousel__viewport"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-dragging={dragging ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        /* The nudge is on the slides and bubbles here. One shot: the flag it
           clears is never set again. */
        onAnimationEnd={() => setNudging(false)}
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
            <div className="musy-carousel__card" onClick={() => onCardClick(i)}>
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
          variant={backVariant}
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
              {/* Empty on purpose. The mark IS the state — a 12px dot, or a
                  24px pill when it is the current one — and the button's own
                  aria-label says where it goes. The ordinal used to be
                  printed inside the active pill and was `aria-hidden`, so
                  cutting it (2026-09-25, Ben) took nothing from the aria
                  layer: there was never anything there to move. */}
              <span className="musy-carousel__dot-mark" />
            </button>
          ))}
        </div>

        <IconButton
          glyph={ChevronRight}
          label={nextLabel ?? t.carouselNext}
          variant={forwardVariant}
          size="primary"
          disabled={index >= total - 1}
          onClick={() => go(index + 1)}
        />
      </div>
    </div>
  );
}
