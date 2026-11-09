/**
 * How the harp looks: seven strings that swing when plucked, bend where they
 * are held, ease from rest into the played or answer colour, over a
 * multi-layer shadow. The experiment's `pluck`/`answerPluck` (the visual
 * half), `level`, `frame`, `stroke`, `drawString` and `shadowPass`.
 *
 * Split in two so the motion can be tested without a canvas:
 *   `shapeStrings` — pure: per string its bent line `xAt(y)`, width, colour
 *                    level and who played it (`experiment.test.ts` runs the
 *                    experiment's own `frame` beside it);
 *   `paintHarp`    — the canvas calls.
 *
 * ── ONE FIXED LOOK ────────────────────────────────────────────────────────
 * Ben, 2026-11-09: no colour-step chooser, no shadow sliders. Colours come
 * only from `host.palette()`, the shadow only from `host.shadow()` and the
 * design system's `instrumentShadowProfile`.
 */
import { instrumentShadowProfile, type InstrumentShadowLayer } from '@musie/design-system';
import type { InstrumentPalette, StageBox } from '../types';
import { tension } from './geometry';
import type { Pull } from './input';
import type { HarpSound } from './sound';

/** Who sounded a string last: the person, or Musie's answer. */
export type Who = 'me' | 'harp';

/** One string's motion and colour — the experiment's `vib[i]`. */
export interface StringState {
  /** Swing amplitude at pluck time, px. */
  amp: number;
  /** When it was plucked, ms. */
  t0: number;
  phase: number;
  who: Who;
  held: Pull | null;
  /** The colour level's current ease: from, to, since. */
  from: number;
  to: number;
  ts: number;
}

export const newString = (): StringState => ({ amp: 0, t0: 0, phase: 0, who: 'me', held: null, from: 0, to: 0, ts: 0 });

/**
 * The motion's literals, as the experiment's `pluck` and `frame` wrote them.
 * `harp.json` locks the sound and the look's named constants (`visual`);
 * these sat inline in the drawing code and are kept here, unchanged.
 */
export const SWING = {
  /** Amplitude = MOTION · (3 + 15 · velocity) px. */
  base: 3,
  perVelocity: 15,
  /** Without damping a re-pluck keeps half the old swing. */
  undampedKeep: 0.5,
  /** The picture dies away with the sound: τ = decay / 3, within 0.25 … 0.9 s. */
  tauDivisor: 3,
  tauMin: 0.25,
  tauMax: 0.9,
  /** prefers-reduced-motion: the swing never wider than this, px. */
  reducedMax: 4,
  /** Below this the string is still, px. */
  still: 0.05,
  /** Oscillation 6 Hz on the lowest string, 14 Hz on the highest. */
  hz: 6,
  hzSpan: 8,
  /** A second harmonic at a quarter, gone in about 0.3 s. */
  overtone: 0.25,
  overtoneTau: 0.3,
  /** Swinging wider than this, the string shows its played colour. */
  active: 1.5,
  /** A held string's colour: 0.3 + 0.7 · tension. */
  heldBase: 0.3,
  heldSpan: 0.7,
  phase: 6,
  /** Strings run 2 px past the canvas at both ends. */
  overhang: 2,
  /** A colour target closer than this to the current one is not restarted. */
  levelEpsilon: 0.02,
} as const;

/** The visual half of the experiment's `pluck` and `answerPluck`. */
export function pluckString(
  s: StringState,
  vel: number,
  who: Who,
  now: number,
  sound: HarpSound,
  random: () => number = Math.random,
): void {
  const keep = sound.preset.damp ? 0 : s.amp * SWING.undampedKeep;
  s.amp = Math.max(keep, sound.visual.MOTION * (SWING.base + SWING.perVelocity * vel));
  s.t0 = now;
  s.phase = random() * SWING.phase;
  s.who = who;
}

const easeInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

const fadeMs = (s: StringState, visual: HarpSound['visual']) => (s.to > s.from ? visual.fadeInMs : visual.fadeOutMs);

/** The experiment's `level`: an eased move towards `target`, 0 rest … 1 active. */
export function level(s: StringState, now: number, target: number, visual: HarpSound['visual'], reduced: boolean): number {
  const cur = () => s.from + (s.to - s.from) * easeInOut(Math.min(1, (now - s.ts) / fadeMs(s, visual)));
  if (Math.abs(target - s.to) > SWING.levelEpsilon) {
    s.from = cur();
    s.to = target;
    s.ts = now;
  }
  return reduced ? target : cur();
}

/**
 * The height a held string bends at: the finger's, kept one pixel inside the
 * canvas (the experiment's `frame`). The tap dot of a pull sits there too.
 */
export const bendY = (y: number, height: number): number => Math.max(1, Math.min(height - 1, y));

export interface DrawnString {
  /** x of the string at height y, CSS px. */
  xAt: (y: number) => number;
  w: number;
  /** Colour level, 0 rest … 1 played or answer. */
  k: number;
  /** Straight and at rest: one shadow strip is enough. */
  still: boolean;
  who: Who;
}

/**
 * Every string's shape for the frame at `now` — the loop body of the
 * experiment's `frame`. Mutates the states as `frame` did (a still string's
 * amplitude is zeroed, colour eases advance). `moving` is false once nothing
 * swings, nothing is held and no colour is still easing: the host may stop
 * asking for frames.
 */
export function shapeStrings(
  now: number,
  strings: StringState[],
  xs: readonly number[],
  height: number,
  sound: HarpSound,
  reduced: boolean,
): { drawn: DrawnString[]; moving: boolean } {
  const { visual, preset } = sound;
  const count = strings.length;
  const H = height;
  const tau = Math.max(SWING.tauMin, Math.min(SWING.tauMax, preset.decay / SWING.tauDivisor));
  const drawn: DrawnString[] = [];
  let moving = false;

  for (let i = 0; i < count; i += 1) {
    const s = strings[i];
    const x0 = xs[i];
    const t = i / (count - 1);
    const w = visual.width[0] + (visual.width[1] - visual.width[0]) * t;
    const age = (now - s.t0) / 1000;
    let a = s.held ? 0 : s.amp * Math.exp(-age / tau);
    if (reduced) a = Math.min(a, SWING.reducedMax);
    if (a < SWING.still) {
      a = 0;
      if (!s.held) s.amp = 0;
    }

    let xAt: (y: number) => number = () => x0;
    if (s.held) {
      const fy = bendY(s.held.y, H);
      const fx = s.held.dx;
      xAt = (y) => x0 + fx * (y < fy ? Math.max(0, y) / fy : Math.max(0, H - y) / (H - fy));
    } else if (a) {
      const osc = Math.cos(2 * Math.PI * (SWING.hz + SWING.hzSpan * t) * age + s.phase);
      const overtone = SWING.overtone * Math.exp(-age / SWING.overtoneTau);
      xAt = (y) => x0 + a * osc * (Math.sin((Math.PI * y) / H) + overtone * Math.sin((2 * Math.PI * y) / H));
    }

    const target = s.held ? SWING.heldBase + SWING.heldSpan * tension(s.held.dx, xs, sound.velocity.pull) : a > SWING.active ? 1 : 0;
    const k = level(s, now, target, visual, reduced);
    drawn.push({ xAt, w, k, still: !a && !s.held, who: s.who });

    const easing = !reduced && s.from !== s.to && now - s.ts < fadeMs(s, visual);
    if (a > 0 || s.held !== null || easing) moving = true;
  }
  return { drawn, moving };
}

/* ── painting ──────────────────────────────────────────────────────────── */

interface ShadowRow {
  canvas: HTMLCanvasElement;
  half: number;
  x: number;
  y: number;
}

/** Shadow cross-sections, painted once per string width and layer. */
export interface ShadowCache {
  key: string;
  byWidth: Map<number, ShadowRow[]>;
}

export interface HarpShadow {
  layers: readonly InstrumentShadowLayer[];
  rgb: readonly [number, number, number];
}

/** A cross-section's alphas, painted into a canvas one device pixel tall. */
function paintRow(alphas: Float32Array, rgb: readonly [number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = alphas.length;
  c.height = 1;
  const g = c.getContext('2d');
  if (g !== null) {
    const img = g.createImageData(alphas.length, 1);
    for (let i = 0; i < alphas.length; i += 1) {
      img.data[i * 4] = rgb[0];
      img.data[i * 4 + 1] = rgb[1];
      img.data[i * 4 + 2] = rgb[2];
      img.data[i * 4 + 3] = Math.round(255 * alphas[i]);
    }
    g.putImageData(img, 0, 0);
  }
  return c;
}

/**
 * The experiment's `shadowPass`: no per-frame blur. Each layer's
 * cross-section is drawn as strips down the string, each strip skewed to
 * follow the bend, so the shadow glides with the string.
 */
function shadowPass(
  g: CanvasRenderingContext2D,
  drawn: DrawnString[],
  shadow: HarpShadow,
  box: StageBox,
  steps: number,
  cache: { current: ShadowCache | null },
): void {
  const { dpr, height: H } = box;
  const key = JSON.stringify([shadow.layers, shadow.rgb, dpr]);
  if (cache.current === null || cache.current.key !== key) cache.current = { key, byWidth: new Map() };
  const rows = cache.current.byWidth;
  const snapY = (y: number) => Math.round(y * dpr) / dpr;
  const top = -SWING.overhang;
  const span = H + 2 * SWING.overhang;

  for (const { xAt, w, still } of drawn) {
    let set = rows.get(w);
    if (set === undefined) {
      set = shadow.layers.map((layer) => {
        const { alphas, half } = instrumentShadowProfile(w, layer, dpr);
        return { canvas: paintRow(alphas, shadow.rgb), half, x: layer[0], y: layer[1] };
      });
      rows.set(w, set);
    }
    const n = still ? 1 : steps;
    for (const p of set) {
      const dw = p.canvas.width / dpr;
      for (let k = 0; k < n; k += 1) {
        const y0 = snapY(top + (span * k) / n);
        const y1 = snapY(top + (span * (k + 1)) / n);
        const x0 = xAt(y0);
        const sk = (xAt(y1) - x0) / (y1 - y0);
        g.setTransform(dpr, 0, dpr * sk, dpr, dpr * (x0 + p.x - p.half), dpr * (y0 + p.y));
        g.drawImage(p.canvas, 0, 0, p.canvas.width, 1, 0, 0, dw, y1 - y0);
      }
    }
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** The experiment's `stroke`: the bent string as a polyline of `steps` segments. */
function stroke(g: CanvasRenderingContext2D, xAt: (y: number) => number, width: number, color: string, H: number, steps: number): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  for (let k = 0; k <= steps; k += 1) {
    const y = -SWING.overhang + ((H + 2 * SWING.overhang) * k) / steps;
    const x = xAt(y);
    if (k) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
}

/** One frame: background, every shadow, then every string over them. */
export function paintHarp(
  g: CanvasRenderingContext2D,
  drawn: DrawnString[],
  box: StageBox,
  palette: InstrumentPalette,
  shadow: HarpShadow | null,
  sound: HarpSound,
  mix: (k: number, rest: string, to: string) => string,
  cache: { current: ShadowCache | null },
): void {
  const { dpr, width: W, height: H } = box;
  const steps = sound.visual.steps;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = palette.background;
  g.fillRect(0, 0, W, H);
  g.lineCap = 'butt';
  g.lineJoin = 'round';
  if (shadow !== null && shadow.layers.length > 0) shadowPass(g, drawn, shadow, box, steps, cache);
  for (const { xAt, w, k, who } of drawn) {
    stroke(g, xAt, w, mix(k, palette.rest, who === 'harp' ? palette.answer : palette.played), H, steps);
  }
}
