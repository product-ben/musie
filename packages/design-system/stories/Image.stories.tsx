/**
 * Image — the rule, and the two ways to bend it.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * The pictures are data-URI swatches at the deck's 4:3 so the stories need no
 * network and no asset. What matters is the intrinsic size: every swatch below
 * is declared 1200px wide, which is what a bare `<img>` would render at.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Image } from '../src/Image';

const SWATCH = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 849">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f6f8f"/><stop offset="1" stop-color="#9fc7a6"/>
    </linearGradient></defs>
    <rect width="1200" height="849" fill="url(#g)"/>
    <text x="600" y="440" font-family="sans-serif" font-size="64" fill="#fff"
      text-anchor="middle">1200 × 849</text>
  </svg>`,
)}`;

/** A visible box, so "fills the container" is something you can see. */
function Box({ children, width = '28rem' }: { children: React.ReactNode; width?: string }) {
  return (
    <div
      style={{
        inlineSize: width,
        padding: 'var(--space-inset-card)',
        border: 'var(--border-width-regular) dashed var(--border-strong)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      {children}
    </div>
  );
}

const meta = {
  title: 'Components/Image',
  component: Image,
  parameters: {
    docs: {
      description: {
        component: [
          '**The rule: a picture fills the width of the container it is in, unless a max',
          'width says otherwise.**',
          '',
          'A bare `<img>` does the opposite. It is `inline` with `width: auto`, so it',
          'renders at its INTRINSIC pixel size — 1200px for this product’s artwork — and',
          'a narrower container gets a picture hanging out of it. Nothing errors, nothing',
          'fails a test, and the overflow shows at some widths and not others, which is',
          'how it survives review. That exact defect shipped twice in one week.',
          '',
          '**What it owns.** `inline-size: 100%` so the container decides the width;',
          '`block-size: auto` so the ratio is the picture’s own; and `maxWidth` /',
          '`minWidth` as the two bounds, with the cap defaulting to `100%` — which is what',
          'makes "fills the container" true rather than "is as wide as it likes".',
          '',
          '**No `object-fit`, on purpose.** Fitting is what you do to a picture in a box of',
          'a fixed shape; the premise here is that the box follows the picture. A screen',
          'that genuinely needs a fixed shape is doing something else and should say so.',
          '',
          '**`alt` is required and `""` is legal.** Required is what stops it being',
          'forgotten; `""` is a real answer — the picture adds nothing a neighbour has not',
          'already said — and keeping it legal is what stops the prop being filled with',
          'noise to satisfy a linter.',
          '',
          '**`width` and `height` are intrinsic, not layout.** They are passed through to',
          'the attributes so the browser knows the ratio before the bytes arrive. A screen',
          'that omits them gets a correct picture and a reflow.',
        ].join('\n'),
      },
    },
  },
  args: {
    src: SWATCH,
    alt: 'A blue and green gradient, as a stand-in for the deck artwork',
    width: 1200,
    height: 849,
  },
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

/** **The rule.** No `maxWidth`, so the picture is exactly as wide as the box —
 *  a 1200px image in a 28rem container. */
export const Default: Story = {
  render: (args) => <Box><Image {...args} /></Box>,
};

/** The same picture in a narrow box. Still exactly the box's width: the cap is
 *  `100%` by default, so nothing has to be said per container. */
export const NarrowContainer: Story = {
  render: (args) => <Box width="14rem"><Image {...args} /></Box>,
};

/**
 * **`maxWidth` caps it below the container.** Any length or token — a reading
 * measure is the common one, so a picture in a prose column does not grow
 * wider than the words beside it.
 */
export const Capped: Story = {
  render: (args) => (
    <Box width="44rem">
      <Image {...args} maxWidth="var(--measure-body)" />
    </Box>
  ),
};

/** A cap larger than the container does nothing, because `inline-size: 100%`
 *  is the width and the cap is only a ceiling. The rule holds either way. */
export const CapAboveTheContainer: Story = {
  render: (args) => <Box width="20rem"><Image {...args} maxWidth="60rem" /></Box>,
};

/**
 * **`minWidth` is the floor, and it is rarely what you want.** A picture that
 * cannot shrink will overflow a container narrower than its floor — which is
 * the behaviour the component exists to prevent, available on request for the
 * cases that genuinely need it.
 */
export const WithMinimum: Story = {
  render: (args) => (
    <Box width="12rem">
      <Image {...args} minWidth="18rem" />
    </Box>
  ),
};

/**
 * **What a bare `<img>` does instead**, for comparison — the same file, the
 * same box, no component. This is the defect, not a variant.
 */
export const WithoutTheComponent: Story = {
  render: (args) => (
    <Box width="14rem">
      {/* A bare <img>, on purpose — this story IS the defect. */}
      <img src={args.src} alt={args.alt} width={args.width} height={args.height} />
    </Box>
  ),
};

/** Decorative: the picture's neighbour already names it, so `alt=""` is the
 *  honest answer rather than a description nobody needs twice. */
export const Decorative: Story = {
  render: (args) => (
    <Box>
      <Image {...args} alt="" />
      <p className="musy-radio-group__hint">MC-01 · Freude</p>
    </Box>
  ),
};
