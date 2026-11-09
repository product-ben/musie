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
 *
 * ── THE DOT IS THE DESIGN SYSTEM'S ─────────────────────────────────────────
 * The experiment's `dots` became the tap effect of all three instruments in
 * round 2 (Ben, 2026-11-09), maintained centrally: `instrumentTapAt` +
 * `paintInstrumentTap` from '@musie/design-system', on the parameters
 * `host.tap()` reads from the `--instrument-tap-*` tokens. So this file says
 * only WHERE a dot is (the tine's centre, the touched point along it) and how
 * STRONG (the note's velocity); how it grows, fades and is coloured is the
 * design system's. It is drawn for the person's own notes only — never for
 * Musie's answer, never for the demo note (index.ts decides which).
 *
 * One difference, accepted: the experiment's unit was the live tine width
 * `L.tw`; the token's `--instrument-tap-size` is that width on the 393px
 * phone (16.85px). Where the tine clamps at 22px (wide screens) the dot is
 * about 23% smaller than the experiment's. parity.test.ts holds the rest.
 */
import { instrumentTapAt, paintInstrumentTap } from '@musie/design-system';
import type { InstrumentTapParams } from '@musie/design-system';
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

/** An own note's press (`presses` in the experiment) — where the tap is drawn. */
export interface Press {
  tine: number;
  /** 0 at the bridge, 1 at the tip; drawn clamped to the tine. */
  pos: number;
  /** The note's velocity: the tap's strength. */
  vel: number;
  t0: number;
}

/** The experiment's look, as numbers. */
export const LOOK = {
  /** `glow = exp(-t / 1.1) * (0.4 + 0.6 * vel)`, shown while above 0.02, mixed at `glow * 1.1`. */
  glow: { tauS: 1.1, base: 0.4, span: 0.6, visible: 0.02, gain: 1.1 },
} as const;

export const hitColour = (p: InstrumentPalette, tone: Tone): string => (tone === 'answer' ? p.answer : p.played);

/** How brightly a tine glows `ageMs` after it was struck. */
export const glowAt = (ageMs: number, vel: number): number =>
  Math.exp(-ageMs / 1000 / LOOK.glow.tauS) * (LOOK.glow.base + LOOK.glow.span * vel);

/** How far towards the hit colour a tine is drawn, or null when it is at rest. */
export const glowMix = (glow: number): number | null =>
  glow > LOOK.glow.visible ? Math.min(1, glow * LOOK.glow.gain) : null;

/** Where a press's tap sits: on the tine's centre line, at the touched point (`dots` in the experiment). */
export function pressPoint(L: KalimbaLayout, d: Press): { x: number; y: number } | null {
  const T = L.tines[d.tine];
  if (!T) return null;
  return { x: T.cx, y: bridgeY(L, T.cx) + clamp(d.pos, 0, 1) * T.len };
}

/* ── colour arithmetic: a canvas cannot mix CSS colours itself ───────── */

export type Rgb = readonly [number, number, number];

const parsed = new Map<string, Rgb | null>();

/**
 * A resolved CSS colour as sRGB 0–255: `rgb()`/`rgba()` in either syntax,
 * `#rgb`/`#rrggbb` (alpha ignored), `color(srgb …)`. Null for anything else,
 * and then the caller draws a tine without mixing, and no tap, rather than
 * either in a wrong colour.
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

/* ── the frame ───────────────────────────────────────────────────────── */

export interface Scene {
  layout: KalimbaLayout;
  glows: readonly TineGlow[];
  /** The own notes' presses — never an answer's or the demo's. */
  presses: readonly Press[];
  /** `host.tap()`: the tap effect's parameters, from the tokens. */
  tap: InstrumentTapParams;
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

  /* The tap, between the rest colour and the played one — the person's
     colour, since only own notes leave one. The host resolves both through
     a computed `color`, which reads as rgb(); one that cannot be read draws
     no dot rather than a wrong one. */
  const rest = parseColour(palette.rest);
  const played = parseColour(palette.played);
  for (const d of scene.presses) {
    const at = pressPoint(L, d);
    const frame = instrumentTapAt(scene.tap, { ageMs: now - d.t0, strength: d.vel });
    if (!at || frame.done) continue;
    moving = true;
    if (rest && played) paintInstrumentTap(g, at.x, at.y, frame, rest, played);
  }
  return moving;
}
