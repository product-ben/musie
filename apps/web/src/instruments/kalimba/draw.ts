/**
 * Drawing the kalimba: the experiment's „Zeichnen“ (`tine`, `wave`, `draw`,
 * `dots`), flat and single-coloured, on the colours the host resolves from
 * the instrument tokens — never a colour of its own.
 *
 *   tines at rest  palette.rest      (--instrument-key: the kalimba is a key)
 *   touched        palette.played    (--instrument-played)
 *   answered       palette.answer    (--instrument-answer)
 *   behind it      palette.background
 *   the bridge     palette.detail    (--instrument-detail)
 *
 * Nothing moves but colour and the soft dot a press leaves; the bridge is
 * still (geometry.ts says why it is a wave). One fixed look: the experiment's
 * shade chooser and wood block are not ported (Ben, 2026-11-09).
 */
import type { InstrumentPalette } from '../types';
import type { KalimbaLayout } from './geometry';
import { bridgePoints, bridgeStroke, bridgeY, tineSpan } from './geometry';
import { clamp } from './sound';

/** Who sounded a tine: the person, or Musie answering. */
export type Tone = 'played' | 'answer';

/** A tine's colour state (`state[i]` in the experiment). */
export interface TineGlow {
  t0: number;
  vel: number;
  tone: Tone;
}

/** A press dot (`presses` in the experiment). */
export interface Press {
  tine: number;
  pos: number;
  vel: number;
  t0: number;
  tone: Tone;
}

/** The experiment's look, as numbers. */
export const LOOK = {
  /** `glow = exp(-t / 1.1) * (0.4 + 0.6 * vel)`, shown while above 0.02, mixed at `glow * 1.1`. */
  glow: { tauS: 1.1, base: 0.4, span: 0.6, visible: 0.02, gain: 1.1 },
  dot: {
    /** `r = tw * (0.8 + (0.6 + 3.4 * vel) * grow)` — a soft edge looks smaller, so drawn larger. */
    radius: { base: 0.8, grow: 0.6, vel: 3.4 },
    /** `grow = 1 - (1 - p)^3`. */
    growPower: 3,
    /** rest → hit at `0.3 + 0.7 * vel`. */
    mix: { base: 0.3, vel: 0.7 },
    /** `alpha = min(1, (1 - p)^1.6 * (0.45 + 0.75 * vel))`. */
    alpha: { power: 1.6, base: 0.45, vel: 0.75 },
    /** Blur as a gradient: Safari has no canvas filter. */
    stops: [[0, 1], [0.3, 0.8], [0.65, 0.3], [1, 0]] as const,
  },
} as const;

export const hitColour = (p: InstrumentPalette, tone: Tone): string => (tone === 'answer' ? p.answer : p.played);

/** How brightly a tine glows `ageMs` after it was struck. */
export const glowAt = (ageMs: number, vel: number): number =>
  Math.exp(-ageMs / 1000 / LOOK.glow.tauS) * (LOOK.glow.base + LOOK.glow.span * vel);

/** How far towards the hit colour a tine is drawn, or null when it is at rest. */
export const glowMix = (glow: number): number | null =>
  glow > LOOK.glow.visible ? Math.min(1, glow * LOOK.glow.gain) : null;

/** One press dot at `now`, or null once it has faded (`dotMs`). */
export function dotAt(
  L: KalimbaLayout,
  d: Press,
  now: number,
  dotMs: number,
): { x: number; y: number; r: number; alpha: number; mix: number } | null {
  const age = now - d.t0;
  if (age >= dotMs) return null;
  const T = L.tines[d.tine];
  if (!T) return null;
  const p = Math.max(0, age) / dotMs;
  const grow = 1 - Math.pow(1 - p, LOOK.dot.growPower);
  const R = LOOK.dot.radius;
  const A = LOOK.dot.alpha;
  return {
    x: T.cx,
    y: bridgeY(L, T.cx) + clamp(d.pos, 0, 1) * T.len,
    r: L.tw * (R.base + (R.grow + R.vel * d.vel) * grow),
    alpha: Math.min(1, Math.pow(1 - p, A.power) * (A.base + A.vel * d.vel)),
    mix: LOOK.dot.mix.base + LOOK.dot.mix.vel * d.vel,
  };
}

/* ── colour arithmetic: a canvas cannot mix CSS colours itself ───────── */

export type Rgb = readonly [number, number, number];

const parsed = new Map<string, Rgb | null>();

/**
 * A resolved CSS colour as sRGB 0–255: `rgb()`/`rgba()` in either syntax,
 * `#rgb`/`#rrggbb` (alpha ignored), `color(srgb …)`. Null for anything else,
 * and then the caller draws without mixing rather than in a wrong colour.
 */
export function parseColour(colour: string): Rgb | null {
  const hit = parsed.get(colour);
  if (hit !== undefined) return hit;
  const s = colour.trim().toLowerCase();
  let out: Rgb | null = null;
  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  const fn = /^rgba?\(([^)]*)\)$/.exec(s);
  const srgb = /^color\(\s*srgb\s+([^)]*)\)$/.exec(s);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) out = [0, 1, 2].map((k) => parseInt(h[k] + h[k], 16)) as unknown as Rgb;
    else if (h.length === 6 || h.length === 8) out = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)) as unknown as Rgb;
  } else if (fn || srgb) {
    const parts = (fn ?? srgb)![1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    const scale = srgb ? 255 : 1;
    const nums = parts.map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p) * scale));
    if (nums.length === 3 && nums.every(Number.isFinite)) out = nums as unknown as Rgb;
  }
  parsed.set(colour, out);
  return out;
}

/** `mix(a, b, t)` of the experiment: straight sRGB interpolation. */
export function mixColour(a: string, b: string, t: number): string {
  const A = parseColour(a);
  const B = parseColour(b);
  if (!A || !B) return t < 0.5 ? a : b;
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

/** The same colour at an alpha, for the dot's gradient stops. */
export function withAlpha(colour: string, alpha: number): string {
  const C = parseColour(colour);
  return C ? `rgba(${C.map((v) => Math.round(v)).join(',')},${alpha})` : colour;
}

/* ── the frame ───────────────────────────────────────────────────────── */

export interface Scene {
  layout: KalimbaLayout;
  glows: readonly TineGlow[];
  presses: readonly Press[];
  dotMs: number;
  width: number;
  height: number;
}

/** Draws one frame. True while a tine still glows or a dot still fades. */
export function drawKalimba(g: CanvasRenderingContext2D, scene: Scene, palette: InstrumentPalette, now: number): boolean {
  const L = scene.layout;
  g.fillStyle = palette.background;
  g.fillRect(0, 0, scene.width, scene.height);
  let moving = false;

  g.lineWidth = L.tw;
  g.lineCap = 'round';
  scene.glows.forEach((s, i) => {
    if (!L.tines[i]) return;
    const t = glowMix(glowAt(now - s.t0, s.vel));
    g.strokeStyle = t === null ? palette.rest : mixColour(palette.rest, hitColour(palette, s.tone), t);
    const { x, y0, y1 } = tineSpan(L, i);
    g.beginPath();
    g.moveTo(x, y0);
    g.lineTo(x, y1);
    g.stroke();
    if (t !== null) moving = true;
  });

  const bridge = bridgeStroke(L);
  g.strokeStyle = palette.detail;
  g.lineWidth = bridge.lineWidth;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  bridgePoints(L).forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.stroke();

  for (const d of scene.presses) {
    const dot = dotAt(L, d, now, scene.dotMs);
    if (!dot) continue;
    const c = mixColour(palette.rest, hitColour(palette, d.tone), dot.mix);
    const fill = g.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r);
    for (const [at, a] of LOOK.dot.stops) fill.addColorStop(at, withAlpha(c, a));
    g.globalAlpha = dot.alpha;
    g.fillStyle = fill;
    g.beginPath();
    g.arc(dot.x, dot.y, dot.r, 0, 2 * Math.PI);
    g.fill();
    moving = true;
  }
  g.globalAlpha = 1;
  return moving;
}
