/**
 * CardDeck — the pile you deal with one card at a time.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 */
import type * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Play, RotateCcw } from 'lucide-react';
import { CardDeck } from '../src/CardDeck';
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
   deck, and a photograph here would be a story about the photograph. */
function Face({ name, text, time }: { name: string; text: string; time: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 'var(--space-gap-related)', padding: 'var(--space-inset-card)', minBlockSize: '18rem' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)', lineHeight: 'var(--type-heading-sm-line)', color: 'var(--on-surface)' }}>{name}</h3>
      <p style={{ margin: 0, fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)', lineHeight: 'var(--type-body-sm-line)', color: 'var(--on-surface-muted)' }}>{text}</p>
      <p style={{ margin: 0, fontFamily: 'var(--type-label-md-family)', fontSize: 'var(--type-label-md-size)', color: 'var(--on-surface-muted)' }}>{time}</p>
    </div>
  );
}

const ITEMS = FACES.map((f) => ({
  id: f.id,
  accent: f.accent,
  content: <Face name={f.name} text={f.text} time={f.time} />,
}));

const meta = {
  title: 'Components/CardDeck',
  component: CardDeck,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A pile of cards you deal with one at a time: swipe **right** to take the',
          'one on top, **left** to send it to the back.',
          '',
          '**The two swipes are not peers, and the component is built around that.**',
          'Left is free — the card goes to the back and comes round again. Right is a',
          'one-way door, so it is deliberately harder to do, in three separate ways:',
          'it needs more travel (half the card, against under a third); a **flick',
          'cannot do it** at all, because velocity arms the left swipe only and a',
          'fast short gesture is the one people make by accident; and it announces',
          'itself first, because the accept chip lights before the finger lifts and',
          'dragging back under the threshold un-arms it.',
          '',
          '**What happens after an accept is the consumer’s, and it can fail.**',
          '`onAccept` fires, the card flies out, and the deck goes inert while `busy`',
          'is true. If `busy` goes false with the item still in `items`, the card',
          'flies back in — a swipe makes a promise, and a promise that cannot be kept',
          'has to visibly return rather than leaving the deck one card further on.',
          '',
          '**Nothing is gated behind the gesture.** Both actions are real buttons,',
          'always in the DOM. On a wide viewport *or* a fine pointer they flank the',
          'deck; on a narrow touch screen the stylesheet reduces them to',
          '`.musy-sr-only` — invisible, still operable. The arrow keys do the same',
          'two things, and Enter accepts.',
          '',
          '**Every word it speaks is the consumer’s.** There are no label defaults,',
          'not even from the locale catalogue: a deck whose actions are "start" and',
          '"later" in one product and "keep" and "discard" in the next cannot have a',
          'sensible default for either.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding. Delete once answered. This is not',
          'documentation._',
          '',
          'The resting tilt, the swing and the card width are three numbers Layer 1',
          'has no token for — there is no rotation scale, and `--bp-sm` is a',
          'breakpoint, not a card. Logged in stories/OPEN-QUESTIONS.md.',
        ].join('\n'),
      },
    },
  },
  args: {
    items: ITEMS,
    /* Required props, so they have to be here for `satisfies Meta` to hold.
       The `action` argTypes below are what actually report the calls. */
    onAccept: () => {},
    onDefer: () => {},
    acceptLabel: 'Start',
    deferLabel: 'Another one',
    acceptGlyph: Play,
    deferGlyph: RotateCcw,
    label: 'The deck. Drag the top card right to start it, left to send it to the back.',
    positionLabel: (position: number, total: number) =>
      `${FACES[position - 1]?.name ?? ''} — card ${position} of ${total}`,
  },
  argTypes: {
    items: { control: false, description: 'Each item carries an id, the card’s face as a node, and an optional 1–3 accent.' },
    onAccept: { action: 'accept', description: 'Swiped right, pressed, or Arrow Right. The consequential one.' },
    onDefer: { action: 'defer', description: 'Swiped left, pressed, or Arrow Left. Sends the card to the back.' },
    acceptLabel: { control: 'text', description: 'The right action’s name, on the chip and the button. Required.' },
    deferLabel: { control: 'text', description: 'The left action’s name. Required.' },
    acceptGlyph: { control: false, description: 'Lucide component for the right action.' },
    deferGlyph: { control: false, description: 'Lucide component for the left action.' },
    label: { control: 'text', description: 'The pile’s accessible name.' },
    positionLabel: { control: false, description: 'What the live region says when the top card changes. The deck knows the position, the consumer knows the name.' },
    busy: { control: 'boolean', description: 'True while an accept is in flight. The deck goes inert.' },
    className: { control: false },
  },
} satisfies Meta<typeof CardDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults. Drag the top card, or use the buttons and arrow keys. */
export const Default: Story = {};

/**
 * An accept in flight. The card is held off to the right and the deck is
 * inert — no gesture, no buttons, no keys — until the consumer resolves it.
 * Turn `busy` off in the controls to watch the card fly back, which is exactly
 * what a refusal looks like.
 */
export const Busy: Story = { args: { busy: true } };

/** Two cards: the floor at which a pile still reads as a pile. */
export const TwoCards: Story = { args: { items: ITEMS.slice(0, 2) } };

/** One card. There is nothing behind it, so the scatter has nothing to show
 *  and the deck is just a card — correct, and worth seeing. */
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
