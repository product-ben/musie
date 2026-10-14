/**
 * Sheet — the full-screen surface you page through downwards.
 *
 * Docs text below is taken from the component's own header comment and from
 * `DIGITAL-CARDS.md` §10.1, which is where it was asked for. Nothing is
 * invented.
 *
 * Every story uses `singlePane`: the sheet is portaled to the document root,
 * so two theme panes would fight over one surface. See CONVENTIONS §6.
 *
 * The index is held by a wrapper in each story rather than by `args`, because
 * the component is controlled on purpose — a sheet holding its own index could
 * not express "the way on appears once the last page has been reached", which
 * is the one thing the first consumer needs.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sheet } from '../src/Sheet';
import type { SheetPage } from '../src/Sheet';
import { CtaButton } from '../src/CtaButton';
import { singlePane } from './_decorators';

/* The five pictures the first consumer walks, as blocks of colour: the real
   ones are the Mindfulness deck's artwork, which does not ship with the
   package. What matters to the component is that a page is full-bleed. */
const SWATCHES = ['#1b4f72', '#117a65', '#7d6608', '#6c3483', '#922b21'];

function picture(colour: string, caption: string): React.ReactNode {
  return (
    <div
      style={{
        blockSize: '100%',
        display: 'grid',
        placeItems: 'center',
        background: colour,
        color: 'white',
        fontSize: 'var(--type-heading-md-size, 1.5rem)',
      }}
    >
      {caption}
    </div>
  );
}

const LEAD = (
  <div style={{ padding: 'var(--space-inset-sheet)', maxInlineSize: 'var(--measure-body)' }}>
    <h2 style={{ marginBlockStart: 0 }}>
      If you are on your phone, turn it to landscape. Then look at the five cards and
      breathe in and out once with each of them.
    </h2>
  </div>
);

const PAGES: SheetPage[] = [
  { id: 'lead', content: LEAD },
  ...SWATCHES.map((colour, i) => ({
    id: `card-${i + 1}`,
    /* Full-bleed, so the position row switches to its white tone. */
    media: true,
    content: picture(colour, `Card ${i + 1}`),
  })),
];

const LABELS = {
  title: 'Your cards',
  closeLabel: 'Close the cards',
  nextLabel: 'Next image',
  previousLabel: 'Previous image',
  dotLabel: (position: number, total: number) => `Image ${position} of ${total}`,
};

const meta = {
  title: 'Components/Sheet',
  component: Sheet,
  decorators: [singlePane],
  parameters: {
    docs: {
      description: {
        component: [
          'Composes `Lightbox surface="immersive"`. APG: Modal Dialog, by way of that',
          'component — focus moved in and restored, the background made inert, the scroll',
          'locked, Escape, and the portal are all base-ui’s and none of it is',
          're-implemented here.',
          '',
          '**What this owns is the paging**, and that is why it is a component rather than',
          'a pattern in a screen: the scroll container inside an immersive Lightbox is',
          '`.musy-lightbox__body`, which belongs to Lightbox, so a screen setting',
          '`scroll-snap-type` on it would be reaching into another component’s geometry',
          '(rule 1, 10-layout.md L7). `useScrollSnap` cannot help either — it owns the',
          'mode on `<html>`, for sections in normal document flow where the document is',
          'the scroller.',
          '',
          '**One gesture is one page.** `scroll-snap-type: y mandatory` plus',
          '`scroll-snap-stop: always`, which is Ben’s decision of 2026-09-22 for both',
          'carousels: `mandatory` alone promises only that a scroll lands on a snap point',
          'and never which one.',
          '',
          '**The consumer owns the index**, the same split Carousel and Music Player make.',
          '',
          '**The foot is computed by the consumer from the index** — a way in on the',
          'first page, nothing in the middle, a way on at the end. That is a decision',
          'about a flow, not about sheets. It hugs its label and wraps before it',
          'overflows, so a long German label at phone width arrives full width and on two',
          'lines without a breakpoint saying so.',
          '',
          '**The paging chevrons are this component’s**, appear once the first page is',
          'behind you, and follow §7.8 Carousel’s emphasis rule: forward is `primary`',
          'while going on is the only thing to do, and steps down the moment the sheet’s',
          'own CTA lights up. Back is derived one rung below forward and is never louder.',
          '',
          '**A page marked `media` switches the dots to their white tone**, so a walk that',
          'opens on copy and continues over artwork changes tone as it moves.',
          '',
          '**Not a horizontal mode.** `Carousel` is the sideways one, and its whole design',
          '— the peek, the nudge, the grab cursor, the scale — exists to say *there are',
          'more of these, sideways*. The two share `Dots` and one declaration.',
        ].join('\n'),
      },
    },
  },
  /* The required props live here so every story inherits a complete set —
     the house pattern (CardDeck, ContentBox). The stories below drive `open`
     and `index` from their own state, because the component is controlled on
     purpose and a static arg cannot show a walk. */
  args: {
    ...LABELS,
    open: true,
    onOpenChange: () => {},
    pages: PAGES,
    index: 0,
    onIndexChange: () => {},
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the instruction, with the one thing the first page offers. */
function Walk({ startAt = 0 }: { startAt?: number }) {
  const [open, setOpen] = React.useState(true);
  const [index, setIndex] = React.useState(startAt);
  const last = index === PAGES.length - 1;

  return (
    <>
      {!open && <CtaButton onClick={() => setOpen(true)}>Draw 5 cards</CtaButton>}
      <Sheet
        {...LABELS}
        open={open}
        onOpenChange={setOpen}
        pages={PAGES}
        index={index}
        onIndexChange={setIndex}
        foot={
          index === 0 ? (
            <CtaButton onClick={() => setIndex(1)}>Look at the first image</CtaButton>
          ) : last ? (
            <CtaButton onClick={() => setOpen(false)}>Continue</CtaButton>
          ) : undefined
        }
      />
    </>
  );
}

/**
 * The whole walk. Page 1 is the instruction and offers one wide action; pages
 * 2–6 are full-bleed and carry the chevrons; the last one adds the way on.
 */
export const Default: Story = { render: () => <Walk /> };

/** The second page — where *previous* is enabled rather than disabled, which
 *  is the one place the first consumer's brief was read against (and asked
 *  about before it was). */
export const SecondPage: Story = { render: () => <Walk startAt={1} /> };

/** The last page: the way on takes `primary` and the forward chevron, which
 *  has nowhere left to go, steps down beside it. */
export const LastPage: Story = { render: () => <Walk startAt={PAGES.length - 1} /> };

/**
 * A single page — no dots, no chevrons, and the foot is whatever the screen
 * offers. This is the shape a one-card exercise gets, and it falls out of the
 * page count rather than out of a prop.
 */
export const OnePage: Story = {
  render: function OneCard() {
    const [open, setOpen] = React.useState(true);
    return (
      <>
        {!open && <CtaButton onClick={() => setOpen(true)}>Draw your card</CtaButton>}
        <Sheet
          {...LABELS}
          open={open}
          onOpenChange={setOpen}
          pages={[{ id: 'only', content: picture(SWATCHES[2], 'Your card') }]}
          index={0}
          onIndexChange={() => {}}
          foot={<CtaButton variant="secondary" onClick={() => setOpen(false)}>Continue</CtaButton>}
        />
      </>
    );
  },
};
