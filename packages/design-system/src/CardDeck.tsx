/**
 * Card Deck — Layer 2
 *
 * A pile of cards you deal with one at a time: swipe RIGHT to take the one on
 * top, LEFT to send it to the back. The pile is scattered, the top card is
 * always square to the page, and the card under your finger follows it.
 *
 * ── THE TWO SWIPES ARE NOT PEERS, AND THE COMPONENT IS BUILT AROUND THAT ──
 * Left is free: the card goes to the back and comes round again. Right is a
 * one-way door — it is the consumer's consequential action, and §7.24's rule
 * applies: a gesture that commits with no confirm is only honest if what it
 * commits is cheap to take back. So right is deliberately harder to do than
 * left, in three separate ways:
 *
 *   1. It needs more travel. ACCEPT_RATIO is half the card's width; DEFER_RATIO
 *      is under a third.
 *   2. A FLICK CANNOT DO IT. Velocity arms the left swipe only. A fast, short
 *      gesture is the one people make by accident, and it must never be able
 *      to open the one-way door.
 *   3. It announces itself first. The accept chip only lights once the gesture
 *      is past the point of commitment, so "this will start it" is on screen
 *      before the finger lifts, and lifting is still not the last word —
 *      dragging back under the threshold un-arms it.
 *
 * ── WHAT HAPPENS AFTER AN ACCEPT IS THE CONSUMER'S, AND IT CAN FAIL ───────
 * `onAccept` fires, the card flies out, and the deck goes inert while `busy`
 * is true. If `busy` goes false with the item still in `items`, THE CARD FLIES
 * BACK IN. That is the whole contract for a refusal: the swipe made a promise,
 * and if the promise cannot be kept the card has to visibly return rather than
 * the deck quietly sitting one card further on. A consumer that navigates away
 * instead simply unmounts, and nothing animates.
 *
 * ── NOTHING IS GATED BEHIND THE GESTURE ──────────────────────────────────
 * Both actions are real buttons, always in the DOM. On a wide viewport or a
 * fine pointer they flank the deck; on a narrow touch screen the stylesheet
 * reduces them to `.musy-sr-only` — invisible, still operable. §7.24's rule is
 * that nothing may be reachable only by a gesture a cursor, a keyboard or a
 * screen reader cannot perform, and a deck that hid its buttons on a phone
 * would be exactly that. The arrow keys do the same two things.
 *
 * ── EVERY WORD IT SPEAKS IS THE CONSUMER'S ───────────────────────────────
 * There are no label defaults here, not even from the locale catalogue. A deck
 * whose two actions are "start" and "later" in one product and "keep" and
 * "discard" in the next cannot have a sensible default for either, and a
 * component that guessed would be wrong in a way nobody noticed until it
 * shipped.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { Dots } from './Dots';
import { Icon } from './Icon';

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
 */
const SLOP_PX = 12;

/** How far across its own width a card goes before a release sends it to the
 *  back. Against the CARD, not the viewport, so the gesture means the same
 *  thing on a phone and on a laptop. */
const DEFER_RATIO = 0.3;

/** Half, for the one-way door. See the note at the top of the file. */
const ACCEPT_RATIO = 0.5;

/** …or this fast, in px/ms. LEFT ONLY — a flick must not be able to accept. */
const FLICK_PX_PER_MS = 0.45;

/** How far the top card travels before the pile behind it has closed up. */
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
  /** Swiped right, pressed, or Arrow Right. The consequential one. */
  onAccept: (id: string) => void;
  /** Swiped left, pressed, or Arrow Left. Sends the card to the back. */
  onDefer: (id: string) => void;
  /** The right action's name, on the chip and the button. REQUIRED. */
  acceptLabel: string;
  /** The left action's name. REQUIRED. */
  deferLabel: string;
  acceptGlyph: LucideIcon;
  deferGlyph: LucideIcon;
  /** The pile's accessible name. */
  label: string;
  /**
   * What the live region says when the top card changes: the card's own name
   * and where it sits. The deck knows the position and not the name, so the
   * consumer is given both and returns the sentence.
   */
  positionLabel: (position: number, total: number, id: string) => string;
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
}

interface Drag {
  x: number;
  y: number;
  swing: number;
  progress: number;
  /** Which action a release would perform right now, or null for neither. */
  armed: 'accept' | 'defer' | null;
}

interface Departing {
  /** Unique per throw, NOT the id: a fast thumb can have one card in flight
   *  twice, once per lap of a short deck. */
  key: number;
  id: string;
  dir: 1 | -1;
  x: number;
  y: number;
  swing: number;
}

export function CardDeck({
  items, onAccept, onDefer, acceptLabel, deferLabel, acceptGlyph, deferGlyph,
  label, positionLabel, busy = false, className,
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
     refusal — see the contract at the top of the file. */
  React.useEffect(() => {
    if (!busy && sent !== null && byId.has(sent)) setSent(null);
  }, [busy, sent, byId]);

  /** The pile, less whatever is mid-accept. */
  const stack = order.filter((id) => id !== sent);
  const frontId = stack[0];
  const inert = busy || sent !== null;

  const accept = React.useCallback((id: string | undefined) => {
    if (id === undefined || inert) return;
    setSent(id);
    setDrag(null);
    onAccept(id);
  }, [inert, onAccept]);

  const defer = React.useCallback((id: string | undefined, from: Omit<Drag, 'armed'>) => {
    if (id === undefined || inert) return;
    throwKey.current += 1;
    /* The order rotates IMMEDIATELY and the card carries on in its own layer,
       so the next card is live the instant this one is released rather than
       after an animation nobody is watching. Several can be in the air. */
    setDeparting((flying) => [...flying, { key: throwKey.current, id, dir: -1, ...from }]);
    setOrder((current) => [...current.filter((x) => x !== id), id]);
    setDrag(null);
    onDefer(id);
  }, [inert, onDefer]);

  /* ── THE GESTURE ───────────────────────────────────────────────────────
     THE HANDLERS ARE ON THE STAGE, not on the card. The stage outlives every
     card in it, and it is the full width of whatever the consumer gives the
     deck — a thumb that lands wide of a card still means that card. Every
     distance is measured from the PILE, through the ref, because a threshold
     is a fraction of the card and not of the surface it is read from. */

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (inert || frontId === undefined) return;
    /* A button speaks for itself. */
    if ((event.target as Element).closest('button') !== null) return;
    gesture.current = {
      x: event.clientX, y: event.clientY, axis: 'undecided',
      width: pile.current?.offsetWidth ?? event.currentTarget.offsetWidth,
      lastX: event.clientX, lastT: event.timeStamp, vx: 0,
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
    setDrag({
      x: travelled,
      y: dy,
      swing: Math.max(-1, Math.min(1, travelled / g.width)),
      progress: Math.min(1, reach / PILE_CLOSES_AT),
      armed:
        travelled > 0
          ? (reach >= ACCEPT_RATIO ? 'accept' : null)
          : (reach >= DEFER_RATIO ? 'defer' : null),
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (g === null || g.axis !== 'x' || drag === null) { setDrag(null); return; }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    /* A FLICK ARMS THE LEFT SWIPE ONLY. Accept is never reachable by speed —
       see the three asymmetries at the top of the file. */
    const flickedLeft = g.vx <= -FLICK_PX_PER_MS && drag.x < 0;
    if (drag.armed === 'accept') { accept(frontId); return; }
    if (drag.armed === 'defer' || flickedLeft) { defer(frontId, drag); return; }
    setDrag(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inert) return;
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      accept(frontId);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      defer(frontId, { x: 0, y: 0, swing: 0, progress: 0 });
    }
  };

  const position = items.findIndex((i) => i.id === frontId) + 1;

  const face = (item: CardDeckItem) => (
    <div className="musy-deck__face">{item.content}</div>
  );

  const vars = (extra: Record<string, number>) => extra as React.CSSProperties;

  return (
    <div
      className={['musy-deck', className ?? ''].filter(Boolean).join(' ')}
      data-busy={inert || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="musy-deck__row">
        <CtaButton
          variant="ghost"
          size="min"
          leadingIcon={deferGlyph}
          className="musy-deck__act musy-deck__act--defer"
          disabled={inert}
          onClick={() => defer(frontId, { x: 0, y: 0, progress: 0, swing: 0 })}
        >
          {deferLabel}
        </CtaButton>

        <div className="musy-deck__stage">
          {/* THE INTENT CHIPS. Nothing at rest — the deck's initial state is
              the deck — and they fade in the moment a horizontal axis is
              decided. The one you are travelling toward lights; the other
              stays dim. This is the whole of "what will happen if I let go". */}
          <div className="musy-deck__chip musy-deck__chip--defer" data-on={drag !== null || undefined}
               data-armed={drag?.armed === 'defer' || undefined} aria-hidden="true">
            <Icon glyph={deferGlyph} size="sm" />
            <span>{deferLabel}</span>
          </div>
          <div className="musy-deck__chip musy-deck__chip--accept" data-on={drag !== null || undefined}
               data-armed={drag?.armed === 'accept' || undefined} aria-hidden="true">
            <Icon glyph={acceptGlyph} size="sm" />
            <span>{acceptLabel}</span>
          </div>

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
            {stack.map((id, depth) => {
              const item = byId.get(id);
              if (item === undefined) return null;
              const isFront = depth === 0;
              return (
                <div
                  key={id}
                  className="musy-deck__card"
                  data-front={isFront}
                  data-accent={item.accent ?? 1}
                  data-swiping={isFront && drag !== null}
                  style={vars({
                    '--musy-card-depth': depth,
                    '--musy-card-seed': seedFor(id),
                    ...(isFront && drag !== null
                      ? { '--musy-drag-x': drag.x, '--musy-drag-y': drag.y, '--musy-card-swing': drag.swing }
                      : {}),
                  } as never)}
                >
                  {face(item)}
                </div>
              );
            })}

            {/* Accepted, and gone until the consumer says otherwise. */}
            {sent !== null && byId.get(sent) !== undefined && (
              <div className="musy-deck__card" data-sent="true" aria-hidden="true"
                   data-accent={byId.get(sent)?.accent ?? 1}
                   style={vars({ '--musy-card-depth': 0, '--musy-card-seed': seedFor(sent) } as never)}>
                {face(byId.get(sent) as CardDeckItem)}
              </div>
            )}

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
                    '--musy-card-swing': flight.swing, '--musy-throw-dir': flight.dir,
                  } as never)}
                >
                  {face(item)}
                </div>
              );
            })}
          </div>
        </div>

        <CtaButton
          variant="primary"
          size="min"
          leadingIcon={acceptGlyph}
          className="musy-deck__act musy-deck__act--accept"
          disabled={inert}
          onClick={() => accept(frontId)}
        >
          {acceptLabel}
        </CtaButton>
      </div>

      {/* Position, twice: as marks for the eye and as a sentence for the ear.
          The dots take no `onSelect` — there is nowhere to jump to in a pile —
          so they render inert and `aria-hidden`, and this carries the
          announcement instead. */}
      <Dots total={items.length} index={Math.max(0, position - 1)} ids={items.map((i) => i.id)}
            label={(p, total) => positionLabel(p, total, frontId ?? '')} />
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
