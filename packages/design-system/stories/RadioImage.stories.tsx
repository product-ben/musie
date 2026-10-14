/**
 * Radio Image — a grid of pictures you choose one of.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * The pictures here are blocks of colour at the deck's 4:3: the real ones are
 * the Mindfulness artwork, which does not ship with the package. What matters
 * to the component is the ratio and that there is no label.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioImage } from '../src/RadioImage';
import type { RadioImageOption } from '../src/RadioImage';

/** A 4:3 swatch as a data URI, so the stories need no network and no asset. */
function swatch(from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 283">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="400" height="283" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const OPTIONS: RadioImageOption[] = [
  { value: 'mc-01', image: swatch('#2f6f8f', '#123043'), imageAlt: 'Fine blue lines fanning across the surface' },
  { value: 'mc-02', image: swatch('#9fc7a6', '#2f6f5f'), imageAlt: 'Green and turquoise waves under a pale light' },
  { value: 'mc-03', image: swatch('#b8c3cc', '#5d7384'), imageAlt: 'Blue-grey ridges layered into haze' },
  { value: 'mc-04', image: swatch('#d9c98f', '#7a8f6a'), imageAlt: 'Horizontal bands of green and cream' },
  { value: 'mc-05', image: swatch('#e08060', '#3b4752'), imageAlt: 'A ridge in red and slate under a dusty sky' },
];

const meta = {
  title: 'Components/RadioImage',
  component: RadioImage,
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: RadioGroup + Radio + Fieldset — the same primitives and the same',
          'selection semantics as §7.7 and §7.9.',
          '',
          '**A grid of pictures you choose one of, and nothing else is on the card.** No',
          'label, no description, no meta row: the picture IS the option, so a word under',
          'it would be answering the question for the person looking.',
          '',
          '**Why it is not `RadioGroupImage` with the label switched off.** That one',
          'requires a label per item and never clamps it; it crops to `1 / 1`, which takes',
          'a third off a 4:3 composition; and it goes 2 / 3 / 4 columns. Collapsing the',
          'two would force one of those three to lose.',
          '',
          '**Two columns, then three, and the group decides.** Three from `30rem` of the',
          'GROUP’s own width — a container query, so the count is right inside a panel or',
          'a sidebar where a viewport query would resolve the desktop grid and overflow.',
          'It never reaches four: a hand of five at three-up reads as a hand, at four-up',
          'as a catalogue.',
          '',
          '**`imageAlt` is required and `alt=""` is not reachable.** There is no label',
          'beside the picture to carry the meaning instead, so a grid of unnamed images is',
          'a grid of identical options for anyone not looking at it.',
          '',
          '**`onCommit` versus `onValueChange` is an accessibility decision**, not a',
          'convenience. Arrow keys move selection through a radio group as a way of',
          'READING it; a consumer that treats every change as a decision commits on the',
          'first arrow press and carries somebody off the screen mid-look. Use',
          '`onValueChange` for a group whose answer is read later, and `onCommit` where',
          'choosing IS the act.',
        ].join('\n'),
      },
    },
  },
  args: {
    name: 'card',
    legend: 'Your cards — choose one',
    options: OPTIONS,
  },
} satisfies Meta<typeof RadioImage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five pictures, nothing chosen yet. Resize the panel to cross 30rem. */
export const Default: Story = {};

/** One chosen: a stronger border, an inset ring and a tick — three cues, so
 *  the state never rests on colour alone (1.4.1). */
export const Chosen: Story = { args: { value: 'mc-03' } };

/**
 * The legend hidden, which is the reference case: the screen's own headline
 * already asks the question, and printing it twice is a caption on a caption.
 * It stays the group's accessible name.
 */
export const LegendHidden: Story = { args: { legendHidden: true, value: 'mc-01' } };

/** Choosing commits — the shape the card step uses. Press a picture, or focus
 *  one and press Enter; the arrow keys move without committing. */
export const Committing: Story = {
  render: function Committing(args) {
    const [value, setValue] = React.useState<string | undefined>(undefined);
    const [committed, setCommitted] = React.useState<string | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--space-gap-group)' }}>
        <RadioImage
          {...args}
          value={value}
          onValueChange={setValue}
          onCommit={setCommitted}
        />
        <p className="musy-radio-group__hint">
          selected: {value ?? '—'} · committed: {committed ?? '—'}
        </p>
      </div>
    );
  },
};

/** Narrow enough to stay two-up, which is the phone. */
export const TwoColumns: Story = {
  render: (args) => (
    <div style={{ inlineSize: '22rem' }}>
      <RadioImage {...args} />
    </div>
  ),
};

/** The whole group disabled — while a choice is being written, for instance. */
export const Busy: Story = { args: { disabled: true, value: 'mc-02' } };

/** Nothing to choose from. The wording is the locale catalogue's unless the
 *  consumer passes its own (rule 7 in the app). */
export const Empty: Story = { args: { options: [] } };

/** An error, announced with the group and drawn under it. */
export const WithError: Story = {
  args: { error: 'That card could not be saved. Try again in a moment.' },
};
