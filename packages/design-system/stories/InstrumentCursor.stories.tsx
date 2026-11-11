/**
 * InstrumentCursor — the harp's green dot, standing in for mouse and pen.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.28. Nothing is invented.
 *
 * The component's one prop, `target`, takes an element, so the story wraps it
 * in a stage that supplies one; size and colour are TOKENS, not props, so
 * their controls set `--instrument-cursor-*` on the dot for this page only
 * and print the lines to paste into the amendments.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../src/Button';
import { InstrumentCursor } from '../src/InstrumentCursor';
import { bothThemes } from './_decorators';

/* The token's own value: two --sp-5 (24px) across. */
const TOKEN_SIZE = 48;
const COLOURS = ['--interactive-primary', '--instrument-played', '--instrument-answer', '--on-surface'] as const;
type CursorColour = (typeof COLOURS)[number];

interface InstrumentCursorStageProps {
  /** `--instrument-cursor-size`, px. */
  size: number;
  /** `--instrument-cursor-color`, a semantic token. */
  color: CursorColour;
}

/**
 * A stand-in instrument to point at, with a control laid over its corner. A
 * press on the stage captures the pointer, as the instruments' canvas does,
 * so dragging past its edge keeps the dot.
 */
function InstrumentCursorStage({ size, color }: InstrumentCursorStageProps) {
  const target = React.useRef<HTMLDivElement>(null);
  const sizeLine = size === TOKEN_SIZE ? 'calc(var(--sp-5) * 2)' : `${size}px`;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-gap-related)', justifyItems: 'start' }}>
      {/* Size and colour are tokens on the dot, which lives on the body —
          so this page overrides them there, for this page only. */}
      <style>{`body > .musy-instrument-cursor { --instrument-cursor-size: ${size}px; --instrument-cursor-color: var(${color}); }`}</style>
      <div style={{ position: 'relative' }}>
        <div
          ref={target}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          style={{
            inlineSize: 320, blockSize: 220, display: 'grid', placeItems: 'center',
            borderRadius: 'var(--radius-card)', background: 'var(--instrument-surface)',
            border: 'var(--border-width-hairline) var(--border-style-solid) var(--border-subtle)',
            color: 'var(--on-surface-muted)',
            fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)',
            lineHeight: 'var(--type-body-sm-line)',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          Point here with a mouse or a pen
        </div>
        <div style={{ position: 'absolute', insetBlockStart: 'var(--sp-3)', insetInlineEnd: 'var(--sp-3)' }}>
          <Button variant="secondary" size="min">A control</Button>
        </div>
      </div>
      <InstrumentCursor target={target} />
      <pre style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: 'var(--on-surface)' }}>
        {`  --instrument-cursor-size: ${sizeLine};\n  --instrument-cursor-color: var(${color});`}
      </pre>
    </div>
  );
}

const meta = {
  title: 'Components/InstrumentCursor',
  component: InstrumentCursorStage,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'No base-ui primitive: a dot that stands in for the pointer. The harp',
          'experiment’s green dot (harp/261104-1443, `.musie-cursor`), the mouse',
          'cursor of every instrument’s focus sheet since 2026-11-09 — sized and',
          'coloured by `--instrument-cursor-size` and `--instrument-cursor-color`',
          '(amendments G5): two `--sp-5` across, `--interactive-primary`, centred on',
          'the pointer.',
          '',
          '`<InstrumentCursor target={canvas} />` — `target` is what the person plays',
          'on: the element itself, or a ref object read once after mount. It renders',
          'nothing in place; the dot is appended to the body, because a fixed element',
          'inside a transformed ancestor is fixed to that ancestor, and inside a clipped',
          'one is clipped by it — and a Lightbox popup holds its entrance transform or',
          'clip-path. It takes the target’s nearest `data-theme`.',
          '',
          '**When it shows.** A MOUSE or a PEN over the target — and the target hides',
          'the system pointer (`cursor: none`) for exactly as long. Past the target’s',
          'edge while the target holds that pointer’s capture: a string pulled beyond',
          'the canvas is still being played. Anything else under the pointer — the',
          'control on the stage’s corner, the page around it — gets the normal pointer',
          'and no dot. TOUCH never: a finger is its own cursor. Leaving the document',
          'hides it.',
          '',
          '**Not drawn under forced colours**, where the system pointer stays. No',
          '`prefers-reduced-motion` rule: it is a pointer, and it moves only when the',
          'person moves. `aria-hidden`.',
          '',
          'Size and colour are tokens, not props: here their controls override them on',
          'the dot for this page and print the lines to paste into the amendments.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-11-09. Delete once answered.',
          'This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    size: TOKEN_SIZE,
    color: '--interactive-primary',
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 8, max: 96, step: 1 },
      description: '`--instrument-cursor-size`, px. The token is `calc(var(--sp-5) * 2)`, 48px.',
    },
    color: {
      control: 'select',
      options: [...COLOURS],
      description: '`--instrument-cursor-color`, as a semantic token. The token is `var(--interactive-primary)`.',
    },
  },
} satisfies Meta<typeof InstrumentCursorStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The token values. Point at the stage with a mouse or a pen; press and drag past its edge. */
export const Default: Story = {};
