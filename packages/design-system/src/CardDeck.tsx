/**
 * Card Deck — Layer 2
 *
 * A pile of cards you deal with one at a time. SWIPE SIDEWAYS TO BROWSE IT —
 * left for the next card, right for the one before — and PRESS A CARD TO TAKE
 * IT.
 *
 * ── IT WAS BUILT THE OTHER WAY ROUND (Ben, 2026-10-05) ────────────────────
 * Until today the gesture carried both actions: a right swipe TOOK the card
 * and a left one sent it to the back, and right was made deliberately harder
 * because it was the one-way door — more travel than left, no flick, and a
 * chip that announced itself first. Nobody read it that way. A pile of cards
 * on a touch screen says "there are more of these, and they are sideways", so
 * people swiped both ways looking for the next one and PRESSED the card they
 * wanted. The press did nothing, and a long swipe started an exercise nobody
 * had chosen.
 *
 * The two kinds of input are now split by what they cost:
 *
 *   SIDEWAYS IS FREE, AND SYMMETRIC. Left is the next card, right is the one
 *   before, and neither decides anything — the pile rotates and comes round
 *   again. So there is ONE threshold for both (SWIPE_RATIO) and a flick arms
 *   either. The three asymmetries that used to protect the right swipe are
 *   gone with the door they were protecting.
 *
 *   A PRESS COMMITS. `onAccept` is a press and never a swipe: on the card in
 *   front, on the button the deck draws in that card's bottom-trailing corner,
 *   or on the primary button in the action column. §7.24's rule still binds it
 *   — a commit with no confirm is only honest if what it commits is cheap to
 *   take back — and a press being the only way in is also what makes an
 *   accidental one unlikely: a press is a place, not a direction.
 *
 * ── THE OVERLAY IS NOT A VERDICT ANY MORE, AND IT ARRIVES AT ONCE ─────────
 * It used to appear AT the threshold, which for the accept was half the card's
 * width: by the time it could be read the card was half off the screen and the
 * decision had been made. Ben, 2026-10-05: "it is only visible once the user
 * already swiped it away."
 *
 * So it is no longer a verdict but the answer to "another card is coming", and
 * it fades in WITH the gesture — fully opaque at OVERLAY_FULL_AT, a tenth of
 * the card, well under half of SWIPE_RATIO. The two intent chips went with it:
 * they existed to let somebody COMPARE two outcomes before choosing one, and
 * with both directions free and the overlay up at a tenth of a card they
 * answered a question nobody is asking and were covered a frame later.
 *
 * ── IT SAYS THE SAME WORD BOTH WAYS (Ben, 2026-10-05) ─────────────────────
 * `nextLabel`, whichever way the finger is going. It named the direction for
 * half a day and Ben asked for one word: both ways deal another card, so
 * "another exercise" is true in both, and a label that changed under the thumb
 * made a browse feel like a decision again. WHICH way is still said, twice,
 * where it is a fact rather than a mood — by the two buttons, and by the SIDE
 * the overlay's word sits on, which stays the trailing edge so the word is
 * whole for the whole of the gesture.
 *
 * It is one line now. The second line named the press, and the press has a
 * button on the card to name it — a sentence under a verb is what you write
 * when there is nothing to point at.
 *
 * ── WHAT HAPPENS AFTER AN ACCEPT IS THE CONSUMER'S, AND IT CAN FAIL ───────
 * `onAccept` fires, the card lifts off the pile and fades, and the deck goes
 * inert while `busy` is true. If `busy` goes false with the item still in
 * `items`, THE CARD COMES BACK. That is the whole contract for a refusal: the
 * press made a promise, and if the promise cannot be kept the card has to
 * visibly return rather than the deck quietly sitting one card further on. A
 * consumer that navigates away instead simply unmounts, and nothing animates.
 *
 * IT LEAVES UPWARD, which is new and is the point: both sideways directions
 * now mean "another card", so a taken card flying off to the right would be
 * saying the one thing the gesture no longer says.
 *
 * ── NOTHING IS GATED BEHIND THE GESTURE ──────────────────────────────────
 * Every action is a real button, always in the DOM: the accept in the action
 * column, and the two directions as a pair of icon buttons under it. The arrow
 * keys do the same two things — RIGHT for the next card, LEFT for the one
 * before, which is the reading order and therefore the mirror of the swipe
 * that does the same job, exactly as in every carousel. Enter accepts.
 *
 * ── EVERY WORD IT SPEAKS IS THE CONSUMER'S ───────────────────────────────
 * There are no label defaults here, not even from the locale catalogue. A deck
 * whose action is "start" in one product and "keep" in the next cannot have a
 * sensible default for it, and a component that guessed would be wrong in a
 * way nobody noticed until it shipped. The two DIRECTIONS carry the deck's own
 * arrows, because which way is back is not a product decision.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { IconButton } from './IconButton';

/**
 * ── THE SWIPE · the numbers ───────────────────────────────────────────────
 *
 * THE AXIS IS DECIDED, NEVER ASSUMED — the same bargain §7.24's swipe strikes.
 * A finger landing on a card is at least as likely to be starting a scroll as
 * a throw, so past the slop the larger of dx and dy wins and the loser is
 * abandoned for the rest of the gesture. The stylesheet carries the other half
 * with `touch-action: pan-y`.
 *
 * L13 asks for a short hold on a coarse pointer instead. The axis decision is
 * the same bargain bought differently, and §7.24 already takes this side of
 * it; the disagreement is logged in stories/OPEN-QUESTIONS.md.
 *
 * IT IS ALSO WHAT TELLS A PRESS FROM A SWIPE. A gesture that never clears the
 * slop has no direction, and a gesture with no direction on the card in front
 * is the accept — which is why the number is load-bearing twice over now.
 */
const SLOP_PX = 12;

/** How far across its own width a card goes before a release moves the pile.
 *  ONE NUMBER FOR BOTH WAYS: neither direction commits to anything, so there
 *  is nothing left for an asymmetry to protect. Against the CARD, not the
 *  viewport, so the gesture means the same thing on a phone and on a laptop. */
const SWIPE_RATIO = 0.25;

/** …or this fast, in px/ms. EITHER WAY, which is also new. A flick used to arm
 *  the left swipe only, because a fast short gesture is the one people make by
 *  accident and it must never open a one-way door. There is no door on this
 *  axis any more, and flicking through a pile is exactly what a flick is for. */
const FLICK_PX_PER_MS = 0.45;

/** Where the overlay has finished fading in, as a fraction of the CARD: a
 *  tenth, so about 36px of the 360 a phone gives it, and well under half of
 *  SWIPE_RATIO.
 *
 *  DELIBERATELY NOT TIED TO THE THRESHOLD. The overlay's job is to name the
 *  card you are heading for while you can still change your mind, and a number
 *  derived from the commit point is a number that arrives when the decision
 *  does — which is the thing that was wrong with it. */
const OVERLAY_FULL_AT = 0.1;

/** How far the top card travels before the pile behind it has closed up.
 *  FORWARD ONLY — see `progress` in onPointerMove. */
const PILE_CLOSES_AT = 0.6;

export interface CardDeckItem {
  id: string;
  /** The card's face. The deck owns the stack; the consumer owns the card. */
  content: React.ReactNode;
  /** 1, 2 or 3 — Layer 1's accent family. Fixed by the consumer, so a card
   *  keeps its colour when the pile is reordered. */
  accent?: 1 | 2 | 3;
}

export interface CardDeckProps {
  items: CardDeckItem[];
  /**
   * Pressed — the card itself, the button the deck draws on it, the primary
   * button in the action column, or Enter. The consequential one, and the only
   * one no gesture can reach.
   */
  onAccept: (id: string) => void;
  /** Swiped LEFT, pressed, or Arrow Right. The card goes to the back of the
   *  pile and the next one comes up. Carries the id of the card that was on
   *  top, which is the one that moved. */
  onNext: (id: string) => void;
  /** Swiped RIGHT, pressed, or Arrow Left. The card at the BACK of the pile
   *  comes back to the top — so the pile turns the other way rather than
   *  dealing. Carries the id of the card that was on top. */
  onPrevious: (id: string) => void;
  /** The accept's name, on the button beside the deck. REQUIRED. */
  acceptLabel: string;
  /**
   * The same action in as few words as a card's corner has room for — "Start"
   * where `acceptLabel` says "Start the exercise".
   *
   * REQUIRED, and a second string rather than a truncation: a label cut to fit
   * is a label that ends mid-word in the language that runs 30% longer.
   */
  acceptShortLabel: string;
  /**
   * What the overlay says, EITHER WAY, and the right-hand icon button's
   * accessible name and tooltip. REQUIRED.
   *
   * It is `nextLabel` rather than a word of its own because the two are the
   * same claim — another card is coming — and a deck with two strings for it
   * is a deck where they will disagree.
   */
  nextLabel: string;
  /** The backward direction's name. The icon button's accessible name and
   *  tooltip, and nothing else: the overlay says `nextLabel` both ways, so this
   *  is read rather than seen, and no measure binds it. REQUIRED. */
  previousLabel: string;
  /** The accept's glyph. The DIRECTIONS have none — see the note at the top. */
  acceptGlyph: LucideIcon;
  /** The pile's accessible name.
   *
   *  It is also the only place a keyboard or screen-reader user is told what
   *  the keys do, because the overlay that teaches the press is a visual state
   *  and is `aria-hidden`. Say both there. */
  label: string;
  /**
   * What the live region says when the top card changes: the card's own name
   * and where it sits. The deck knows the position and not the name, so the
   * consumer is given both and returns the sentence.
   */
  positionLabel: (position: number, total: number, id: string) => string;
  /**
   * Rendered at the HEAD of the action stack, above the deck's own controls.
   *
   * It had a row of its own above the card while the dots were there to share
   * it with; with the dots gone that row held one control and a lot of space.
   * A view switch is the reference case, and it belongs with the other things
   * you can press rather than floating over the deck on its own.
   *
   * Above the accept rather than below, because it does not act on the card in
   * front — it changes what you are looking at altogether, which is a decision
   * you make before the ones underneath it.
   */
  toolbar?: React.ReactNode;
  /**
   * Extra controls under the deck's own, in the same stack.
   *
   * The deck owns the accept and the two directions because it owns what they
   * do to the pile. Anything else a screen offers about the deck as a whole —
   * pick one for me, and nothing else so far — has no business being a prop
   * here, and every business being in the same column so it reads as one set
   * of choices.
   */
  actions?: React.ReactNode;
  /** True while an accept is in flight. See the contract at the top. */
  busy?: boolean;
  className?: string;
}

interface Gesture {
  x: number;
  y: number;
  axis: 'undecided' | 'x' | 'y';
  width: number;
  lastX: number;
  lastT: number;
  vx: number;
  /** Whether the pointer went down on the card in FRONT, which is the only
   *  place a press means the accept. */
  onFront: boolean;
}

/** Where a card is when it is let go of — the three numbers the stylesheet
 *  needs to carry on from under the finger. */
interface Flight {
  x: number;
  y: number;
  swing: number;
}

/** A throw from a standstill, for the button and the key that do the same job
 *  as the gesture. */
const STILL: Flight = { x: 0, y: 0, swing: 0 };

interface Drag extends Flight {
  /** How far the pile behind has closed up, 0…1. Forward only. */
  progress: number;
  /** Which way the finger is going, from the first pixel past the slop. */
  dir: 'next' | 'previous';
  /** How much of the overlay is showing, 0…1. Full long before `armed`. */
  reveal: number;
  /** True once a release would move the pile. */
  armed: boolean;
}

interface Departing extends Flight {
  /** Unique per throw, NOT the id: a fast thumb can have one card in flight
   *  twice, once per lap of a short deck. */
  key: number;
  id: string;
}

export function CardDeck({
  items, onAccept, onNext, onPrevious,
  acceptLabel, acceptShortLabel, nextLabel, previousLabel,
  acceptGlyph, label, positionLabel, toolbar, actions, busy = false, className,
}: CardDeckProps) {
  const [order, setOrder] = React.useState<string[]>(() => items.map((i) => i.id));
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [departing, setDeparting] = React.useState<Departing[]>([]);
  /** The card that was accepted and is waiting on the consumer. */
  const [sent, setSent] = React.useState<string | null>(null);

  const gesture = React.useRef<Gesture | null>(null);
  const throwKey = React.useRef(0);
  const pile = React.useRef<HTMLDivElement>(null);

  const byId = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  /* The deck follows the items it is given: ids that have gone are dropped and
     new ones join the back, without disturbing the order of what is still
     here. A consumer that removes the accepted card gets exactly what it
     expects, and so does one that does not. */
  React.useEffect(() => {
    setOrder((current) => {
      const live = current.filter((id) => byId.has(id));
      const added = items.map((i) => i.id).filter((id) => !live.includes(id));
      return added.length === 0 && live.length === current.length ? current : [...live, ...added];
    });
  }, [items, byId]);

  /* THE CARD COMES BACK. `busy` falling with the card still in `items` is a
     refusal — see the contract at the top of the file.
     …AND IT STOPS WAITING IF THE CARD IS TAKEN AWAY. A consumer that removes
     the accepted item means it for good, and there is nothing to bring back; if
     this only watched `busy` the deck would hold an id it can no longer draw
     and stay inert for the rest of its life. */
  React.useEffect(() => {
    if (sent === null) return;
    if (!byId.has(sent) || !busy) setSent(null);
  }, [busy, sent, byId]);

  /**
   * The pile, with the accepted card still in it.
   *
   * IT HAS TO BE THE SAME ELEMENT, which is the whole reason this is `order`
   * and not `order.filter(…)`. The accepted card used to be rendered as a
   * second element of its own while the stack dropped it, and a freshly
   * inserted element has nothing to transition FROM — so the card did not lift
   * and fade, it simply vanished, and came back the same way. (The thrown
   * cards get away with being their own element because they ANIMATE, and an
   * animation does run on insertion. A transition does not.) Keeping the id in
   * place keeps React's element in place, and the transition is real in both
   * directions — which is what the refusal contract at the top of the file
   * promises.
   */
  const stack = order;
  /** The card you are dealing with: the first one that is not on its way out. */
  const frontId = stack.find((id) => id !== sent);
  const inert = busy || sent !== null;
  /** A pile of one has no other card to go to, in either direction. */
  const browsable = stack.filter((id) => id !== sent).length > 1;

  const accept = React.useCallback((id: string | undefined) => {
    if (id === undefined || inert) return;
    setSent(id);
    setDrag(null);
    onAccept(id);
  }, [inert, onAccept]);

  const next = React.useCallback((id: string | undefined, from: Flight) => {
    if (id === undefined || inert) return;
    setDrag(null);
    /* ONE CARD IS ITS OWN NEXT. Without this the deck threw a copy of the only
       card off the screen while the same card sat in the pile underneath it,
       because the throw layer and the order are two places the same id can
       be. Nothing moves, and the consumer is not told about a move that did
       not happen. */
    if (!browsable) return;
    throwKey.current += 1;
    /* The order rotates IMMEDIATELY and the card carries on in its own layer,
       so the next card is live the instant this one is released rather than
       after an animation nobody is watching. Several can be in the air. */
    setDeparting((flying) => [...flying, { key: throwKey.current, id, ...from }]);
    setOrder((current) => [...current.filter((x) => x !== id), id]);
    onNext(id);
  }, [browsable, inert, onNext]);

  /**
   * BACKWARD, AND WITH NO THROW — which is not an omission.
   *
   * Going forward takes the top card off the pile, so it leaves. Going back
   * PUTS IT BACK: the card under the finger becomes the second card rather
   * than the last, and the card from the bottom of the pile rises to the top.
   * `setDrag(null)` restores the card's own transition, so it eases from
   * wherever the finger left it down into its new place. The reorder IS the
   * animation, and there is nothing left to animate separately.
   */
  const previous = React.useCallback((id: string | undefined) => {
    if (id === undefined || inert) return;
    setDrag(null);
    if (!browsable) return;
    setOrder((current) => {
      const last = current[current.length - 1];
      return last === undefined ? current : [last, ...current.slice(0, -1)];
    });
    onPrevious(id);
  }, [browsable, inert, onPrevious]);

  /* ── THE GESTURE ───────────────────────────────────────────────────────
     THE HANDLERS ARE ON THE STAGE, not on the card. The stage outlives every
     card in it, and it is the full width of whatever the consumer gives the
     deck — a thumb that lands wide of a card still means that card. Every
     distance is measured from the PILE, through the ref, because a threshold
     is a fraction of the card and not of the surface it is read from. */

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (inert || frontId === undefined) return;
    /* A button speaks for itself. The card's own accept is one, which makes
       its corner a dead spot for the gesture — small, inset, and the one
       place on the card where a press is already the right answer. */
    if ((event.target as Element).closest('button') !== null) return;
    const card = (event.target as Element).closest('.musy-deck__card');
    gesture.current = {
      x: event.clientX, y: event.clientY, axis: 'undecided',
      width: pile.current?.offsetWidth ?? event.currentTarget.offsetWidth,
      lastX: event.clientX, lastT: event.timeStamp, vx: 0,
      /* WHETHER A PRESS HERE MEANS THE CARD. The stage is wider than the pile
         on purpose, and a thumb that lands beside a card still swipes it; it
         must not also START it. A consequential action does not get an
         invisible target either side of the thing it acts on. */
      onFront: card !== null && card.getAttribute('data-front') === 'true',
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g === null || g.axis === 'y') return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (g.axis === 'undecided') {
      /* Whichever clears the slop first wins, and a tie goes to the page: the
         browser is already scrolling, and a pile that joined in halfway
         through is a pile that jumps. */
      if (Math.abs(dy) > SLOP_PX && Math.abs(dy) >= Math.abs(dx)) { g.axis = 'y'; return; }
      if (Math.abs(dx) <= SLOP_PX) return;
      g.axis = 'x';
      /* Captured only once the axis is settled, so a tap that never moved
         still reaches whatever it landed on. */
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    /* Sampled per move, not averaged: a flick's speed is what it was doing at
       the END. Guarded against the 0ms gap coalesced events produce. */
    const dt = Math.max(1, event.timeStamp - g.lastT);
    g.vx = (event.clientX - g.lastX) / dt;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;

    /* The slop is added back, so the card starts from under the finger rather
       than jumping the twelve pixels spent deciding. */
    const travelled = dx - Math.sign(dx) * SLOP_PX;
    const reach = Math.abs(travelled) / g.width;
    const forward = travelled < 0;
    setDrag({
      x: travelled,
      y: dy,
      swing: Math.max(-1, Math.min(1, travelled / g.width)),
      /* THE PILE ONLY CLOSES UP GOING FORWARD. The rise is a preview of the
         card about to be on top, and going back that card is the one at the
         BOTTOM of the pile rather than the one at depth 1 — so a rise here
         would promise the wrong card. A pile does not open up when you are
         putting a card back into it. */
      progress: forward ? Math.min(1, reach / PILE_CLOSES_AT) : 0,
      dir: forward ? 'next' : 'previous',
      reveal: Math.min(1, reach / OVERLAY_FULL_AT),
      armed: reach >= SWIPE_RATIO,
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    release(event);
    if (g === null) { setDrag(null); return; }

    /* A PRESS, NOT A SWIPE. The axis was never decided, so nothing travelled
       far enough to mean a direction — and on the card in front that is the
       accept. It is the same twelve pixels the axis is decided by, which is
       why a press can be made with a slightly unsteady thumb. */
    if (g.axis === 'undecided') {
      setDrag(null);
      if (g.onFront) accept(frontId);
      return;
    }

    if (g.axis !== 'x' || drag === null) { setDrag(null); return; }
    /* A FLICK ARMS EITHER DIRECTION, as long as it is still going the way the
       card has travelled: a throw that reverses at the last moment is somebody
       changing their mind, and the sign test is what hears that. */
    const flicked = Math.abs(g.vx) >= FLICK_PX_PER_MS && Math.sign(g.vx) === Math.sign(drag.x);
    if (drag.armed || flicked) {
      if (drag.dir === 'next') next(frontId, drag);
      else previous(frontId);
      return;
    }
    setDrag(null);
  };

  /* A CANCEL IS NOT A RELEASE, and it gets its own handler for one reason: a
     cancelled pointer must never be read as a press. The browser cancels when
     it takes the gesture over — the page starts panning, a system gesture
     begins — and those arrive having moved nothing on this axis, which is
     exactly the shape of a press. */
  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    gesture.current = null;
    release(event);
    setDrag(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inert) return;
    /* A BUTTON SPEAKS FOR ITSELF — the same rule the pointer follows, and it is
       here for a reason that only arrived with the card's own accept: that
       button is INSIDE the pile, so Enter on it raises the button's click AND
       bubbles to this handler. Both call `accept`, and whether the second one
       is refused depends on React having flushed `sent` between the keydown and
       the click — which it does today, and which is not a thing to leave a
       one-way door standing on. */
    if ((event.target as Element).closest('button') !== null) return;
    /* ENTER TAKES THE CARD, and the arrow keys browse in READING ORDER —
       right for the next card, left for the one before. That is the mirror of
       the swipe that does the same job, and it is right both times: a swipe
       moves the card, a key moves the position. Every carousel ever shipped
       makes the same pair of promises. */
    if (event.key === 'Enter') {
      event.preventDefault();
      accept(frontId);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next(frontId, STILL);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous(frontId);
    }
  };

  const position = items.findIndex((i) => i.id === frontId) + 1;

  const face = (item: CardDeckItem) => (
    <div className="musy-deck__face">{item.content}</div>
  );

  const vars = (extra: Record<string, number>) => extra as React.CSSProperties;

  /* The pile's depth counter, spent by the map below. It starts at -1 because
     the first card that is not on its way out is depth 0. */
  let depth = -1;

  return (
    <div
      className={['musy-deck', className ?? ''].filter(Boolean).join(' ')}
      data-busy={inert || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="musy-deck__body">
        <div className="musy-deck__stage">
          <div
            className="musy-deck__pile"
            ref={pile}
            role="group"
            tabIndex={0}
            aria-label={label}
            aria-busy={inert || undefined}
            style={vars({ '--musy-deck-progress': drag?.progress ?? 0 } as never)}
            onKeyDown={onKeyDown}
          >
            {/* THE DEPTH IS COUNTED, NOT INDEXED, because the card on its way
                out is still in this list and no longer has a place in the
                pile: it keeps depth 0 and its own `data-sent` geometry, and
                the cards behind it close up as though it had gone. */}
            {stack.map((id) => {
              const item = byId.get(id);
              if (item === undefined) return null;
              const isSent = id === sent;
              if (!isSent) depth += 1;
              const isFront = id === frontId;
              return (
                <div
                  key={id}
                  className="musy-deck__card"
                  data-front={isFront}
                  data-sent={isSent || undefined}
                  aria-hidden={isSent || undefined}
                  data-accent={item.accent ?? 1}
                  data-swiping={isFront && drag !== null}
                  style={vars({
                    '--musy-card-depth': isSent ? 0 : depth,
                    '--musy-card-seed': seedFor(id),
                    ...(isFront && drag !== null
                      ? { '--musy-drag-x': drag.x, '--musy-drag-y': drag.y, '--musy-card-swing': drag.swing }
                      : {}),
                  } as never)}
                >
                  {face(item)}

                  {/* ── THE CARD'S OWN ACCEPT ─────────────────────────────
                      In the corner of the card in front, and drawn only on
                      the small tier — above it the primary button sits beside
                      the deck with room for the whole label (Ben, 2026-10-05).

                      It is here rather than beside the deck because a press
                      is now the action, and the card is the thing being
                      pressed: a button ON it says so where a button under it
                      only says the deck can do this.

                      THE CONDENSED RUNG, and it is the one rule in this file
                      that is being broken on purpose (Ben, 2026-10-05: "lass
                      uns die condensed button variante probieren"). §5.4
                      permits `min` for a card control and NEVER for a primary
                      action, and this is both at once — the card's own control
                      and the screen's consequential one. It is logged in
                      stories/OPEN-QUESTIONS.md with what it costs: the rung
                      renders at 36px, so the target is under the 44px §5.4
                      asks of a primary action, and clears 2.5.8's 24px with
                      the margin the class bakes in. The full-size button
                      beside the deck is unchanged and is the same action. */}
                  {isFront && (
                    <CtaButton
                      variant="primary"
                      size="min"
                      leadingIcon={acceptGlyph}
                      className="musy-deck__card-act"
                      disabled={inert}
                      onClick={() => accept(id)}
                    >
                      {acceptShortLabel}
                    </CtaButton>
                  )}

                  {/* ── THE OVERLAY ───────────────────────────────────────
                      Where the swipe is going, named, from the first pixel of
                      it. The whole face goes over to one colour with one word
                      on it, and the word is the CARD YOU WILL GET rather than
                      a verdict on this one — nothing is being decided, so
                      there is nothing to decide between.

                      ONE WORD BOTH WAYS, and NO DIRECTION GLYPH. The arrow
                      here would have to mean "the way the finger is going",
                      and the arrows on the two buttons mean "back and forward
                      in a sequence" — which for the backward direction are
                      opposite arrows for the same move. `data-dir` stays, and
                      earns its keep twice over: it is what puts the word on
                      the edge of the card that is still on screen, and what
                      holds the fade off while a finger is down.

                      `aria-hidden`: this is the visible half of a state the
                      live region already announces, and a screen reader
                      driving the deck by its buttons never reaches it. */}
                  {isFront && (
                    <div
                      className="musy-deck__overlay"
                      data-dir={drag?.dir ?? undefined}
                      aria-hidden="true"
                      style={vars({ '--musy-card-reveal': drag?.reveal ?? 0 } as never)}
                    >
                      <span className="musy-deck__overlay-label">{nextLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* In the air. Outside the stack — the pile closed up behind them. */}
            {departing.map((flight) => {
              const item = byId.get(flight.id);
              if (item === undefined) return null;
              return (
                <div
                  key={flight.key}
                  className="musy-deck__card"
                  data-throwing="true"
                  aria-hidden="true"
                  data-accent={item.accent ?? 1}
                  onAnimationEnd={() =>
                    setDeparting((rest) => rest.filter((o) => o.key !== flight.key))}
                  style={vars({
                    '--musy-card-depth': 0, '--musy-card-seed': seedFor(flight.id),
                    '--musy-drag-x': flight.x, '--musy-drag-y': flight.y,
                    '--musy-card-swing': flight.swing,
                  } as never)}
                >
                  {face(item)}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── THE ACTIONS ─────────────────────────────────────────────
            One column, in the order they carry weight: the way in, the two
            ways round, then whatever the screen adds. Beside the card where
            there is room and under it where there is not — a wrap, not a
            breakpoint, so it answers to the space the deck actually has.

            NORMAL SIZE, not the small rung. These are the screen's real
            choices; the row above is furniture. */}
        <div className="musy-deck__actions">
          {toolbar}
          <CtaButton
            variant="primary"
            leadingIcon={acceptGlyph}
            className="musy-deck__act musy-deck__act--accept"
            disabled={inert}
            onClick={() => accept(frontId)}
          >
            {acceptLabel}
          </CtaButton>
          {/* ── THE TWO DIRECTIONS, AS A PAIR ─────────────────────────
              One row, in reading order: back, then forward. They are a PAIR
              rather than two more rows in the column because that is what
              they are — the same move twice, in opposite directions — and
              because two more full-width labels under the primary button
              would have read as three things to decide between.

              ICON-ONLY, which is the one place the deck owns a glyph: an
              arrow for back and an arrow for forward are not a product
              decision. The labels are still the consumer's, as the
              accessible name and the tooltip. */}
          <div className="musy-deck__nav">
            <IconButton
              glyph={ArrowLeft}
              label={previousLabel}
              variant="secondary"
              className="musy-deck__act musy-deck__act--previous"
              disabled={inert || !browsable}
              onClick={() => previous(frontId)}
            />
            <IconButton
              glyph={ArrowRight}
              label={nextLabel}
              variant="secondary"
              className="musy-deck__act musy-deck__act--next"
              disabled={inert || !browsable}
              onClick={() => next(frontId, STILL)}
            />
          </div>
          {actions}
        </div>
      </div>

      {/* The position as a sentence. This is what a screen reader is told when
          the top card changes. */}
      <p className="musy-sr-only" aria-live="polite">
        {frontId === undefined ? '' : positionLabel(position, items.length, frontId)}
      </p>
    </div>
  );
}

/**
 * HOW SLOPPY THIS PARTICULAR CARD IS — one number in -1…1, hashed from its id,
 * which the stylesheet spends on an offset and an angle.
 *
 * DETERMINISTIC, and that is the point: `Math.random()` would re-scatter the
 * pile on every render, so every drag frame would reshuffle the cards nobody
 * is touching and the pile would read as shivering.
 *
 * IT HAS TO AVALANCHE. The obvious `hash * 31 + charCode` does not: on a set
 * of ids differing in one character — mc-01 … mc-09 — every card came out
 * within a pixel of the same offset, and the pile looked neatly stacked while
 * the hash looked like it was working. FNV-1a to fold, then MurmurHash3's
 * finalizer, whose two multiplies and two xor-shifts are what turn a one-bit
 * difference into a different number.
 */
function seedFor(id: string): number {
  let folded = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    folded ^= id.charCodeAt(i);
    folded = Math.imul(folded, 0x01000193);
  }
  let h = Math.imul(folded, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  /* `>>> 0` first: Math.imul returns a SIGNED 32-bit int, and dividing a
     negative one gives a number outside -1…1. */
  return Math.round((((h >>> 0) / 0xffffffff) * 2 - 1) * 1000) / 1000;
}
