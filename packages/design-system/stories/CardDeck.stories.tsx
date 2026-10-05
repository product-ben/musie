/**
 * CardDeck — the pile you deal with one card at a time.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 */
import type * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Shuffle } from 'lucide-react';
import { CtaButton } from '../src/CtaButton';
import { CardDeck } from '../src/CardDeck';
import type { CardDeckCard } from '../src/CardDeck';
import { bothThemes } from './_decorators';

/**
 * Four faces. The deck owns the stack; the CONSUMER owns the card — which is
 * the whole of the component's API surface for content, and why these are
 * plain nodes rather than a prop per field.
 */
const FACES = [
  { id: 'pause', accent: 1 as const, name: 'Mindful Pause', text: 'Pick 5 random cards. Scan the one that speaks to you. Listen to the piece behind it.', time: '2–12 min' },
  { id: 'free', accent: 2 as const, name: 'Free Rein', text: 'Scan a random card and jump straight into the exercise.', time: '2–5 min' },
  { id: 'breath', accent: 3 as const, name: 'Mindful Breathing', text: 'Use the pulse of the music to let your breath settle.', time: '5–8 min' },
  { id: 'scan', accent: 1 as const, name: 'Body Scan', text: 'Find a comfortable position. If you like, let the voice guide you through your body.', time: '10–12 min' },
];

/* A stand-in for a consumer's card. Deliberately plain: the story is about the
   deck, and a photograph here would be a story about the photograph.
   
   ITS BOTTOM ROW IS THE POINT OF THE `card` ARGUMENT. The deck hands the face
   its own accept, and the face puts it in a row it already owns — beside the
   time, on one baseline, where nothing can be drawn over anything. The deck
   used to position that button itself and could not be told how wide this row
   was; see the component's header. */
function Face({ name, text, time, card }: { name: string; text: string; time: string; card: CardDeckCard }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 'var(--space-gap-related)', padding: 'var(--space-inset-card)', minBlockSize: '18rem' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)', lineHeight: 'var(--type-heading-sm-line)', color: 'var(--on-surface)' }}>{name}</h3>
      <p style={{ margin: 0, fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)', lineHeight: 'var(--type-body-sm-line)', color: 'var(--on-surface-muted)' }}>{text}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-gap-inline)' }}>
        <p style={{ margin: 0, minInlineSize: 0, fontFamily: 'var(--type-label-md-family)', fontSize: 'var(--type-label-md-size)', color: 'var(--on-surface-muted)' }}>{time}</p>
        <CtaButton variant="primary" size="min" leadingIcon={ArrowRight} disabled={card.disabled} onClick={card.accept}>
          Start
        </CtaButton>
      </div>
    </div>
  );
}

const ITEMS = FACES.map((f) => ({
  id: f.id,
  accent: f.accent,
  content: (card: CardDeckCard) => <Face name={f.name} text={f.text} time={f.time} card={card} />,
}));

const meta = {
  title: 'Components/CardDeck',
  component: CardDeck,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A pile of cards you deal with one at a time: **swipe sideways to deal the',
          'top card away** — either way, and it leaves the way your hand went — and',
          '**press a card to take it**.',
          '',
          '**It was built the other way round, and that was the thing to fix**',
          '(Ben, 2026-10-05). A right swipe used to TAKE the card and a left one sent',
          'it to the back, with the right swipe made deliberately harder because it',
          'was a one-way door. Nobody read it that way: a pile on a touch screen says',
          '"there are more of these, and they are sideways", so people swiped both',
          'ways looking for the next card and pressed the one they wanted — and the',
          'press did nothing while a long swipe started something nobody had chosen.',
          '',
          '**Sideways is free and symmetric.** Both directions deal the same card off',
          'the same pile and differ only in where it is thrown; one threshold for',
          'both, and a flick arms either. **Going back is a button and a key, never a',
          'swipe** — the undo for a card dealt past, drawn as the opposite of a deal.',
          '**A press commits:** the card itself, whatever the FACE puts the accept on,',
          'the primary button in the action column, or Enter.',
          '',
          '**A face written as a function gets the accept** — `content: (card) => …`,',
          'with `card.accept` and `card.disabled`. The deck drew a small button into',
          'the card’s corner itself for half a day and could not be made safe there:',
          'at 320px the German time string on the reference card ran 18px *under* it,',
          'because a button’s width is its label’s width and no token knows that. Two',
          'boxes in one flex row cannot overlap, so the action is handed over instead',
          'of the geometry being guessed. Ignoring it loses nothing.',
          '',
          '**The overlay is not a verdict any more.** It used to appear *at* the',
          'threshold — half the card for the accept — so it arrived with the card half',
          'off the stage and the decision already made. It now fades in with the',
          'gesture and is fully opaque at a **tenth** of the card. The two intent chips',
          'went with it: there is no longer a pair of outcomes to compare.',
          '',
          'It says **`nextLabel` whichever way the finger is going** — both ways deal',
          'another card, and a word that changed under the thumb made a browse feel',
          'like a decision. Which way is still said by the two buttons, and by the',
          'SIDE the word sits on: the trailing edge, so it is whole for the whole of',
          'the gesture rather than sliding off with the card it belongs to.',
          '',
          '**What happens after an accept is the consumer’s, and it can fail.**',
          '`onAccept` fires, the card lifts off the pile and fades, and the deck goes',
          'inert while `busy` is true. If `busy` goes false with the item still in',
          '`items`, the card comes back — a press makes a promise, and a promise that',
          'cannot be kept has to visibly return rather than leaving the deck one card',
          'further on. It leaves **upward**, because both sideways directions now mean',
          '"another card".',
          '',
          '**Nothing is gated behind the gesture.** Every action is a real button,',
          'always in the DOM: the accept, and back and forward as a pair of icon',
          'buttons under it. Arrow Right deals, Arrow Left goes back, Enter accepts.',
          '',
          '**Every word it speaks is the consumer’s.** There are no label defaults,',
          'not even from the locale catalogue: a deck whose action is "start" in one',
          'product and "keep" in the next cannot have a sensible default for it. The',
          'two *directions* carry the deck’s own arrows — which way is back is not a',
          'product decision.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding. Delete once answered. This is not',
          'documentation._',
          '',
          'The resting tilt, the swing and the card width are three numbers Layer 1',
          'has no token for — there is no rotation scale, and `--bp-sm` is a',
          'breakpoint, not a card. Logged in stories/OPEN-QUESTIONS.md, along with',
          'the corner of the card the deck now draws its own button into.',
        ].join('\n'),
      },
    },
  },
  args: {
    items: ITEMS,
    /* Required props, so they have to be here for `satisfies Meta` to hold.
       The `action` argTypes below are what actually report the calls. */
    onAccept: () => {},
    onNext: () => {},
    onPrevious: () => {},
    acceptLabel: 'Start the exercise',
    nextLabel: 'Next exercise',
    previousLabel: 'Previous exercise',
    acceptGlyph: ArrowRight,
    label: 'The deck. Enter starts the exercise on the top card; the arrow keys show the next one and the one before.',
    positionLabel: (position: number, total: number) =>
      `${FACES[position - 1]?.name ?? ''} — card ${position} of ${total}`,
  },
  argTypes: {
    items: { control: false, description: 'Each item carries an id, the card’s face — a node, or a function given the deck’s own accept — and an optional 1–3 accent.' },
    onAccept: { action: 'accept', description: 'Pressed — the card, the button on it, the primary button, or Enter. The consequential one, and the only one no gesture can reach.' },
    onNext: { action: 'next', description: 'Swiped left, pressed, or Arrow Right. The card goes to the back of the pile.' },
    onPrevious: { action: 'previous', description: 'Swiped right, pressed, or Arrow Left. The card at the back comes to the top.' },
    acceptLabel: { control: 'text', description: 'The accept’s name, on the button beside the deck. Required.' },
    nextLabel: { control: 'text', description: 'What the overlay says, either way, and the right-hand icon button’s accessible name and tooltip. Required.' },
    previousLabel: { control: 'text', description: 'The back button’s accessible name and tooltip, and nothing else — the overlay says nextLabel both ways. Required.' },
    acceptGlyph: { control: false, description: 'Lucide component for the accept. The directions have none — the deck owns its own arrows.' },
    label: { control: 'text', description: 'The pile’s accessible name, and the only place the keys are named: the overlay is aria-hidden.' },
    toolbar: { control: false, description: 'Rendered at the head of the action stack, above the deck’s own controls. A view switch is the reference case.' },
    actions: { control: false, description: 'Extra controls under the deck’s own, in the same stack.' },
    positionLabel: { control: false, description: 'What the live region says when the top card changes. The deck knows the position, the consumer knows the name.' },
    busy: { control: 'boolean', description: 'True while an accept is in flight. The deck goes inert.' },
    className: { control: false },
  },
} satisfies Meta<typeof CardDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Component defaults. Press the top card to take it; drag it either way to
 * browse, or use the buttons and the arrow keys.
 *
 * The *Start* in each card's bottom row is the FACE's, placed through the
 * accept the deck hands it — and the cards behind the top one are `inert`, so
 * four more of those buttons are neither focusable nor announced.
 */
export const Default: Story = {};

/**
 * THE CONDENSED RUNG IS WHAT THESE FACES CARRY, and it is a deliberate
 * exception rather than a choice of size: §5.4 permits `min` for a card
 * control and forbids it for a primary action, and a card's *Start* is both at
 * once. Ben took it on 2026-10-05. It renders at 36px: over 2.5.8's 24, under
 * §5.4's 44, with the margin the class bakes in earning the spacing exception.
 * Logged in stories/OPEN-QUESTIONS.md. The deck has no opinion about it — the
 * face chose that rung, which is the other half of handing the action over.
 */

/**
 * The deck inert. `busy` is the consumer saying "I am still deciding", and
 * until it falls nothing answers: no gesture, no button, no key.
 *
 * IT DOES NOT SHOW THE LIFTED CARD, and cannot — the lift belongs to the card
 * that was accepted, which is the deck's own state rather than a prop. Press a
 * card in the story above to see both halves at once: with `busy` left false
 * and the item still in `items`, the deck reads that as a refusal the moment it
 * happens, so the card lifts and comes straight back. That is the whole
 * contract, in one press.
 */
export const Busy: Story = { args: { busy: true } };

/**
 * Both slots in use: something at the head of the action column, and a further
 * action under the deck's own.
 *
 * Resize the frame to watch the actions move from beside the card to under it.
 * It is a WRAP, not a breakpoint — the deck can be put in a narrow column on a
 * wide screen, and a media query would get that case exactly backwards.
 */
export const WithToolbarAndActions: Story = {
  args: {
    toolbar: <span style={{ font: 'var(--type-label-md-weight) var(--type-label-md-size) var(--type-label-md-family)', color: 'var(--on-surface-muted)' }}>Your toolbar here</span>,
    actions: <CtaButton variant="ghost" leadingIcon={Shuffle}>Pick a card for me</CtaButton>,
  },
};

/** Two cards: the floor at which a pile still reads as a pile. */
export const TwoCards: Story = { args: { items: ITEMS.slice(0, 2) } };

/** One card. There is nothing behind it, so the scatter has nothing to show
 *  and the deck is just a card — correct, and worth seeing.
 *
 *  BOTH DIRECTIONS ARE DISABLED HERE, which is the honest state: a pile of one
 *  has no other card to go to either way. The swipe springs back for the same
 *  reason, and the consumer is not told about a move that did not happen —
 *  which it used to be, while a copy of the only card flew off the screen. */
export const OneCard: Story = { args: { items: ITEMS.slice(0, 1) } };

/** The deck narrowed by the consumer. The width is published as
 *  `--musy-deck-card-inline`; a screen that needs it smaller overrides that
 *  rather than reaching into the card. */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ '--musy-deck-card-inline': '14rem' } as React.CSSProperties}>
      <CardDeck {...args} />
    </div>
  ),
};
