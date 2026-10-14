/**
 * Dots — the position row, and the one decision a consumer has to make about
 * it: which tone, and that is a question about what is UNDER the row.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dots } from '../src/Dots';

const LABEL = (position: number, total: number) => `Image ${position} of ${total}`;

/** A stand-in for the thing a row of dots is usually drawn over. */
function Media({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        inlineSize: '22rem',
        blockSize: '13rem',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background: dark
          ? 'linear-gradient(140deg, #16323f, #0b1a22)'
          : 'linear-gradient(140deg, #f3e7c8, #cfe3d8)',
      }}
    >
      {children}
    </div>
  );
}

const meta = {
  title: 'Components/Dots',
  component: Dots,
  parameters: {
    docs: {
      description: {
        component: [
          '**The position row: one mark per item, the current one drawn as a pill.**',
          'Extracted from §7.8 Carousel rather than copied — the Card Deck and the Sheet',
          'need the same row for the same reason, "which of how many, and roughly where".',
          '',
          '**SC 2.5.8.** The mark is 12px and the target is 24px. A 12px dot is the right',
          'size to look at and the wrong size to hit, so the button is padded out around a',
          'mark that is not.',
          '',
          '**The selected state is width and fill, not fill alone (1.4.1).** The active',
          'mark is a pill at 2:1, so colour is never the only thing separating current',
          'from not.',
          '',
          '**Omit `onSelect` and the row stops being controls.** Without a destination',
          'there is nothing to press, so the dots render as spans and the row is marked',
          '`aria-hidden` — a screen reader meeting unpressable buttons learns only that',
          'they cannot be pressed. A host that hides them this way owes its own',
          'announcement of the position; the Card Deck’s live region is the reference case.',
          '',
          '**`--musy-sel-fill` is read, not set.** It is the host component’s selected',
          'colour, so the dots take the colour of whatever they are the position row for.',
          'A host that forgets it gets a current mark with no fill — an invisible dot and',
          'a row with a hole in it.',
        ].join('\n'),
      },
    },
  },
  args: {
    total: 5,
    index: 1,
    label: LABEL,
    onSelect: () => {},
  },
} satisfies Meta<typeof Dots>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * **`default` — the green row. Use it on a surface**: a card, a panel, the
 * page. The marks are `--border-strong` and the current one takes the host’s
 * `--musy-sel-fill`, and both were contrast-checked against surfaces.
 */
export const Default: Story = {
  render: (args) => (
    <div style={{ '--musy-sel-fill': 'var(--interactive-primary)' } as React.CSSProperties}>
      <Dots {...args} />
    </div>
  ),
};

/**
 * **`onMedia` — the white row. Use it when the dots sit on top of a picture.**
 *
 * Nothing can be contrast-checked against an arbitrary photograph, so this
 * variant does not try: the marks are `--on-surface-inverse` at two opacities,
 * under one soft scrim shadow. That pairing survives a pale sky and a dark
 * forest in the same deck — the two stories below are those two cases.
 *
 * The current mark deliberately ignores `--musy-sel-fill` here: a brand accent
 * chosen against a surface is one more unpredictable contrast over artwork, so
 * position is carried by opacity and by the pill’s length instead.
 */
export const OnMediaDark: Story = {
  args: { tone: 'onMedia' },
  render: (args) => (
    <Media dark>
      <Dots {...args} />
    </Media>
  ),
};

/** The same row over a pale picture, which is the harder of the two. */
export const OnMediaLight: Story = {
  args: { tone: 'onMedia' },
  render: (args) => (
    <Media>
      <Dots {...args} />
    </Media>
  ),
};

/**
 * **The wrong pairing, shown on purpose.** The green row over artwork is what
 * `onMedia` exists to stop: on a dark picture the marks disappear, and on a
 * pale one the current mark competes with whatever the picture is doing.
 */
export const DefaultOverMedia: Story = {
  render: (args) => (
    <Media dark>
      <div style={{ '--musy-sel-fill': 'var(--interactive-primary)' } as React.CSSProperties}>
        <Dots {...args} />
      </div>
    </Media>
  ),
};

/**
 * Laid out as a column, which is how the Sheet draws it — pinned to the inline
 * start of a full-screen page. The current mark becomes a pill along the axis
 * of travel, so it still reads as a position rather than as one fatter dot.
 */
export const Vertical: Story = {
  args: { tone: 'onMedia' },
  render: (args) => (
    <Media dark>
      <Dots {...args} className="musy-sheet__dots" />
    </Media>
  ),
};

/**
 * Without `onSelect`: spans rather than buttons, and the whole row is
 * `aria-hidden`. The host owes the announcement.
 */
export const NotControls: Story = {
  args: { onSelect: undefined },
};
