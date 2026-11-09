/**
 * Instrument tap — the soft dot a note of your own leaves, with every
 * parameter on a control.
 *
 * NOT A COMPONENT, so it is filed under Foundations beside „Instrument
 * shadows“ rather than under Components (CONVENTIONS §2 names component
 * stories). What it documents is a set of tokens (`--instrument-tap-*`,
 * amendments G5) and the pure function that reads them, `instrumentTapAt`.
 *
 * THIS PAGE IS WHERE THE EFFECT IS MAINTAINED (Ben, 2026-11-09): tune it with
 * the controls, then paste the printed lines over the ones in
 * `tokens/musy-foundations-amendments.css`. The controls start at
 * `INSTRUMENT_TAP_DEFAULT`, which `apps/web/src/instruments/tap.test.ts`
 * holds equal to the tokens.
 *
 * Docs text is taken from the header of `src/instrumentTap.ts` and from the
 * G5 comment in the amendments. Nothing is invented.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  INSTRUMENT_TAP_DEFAULT, instrumentTapAt, instrumentTapTokenLines, paintInstrumentTap,
} from '../src/instrumentTap';
import type { InstrumentTapParams, InstrumentTapRgb } from '../src/instrumentTap';
import { bothThemes } from './_decorators';

const W = 320;
const H = 300;

/* Three things to tap, each in its own rest colour: a harp string (6px, the
   harp's lowest), a kalimba tine (the tine width the size token was taken
   from) and a marimba bar (five tines wide). Upright, on the surface. */
const STRING = { x: 52, width: 6, top: 0, bottom: H, token: '--instrument-string' } as const;
const TINE = { x: 132, width: INSTRUMENT_TAP_DEFAULT.size, top: 48, bottom: 252, token: '--instrument-key' } as const;
const BAR = { x: 240, width: INSTRUMENT_TAP_DEFAULT.size * 5, top: 62, bottom: 238, token: '--instrument-key' } as const;
const SHAPES = [STRING, TINE, BAR];

/* What plays by itself when the page opens and whenever a control moves, so
   a change is seen without tapping: soft on the string, middling on the
   tine, full on the bar. */
const DEMO = [
  { shape: 0, y: H * 0.3, strength: 0.3 },
  { shape: 1, y: H * 0.55, strength: 0.65 },
  { shape: 2, y: H * 0.45, strength: 1 },
] as const;

type StrengthFrom = 'height' | 'control';

interface InstrumentTapStageProps extends InstrumentTapParams {
  /** 0 … 1 — used when `strengthFrom` is `control`. */
  strength: number;
  /** `height`: the higher the tap, the softer (top 0, bottom 1); `control`: the strength control. */
  strengthFrom: StrengthFrom;
}

interface Dot { x: number; y: number; t0: number; strength: number; rest: InstrumentTapRgb }

interface Colours { surface: string; rest: string[]; restRgb: InstrumentTapRgb[]; playedRgb: InstrumentTapRgb }

const rgbOf = (colour: string): InstrumentTapRgb => {
  const [r = 0, g = 0, b = 0] = (colour.match(/[\d.]+/g) ?? []).map(Number);
  return [r, g, b];
};

/* Tokens resolved inside the pane's own data-theme, through a probe — a
   canvas cannot read var(). */
function resolveColours(scope: HTMLElement): Colours {
  const probe = document.createElement('span');
  scope.appendChild(probe);
  const read = (token: string) => {
    probe.style.color = `var(${token})`;
    return getComputedStyle(probe).color;
  };
  const surface = read('--instrument-surface');
  const rest = SHAPES.map((s) => read(s.token));
  const played = read('--instrument-played');
  probe.remove();
  return { surface, rest, restRgb: rest.map(rgbOf), playedRgb: rgbOf(played) };
}

function paintStage(canvas: HTMLCanvasElement, colours: Colours, dots: readonly Dot[], now: number, params: InstrumentTapParams) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  if (canvas.width !== W * dpr) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }
  const g = canvas.getContext('2d');
  if (g === null) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = colours.surface;
  g.fillRect(0, 0, W, H);
  g.fillStyle = colours.rest[0];
  g.fillRect(STRING.x - STRING.width / 2, STRING.top, STRING.width, STRING.bottom - STRING.top);
  g.strokeStyle = colours.rest[1];
  g.lineWidth = TINE.width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(TINE.x, TINE.top);
  g.lineTo(TINE.x, TINE.bottom);
  g.stroke();
  g.fillStyle = colours.rest[2];
  g.beginPath();
  g.roundRect(BAR.x - BAR.width / 2, BAR.top, BAR.width, BAR.bottom - BAR.top, 8);
  g.fill();
  for (const d of dots) {
    paintInstrumentTap(g, d.x, d.y, instrumentTapAt(params, { ageMs: now - d.t0, strength: d.strength }), d.rest, colours.playedRgb);
  }
}

const nearest = (x: number) =>
  SHAPES.reduce((best, s, i) => (Math.abs(s.x - x) < Math.abs(SHAPES[best].x - x) ? i : best), 0);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The token lines to paste, each one that differs from today's token marked with what it was. */
function tokenLines(params: InstrumentTapParams): string {
  const today = instrumentTapTokenLines(INSTRUMENT_TAP_DEFAULT).split('\n');
  return instrumentTapTokenLines(params)
    .split('\n')
    .map((line, i) => (line === today[i] ? line : `${line} /* was ${today[i].replace(/^.*?: |;$/g, '')} */`))
    .join('\n');
}

/**
 * The stage the story draws: tap anywhere — the dot is drawn where you tapped,
 * in the rest colour of the nearest instrument, mixed towards
 * `--instrument-played`.
 */
function InstrumentTapStage({ strength, strengthFrom, ...params }: InstrumentTapStageProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const dots = React.useRef<Dot[]>([]);
  const frame = React.useRef(0);
  /* The latest args, for the animation loop, which outlives a render. */
  const live = React.useRef({ params, strength, strengthFrom });
  const lastKey = React.useRef('');
  /* Resolved when a run of frames starts, not on every frame. */
  const colours = React.useRef<Colours | null>(null);

  const loop = React.useCallback((now: number) => {
    const el = canvas.current;
    if (!el || !colours.current) return;
    const { params: p } = live.current;
    paintStage(el, colours.current, dots.current, now, p);
    dots.current = dots.current.filter((d) => !instrumentTapAt(p, { ageMs: now - d.t0, strength: d.strength }).done);
    frame.current = dots.current.length > 0 ? requestAnimationFrame(loop) : 0;
  }, []);

  /* A dot was added: resolve the pane's colours and run frames until the last dot is gone. */
  const kick = React.useCallback((scope: HTMLElement) => {
    colours.current = resolveColours(scope);
    if (frame.current === 0) frame.current = requestAnimationFrame(loop);
  }, [loop]);

  /* Every render is an args change: keep the loop's copy current, and when
     an effect parameter moved, play the three demo dots again so the change
     is seen. */
  React.useEffect(() => {
    live.current = { params, strength, strengthFrom };
    const key = JSON.stringify(params);
    if (key === lastKey.current) return;
    lastKey.current = key;
    const scope = canvas.current?.parentElement;
    if (!scope) return;
    kick(scope);
    const rest = colours.current?.restRgb ?? [];
    const now = performance.now();
    dots.current = DEMO.map((d) => ({
      x: SHAPES[d.shape].x, y: d.y, t0: now, strength: d.strength, rest: rest[d.shape] ?? [0, 0, 0],
    }));
  });

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const scope = e.currentTarget.parentElement;
    if (!scope) return;
    kick(scope);
    const { strength: s, strengthFrom: from } = live.current;
    dots.current.push({
      x, y, t0: performance.now(),
      strength: from === 'height' ? clamp01(y / H) : clamp01(s),
      rest: colours.current?.restRgb[nearest(x)] ?? [0, 0, 0],
    });
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-gap-related)', justifyItems: 'start' }}>
      <div
        style={{
          border: 'var(--border-width-hairline) var(--border-style-solid) var(--border-subtle)',
          borderRadius: 'var(--radius-card)', overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label="A harp string, a kalimba tine and a marimba bar. Tap to play the effect."
          onPointerDown={onPointerDown}
          style={{ inlineSize: W, blockSize: H, display: 'block', touchAction: 'none' }}
        />
      </div>
      <pre
        style={{
          margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12,
          color: 'var(--on-surface)', whiteSpace: 'pre',
          overflowX: 'auto', maxInlineSize: '100%',
        }}
      >
        {tokenLines(params)}
      </pre>
    </div>
  );
}

const num = (min: number, max: number, step: number, description: string) =>
  ({ control: { type: 'range' as const, min, max, step }, description });

const meta = {
  title: 'Foundations/Instrument tap',
  component: InstrumentTapStage,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'The soft dot a note of **your own** leaves where it was played — on all',
          'three instruments, and none for Musie’s answer (Ben, 2026-11-09). The',
          'kalimba experiment’s `dots` (kalimba/261106-1121), as tokens',
          '(`--instrument-tap-*`, amendments G5) read by `instrumentTapAt()` and',
          'painted by `paintInstrumentTap()` (`src/instrumentTap.ts`).',
          '',
          '**Maintained here.** Tap the string, the tine or the bar — anywhere on the',
          'canvas; the dot takes the rest colour of the nearest one. Move a control and',
          'the three dots play again with the new value. Then paste the printed lines',
          'over the ones in `tokens/musy-foundations-amendments.css`; a changed line',
          'says what it was.',
          '',
          '**The arithmetic.** At age p (0 → 1 over the duration) and strength v',
          '(0 … 1): radius = size × (start + (growth + growth-by-strength × v) ×',
          '(1 − (1 − p)^growth-power)); colour = rest → played at mix +',
          'mix-by-strength × v; opacity = min(1, (1 − p)^fade-power × (opacity +',
          'opacity-by-strength × v)). Drawn as a radial gradient (1 → 0.8 → 0.3 → 0),',
          'because Safari has no canvas filter.',
          '',
          '**The size is absolute,** in px. The experiment multiplied by the tine it',
          'was played on, and a marimba bar is about five times as wide, so a relative',
          'dot would be five times as large there. 16.85px is the kalimba’s tine width',
          'on a 393px phone: the kalimba there draws exactly the experiment’s dot, and',
          'every other instrument draws that same dot.',
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
    ...INSTRUMENT_TAP_DEFAULT,
    strength: 1,
    strengthFrom: 'height',
  },
  argTypes: {
    durationMs: num(100, 3000, 10, '`--instrument-tap-duration` — how long a dot lives, ms. The experiment’s `DOT_MS`.'),
    size: num(2, 60, 0.05, '`--instrument-tap-size` — the unit of the radius, CSS px. Absolute, never the width of what was hit.'),
    start: num(0, 4, 0.05, '`--instrument-tap-start` — the radius at the moment of the stroke, in sizes.'),
    growth: num(0, 6, 0.05, '`--instrument-tap-growth` — how much it grows at strength 0, in sizes …'),
    growthByStrength: num(0, 8, 0.05, '`--instrument-tap-growth-by-strength` — … plus this much per unit of strength.'),
    growthPower: num(0.2, 8, 0.1, '`--instrument-tap-growth-power` — the ease-out of the growth: 1 − (1 − p)^power.'),
    mix: num(0, 1, 0.01, '`--instrument-tap-mix` — how far from the rest colour towards the played one, at strength 0 …'),
    mixByStrength: num(0, 1, 0.01, '`--instrument-tap-mix-by-strength` — … plus this much per unit of strength.'),
    opacity: num(0, 1.5, 0.01, '`--instrument-tap-opacity` — the opacity at the moment of the stroke, at strength 0 …'),
    opacityByStrength: num(0, 1.5, 0.01, '`--instrument-tap-opacity-by-strength` — … plus this much per unit of strength.'),
    fadePower: num(0.2, 6, 0.1, '`--instrument-tap-fade-power` — how it fades: opacity × (1 − p)^power.'),
    strength: num(0, 1, 0.01, 'Not a token: the strength of a tap when `strengthFrom` is `control`. The instruments take it from the stroke.'),
    strengthFrom: {
      control: 'inline-radio',
      options: ['height', 'control'],
      description: 'Not a token. `height`: the higher the tap, the softer (top 0, bottom 1), so one canvas shows the whole range; `control`: the strength control.',
    },
  },
} satisfies Meta<typeof InstrumentTapStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The token values. Tap anywhere; move a control to see the change. */
export const Default: Story = {};
