/**
 * Instrument shadows — the harp's multi-layer shadow, as a pure function.
 *
 * Moved here from the harp experiment (`apps/web/public/experiments/harp/
 * 261109-0920`, functions `shadowLayers`, `shadowColor`, `profile`) on
 * 2026-11-09, when the instruments became exercises and the shadow became a
 * shared style (Ben: "die Multi layer shadows … auch als neue storybook
 * styles (instrument shadows)"). The arithmetic is unchanged.
 *
 * ── WHY NOT A BOX-SHADOW TOKEN ────────────────────────────────────────────
 * The instruments are drawn on a canvas, and a canvas cannot take `var(--…)`
 * or a CSS shadow. The tokens are therefore the shadow's PARAMETERS
 * (`--instrument-shadow-*`, musy-foundations-amendments.css G5), and this file
 * turns them into layers a canvas can draw. After Josh Comeau's shadow palette
 * generator (joshwcomeau.com/shadow-palette), read from that page's code: per
 * elevation a number of layers (resolution), their offsets along a Bézier
 * curve (crispy bends it), blur as a multiple of the distance, a negative
 * spread that grows from layer to layer, and an opacity that oomph and crispy
 * share out between near and far layers. One change for strings: the spread
 * never narrows a shadow below 1px.
 *
 * Pure: no DOM. `instrumentShadowProfile` returns alphas; the caller paints.
 */

export interface InstrumentShadowParams {
  /** 0 Aus · 1 Niedrig · 2 Mittel · 3 Hoch. */
  level: 0 | 1 | 2 | 3;
  /** 0 … 1: how strong. */
  oomph: number;
  /** 0 … 1: how sharp. */
  crispy: number;
  /** 0 … 1: how many layers within the level's range. */
  resolution: number;
  /** −1 … 1: where the light comes from. */
  lightX: number;
  lightY: number;
  /** Colour the shadow from the surface, or draw it neutral. */
  tint: boolean;
}

/** One layer: offset, blur and spread in CSS px, opacity 0 … 1. */
export type InstrumentShadowLayer = readonly [x: number, y: number, blur: number, spread: number, alpha: number];

/** The values the harp shipped, „euer Schatten, 4. November“ — the tokens' values. */
export const INSTRUMENT_SHADOW_DEFAULT: InstrumentShadowParams = {
  level: 3, oomph: 0.34, crispy: 0.44, resolution: 0.26, lightX: -0.25, lightY: -0.37, tint: true,
};

export const INSTRUMENT_SHADOW_LEVELS = ['Aus', 'Niedrig', 'Mittel', 'Hoch'] as const;

const SIZES = [null, { min: 2, max: 3, off: [3, 5] }, { min: 2, max: 5, off: [15, 25] }, { min: 3, max: 10, off: [50, 150] }] as const;

const map = (v: number, a: number, b: number, c: number, d: number) => c + ((v - a) * (d - c)) / (b - a);
const roundTo = (v: number, p: number) => Math.round(v * 10 ** p) / 10 ** p;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Start [0,1], end [1,0], both control points [c,c]. */
function bezierX(t: number, c: number): number {
  const u = 1 - t;
  return 3 * u * u * t * c + 3 * u * t * t * c + t * t * t;
}

/** The layers for one level — empty at level 0. */
export function instrumentShadowLayers(p: InstrumentShadowParams): InstrumentShadowLayer[] {
  const size = SIZES[p.level];
  if (size === null) return [];
  const n = Math.round(map(p.resolution, 0, 1, size.min, size.max));
  const far = map(p.oomph, 0, 1, size.off[0], size.off[1]);
  const out: InstrumentShadowLayer[] = [];
  for (let i = 0; i < n; i += 1) {
    let alpha = map(p.oomph, 0, 1, 0.4, 1.25) * map(i, 0, n, p.crispy, 1 - p.crispy) * ((size.min + size.max) / 2 / n);
    if (!p.tint) alpha *= 0.3;
    const c = bezierX(i / (n - 1), map(p.crispy, 0, 1, 0.25, 0));
    const x = roundTo(map(c, 0, 1, map(p.lightX, -1, 1, 1, -1), map(p.lightX, -1, 1, far, -far)), 1);
    const y = roundTo(map(c, 0, 1, map(p.lightY, -1, 1, 1, -1), map(p.lightY, -1, 1, far, -far)), 1);
    const blur = roundTo(map(p.crispy, 0, 1, 1.5, 0.75) * Math.hypot(x, y), 1);
    const spread = i ? roundTo(map(i + 1, 1, n, 0, map(p.crispy, 0, 1, 0, -5)), 1) : 0;
    out.push([x, y, blur, spread, clamp(roundTo(alpha, 2), 0, 1)]);
  }
  return out;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, s * 100, l * 100];
}

/**
 * „Tint shadow“: the surface's hue, desaturated and darkened — or black.
 * `surfaceHex` is `--instrument-surface` resolved, `#rrggbb`.
 */
export function instrumentShadowColor(p: InstrumentShadowParams, surfaceHex: string): [h: number, s: number, l: number] {
  if (!p.tint) return [0, 0, 0];
  const [h, s, l] = hexToHsl(surfaceHex);
  const top = map(p.oomph, 0, 1, 85, 50);
  return [
    Math.round(h),
    Math.round(clamp(s * map(l, 50, 100, 1, 0.25), 0, 100)),
    Math.round(clamp(map(l, 0, 100, 0, top) - 5, 0, 100)),
  ];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const channel = (n: number) => Math.round(255 * (ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return [channel(0), channel(8), channel(4)];
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return x < 0 ? -y : y;
}

/**
 * The cross-section of one layer across a line `width` px wide: the line
 * convolved with the same Gaussian blur canvas and CSS use (σ = blur / 2), in
 * device pixels. Painted once per width and layer, then stretched along the
 * line — which is why the harp's shadow glides with the string instead of
 * stepping (the experiment's v18 → v19 finding).
 */
export function instrumentShadowProfile(
  width: number,
  layer: InstrumentShadowLayer,
  dpr: number,
): { alphas: Float32Array; half: number } {
  const [, , blur, spread, alpha] = layer;
  const sigma = Math.max(0.05, blur / 2);
  const bw = Math.max(1, width + 2 * spread);
  const half = bw / 2 + 3 * sigma + 1;
  const n = Math.ceil(2 * half * dpr);
  const r2 = sigma * Math.SQRT2;
  const alphas = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const u = (i + 0.5) / dpr - half;
    alphas[i] = alpha * 0.5 * (erf((u + bw / 2) / r2) - erf((u - bw / 2) / r2));
  }
  return { alphas, half };
}

/**
 * The parameters as the tokens state them, from a computed style — the
 * element must sit inside `[data-theme]` so the amendments apply.
 */
export function readInstrumentShadowParams(style: CSSStyleDeclaration): InstrumentShadowParams {
  const num = (name: string, fallback: number) => {
    const v = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const d = INSTRUMENT_SHADOW_DEFAULT;
  const level = Math.round(clamp(num('--instrument-shadow-level', d.level), 0, 3)) as InstrumentShadowParams['level'];
  return {
    level,
    oomph: num('--instrument-shadow-oomph', d.oomph),
    crispy: num('--instrument-shadow-crispy', d.crispy),
    resolution: num('--instrument-shadow-resolution', d.resolution),
    lightX: num('--instrument-shadow-light-x', d.lightX),
    lightY: num('--instrument-shadow-light-y', d.lightY),
    tint: num('--instrument-shadow-tint', 1) !== 0,
  };
}
