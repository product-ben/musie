/**
 * Instrument tap — the soft dot a note of your own leaves where it was
 * played, as a pure function.
 *
 * Moved here from the kalimba experiment (`apps/web/public/experiments/
 * kalimba/261106-1121`, function `dots` and `pluckVisual`) on 2026-11-09,
 * when Ben made it the effect for every own note on all three instruments —
 * none for Musie's answer — and asked for it to be maintained centrally, with
 * live controls in Storybook. The arithmetic is the experiment's:
 *
 *   p       = age / 700 ms                      (0 → 1, gone at 1)
 *   grow    = 1 − (1 − p)^3
 *   r       = tw × (0.8 + (0.6 + 3.4 × vel) × grow)
 *   colour  = mix(rest, hit, 0.3 + 0.7 × vel)
 *   alpha   = min(1, (1 − p)^1.6 × (0.45 + 0.75 × vel))
 *
 * filled as a radial gradient (1 → 0.8 → 0.3 → 0 at 0, 0.3, 0.65, 1),
 * because Safari has no canvas filter to blur a disc with.
 *
 * ── ONE CHANGE: THE SIZE IS ABSOLUTE ──────────────────────────────────────
 * The experiment's unit was `tw`, the width of the tine that was played. A
 * marimba bar is about five times as wide, so a dot relative to what was hit
 * would be five times as large there. The unit is therefore a token in px,
 * `--instrument-tap-size`, and its value is the kalimba's tine width on the
 * 393px reference phone (16.85px): the kalimba there draws exactly the
 * experiment's dot, and every instrument draws that same dot.
 *
 * ── WHY PARAMETERS AND NOT A CSS ANIMATION ────────────────────────────────
 * The instruments are drawn on a canvas, which cannot take `var(--…)` or a
 * keyframe. The tokens are the effect's PARAMETERS (`--instrument-tap-*`,
 * musy-foundations-amendments.css G5), and this file turns them into a frame
 * a canvas can paint — the same split `instrumentShadow.ts` makes.
 *
 * Pure: `instrumentTapAt` touches no DOM. `paintInstrumentTap` is handed the
 * context; the caller resolves the two colours and keeps the dots' ages.
 */

export interface InstrumentTapParams {
  /** How long a dot lives, ms. The experiment's `DOT_MS`. */
  durationMs: number;
  /** The unit of the radius, CSS px — absolute, never the width of what was hit. */
  size: number;
  /** The radius at the moment of the stroke, in sizes. */
  start: number;
  /** How much it grows at strength 0, in sizes … */
  growth: number;
  /** … plus this much per unit of strength. */
  growthByStrength: number;
  /** The ease-out of the growth: `1 − (1 − p)^growthPower`. */
  growthPower: number;
  /** How far from the rest colour towards the played one, at strength 0 … */
  mix: number;
  /** … plus this much per unit of strength. */
  mixByStrength: number;
  /** The opacity at the moment of the stroke, at strength 0 … */
  opacity: number;
  /** … plus this much per unit of strength. */
  opacityByStrength: number;
  /** How it fades: opacity × `(1 − p)^fadePower`. */
  fadePower: number;
}

/** The kalimba experiment's values — the tokens' values. */
export const INSTRUMENT_TAP_DEFAULT: InstrumentTapParams = {
  durationMs: 700,
  size: 16.85,
  start: 0.8,
  growth: 0.6,
  growthByStrength: 3.4,
  growthPower: 3,
  mix: 0.3,
  mixByStrength: 0.7,
  opacity: 0.45,
  opacityByStrength: 0.75,
  fadePower: 1.6,
};

/** The blur, as a gradient: [offset along the radius, opacity of the colour]. */
export const INSTRUMENT_TAP_STOPS: readonly (readonly [offset: number, alpha: number])[] = [
  [0, 1], [0.3, 0.8], [0.65, 0.3], [1, 0],
];

/** Every parameter's token, in the order the amendments declare them. */
export const INSTRUMENT_TAP_TOKENS: Readonly<Record<keyof InstrumentTapParams, string>> = {
  durationMs: '--instrument-tap-duration',
  size: '--instrument-tap-size',
  start: '--instrument-tap-start',
  growth: '--instrument-tap-growth',
  growthByStrength: '--instrument-tap-growth-by-strength',
  growthPower: '--instrument-tap-growth-power',
  mix: '--instrument-tap-mix',
  mixByStrength: '--instrument-tap-mix-by-strength',
  opacity: '--instrument-tap-opacity',
  opacityByStrength: '--instrument-tap-opacity-by-strength',
  fadePower: '--instrument-tap-fade-power',
};

/** One dot at one moment. */
export interface InstrumentTapFrame {
  /** CSS px. */
  radius: number;
  /** 0 … 1, the dot's whole opacity (the gradient's stops are inside it). */
  alpha: number;
  /** 0 … 1: how far from the rest colour towards the played one. */
  mix: number;
  /** The duration is over: drop the dot. */
  done: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * The dot `ageMs` after the stroke, for a stroke of `strength` 0 … 1 (the
 * experiment's `vel`; clamped). A negative age is the moment of the stroke.
 */
export function instrumentTapAt(
  p: InstrumentTapParams,
  { ageMs, strength }: { ageMs: number; strength: number },
): InstrumentTapFrame {
  const v = clamp(strength, 0, 1);
  const t = p.durationMs > 0 ? Math.max(0, ageMs) / p.durationMs : 1;
  const q = Math.min(1, t);
  const grow = 1 - Math.pow(1 - q, p.growthPower);
  return {
    radius: Math.max(0, p.size * (p.start + (p.growth + p.growthByStrength * v) * grow)),
    alpha: clamp(Math.pow(1 - q, p.fadePower) * (p.opacity + p.opacityByStrength * v), 0, 1),
    mix: clamp(p.mix + p.mixByStrength * v, 0, 1),
    done: t >= 1,
  };
}

/** sRGB 0–255. */
export type InstrumentTapRgb = readonly [r: number, g: number, b: number];

/**
 * Paint one dot at (x, y), exactly as the experiment's `dots` does: the
 * colour mixed channel by channel and rounded, a radial gradient through
 * `INSTRUMENT_TAP_STOPS`, the whole dot at `frame.alpha`. `restRgb` is the
 * instrument's rest colour (`--instrument-string` / `--instrument-key`),
 * `playedRgb` is `--instrument-played`, both resolved by the caller. Leaves
 * `globalAlpha` and `fillStyle` as it found them; draws nothing once done.
 */
export function paintInstrumentTap(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: InstrumentTapFrame,
  restRgb: InstrumentTapRgb,
  playedRgb: InstrumentTapRgb,
): void {
  if (frame.done || !(frame.radius > 0) || !(frame.alpha > 0)) return;
  const c = restRgb.map((v, i) => Math.round(v + (playedRgb[i] - v) * frame.mix)).join(',');
  const fill = g.createRadialGradient(x, y, 0, x, y, frame.radius);
  for (const [at, a] of INSTRUMENT_TAP_STOPS) fill.addColorStop(at, `rgba(${c},${a})`);
  const { globalAlpha, fillStyle } = g;
  g.globalAlpha = frame.alpha;
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, frame.radius, 0, 2 * Math.PI);
  g.fill();
  g.globalAlpha = globalAlpha;
  g.fillStyle = fillStyle;
}

/** `700ms`, `0.7s` or a bare number of ms. */
function parseTime(value: string): number {
  const s = value.trim();
  const v = Number.parseFloat(s);
  return s.endsWith('s') && !s.endsWith('ms') ? v * 1000 : v;
}

/**
 * The parameters as the tokens state them, from a computed style — the
 * element must sit inside `[data-theme]` so the amendments apply. A token
 * that is missing or does not parse falls back to the default.
 */
export function readInstrumentTapParams(style: CSSStyleDeclaration): InstrumentTapParams {
  const out = { ...INSTRUMENT_TAP_DEFAULT };
  for (const key of Object.keys(INSTRUMENT_TAP_TOKENS) as (keyof InstrumentTapParams)[]) {
    const raw = style.getPropertyValue(INSTRUMENT_TAP_TOKENS[key]);
    const v = key === 'durationMs' ? parseTime(raw) : Number.parseFloat(raw);
    if (Number.isFinite(v)) out[key] = v;
  }
  return out;
}

/**
 * The parameters as the lines of the amendments file — what the Storybook
 * page prints for pasting back into `musy-foundations-amendments.css`.
 */
export function instrumentTapTokenLines(p: InstrumentTapParams): string {
  const unit: Partial<Record<keyof InstrumentTapParams, string>> = { durationMs: 'ms', size: 'px' };
  const tidy = (v: number) => String(Math.round(v * 1000) / 1000);
  return (Object.keys(INSTRUMENT_TAP_TOKENS) as (keyof InstrumentTapParams)[])
    .map((key) => `  ${INSTRUMENT_TAP_TOKENS[key]}: ${tidy(p[key])}${unit[key] ?? ''};`)
    .join('\n');
}
