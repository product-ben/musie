/**
 * `/dev/deck` — the deck as a pile you can throw cards off. A PROOF OF
 * CONCEPT, in the sense /dev/qr is a tool: not linked from the product, not
 * imported by it, and nothing in the product depends on it.
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────
 * To find out what the printed deck feels like on a phone before anything in
 * the product commits to it. The question is not "can nine cards be listed" —
 * Carousel (§7.11) already answers that — it is whether a PILE reads as the
 * paper object it is: scattered, thumbed through, thrown aside. That is a
 * question about motion, so it is answered by moving something.
 *
 * ── IT READS deck.json, NOT THE DATABASE, AND THAT IS THE ONE THING HERE
 *    THAT ARGUES WITH THE REPO ──────────────────────────────────────────────
 * Every other screen reads content through lib/content.ts, and /dev/qr — the
 * closest precedent — reads the cards from Postgres for the good reason that
 * `cards.code` is the printed code and a hardcoded list of nine strings would
 * be silently invalidated by a tenth card.
 *
 * This one imports `supabase/content/deck.json` instead, so a POC about MOTION
 * does not require `supabase start` to run at all. The drift that argument
 * usually costs is small here: CLAUDE.md names deck.json as the deck's single
 * source of truth, and the migration generator reads the same file, so a tenth
 * card lands here and in the database from one edit. What it does NOT track is
 * an edit made to the database directly — which rule 4 forbids anyway.
 *
 * IT IS STILL A TRADE, and it is logged as one in apps/web/OPEN-QUESTIONS.md.
 * Nothing in the product should copy it.
 *
 * ── THE FEELINGS ARE CONTENT AND ARE NOT IN THE CATALOGUE ─────────────────
 * `feeling.de` / `feeling.en` come from deck.json, which is where the Cards
 * spreadsheet's copy lives. They are NOT added to i18n/en.ts: chrome is ours
 * and permanent, content is not, and putting nine provisional content strings
 * in the permanent catalogue is how the two stop being distinguishable. Every
 * word this screen says in its OWN voice does go through the catalogue.
 */
import * as React from 'react';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { IconButton } from '@musie/design-system';
import deck from '../../../../supabase/content/deck.json';
import { useLocale, useT } from '../i18n/localeContext';
import type { Locale } from '../i18n';
import '../poc-deck.css';

/**
 * ── THE SWIPE · the numbers ───────────────────────────────────────────────
 *
 * THE AXIS IS DECIDED, NEVER ASSUMED — the same bargain DraggableList's swipe
 * strikes, and for the same reason: a finger landing on a card is at least as
 * likely to be starting a scroll as a throw. Past the slop, the larger of dx
 * and dy wins and the loser is abandoned for the rest of the gesture. The
 * stylesheet carries the other half with `touch-action: pan-y`.
 */
const SLOP_PX = 12;

/**
 * How far across its own width a card must go before a release throws it
 * rather than dropping it back. Against the CARD's width, not the viewport's,
 * so the gesture means the same thing on a phone and on a laptop.
 */
const THROW_RATIO = 0.35;

/**
 * …OR how fast it must be going, in px/ms, regardless of how far it got. A
 * flick is a throw even when the thumb only travelled 40px, and a UI that
 * ignores velocity is the one that feels "sticky" without anybody being able
 * to say why.
 */
const FLICK_PX_PER_MS = 0.45;

/**
 * How far the top card travels before the pile behind it has fully closed up.
 * Under 1 on purpose: the cards underneath finish arriving just BEFORE the
 * commit point, so the pile looks ready to receive the throw rather than
 * surprised by it.
 */
const PILE_CLOSES_AT = 0.6;

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
}

interface Departing extends Drag {
  /** Unique per throw, NOT the card id: a fast thumb can have the same card in
   *  flight twice, once per lap of a nine-card deck. */
  key: number;
  id: string;
  dir: 1 | -1;
}

/**
 * HOW SLOPPY THIS PARTICULAR CARD IS — three numbers in -1…1, hashed from its
 * id.
 *
 * DETERMINISTIC, and that is the whole point. `Math.random()` here would
 * re-scatter the pile on every render — so every drag frame would reshuffle
 * the eight cards nobody is touching, which reads as the pile shivering. A
 * hash of the id gives each card one resting angle it keeps for the life of
 * the page, through re-renders, locale changes and shuffles alike.
 */
function scatterFor(id: string): { x: number; y: number; tilt: number } {
  /* IT HAS TO AVALANCHE, and the obvious hash does not. This was
     `hash * 31 + charCode` with three bytes shifted out of it, which is the
     string hash everybody writes — and on THIS set of ids it produced a pile
     with no slop in it at all. The ids are mc-01 … mc-09: they differ in one
     character, in the last position, by one. So the accumulator differed by
     one, the low bytes differed by one part in 255, and all nine cards were
     dealt to within a pixel of the same offset and a tenth of a degree of the
     same angle. The pile looked neatly stacked and the bug looked like a CSS
     problem — it is worth knowing that a hash can be "working" and still be
     useless for anything you intend to LOOK at.

     FNV-1a to fold the string, then MurmurHash3's finalizer per slot. The
     finalizer is the part that matters: two multiplies and two xor-shifts,
     which is what turns a one-bit difference in the input into a completely
     different output. */
  let folded = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    folded ^= id.charCodeAt(i);
    folded = Math.imul(folded, 0x01000193);
  }
  const pick = (slot: number) => {
    let h = Math.imul(folded ^ (slot + 1), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    /* `>>> 0` first: Math.imul returns a SIGNED 32-bit int, and dividing a
       negative one gives a number outside -1…1. */
    return ((h >>> 0) / 0xffffffff) * 2 - 1;
  };
  return { x: pick(0) * 2, y: pick(1) * 2, tilt: pick(2) };
}

interface DeckCard {
  id: string;
  code: string;
  feeling: string;
  /** 1, 2 or 3 — fixed by the card's place in the PRINTED deck, so a card
   *  keeps its colour when the pile is shuffled. */
  accent: number;
  scatter: { x: number; y: number; tilt: number };
}

function cardsIn(locale: Locale): DeckCard[] {
  return deck.cards.map((card, index) => ({
    id: card.id,
    code: card.code,
    feeling: card.feeling[locale],
    accent: (index % 3) + 1,
    scatter: scatterFor(card.id),
  }));
}

export function DeckPoc() {
  const t = useT();
  const { locale } = useLocale();

  const cards = React.useMemo(() => cardsIn(locale), [locale]);

  /** Card ids, front of the pile first. Rotates on every throw, so the deck
   *  has no end — a thrown card goes to the bottom, as it would on a table. */
  const [order, setOrder] = React.useState<string[]>(() => cards.map((card) => card.id));
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [departing, setDeparting] = React.useState<Departing[]>([]);
  /** The card sliding back in from the edge after Previous. */
  const [arriving, setArriving] = React.useState<{ id: string; dir: 1 | -1 } | null>(null);

  const gesture = React.useRef<Gesture | null>(null);
  const throwKey = React.useRef(0);

  const byId = React.useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const front = byId.get(order[0]);

  /* ── THE THREE ACTIONS ───────────────────────────────────────────────────
     Every one of them is reachable by button and by key as well as by thumb.
     Nothing in this screen is gated behind a gesture a cursor, a keyboard or a
     screen reader cannot perform — DraggableList's rule, and it holds here. */

  /**
   * Throw the top card and close the pile up behind it.
   *
   * THE ORDER ROTATES IMMEDIATELY and the thrown card carries on in its own
   * layer. That is what lets you swipe as fast as your thumb moves: the next
   * card is live the instant the last one is released, rather than after an
   * animation nobody is watching. `departing` is a list rather than a single
   * slot for exactly that reason — several can be in the air at once.
   */
  const throwCard = React.useCallback(
    (dir: 1 | -1, from: Drag) => {
      const id = order[0];
      if (id === undefined) return;
      /* EVERY setState UPDATER IN THIS FILE IS PURE, and this is the reason:
         StrictMode invokes them twice to find exactly the kind of side effect
         that queueing the throw from inside the `order` updater would be. Done
         that way, one release put the same card in the air twice. */
      throwKey.current += 1;
      setDeparting((flying) => [...flying, { ...from, key: throwKey.current, id, dir }]);
      setOrder((current) => [...current.slice(1), current[0]]);
      setDrag(null);
      setArriving(null);
    },
    [order],
  );

  /** Bring the bottom card back to the front, sliding in from the side it
   *  left by — the throw's keyframes, played backwards. */
  const takeBack = React.useCallback(() => {
    const id = order[order.length - 1];
    if (id === undefined) return;
    setArriving({ id, dir: 1 });
    setOrder((current) => [current[current.length - 1], ...current.slice(0, -1)]);
    setDrag(null);
  }, [order]);

  const shuffle = React.useCallback(() => {
    setOrder((current) => {
      /* Fisher–Yates on a copy. `sort(() => Math.random() - 0.5)` is the
         one-liner everybody reaches for and it is not a shuffle: the
         comparator is inconsistent, so the distribution it produces depends on
         the engine's sort and is measurably biased in V8. */
      const next = [...current];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setDrag(null);
    setArriving(null);
  }, []);

  /* ── THE GESTURE ─────────────────────────────────────────────────────────
     THE HANDLERS ARE ON THE PILE, NOT ON THE CARD. The pile outlives every
     card in it; the top card is unmounted into `departing` the moment it is
     thrown. A pointer captured by an element that then unmounts is how a
     gesture ends up stuck with the button still down.

     A MOUSE IS ALLOWED TO DRAG, which is where this parts company with
     DraggableList — that component refuses `pointerType === 'mouse'` because
     its swipe is a shortcut to a delete the row menu already offers, and a
     hidden drag would mostly surprise people mid-text-selection. Here the drag
     IS the thing being prototyped. Refusing the mouse would mean the question
     this screen exists to answer could not be asked on the machine it is being
     built on. */

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (order.length === 0) return;
    /* A card mid-flight is not a handle, and neither is a button. */
    if ((event.target as Element).closest('button') !== null) return;
    setArriving(null);
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      axis: 'undecided',
      width: event.currentTarget.getBoundingClientRect().width,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g === null || g.axis === 'y') return;

    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (g.axis === 'undecided') {
      /* WHICHEVER CLEARS THE SLOP FIRST WINS, and a tie goes to the page. A
         vertical win is final: the browser is already scrolling, and a pile
         that joined in halfway through is a pile that jumps. */
      if (Math.abs(dy) > SLOP_PX && Math.abs(dy) >= Math.abs(dx)) {
        g.axis = 'y';
        return;
      }
      if (Math.abs(dx) <= SLOP_PX) return;
      g.axis = 'x';
      /* Captured only once the axis is settled, so a tap that never moved
         still reaches whatever it landed on. */
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    /* Velocity, sampled per move rather than averaged: a flick's speed is what
       it was doing at the END, and an average over the whole gesture reports a
       slow drag that finished fast as slow. Guarded against a 0ms gap, which
       coalesced pointer events do produce. */
    const dt = Math.max(1, event.timeStamp - g.lastT);
    g.vx = (event.clientX - g.lastX) / dt;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;

    /* The slop is added back so the card starts from under the finger rather
       than jumping the twelve pixels that were spent deciding. */
    const travelled = dx - Math.sign(dx) * SLOP_PX;
    setDrag({
      x: travelled,
      y: dy,
      swing: clamp(travelled / g.width, -1, 1),
      progress: Math.min(1, Math.abs(travelled) / (g.width * PILE_CLOSES_AT)),
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (g === null || g.axis !== 'x') {
      setDrag(null);
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const travelled = event.clientX - g.x;
    const far = Math.abs(travelled) >= g.width * THROW_RATIO;
    const fast = Math.abs(g.vx) >= FLICK_PX_PER_MS;

    if ((far || fast) && drag !== null) {
      /* THE DIRECTION COMES FROM THE THROW, not from the sign of the travel.
         They are the same on any ordinary drag and they differ on the one that
         matters: a card dragged left and flicked back right should leave to
         the right, because that is where the hand sent it. */
      throwCard(fast ? (g.vx > 0 ? 1 : -1) : travelled > 0 ? 1 : -1, drag);
      return;
    }
    /* Under both thresholds: it drops back into the pile. The transition in
       the stylesheet does the springing. */
    setDrag(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      throwCard(1, { x: 0, y: 0, swing: 0, progress: 0 });
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      takeBack();
    }
  };

  return (
    <>
      <h1 className="musie-placeholder">{t('poc.deck.title')}</h1>
      <p className="musie-note">{t('poc.deck.text')}</p>

      <div className="musie-deck">
        {/*
          THE PILE IS THE CONTROL, which is why it is what takes focus and
          holds the keyboard handler rather than each card doing so. Nine
          focusable cards would be nine tab stops for one deck, and the eight
          underneath cannot be acted on anyway.

          `group` rather than `list`: the cards are one object being handled,
          not an enumeration, and a screen reader reading the group reads all
          nine — which is the honest description of a deck sitting on a table.
        */}
        <div
          className="musie-deck__pile"
          role="group"
          tabIndex={0}
          aria-label={t('poc.deck.stage')}
          style={cssVars({ '--musie-deck-progress': drag?.progress ?? 0 })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {order.map((id, depth) => {
            const card = byId.get(id);
            if (card === undefined) return null;
            const isFront = depth === 0;
            return (
              <div
                key={id}
                className="musie-deck__card"
                data-front={isFront}
                data-accent={card.accent}
                data-swiping={isFront && drag !== null}
                data-arriving={arriving?.id === id}
                onAnimationEnd={arriving?.id === id ? () => setArriving(null) : undefined}
                style={cssVars({
                  '--musie-card-depth': depth,
                  '--musie-card-scatter-x': card.scatter.x,
                  '--musie-card-scatter-y': card.scatter.y,
                  '--musie-card-scatter-tilt': card.scatter.tilt,
                  '--musie-throw-dir': arriving?.id === id ? arriving.dir : 0,
                  ...(isFront && drag !== null
                    ? {
                        '--musie-drag-x': drag.x,
                        '--musie-drag-y': drag.y,
                        '--musie-card-swing': drag.swing,
                      }
                    : {}),
                })}
              >
                <CardFace card={card} />
              </div>
            );
          })}

          {/* The cards in the air. Outside `order` entirely — the pile has
              already closed up behind them. */}
          {departing.map((flight) => {
            const card = byId.get(flight.id);
            if (card === undefined) return null;
            return (
              <div
                key={flight.key}
                className="musie-deck__card"
                data-throwing="true"
                data-accent={card.accent}
                aria-hidden="true"
                onAnimationEnd={() =>
                  setDeparting((rest) => rest.filter((other) => other.key !== flight.key))
                }
                style={cssVars({
                  '--musie-card-depth': 0,
                  '--musie-card-scatter-x': card.scatter.x,
                  '--musie-card-scatter-y': card.scatter.y,
                  '--musie-card-scatter-tilt': card.scatter.tilt,
                  '--musie-drag-x': flight.x,
                  '--musie-drag-y': flight.y,
                  '--musie-card-swing': flight.swing,
                  '--musie-throw-dir': flight.dir,
                })}
              >
                <CardFace card={card} />
              </div>
            );
          })}
        </div>

        <div className="musie-deck__controls">
          <IconButton
            glyph={ChevronLeft}
            label={t('poc.deck.previous')}
            onClick={takeBack}
          />
          {/*
            THE COUNTER IS THE LIVE REGION. A throw changes what is on top and
            nothing else on screen says so, so the one place that names the
            front card announces it. `polite`, because a card being thrown is
            never urgent, and it carries the feeling as well as the number —
            "5 / 9" alone tells a screen-reader user the pile moved but not
            what it moved to.
          */}
          <p className="musie-deck__counter" aria-live="polite">
            {t('poc.deck.position', {
              feeling: front?.feeling,
              index: String(cards.findIndex((card) => card.id === front?.id) + 1),
              total: String(cards.length),
            })}
          </p>
          <IconButton
            glyph={ChevronRight}
            label={t('poc.deck.next')}
            onClick={() => throwCard(1, { x: 0, y: 0, swing: 0, progress: 0 })}
          />
          <IconButton glyph={Shuffle} label={t('poc.deck.shuffle')} onClick={shuffle} />
        </div>

        <p className="musie-deck__hint">{t('poc.deck.hint')}</p>
      </div>
    </>
  );
}

function CardFace({ card }: { card: DeckCard }) {
  return (
    <div className="musie-deck__face">
      {/* The printed code is DATA — it is on the paper card — so it does not
          go through the catalogue, and it is never translated. */}
      <p className="musie-deck__code">{card.code}</p>
      <p className="musie-deck__feeling">{card.feeling}</p>
      <div className="musie-deck__rule" />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Custom properties in a `style` prop.
 *
 * React writes any `--*` key straight through to the element, but
 * `CSSProperties` does not model them, so the cast is the documented way to
 * say so rather than a hole in the typing. Numbers stay NUMBERS: every one of
 * them is unitless by design and gets its unit from a token in poc-deck.css.
 */
function cssVars(vars: Record<`--${string}`, number | string>): React.CSSProperties {
  return vars as React.CSSProperties;
}
