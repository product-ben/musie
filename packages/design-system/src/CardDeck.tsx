/**
 * Card Deck — Layer 2
 *
 * A pile of cards you deal with one at a time. SWIPE SIDEWAYS TO DEAL THE TOP
 * CARD AWAY — either way, and it leaves the way your hand went — and PRESS A
 * CARD TO TAKE IT.
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
 *   SIDEWAYS DEALS, WHICHEVER WAY. A swipe throws the top card off the stage
 *   the way the finger went — rotating, fading — and the card under it is
 *   live before it lands. Both directions do the same thing to the pile,
 *   which is what the overlay has been saying in one word since Ben asked for
 *   it: another card. One threshold for both (SWIPE_RATIO), and a flick arms
 *   either. The three asymmetries that used to protect the right swipe are
 *   gone with the door they were protecting.
 *
 *   The right swipe TURNED THE PILE BACK for half a day instead, and Ben had
 *   it on a phone: "when I swipe a card to the right, I expect it to fade away
 *   with a slight rotation, as right now perfectly implemented for swipe left,
 *   and the card I see below becoming active." A pile you deal with has one
 *   way through it; the hand decides which way the card is thrown, not which
 *   way the pile turns.
 *
 *   GOING BACK IS A BUTTON AND A KEY, and the one thing the gesture does not
 *   do. It is the undo for a card dealt past, drawn as the opposite of a deal:
 *   the card at the bottom of the pile comes back in over the leading edge.
 *   Nothing is gated behind it — a pile comes round again, so going back is a
 *   shortcut and never the only way to a card.
 *
 *   A PRESS COMMITS. `onAccept` is a press and never a swipe: on the card in
 *   front, on whatever the FACE puts the accept on (see `CardDeckItem`), or on
 *   the primary button in the action column. §7.24's rule still binds it — a
 *   commit with no confirm is only honest if what it commits is cheap to take
 *   back — and a press being the only way in is also what makes an accidental
 *   one unlikely: a press is a place, not a direction.
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
 * Both ways round the pile are real buttons, always in the DOM, and Arrow
 * Right and Arrow Left do the same two things.
 *
 * THE ACCEPT IS THE ONE THE DECK NO LONGER DRAWS (Ben, 2026-10-05). It had a
 * primary button in the action column, and once a face could put one on the
 * card that was the same action twice in two sizes a hand's width apart. So
 * the deck's half of the promise is now Enter on the pile — which a keyboard
 * and a screen reader both reach — and the VISIBLE half belongs to the face,
 * through the accept it is handed. The app's exercise card draws it; a
 * consumer that draws nothing still has the press, the key, and a pile that
 * says so in its own label.
 *
 * ── EVERY WORD IT SPEAKS IS THE CONSUMER'S ───────────────────────────────
 * There are no label defaults here, not even from the locale catalogue. A deck
 * whose action is "start" in one product and "keep" in the next cannot have a
 * sensible default for it, and a component that guessed would be wrong in a
 * way nobody noticed until it shipped. The two DIRECTIONS carry the deck's own
 * arrows, because which way is back is not a product decision.
 *
 * ── ON A PHONE THE PAIR IS THE GUTTERS (Ben, 2026-11-11) ──────────────────
 * Below --bp-sm the two directions stop being a pair of buttons under the
 * card and become the two strips of screen either side of it, each the full
 * height of the stack: "the action is triggered over tapping on the right
 * side next to the card". Under the card they were a second thing to find,
 * a thumb's length below the thing they move; beside it they are where a
 * thumb already is. The visible part is a quiet chevron in the middle of each
 * strip, and the whole strip is the target. At --bp-sm and up the pair
 * stayed beside the card, at the foot of the stack, until 2026-11-13 („show
 * the arrows left and right on all viewports"): the gutters are the pair at
 * every width now, one `--musy-deck-gutter` wide where the card stops
 * growing, and the IconButton pair below is never drawn.
 *
 * What it costs is the swipe's landing area on a phone. The gutters used to
 * be part of the swipe surface — "a thumb that lands wide of a card still
 * means that card" — and they are buttons now, and a press on a button never
 * starts a drag. On a phone the swipe starts ON the card.
 *
 * ── THE COVER IS A CARD, AND IT LEAVES LIKE ONE (Ben, 2026-11-11) ────────
 * The `cover` — an extra card on top of the pile, the /exercises legend —
 * never moved. It sat on the pile looking exactly like a card, so people did
 * to it what they do to a card, and it did nothing until it was pressed.
 * Now the deck's own drag, thresholds and fling apply to it: it follows the
 * finger, flies out either way past the threshold, springs back below it, and
 * every direction the deck answers — the pair, the gutters, the arrow keys,
 * a sideways scroll, a dot — sends IT away instead of moving the pile under
 * it. `onCoverDismiss` says when it has gone. The pile underneath does not
 * move: the first card is on top when the cover has left, exactly as it was.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dots } from './Dots';
import { Icon } from './Icon';
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

/** How far a horizontal scroll travels before the pile moves one card.
 *
 *  NOT `SLOP_PX`, and not a fraction of the card either. A trackpad reports
 *  distance the hand never travelled — one short two-finger flick is a burst
 *  of events summing to several hundred px — so this is a number about the
 *  INPUT, not about the card, and it is the only threshold here that is.
 *  60px is roughly the smallest deliberate nudge that is not a tremor. */
const WHEEL_STEP_PX = 60;

/** How long the wheel stream must be quiet before the next card can move.
 *
 *  A FALLBACK, NOT THE MAIN RULE — and it was the main rule for one commit,
 *  which is why repeating the gesture quickly did nothing (Ben, 2026-10-09).
 *  A trackpad coasts for up to a second after the fingers lift, every coasting
 *  event rearms this timer, and so a second flick arriving mid-coast was
 *  swallowed by a latch waiting for a silence that the FIRST flick was still
 *  preventing. Silence only arrives when somebody stops scrolling altogether,
 *  which is the one case this still covers. */
const WHEEL_SETTLE_MS = 140;

/** How much bigger than the event before it a delta must be to count as a new
 *  push rather than the tail of the last one.
 *
 *  MOMENTUM ONLY EVER DECAYS. That is the whole discriminator, and it is a
 *  fact about the hardware rather than a tuned number: a coasting trackpad
 *  hands back a monotonically shrinking delta at ~60fps, so anything that
 *  climbs is a hand that pushed again. The ratio is the tolerance for a stream
 *  that is not perfectly monotonic — 1.6 is comfortably above the jitter and
 *  comfortably below a real second flick, which arrives several times the size
 *  of whatever the tail had decayed to. */
const WHEEL_RISE_RATIO = 1.6;

/** How far below its own peak the stream must fall before a rise is allowed to
 *  mean anything.
 *
 *  A RISE ALONE IS NOT ENOUGH, and this is the half that was missing. A single
 *  flick is not monotonic while the fingers are still moving — a push of
 *  30, 70, 110 climbs 1.57× on its own, a hair under the ratio above, and a
 *  slightly harder flick clears it and deals a second card nobody asked for.
 *  Measured: 3 flicks dealt 26 cards before this existed.
 *
 *  Coasting is the thing that cannot be faked: whatever the fingers did, the
 *  tail that follows them falls away. So a rise only counts once the stream
 *  has dropped under half of this gesture's own biggest delta, which is the
 *  shape of a flick ending and nothing else. */
const WHEEL_DECAY_RATIO = 0.5;

/** The least time that can separate two cards, in ms.
 *
 *  THE ONLY THING HERE THAT IS NOT A GUESS ABOUT THE STREAM. Everything above
 *  reads gesture boundaries out of delta sizes, and sizes cannot carry that
 *  meaning on their own: inside ONE swipe the fingers slow and speed up again,
 *  which is indistinguishable from a tail followed by a fresh push — so a
 *  variable-speed flick dealt two or three cards (Ben, 2026-10-09).
 *
 *  A SECOND GESTURE COSTS A HAND. Fingers have to leave the pad and come back,
 *  and that takes longer than any wobble inside a single swipe. So no two
 *  cards may be dealt closer together than this, whatever the deltas say, and
 *  nothing accumulates while it is running — otherwise a long tail banks up
 *  and spends itself the moment the window closes.
 *
 *  280ms is comfortably under a real lift-and-replace and comfortably over the
 *  tens of milliseconds a mid-swipe speed change takes. It is a floor on the
 *  gesture, not a cooldown on the deck: one card per gesture is Ben's rule,
 *  AT ANY SPEED. */
const WHEEL_GESTURE_MIN_MS = 280;

/**
 * What a face is handed when it is written as a FUNCTION — the deck's own
 * accept, for a face that would rather place it than be drawn over.
 */
export interface CardDeckCard {
  /** Take this card. The same accept a press on the card makes: the card
   *  lifts, the deck goes inert, and a refusal brings it back. */
  accept: () => void;
  /** True when this card cannot be taken — the deck is busy, or this is not
   *  the card in front. Pass it to whatever you render. */
  disabled: boolean;
}

export interface CardDeckItem {
  id: string;
  /**
   * The card's face. The deck owns the stack; the consumer owns the card.
   *
   * ── A FUNCTION, IF THE FACE WANTS THE ACCEPT ON IT (Ben, 2026-10-05) ─────
   * The deck drew its own small button into the card's bottom-trailing corner
   * for half a day, and absolutely positioned over a face it knows nothing
   * about is a bad place for a button to live: at 320px the German time string
   * on the reference card ran 18px UNDER it, and the English one had 4px to
   * spare. Everything that could have saved it — a published inline clearance,
   * a reserved fraction of the row, a width on the text — is arithmetic
   * between two boxes that were never laid out together.
   *
   * So the deck hands the action over instead. A face written as a function
   * gets `accept` and `disabled` and puts the control in its OWN row, where
   * ordinary layout keeps the two apart and ordinary alignment puts them on
   * one baseline. Nothing is lost by ignoring it: the accept is still a press
   * on the card, still a button in the action column, still Enter.
   */
  content: React.ReactNode | ((card: CardDeckCard) => React.ReactNode);
  /** 1 or 2 — Layer 1's accent family. Fixed by the consumer, so a card
   *  keeps its colour when the pile is reordered. Two, not three, since
   *  2026-10-10: Layer 1 carries two chromatic scales, green and terracotta,
   *  and `accent-3` went with the purple one. */
  accent?: 1 | 2;
}

export interface CardDeckProps {
  items: CardDeckItem[];
  /**
   * Pressed — the card itself, the button the deck draws on it, the primary
   * button in the action column, or Enter. The consequential one, and the only
   * one no gesture can reach.
   */
  onAccept: (id: string) => void;
  /** Swiped — EITHER WAY — pressed, or Arrow Right. The card is thrown off the
   *  stage and goes to the back of the pile; the next one comes up. Carries the
   *  id of the card that was dealt. */
  onNext: (id: string) => void;
  /** Pressed, or Arrow Left — never swiped. The card at the BACK of the pile
   *  comes back to the top, which is the undo for a card dealt past. Carries
   *  the id of the card that was on top when it happened. */
  onPrevious: (id: string) => void;
  /**
   * What the overlay says while a card is being dealt — the card you are going
   * TO, which is the same card whichever way the hand went — and the right-hand
   * icon button's accessible name and tooltip. REQUIRED.
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
   * Extra controls under the deck's own, in the same stack.
   *
   * The deck owns the accept and the two directions because it owns what they
   * do to the pile. Anything else a screen offers about the deck as a whole —
   * pick one for me, and nothing else so far — has no business being a prop
   * here, and every business being in the same column so it reads as one set
   * of choices.
   */
  actions?: React.ReactNode;
  /* NO `navActions` ANY MORE (Ben, 2026-11-11). It put extra icon controls
     in the nav row beside the two directions, and its one caller — the help
     button on /exercises — moved to that screen's toolbar (D9 in
     docs/plans/exercises-ready-to-build.md). Its premise went too: below
     --bp-sm the two directions are the gutters either side of the card, so
     "beside the two directions" stopped being a place. Deprecated and
     removed the same day, once the last usage was out. */
  /**
   * ── AN EXTRA CARD ON TOP OF THE PILE ────────────────────────────────────
   *
   * Rendered in the pile's one grid cell, above every card and at the card's
   * own size and radius. For something that is ABOUT the pile and has to be
   * seen against it — the first-use legend on /exercises, which is what this
   * is for.
   *
   * NOT `children` AND NOT A PORTAL. The pile is the only box that knows how
   * wide a card is (`--musy-deck-card-inline`) and how tall the tallest face
   * came out, and a consumer positioning something over the deck from outside
   * would be measuring both — in a layout that reflows with the copy, in two
   * languages. Handing the slot the card's own cell costs the consumer
   * nothing and cannot drift.
   *
   * WHAT IT DOES NOT DO: it carries no state and no styling of its own, and
   * the deck still has no opinion about when an extra card has been READ.
   * A press on it reaches whatever is in it, untouched — the legend's own
   * press-to-dismiss is the legend's.
   *
   * ── BUT IT MOVES LIKE A CARD (Ben, 2026-11-11) ──────────────────────────
   * It used to sit still and carry no dismissal at all. It now takes the
   * deck's drag, thresholds and fling — follows the finger, flies out the
   * way the hand went past SWIPE_RATIO or a flick, springs back below — and
   * the directions send it away instead of turning the pile under it: the
   * pair and the gutters, Arrow Left and Right, a sideways scroll, a dot. It
   * still has no dot and no position of its own; `positionLabel` stays about
   * the cards.
   *
   * THE DECK NEVER UNMOUNTS IT. Once it has left, the deck stops drawing it
   * and calls `onCoverDismiss`; taking it away is the consumer's. A cover
   * that is still passed after that is NOT drawn again until `cover` has been
   * undefined once — the deck cannot tell a new cover from the old one by
   * identity, because every render of the consumer hands it a new element.
   */
  cover?: React.ReactNode;
  /**
   * The cover has left. Called ONCE, when its flight has LANDED rather than
   * when it was let go, so the consumer can unmount it without cutting the
   * animation short — under reduced motion that is a millisecond later.
   *
   * `'next'` when it went out over the leading edge — a left swipe, Arrow
   * Right, the forward button or gutter, a rightward scroll — and
   * `'previous'` over the trailing one: the way a CARD leaves when that
   * button deals it, so the two words mean what the pair already means.
   *
   * A press on the cover's own content is not this. That reaches the
   * content, and whatever the content does about it is its own.
   */
  onCoverDismiss?: (direction: 'previous' | 'next') => void;
  /** True while an accept is in flight. See the contract at the top. */
  busy?: boolean;
  /**
   * Change it and the pile deals itself in.
   *
   * ── IT IS A KEY, NOT A TRIGGER ──────────────────────────────────────────
   * A boolean `dealing` would make the consumer own the animation's LIFETIME
   * — set it true, then remember to set it false, and guess when. A key says
   * only what happened: this is a different pile from the one before. The
   * deck decides what that costs and when it is over.
   *
   * Undefined never deals, so a deck that simply exists does not animate.
   * Any defined value that differs from the last one deals — INCLUDING the
   * first, because a deck mounted in answer to a choice is the common case
   * and it must not be the silent one. /exercises passes the chosen goal.
   *
   * Changing `items` does NOT deal on its own: a pile that re-dealt whenever
   * a card was added would animate on every refetch.
   */
  dealKey?: string;
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
  /** Whether this gesture moves the COVER rather than the pile. Decided at
   *  the press and kept: a cover sent away mid-gesture — by a key, say — must
   *  not hand the rest of the gesture to the card that was under it. */
  onCover: boolean;
}

/** Where a card is when it is let go of — the three numbers the stylesheet
 *  needs to carry on from under the finger. */
interface Flight {
  x: number;
  y: number;
  swing: number;
}

/** A throw from a standstill, for the button and the key that do the same job
 *  as the gesture. It leaves the way a dealt card leaves when nobody has said
 *  otherwise: off the leading edge. */
const STILL: Flight = { x: 0, y: 0, swing: 0 };

interface Drag extends Flight {
  /** How far the pile behind has closed up, 0…1. */
  progress: number;
  /**
   * Which way the finger is going, from the first pixel past the slop.
   *
   * THE HAND'S DIRECTION, NOT AN ACTION. Both ways deal the same card off the
   * same pile; this is what the card is thrown along and which edge the
   * overlay's word sits on, and nothing else.
   */
  dir: 'left' | 'right';
  /** How much of the overlay is showing, 0…1. Full long before `armed`. */
  reveal: number;
  /** True once a release would move the pile. */
  armed: boolean;
  /** True when the thing under the finger is the cover. Then `progress` and
   *  `reveal` stay 0: the pile does not rise and the overlay does not show,
   *  because nothing is happening to the pile. */
  cover: boolean;
}

/** The cover on its way out — and, once `landed`, out, and waiting for the
 *  consumer to take it away. */
interface CoverExit extends Flight {
  /** As `Departing.dir`: -1 off the leading edge, 1 off the trailing one. */
  dir: 1 | -1;
  landed: boolean;
}

interface Departing extends Flight {
  /** Unique per throw, NOT the id: a fast thumb can have one card in flight
   *  twice, once per lap of a short deck. */
  key: number;
  id: string;
  /** -1 off the leading edge, 1 off the trailing one — whichever way the hand
   *  threw it. The stylesheet multiplies a viewport's width by it. */
  dir: 1 | -1;
}

export function CardDeck({
  items, onAccept, onNext, onPrevious,
  nextLabel, previousLabel, cover, onCoverDismiss,
  label, positionLabel, actions, busy = false, dealKey, className,
}: CardDeckProps) {
  const [order, setOrder] = React.useState<string[]>(() => items.map((i) => i.id));
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [departing, setDeparting] = React.useState<Departing[]>([]);
  /** The card on its way back in from the bottom of the pile. One at a time:
   *  it is the card in front by the time it lands, and there is only ever one
   *  of those. */
  const [arriving, setArriving] = React.useState<{ key: number; id: string } | null>(null);
  /** The card that was accepted and is waiting on the consumer. */
  const [sent, setSent] = React.useState<string | null>(null);
  /** The whole pile is dealing itself in. Cleared when the deepest card lands. */
  const [dealing, setDealing] = React.useState(false);
  /** The cover's way out. Null while it is up — or while there is none. */
  const [coverExit, setCoverExit] = React.useState<CoverExit | null>(null);

  const gesture = React.useRef<Gesture | null>(null);
  const coverBox = React.useRef<HTMLDivElement>(null);
  /** The click a cover drag leaves behind, to be swallowed. See `onPointerUp`. */
  const swallowClick = React.useRef(false);
  const throwKey = React.useRef(0);
  const arriveKey = React.useRef(0);
  /* STARTS UNDEFINED RATHER THAN AT `dealKey`, which is what makes the first
     defined value deal. Initialising it to the prop would mean a deck mounted
     with a key already set never animated — and that is precisely the moment
     /exercises wants the deal, because the deck is mounted BY the choice. */
  const dealt = React.useRef<string | undefined>(undefined);
  const pile = React.useRef<HTMLDivElement>(null);
  /**
   * The scroll gesture's latch, on a ref because it MUST OUTLIVE THE LISTENER.
   *
   * FOUND BY DRIVING A REAL BURST, not by reading. These three were locals
   * inside the effect, which looked right and dealt five cards on one flick:
   * the effect depends on `frontId`, dealing a card changes `frontId`, so the
   * effect tore down and re-attached with `spent` back to false — and the
   * momentum still arriving spent itself one card at a time. The pile cycled
   * back to where it started, which is why it read as nothing happening.
   *
   * A ref is the whole fix: the listener may be rebuilt as often as it likes
   * and the gesture it is halfway through is still the same gesture.
   */
  const wheeling = React.useRef<{
    travelled: number;
    spent: boolean;
    /** The last delta seen, SIGNED: its size is what a new push has to climb
     *  above, and its sign is what a reversal is measured against. */
    last: number;
    /** The biggest delta this gesture has produced, and whether the stream has
     *  since fallen away from it. Together they are "the flick has ended". */
    peak: number;
    decayed: boolean;
    /** When the last card was dealt, on the event clock. Survives `rearm`:
     *  it is a fact about the deck, not about the gesture in progress. */
    dealtAt: number;
    settle: ReturnType<typeof setTimeout> | undefined;
  }>({ travelled: 0, spent: false, last: 0, peak: 0, decayed: false, dealtAt: 0, settle: undefined });

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

  /* A NEW KEY DEALS THE PILE. The ref holds the key the current pile was
     dealt for, so a re-render with the same key is not a second deal — which
     matters because this component re-renders on every frame of a drag. */
  React.useEffect(() => {
    if (dealKey === undefined || dealKey === dealt.current) return;
    dealt.current = dealKey;
    setDealing(true);
  }, [dealKey]);

  /* A COVER THAT HAS GONE STAYS GONE UNTIL THE CONSUMER LETS GO OF IT. The
     exit is forgotten only when `cover` goes undefined, so the next cover the
     consumer passes — help pressed on /exercises — is a new one and comes up.
     Identity cannot say that: every render hands the deck a new element. */
  const hasCover = cover !== undefined;
  React.useEffect(() => {
    if (!hasCover) setCoverExit(null);
  }, [hasCover]);

  /**
   * ── EVERY CARD STAYS THE SAME ELEMENT FOR AS LONG AS IT IS IN `items` ────
   * `order` is the PILE's order and nothing else: it is never what the cards
   * are rendered in, and the accepted card is never dropped out of it. Both
   * halves of that are the same lesson, learned twice.
   *
   * The accepted card used to be rendered as a second element while the pile
   * dropped its id, and a freshly inserted element has nothing to transition
   * FROM — so it did not lift and fade, it vanished, and came back the same
   * way. (The thrown cards get away with being their own element because they
   * ANIMATE, and an animation does run on insertion. A transition does not.)
   *
   * And the list was rendered in `order` itself, so turning the pile reordered
   * the DOM — which React does by MOVING nodes, and a move is a remove and an
   * insert, and an element that leaves the document loses every transition it
   * had running. See `depthOf` further down.
   */
  /** The card you are dealing with: the first one that is not on its way out. */
  const frontId = order.find((id) => id !== sent);
  const inert = busy || sent !== null;
  /** A pile of one has no other card to go to, in either direction. */
  const browsable = order.filter((id) => id !== sent).length > 1;
  /** The cover is on the pile and has not been sent anywhere: every move the
   *  deck answers is the cover's until it goes. */
  const coverUp = hasCover && coverExit === null;

  /**
   * ── THE COVER LEAVES THE WAY A CARD IS DEALT ────────────────────────────
   * From where the finger left it, or from a standstill for the buttons and
   * keys, along `dir`. It stays the SAME ELEMENT for its flight — not a copy
   * in a throw layer, as a dealt card is — because what is in it is the
   * consumer's and must not be mounted twice; the throw animation is applied
   * to it where it is. The pile under it is live the instant it is let go,
   * exactly as it is under a dealt card.
   *
   * IDEMPOTENT, because a fast double press on a gutter would otherwise send
   * a cover that is already in the air a second time.
   */
  const sendCover = React.useCallback((from: Flight, dir: 1 | -1) => {
    if (inert) return;
    setDrag(null);
    /* FOCUS COMES OUT FIRST. The cover goes inert for its flight, and an
       element made inert while it holds focus drops it on the document body
       — a keyboard user who sent the legend away with an arrow key would be
       sent back to the top of the page. The pile is where they were. */
    const box = coverBox.current;
    if (box !== null && box.contains(document.activeElement)) {
      pile.current?.focus({ preventScroll: true });
    }
    setCoverExit((current) => current ?? { x: from.x, y: from.y, swing: from.swing, dir, landed: false });
  }, [inert]);

  const accept = React.useCallback((id: string | undefined) => {
    if (id === undefined || inert) return;
    setSent(id);
    setDrag(null);
    onAccept(id);
  }, [inert, onAccept]);

  const next = React.useCallback((id: string | undefined, from: Flight, dir: 1 | -1 = -1) => {
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
    setDeparting((flying) => [...flying, { key: throwKey.current, id, ...from, dir }]);
    setOrder((current) => [...current.filter((x) => x !== id), id]);
    onNext(id);
  }, [browsable, inert, onNext]);

  /**
   * BACKWARD: the card at the bottom of the pile comes back in, the way a
   * dealt one leaves.
   *
   * ── A REORDER IS NOT AN ANIMATION, WHICH IS EXACTLY WHAT IT LOOKED LIKE ──
   * This did nothing but reorder for half a day, on the theory that the cards'
   * own transitions would carry it: the card under the finger eases back into
   * the pile, the bottom card eases up to the top, nothing to write. Ben:
   * "swiping right feels cut off — the card just disappears abruptly and the
   * next one appears."
   *
   * The reason is z-index, which is NOT interpolated. The arriving card is on
   * top from the first frame, covering the one easing back behind it, and its
   * own journey from the bottom of the pile is 32px and a 4% scale — nothing
   * to watch. All the motion there was, was hidden behind the one card that
   * barely moved.
   *
   * So the arrival is the THROW RUN BACKWARDS: in from the leading edge, where
   * a dealt card went, landing square. The card under the finger still eases
   * back into the pile at depth 1, and now you can see it do it, because the
   * card coming in is crossing the stage rather than sitting on it.
   */
  const previous = React.useCallback((id: string | undefined) => {
    if (id === undefined || inert) return;
    setDrag(null);
    if (!browsable) return;
    const back = order[order.length - 1];
    if (back === undefined) return;
    setOrder((current) => {
      const last = current[current.length - 1];
      return last === undefined ? current : [last, ...current.slice(0, -1)];
    });
    /* KEYED PER ARRIVAL. A CSS animation restarts when the attribute that
       carries it is added, and on a two-card pile the same id arrives twice in
       a row — the key is what makes the second one a new state rather than an
       attribute that never changed. */
    arriveKey.current += 1;
    setArriving({ key: arriveKey.current, id: back });
    onPrevious(id);
  }, [browsable, inert, onPrevious, order]);

  /**
   * ── STRAIGHT TO A CARD, WHICH THE PILE COULD NOT DO UNTIL NOW ────────
   * The dots become controls. Ben, 2026-10-09, answering the question
   * stories/OPEN-QUESTIONS.md left open when they were drawn: `Dots` has
   * always had `onSelect` and this component withheld it, because jumping
   * means reaching a position the pile had no move for — it dealt forward and
   * undid backward, and that was the whole model. This is the move, so it is a
   * change to what the pile can DO and not a prop that was missing.
   *
   * ── A ROTATION, SO THE PILE IS STILL A LOOP ─────────────────────
   * `order` is brought round until the chosen card is in front, and the cards
   * it passes keep their sequence. NOT a splice to the top: that would make
   * the dots a reordering tool, the pile would read differently after every
   * press, and the position the dots themselves report would stop meaning
   * anything. Deal on from any card and the rest follow in the order they
   * always had — which is what `next` and `previous` already do, one step at a
   * time, and this is the same rotation by more than one.
   *
   * ── THE SHORT WAY ROUND, AND THAT IS ONLY THE ANIMATION ────────────
   * Both branches set the SAME order — there is one rotation that puts a card
   * in front and no choice about it. What the distance decides is which way
   * the move is drawn: a card ahead leaves like a deal, a card behind arrives
   * like an undo. Going to the last dot of five therefore comes IN from the
   * leading edge rather than throwing four cards off, because one step back is
   * what it is.
   *
   * ── WHAT IT TELLS THE CONSUMER ────────────────────────────
   * `onNext` or `onPrevious`, once, with the id of the card being LEFT — which
   * is the argument both already carry. No `onJump`: a third callback would
   * make every consumer handle a third case to learn the one thing it already
   * learns from these two, that the pile moved and which way. The live region
   * reads `positionLabel` off the new order, so the announcement needs nothing
   * from here.
   */
  const jump = React.useCallback((at: number) => {
    const target = items[at]?.id;
    if (target === undefined || inert) return;
    setDrag(null);

    const from = order.indexOf(target);
    const ahead = from <= order.length - from;

    /* ── A DOT UNDER A COVER SENDS THE COVER TOO (2026-11-11) ────────────
       The other directions send the cover INSTEAD of moving the pile, because
       "the next one" under a cover means the cover. A dot does not say "the
       next one"; it names a card, and the only way to show a card that is
       under a cover is to take the cover off it. So both happen: the cover
       leaves the way the jump is drawn, and the pile jumps beneath it. The
       current dot sends the cover alone. */
    if (coverUp) sendCover(STILL, ahead ? -1 : 1);

    if (!browsable) return;

    /* Already in front, or not in the pile at all. Pressing the current dot is
       a no-op rather than a lap of the deck. */
    if (from <= 0) return;

    const leaving = order[0];
    const rotate = (current: string[]) => [...current.slice(from), ...current.slice(0, from)];

    if (ahead) {
      throwKey.current += 1;
      setDeparting((flying) => [...flying, { key: throwKey.current, id: leaving, ...STILL, dir: -1 }]);
      setOrder(rotate);
      if (leaving !== undefined) onNext(leaving);
      return;
    }

    setOrder(rotate);
    arriveKey.current += 1;
    setArriving({ key: arriveKey.current, id: target });
    if (leaving !== undefined) onPrevious(leaving);
  }, [browsable, coverUp, inert, items, onNext, onPrevious, order, sendCover]);

  /* THE TWO DIRECTIONS, AS EVERY CONTROL FOR THEM ASKS FOR THEM — the pair,
     the gutters, the keys and the scroll. Under a cover each one sends the
     cover the way that control deals a card: forward off the leading edge,
     back off the trailing one. */
  const goNext = React.useCallback(() => {
    if (coverUp) sendCover(STILL, -1);
    else next(frontId, STILL);
  }, [coverUp, frontId, next, sendCover]);

  const goPrevious = React.useCallback(() => {
    if (coverUp) sendCover(STILL, 1);
    else previous(frontId);
  }, [coverUp, frontId, previous, sendCover]);

  /**
   * ── THE SCROLL GESTURE ────────────────────────────────────────
   * A trackpad's two-finger sideways scroll moves the pile. Ben, 2026-10-09.
   *
   * ── IT IS DIRECTIONAL, AND THE SWIPE IS NOT ──────────────────────
   * The file header says both swipes deal the next card, and that going back
   * "is a button and a key, and the one thing the gesture does not do". That
   * still holds for the SWIPE, and it was decided on a phone: a pile of cards
   * under a thumb is a thing you throw, and the hand picks which way the card
   * goes, not which way the pile turns.
   *
   * A WHEEL IS NOT A THROW. Nothing leaves your hand, nothing has a direction
   * to be thrown in, and the mental model is a track you move ALONG — which is
   * why every horizontal scroller on the machine, this package's own Carousel
   * included, answers a rightward scroll with the next thing. So this gesture
   * is read the way the ARROW KEYS are read, which is the mapping this
   * component already has: right is `next`, left is `previous`.
   *
   * THE TWO CAN DISAGREE ON ONE LAPTOP, and that is the cost: a mouse DRAG
   * deals forward whichever way it goes, while a trackpad SCROLL goes back if
   * it goes left. Logged in stories/OPEN-QUESTIONS.md rather than resolved
   * here, because resolving it means re-opening a decision Ben made on a
   * device and this is not that change.
   *
   * ── A NATIVE LISTENER, BECAUSE REACT'S IS PASSIVE ────────────────
   * `onWheel` goes through React's root delegation, where `wheel` is attached
   * passively — `preventDefault()` from there is ignored and warns. It has to
   * be prevented: on macOS a horizontal overscroll is the BROWSER'S BACK
   * GESTURE, so without this a scroll that runs past the end of the pile
   * leaves the app. That is also why the listener sits on the pile rather than
   * on the stage: the smallest surface that owns the gesture.
   *
   * ── WHAT IT DECLINES TO TAKE ──────────────────────────────
   * A gesture more vertical than horizontal is the page's, and is not
   * prevented — a deck sits mid-page and a thumb scrolling past it must not
   * be caught. Neither is a gesture the pile could not answer: `inert`, or a
   * pile with nothing to turn to. Swallowing those would stop the page doing
   * what it would have done and give nothing back.
   */
  React.useEffect(() => {
    const element = pile.current;
    if (element === null) return undefined;

    const w = wheeling.current;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      /* A cover can always be sent, even off a pile of one: there is a card
         under it to show. */
      if (inert || !(browsable || coverUp)) return;

      event.preventDefault();

      const size = Math.abs(event.deltaX);
      const rearm = () => {
        w.travelled = 0; w.spent = false; w.last = 0; w.peak = 0; w.decayed = false;
      };

      clearTimeout(w.settle);
      w.settle = setTimeout(rearm, WHEEL_SETTLE_MS);

      /* INSIDE THE FLOOR NOTHING COUNTS — not the latch, not the distance. The
         travel is dropped rather than held so a tail cannot bank up and spend
         itself the instant the window closes. */
      if (event.timeStamp - w.dealtAt < WHEEL_GESTURE_MIN_MS) {
        w.travelled = 0;
        w.last = event.deltaX;
        return;
      }

      if (size < w.peak * WHEEL_DECAY_RATIO) w.decayed = true;

      if (w.spent) {
        /* COASTING, OR PUSHED AGAIN? A reversal is a hand and needs no ratio:
           nothing coasting changes sign. Otherwise it takes BOTH halves — the
           stream has to have fallen away from this gesture's peak, and then
           climbed back past the event before it. One without the other is a
           flick that is still going. */
        const reversed = Math.sign(event.deltaX) !== Math.sign(w.last);
        const pushedAgain = w.decayed && size > Math.abs(w.last) * WHEEL_RISE_RATIO;
        if (!reversed && !pushedAgain) {
          w.last = event.deltaX;
          return;
        }
        rearm();
      }

      w.last = event.deltaX;
      w.peak = Math.max(w.peak, size);
      w.travelled += event.deltaX;
      if (Math.abs(w.travelled) < WHEEL_STEP_PX) return;

      /* Latched here and not at the end of the burst, so the card moves while
         the fingers are still down and the coast that follows is spent on a
         gesture that has already been answered. */
      w.spent = true;
      w.dealtAt = event.timeStamp;
      /* Under a cover the flick sends the cover and is SPENT on it — the latch
         above is what stops the same flick's momentum dealing the card that
         was under it as well. */
      if (w.travelled > 0) goNext();
      else goPrevious();
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [browsable, coverUp, goNext, goPrevious, inert]);

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
    if (inert) return;
    const target = event.target as Element;
    /* ── WHILE A COVER IS UP, THE GESTURE IS THE COVER'S (2026-11-11) ──────
       Wherever on the stage it starts, as a card's is: a thumb that lands
       beside the cover still means the cover. The pile under it is not
       reachable by hand until it has gone. */
    const onCover = coverUp;
    const inCover = onCover && coverBox.current !== null && coverBox.current.contains(target);
    /* A button speaks for itself. The card's own accept is one, which makes
       its corner a dead spot for the gesture — small, inset, and the one
       place on the card where a press is already the right answer. The
       gutters are two more (2026-11-11), which is what keeps a press there
       from ever starting a drag: they are the whole strip, so there is no
       part of them that is not a button.

       EXCEPT INSIDE THE COVER. The legend on /exercises IS a button, edge to
       edge, so this rule would make the cover undraggable from anywhere on
       it. Inside the cover a gesture starts even on a button, and a PRESS
       still reaches the button: the pointer is captured only once the axis
       is decided, so a tap that never travelled lands where it fell. */
    if (!inCover && target.closest('button') !== null) return;
    if (!onCover && frontId === undefined) return;
    const card = target.closest('.musy-deck__card');
    gesture.current = {
      x: event.clientX, y: event.clientY, axis: 'undecided',
      width: pile.current?.offsetWidth ?? event.currentTarget.offsetWidth,
      lastX: event.clientX, lastT: event.timeStamp, vx: 0,
      /* WHETHER A PRESS HERE MEANS THE CARD. The stage is wider than the pile
         on purpose, and a thumb that lands beside a card still swipes it; it
         must not also START it. A consequential action does not get an
         invisible target either side of the thing it acts on. Never under a
         cover: the card is not what the press landed on. */
      onFront: !onCover && card !== null && card.getAttribute('data-front') === 'true',
      onCover,
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
      /* THE PILE CLOSES UP EITHER WAY, because either way the card under this
         one is the card about to be on top. It was forward-only while a right
         swipe turned the pile back, where the rise would have promised the
         wrong card.

         NOT UNDER A COVER. The card under the cover is ALREADY the one on
         top, and stays it: a rise there would shuffle the pile one place up
         for a move that does not move it. Nor does the overlay show — it
         names the next card, and the cover leaving brings no next card. */
      progress: g.onCover ? 0 : Math.min(1, reach / PILE_CLOSES_AT),
      dir: travelled < 0 ? 'left' : 'right',
      reveal: g.onCover ? 0 : Math.min(1, reach / OVERLAY_FULL_AT),
      armed: reach >= SWIPE_RATIO,
      cover: g.onCover,
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

    /* ── THE COVER: SAME THRESHOLD, SAME FLICK, ITS OWN EXIT ─────────────
       Out the way the hand went, or back where it was. Nothing is dealt:
       the pile under it is the pile it covered.

       AND THE CLICK THIS DRAG LEAVES BEHIND IS SWALLOWED. The drag started
       on the cover's content, which on /exercises is a button that dismisses
       on click, and a mouse released after a drag still produces a click.
       Most engines send it to the capture target rather than the button, and
       "most" is not a thing to leave a sprung-back legend dismissing itself
       on. The flag lives for ONE TASK — the click follows the pointerup in
       the same one — so it can never outlast this gesture and eat a click
       from the keyboard, which arrives with no pointer at all. */
    if (g.onCover) {
      swallowClick.current = true;
      setTimeout(() => { swallowClick.current = false; }, 0);
      if (coverUp && (drag.armed || flicked)) sendCover(drag, drag.dir === 'left' ? -1 : 1);
      else setDrag(null);
      return;
    }

    if (drag.armed || flicked) {
      /* THE CARD IS THROWN THE WAY THE HAND WENT, and the pile turns the one
         way it turns. The direction is the only thing the two swipes differ
         in. */
      next(frontId, drag, drag.dir === 'left' ? -1 : 1);
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

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inert) return;
    const target = event.target as Element;
    const arrow = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
    /* A BUTTON SPEAKS FOR ITSELF — the same rule the pointer follows, and it is
       here for a reason that only arrived with the card's own accept: that
       button is INSIDE the pile, so Enter on it raises the button's click AND
       bubbles to this handler. Both call `accept`, and whether the second one
       is refused depends on React having flushed `sent` between the keydown and
       the click — which it does today, and which is not a thing to leave a
       one-way door standing on.

       THE ARROWS FROM INSIDE A COVER ARE THE EXCEPTION (2026-11-11), for the
       pointer's reason: the legend is a button from edge to edge, so focus on
       it is focus on a button, and a keyboard user there could otherwise send
       it away only by pressing it. An arrow on a button does nothing of its
       own, so nothing is raised twice. */
    const fromCover = coverUp && coverBox.current !== null && coverBox.current.contains(target);
    if (target.closest('button') !== null && !(fromCover && arrow)) return;
    /* ENTER TAKES THE CARD, and the two arrow keys are the two buttons: Right
       deals the next card, Left brings back the one dealt before it. The
       gesture only goes forward — both swipes deal — so Left is the one move
       no gesture makes, which is exactly why it has a key and a button.

       NOT UNDER A COVER (2026-11-11). Enter used to take the card the cover
       was hiding — an exercise started from a card nobody could see. The
       arrows send the cover instead; Enter waits for it to go. */
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!coverUp) accept(frontId);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevious();
    }
  };

  const onCoverAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    /* ITS OWN THROW AND NOTHING ELSE. Animation events bubble, and what is in
       the cover animates on its own account — the legend fades in — which
       would otherwise land a cover that has not left. */
    if (event.target !== event.currentTarget || event.animationName !== 'musy-deck-throw') return;
    if (coverExit === null || coverExit.landed) return;
    setCoverExit({ ...coverExit, landed: true });
    onCoverDismiss?.(coverExit.dir === -1 ? 'next' : 'previous');
  };

  /** The drag, when it is a CARD's. The front card and the pile read this;
   *  the cover reads `drag` itself. */
  const cardDrag = drag !== null && !drag.cover ? drag : null;

  const position = items.findIndex((i) => i.id === frontId) + 1;

  const face = (item: CardDeckItem, isFront: boolean) => (
    <div className="musy-deck__face">
      {typeof item.content === 'function'
        ? item.content({
            accept: () => accept(item.id),
            /* A CARD THAT IS NOT IN FRONT CANNOT BE TAKEN, and the face is
               told so rather than left to work it out from a position it is
               not given. Belt and braces with the `inert` below: this is what
               makes the control LOOK unavailable, that is what stops it being
               reached. */
            disabled: inert || !isFront,
          })
        : item.content}
    </div>
  );

  const vars = (extra: Record<string, number>) => extra as React.CSSProperties;

  /**
   * HOW DEEP EACH CARD IS — and the reason it is a MAP rather than the index
   * of the loop below.
   *
   * ── THE DOM ORDER IS THE CONSUMER'S, AND THE PILE'S ORDER IS A NUMBER ────
   * The cards used to be rendered in `order`, so turning the pile reordered the
   * DOM. React reconciles a keyed list by MOVING nodes, a move is a remove and
   * an insert, and an element that leaves the document loses every running
   * transition — so the card that had just been let go of snapped into its new
   * place instead of easing there. Measured: 130px of travel gone in one frame,
   * where the same card springing back from a drag that did not reorder
   * anything eases over 220ms like everything else. It was invisible going
   * forward, because the card that leaves has a throw layer of its own, and it
   * was the whole of Ben's "swiping right feels cut off".
   *
   * So the list below is `items` — the consumer's order, which only changes
   * when the consumer changes it — and the pile is expressed entirely by
   * `--musy-card-depth` and the z-index built from it. Nothing moves, so
   * nothing is interrupted, and the cards behind now settle into their new
   * depths as well.
   */
  const depthOf = new Map<string, number>();
  {
    let d = -1;
    for (const id of order) {
      const leaving = id === sent;
      if (!leaving) d += 1;
      /* The card on its way out keeps depth 0 — it is leaving from the top —
         and the pile closes up as though it had already gone. */
      depthOf.set(id, leaving ? 0 : d);
    }
  }

  /* The last card to land when the pile deals, because the stagger is the
     depth. Its animationend is what ends the deal — counting every card's
     would need a tally, and a timeout would need this file to know a duration
     that lives in the stylesheet. */
  const deepest = Math.max(0, ...depthOf.values());

  return (
    <div
      className={['musy-deck', className ?? ''].filter(Boolean).join(' ')}
      data-busy={inert || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
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
            style={vars({ '--musy-deck-progress': cardDrag?.progress ?? 0 } as never)}
            onKeyDown={onKeyDown}
          >
            {items.map((item) => {
              const id = item.id;
              const isSent = id === sent;
              const isFront = id === frontId;
              /* An item the pile has not taken in yet — one render, at most,
                 before the effect above puts it at the back. It is drawn there
                 in the meantime rather than on top of everything. */
              const depth = depthOf.get(id) ?? items.length;
              return (
                <div
                  key={id}
                  className="musy-deck__card"
                  data-front={isFront}
                  data-sent={isSent || undefined}
                  aria-hidden={isSent || undefined}
                  data-accent={item.accent ?? 1}
                  data-swiping={isFront && cardDrag !== null}
                  data-arriving={arriving?.id === id || undefined}
                  data-dealing={dealing || undefined}
                  onAnimationEnd={(event) => {
                    /* BY NAME, because three animations can end on this same
                       element and they mean different things. Without the
                       check a deal landing on the arriving card would clear
                       the arrival early, and the card would cut rather than
                       fly. */
                    if (event.animationName === 'musy-deck-deal') {
                      if (depth === deepest) setDealing(false);
                      return;
                    }
                    setArriving((current) => (current?.id === id ? null : current));
                  }}
                  /* ── EVERY CARD BUT THE ONE IN FRONT IS INERT ──────────────
                     A face may now put a button on itself, and four more of
                     them stacked behind the top card would be four tab stops
                     nobody can see. `inert` takes the whole subtree out of the
                     tab order AND out of the accessibility tree, which is also
                     the right answer for the text: this deck deals one card at
                     a time, and a screen reader hearing five faces at once was
                     hearing the pile rather than the card. The live region
                     names the one in front as it changes.

                     It does not touch the gesture: the handlers are on the
                     stage, so a thumb landing on a card behind still swipes
                     the pile — it simply no longer lands on a card.

                     AND UNDER A COVER THE ONE IN FRONT IS TOO (2026-11-11).
                     Its Start button was a tab stop the cover was sitting on:
                     focus landed on a control nobody could see (2.4.11). It
                     comes back the instant the cover is let go, which is the
                     same instant a card under a dealt one goes live. */
                  inert={!isFront || isSent || coverUp}
                  style={vars({
                    '--musy-card-depth': isSent ? 0 : depth,
                    ...(isFront && cardDrag !== null
                      ? { '--musy-drag-x': cardDrag.x, '--musy-drag-y': cardDrag.y, '--musy-card-swing': cardDrag.swing }
                      : {}),
                  } as never)}
                >
                  {face(item, isFront && !isSent)}

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
                      data-dir={cardDrag?.dir ?? undefined}
                      aria-hidden="true"
                      style={vars({ '--musy-card-reveal': cardDrag?.reveal ?? 0 } as never)}
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
                    '--musy-card-depth': 0,
                    '--musy-drag-x': flight.x, '--musy-drag-y': flight.y,
                    '--musy-card-swing': flight.swing, '--musy-throw-dir': flight.dir,
                  } as never)}
                >
                  {face(item, false)}
                </div>
              );
            })}

            {/* ── THE EXTRA CARD ─────────────────────────────────────────
                Last in the pile and in its one cell, so it is over every card
                including one mid-flight. The deck gives it the card's box and,
                since 2026-11-11, the card's movement — and still no state and
                no styling of its own; see the prop.

                WRAPPED, and that is not ceremony: the cell is claimed by
                `grid-area: card`, and a consumer's node cannot carry that
                without being handed a design-system class to put on itself.
                Measured before the wrapper existed — the legend landed BELOW
                the card at its own content height instead of over it. The
                wrapper is the grid item; what goes inside it stretches.

                THE WRAPPER IS ALSO WHAT MOVES. The drag and the throw are
                transforms on it, so whatever the consumer put inside travels
                with it untouched — and keeps animating on its own account,
                which is why its animationend is checked by name.

                INERT FOR ITS FLIGHT, as a dealt card is aria-hidden for its
                own: it is leaving, and nothing in it should be reachable on
                the way out. */}
            {hasCover && coverExit?.landed !== true && (
              <div
                ref={coverBox}
                className="musy-deck__cover"
                data-swiping={(coverUp && drag?.cover === true) || undefined}
                data-throwing={coverExit !== null || undefined}
                inert={coverExit !== null}
                onAnimationEnd={onCoverAnimationEnd}
                style={vars(
                  coverExit !== null
                    ? {
                        '--musy-drag-x': coverExit.x, '--musy-drag-y': coverExit.y,
                        '--musy-card-swing': coverExit.swing, '--musy-throw-dir': coverExit.dir,
                      }
                    : coverUp && drag?.cover === true
                      ? { '--musy-drag-x': drag.x, '--musy-drag-y': drag.y, '--musy-card-swing': drag.swing }
                      : {},
                )}
              >
                {cover}
              </div>
            )}
          </div>

          {/* ── THE GUTTERS (Ben, 2026-11-11) ──────────────────────────────
              The pair, at every width since 2026-11-13 (below --bp-sm only
              until then). Each is the whole strip of screen between the card
              and the edge — one `--musy-deck-gutter` wide from --bp-sm up —
              the full height of the stack, with a quiet chevron in the middle
              of it: the stylesheet places them.

              THE WHOLE STRIP IS THE BUTTON, not a hit area stretched out of a
              44px one. IconButton owns its own box, and widening it from here
              would be the deck reaching into another component's geometry —
              so the strip is the deck's own button and the chevron is drawn
              in it, in the ghost rung's own tokens. A press anywhere in it is
              a press on a button, which is exactly what keeps it from ever
              starting a drag (`onPointerDown`).

              HERE IN THE TREE, between the pile and the dots, for the tab
              order: the card, then the two directions, then the positions.
              Back before forward, as the pair reads.

              NO TOOLTIP, where IconButton would draw one. It was argued from
              these existing only for a thumb, and that half went on
              2026-11-13; the other half stands — a tooltip anchored to a
              strip the height of a card would point at the middle of nothing.
              The label is the accessible name. A cursor now finds no tooltip
              where the old pair had one: logged in stories/OPEN-QUESTIONS.md. */}
          <Button
            className="musy-deck__strip musy-deck__strip--previous"
            aria-label={previousLabel}
            disabled={inert || !browsable}
            onClick={goPrevious}
          >
            <span className="musy-deck__strip-mark">
              <Icon glyph={ChevronLeft} size="md" />
            </span>
          </Button>
          <Button
            className="musy-deck__strip musy-deck__strip--next"
            aria-label={nextLabel}
            disabled={inert || !browsable}
            onClick={goNext}
          >
            <span className="musy-deck__strip-mark">
              <Icon glyph={ChevronRight} size="md" />
            </span>
          </Button>

          {/* ── WHERE YOU ARE IN THE PILE, FOR THE EYE ──────────────────
              The deck has always said this to a screen reader — the live
              region below carries `positionLabel` on every change — and said
              nothing at all to anyone looking at it. A pile shows one card by
              definition, so without these the only clue that more exist is
              the scatter behind the top one.

              INSIDE THE STAGE, which is what centres them under the PILE
              rather than under the deck: at --bp-sm and up the body is a row
              and the stage is only its first column, so dots placed after the
              body would sit under the stage and the action column together
              and read as belonging to neither.

              NON-INTERACTIVE, which is `Dots`' own documented Card Deck case:
              with no `onSelect` it renders spans and marks the row
              `aria-hidden`, because a row of unpressable buttons teaches a
              screen reader only that they cannot be pressed. The host then
              owes the announcement, and the live region below is it.

              `positionLabel` RATHER THAN A PROP OF ITS OWN. `Dots` requires a
              label even on the path that never reads it, and the consumer has
              already handed this component that exact sentence. A second
              string prop would be a second way to say one thing. */}
          {browsable && frontId !== undefined && (
            <Dots
              className="musy-deck__dots"
              total={items.length}
              index={position - 1}
              ids={items.map((item) => item.id)}
              label={(at, of) => positionLabel(at, of, items[at - 1]?.id ?? frontId)}
              onSelect={jump}
            />
          )}
        </div>

        {/* ── THE ACTIONS ─────────────────────────────────────────────
            The two ways round the pile, then whatever the screen adds. Beside
            the card where there is room and under it where there is not — a
            wrap, not a breakpoint, so it answers to the space the deck
            actually has.

            THE DECK'S OWN ACCEPT BUTTON STOOD HERE and is gone (Ben,
            2026-10-05): the face carries one now, on the card, and the same
            action a hand's width apart in two sizes was the redundancy rather
            than the reassurance. What the deck keeps is the pile's own
            business — which card is in front — and nothing about what taking
            one means. */}
        <div className="musy-deck__actions">
          {/* ── THE TWO DIRECTIONS, AS A PAIR ─────────────────────────
              One row, in reading order: back, then forward. They are a PAIR
              rather than two more rows in the column because that is what
              they are — the same move twice, in opposite directions — and
              because two more full-width labels under the primary button
              would have read as three things to decide between.

              ICON-ONLY, which is the one place the deck owns a glyph: back
              and forward are not a product decision. CHEVRONS, not arrows
              (Ben, 2026-10-05, when the accept took an arrow): one screen
              cannot have → meaning "the next card" beside → meaning "start
              this one". Chevrons browse, arrows act — which is the way round
              every other set does it too. */}
          <div className="musy-deck__nav">
            {/* `outline`, NOT `secondary` — Ben, 2026-10-07. A secondary
                IconButton is a RAISED SURFACE with a border, which is also
                what a card is: three of them in a row beside the pile read as
                more cards rather than as the controls for one. The outline
                keeps the border and drops the fill, so the only raised thing
                on this component is the thing you can take.

                ── AND `secondary` AGAIN — Ben, 2026-11-11 (D6) ──────────────
                Reversed. The new desktop frame in Figma (`76:4072`, *Ready to
                build*) draws the pair secondary, beside a Shuffle that is
                secondary too, and the argument above lost its third member:
                the help button that made them "three in a row" leaves this
                row for the screen's toolbar (`navActions`, deprecated the
                same day). Two raised chevrons at the foot of a pile read as
                its controls, and the toolbar above now speaks the same rung.

                NOT DRAWN AT ANY WIDTH SINCE 2026-11-13: the pair is the
                gutters above everywhere, and their ghost chevron is the
                strip's own look, not a variant of this. Kept in the tree, and
                hidden by the stylesheet, so going back is one rule there. */}
            <IconButton
              glyph={ChevronLeft}
              label={previousLabel}
              variant="secondary"
              className="musy-deck__act musy-deck__act--previous"
              disabled={inert || !browsable}
              onClick={goPrevious}
            />
            <IconButton
              glyph={ChevronRight}
              label={nextLabel}
              variant="secondary"
              className="musy-deck__act musy-deck__act--next"
              disabled={inert || !browsable}
              onClick={goNext}
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
