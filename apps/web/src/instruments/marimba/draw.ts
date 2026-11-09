/**
 * The marimba, drawn: flat bars across the full width, low on the left, two
 * cords through the nodal points, a soft dot where the mallet hit.
 *
 * Source: the experiment's „Zeichnen“ (`layout`, `cords`, `bar`, `dots`,
 * `draw`, `lightUp`) and „Berühren“ (`hit`). The geometry is the experiment's
 * own and lives here as named constants — `marimba.json` locks the SOUND, the
 * look is this file. The experiment is flat (v1, v3), so no instrument shadow
 * is drawn.
 *
 * COLOURS come only from `host.palette()` (CLAUDE.md rule 1): the bars at
 * rest are `rest` (the key family), the person's strokes `played`, Musie's
 * answer `answer`, cords and holes `detail`, the ground `background`.
 */
import type { InstrumentPalette, StageBox } from '../types';
import { clamp } from './strike';

/* ── geometry, as the experiment draws it ─────────────────────────────── */

/** Side margin: at least this, or the safe area. */
const SIDE_MIN = 16;
/** Clear space above the bars (below the header) and below them (above the toolbar). */
const CHROME_GAP = 8;
/** The bars never get shorter than this, however little room there is. */
const MIN_AVAIL = 60;
/** Length falls with pitch as (f0 / f)^0.16: the highest bar is a good 80 % of the lowest. */
const LENGTH_EXPONENT = 0.16;
/** Width as a share of the column: 0.82 for the lowest bar, 0.12 less for the highest. */
const WIDTH_BASE = 0.82;
const WIDTH_TAPER = 0.12;
/** The nodal points, 22.4 % from either end: cords and holes. */
const NODES = [0.224, 0.776] as const;
/** How far outside the bars a touch still counts. */
const HIT_ABOVE = 24;
const HIT_BELOW = 12;
const HIT_SIDE = 8;
const CORD_WIDTH = 1.5;
const CORD_OVERHANG = 4;
const CORNER_MAX = 8;
const HOLE_SHARE = 0.05;
const HOLE_MIN = 1.5;
const HOLE_MAX = 3;

/* ── light ───────────────────────────────────────────────────────────── */

/** glow = e^(−t/glowTau) · (0.35 + 0.65 · vel); lit above 0.02; colour share glow · 1.15. */
const GLOW_BASE = 0.35;
const GLOW_SPAN = 0.65;
const GLOW_LIT = 0.02;
const GLOW_GAIN = 1.15;
/** A bar struck again by the same player while still lit keeps 70 % of its glow. */
const GLOW_KEEP = 0.7;
/** The dot: radius share of the bar width, growth, fade, and its three gradient stops. */
const DOT_BASE = 0.18;
const DOT_GROW = 0.15;
const DOT_GROW_VEL = 0.35;
const DOT_POS_MIN = 0.08;
const DOT_POS_MAX = 0.92;
const DOT_FADE_POWER = 1.4;
const DOT_ALPHA_BASE = 0.4;
const DOT_ALPHA_VEL = 0.5;
const DOT_STOPS = [[0, 0.9], [0.4, 0.5], [1, 0]] as const;

/**
 * The ground warms toward `played` at `calm · calm.background · WARM_SHARE`.
 *
 * The experiment warmed `--sand-1` toward `--terracotta-2` at `calm · 0.85`.
 * `played` is `--terracotta-7`, much stronger than terracotta-2, so the
 * experiment's factor alone would turn the ground the colour of a stroke and
 * take the strokes' contrast with it. Measured on the tokens, terracotta-2 is
 * 13 % (light) and 15 % (dark) of the way from sand-1 to terracotta-7
 * (least squares over RGB); 0.14 keeps the experiment's warmest ground.
 */
export const WARM_SHARE = 0.14;

/* ── layout and hit ──────────────────────────────────────────────────── */

export interface BarGeometry {
  cx: number;
  w: number;
  h: number;
  y0: number;
}

export interface MarimbaLayout {
  width: number;
  height: number;
  x0: number;
  x1: number;
  col: number;
  top: number;
  bottom: number;
  bars: BarGeometry[];
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * The experiment's `layout`, in the stage's box: the bars span the full width
 * between the side margins, and the height between the chrome the stage
 * reserves (`inset.top` for the header, `inset.bottom` for the toolbar).
 */
export function layoutBars(box: StageBox, scale: readonly { midi: number }[]): MarimbaLayout {
  const { width, height, inset } = box;
  const x0 = Math.max(SIDE_MIN, inset.left);
  const x1 = width - Math.max(SIDE_MIN, inset.right);
  const top = inset.top + CHROME_GAP;
  const bottom = height - inset.bottom - CHROME_GAP;
  const n = scale.length;
  const col = (x1 - x0) / n;
  const avail = Math.max(MIN_AVAIL, bottom - top);
  const cy = (top + bottom) / 2;
  const f0 = hz(scale[0].midi);
  const bars = scale.map((b, i) => {
    const h = avail * Math.pow(f0 / hz(b.midi), LENGTH_EXPONENT);
    const w = col * (WIDTH_BASE - (WIDTH_TAPER * i) / Math.max(1, n - 1));
    return { cx: x0 + col * (i + 0.5), w, h, y0: cy - h / 2 };
  });
  return { width, height, x0, x1, col, top, bottom, bars };
}

/** `hit`: which bar, and where along it (0 top … 1 bottom, may overshoot); null off the instrument. */
export function hitBar(L: MarimbaLayout, x: number, y: number): { i: number; pos: number } | null {
  if (y < L.top - HIT_ABOVE || y > L.bottom + HIT_BELOW || x < L.x0 - HIT_SIDE || x > L.x1 + HIT_SIDE) return null;
  const i = clamp(Math.floor((x - L.x0) / L.col), 0, L.bars.length - 1);
  const B = L.bars[i];
  return { i, pos: (y - B.y0) / B.h };
}

/** Portrait: the marimba lies across, so the stage may ask to turn the phone. */
export function isPortrait(box: StageBox | null): boolean {
  return box !== null && box.height > box.width;
}

/* ── colour ──────────────────────────────────────────────────────────── */

export type Rgb = readonly [number, number, number];

const parsed = new Map<string, Rgb>();

/**
 * A resolved CSS colour as RGB 0 … 255 — what a probe element's computed
 * `color` gives (`rgb(…)` / `rgba(…)`, either syntax), plus hex and
 * `color(srgb …)` for safety. Anything else falls back to the experiment's
 * rule: the first three numbers in the string.
 */
export function parseColour(css: string): Rgb {
  const known = parsed.get(css);
  if (known) return known;
  const s = css.trim().toLowerCase();
  let rgb: Rgb;
  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    const full = h.length <= 4 ? [...h.slice(0, 3)].map((c) => c + c).join('') : h.slice(0, 6);
    rgb = [0, 2, 4].map((k) => parseInt(full.slice(k, k + 2), 16)) as unknown as Rgb;
  } else if (s.startsWith('color(srgb')) {
    const n = (s.match(/-?[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    rgb = n.map((v) => Math.round(clamp(v, 0, 1) * 255)) as unknown as Rgb;
  } else {
    const n = (s.match(/-?[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    rgb = [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0];
  }
  parsed.set(css, rgb);
  return rgb;
}

/** `mix`: from `a` toward `b` by `t`, as an `rgb(…)` string. */
export function mixColour(a: string, b: string, t: number): string {
  const A = parseColour(a);
  const B = parseColour(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export function withAlpha(colour: string, alpha: number): string {
  const [r, g, b] = parseColour(colour);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── the picture ─────────────────────────────────────────────────────── */

export type Player = 'played' | 'answer';

interface BarLight {
  t0: number;
  vel: number;
  who: Player;
  on: boolean;
}

interface Press {
  i: number;
  pos: number;
  vel: number;
  who: Player;
  t0: number;
}

/** The glow of a struck bar `ms` after the stroke. */
export function glowAt(ms: number, vel: number, glowTau: number): number {
  return Math.exp(-ms / 1000 / glowTau) * (GLOW_BASE + GLOW_SPAN * vel);
}

/** What `draw` needs that changes from frame to frame. */
export interface Frame {
  layout: MarimbaLayout | null;
  dpr: number;
  palette: InstrumentPalette;
  /** 0 … 1: how far the ground has warmed toward `played`. */
  warmth: number;
  now: number;
}

export interface MarimbaPicture {
  /** `lightUp`: a bar struck by the person (`played`) or by Musie (`answer`). */
  lightUp(i: number, vel: number, who: Player, pos: number, now: number): void;
  /** One frame. True while a bar still glows or a dot still fades. */
  draw(g: CanvasRenderingContext2D, frame: Frame): boolean;
}

export function createPicture(count: number, visual: { dotMs: number; glowTau: number }): MarimbaPicture {
  const light: BarLight[] = Array.from({ length: count }, () => ({ t0: -1e9, vel: 0, who: 'played', on: false }));
  let presses: Press[] = [];

  function cords(g: CanvasRenderingContext2D, L: MarimbaLayout, p: InstrumentPalette) {
    g.strokeStyle = p.detail;
    g.lineWidth = CORD_WIDTH;
    g.lineCap = 'round';
    for (const f of NODES) {
      g.beginPath();
      L.bars.forEach((B, i) => {
        const y = B.y0 + B.h * f;
        if (i === 0) g.moveTo(L.x0 - CORD_OVERHANG, y);
        g.lineTo(B.cx, y);
      });
      const last = L.bars[L.bars.length - 1];
      g.lineTo(L.x1 + CORD_OVERHANG, last.y0 + last.h * f);
      g.stroke();
    }
  }

  function bar(g: CanvasRenderingContext2D, L: MarimbaLayout, p: InstrumentPalette, i: number, now: number) {
    const B = L.bars[i];
    const s = light[i];
    const glow = glowAt(now - s.t0, s.vel, visual.glowTau);
    s.on = glow > GLOW_LIT;
    g.fillStyle = s.on ? mixColour(p.rest, s.who === 'answer' ? p.answer : p.played, Math.min(1, glow * GLOW_GAIN)) : p.rest;
    g.beginPath();
    g.roundRect(B.cx - B.w / 2, B.y0, B.w, B.h, Math.min(CORNER_MAX, B.w / 4));
    g.fill();
    g.fillStyle = p.detail;
    const r = clamp(B.w * HOLE_SHARE, HOLE_MIN, HOLE_MAX);
    for (const f of NODES) {
      g.beginPath();
      g.arc(B.cx, B.y0 + B.h * f, r, 0, 2 * Math.PI);
      g.fill();
    }
  }

  function dots(g: CanvasRenderingContext2D, L: MarimbaLayout, p: InstrumentPalette, now: number) {
    presses = presses.filter((d) => now - d.t0 < visual.dotMs && d.i < L.bars.length);
    for (const d of presses) {
      const B = L.bars[d.i];
      const t = (now - d.t0) / visual.dotMs;
      const grow = 1 - Math.pow(1 - t, 3);
      const r = B.w * (DOT_BASE + (DOT_GROW + DOT_GROW_VEL * d.vel) * grow);
      const x = B.cx;
      const y = B.y0 + clamp(d.pos, DOT_POS_MIN, DOT_POS_MAX) * B.h;
      const colour = d.who === 'answer' ? p.answer : p.played;
      const fill = g.createRadialGradient(x, y, 0, x, y, r);
      for (const [at, alpha] of DOT_STOPS) fill.addColorStop(at, withAlpha(colour, alpha));
      g.globalAlpha = Math.pow(1 - t, DOT_FADE_POWER) * (DOT_ALPHA_BASE + DOT_ALPHA_VEL * d.vel);
      g.fillStyle = fill;
      g.beginPath();
      g.arc(x, y, r, 0, 2 * Math.PI);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  return {
    lightUp(i, vel, who, pos, now) {
      const s = light[i];
      if (!s) return;
      s.vel = Math.max(vel, s.on && s.who === who ? s.vel * GLOW_KEEP : 0);
      s.t0 = now;
      s.who = who;
      s.on = true;
      presses.push({ i, pos, vel, who, t0: now });
    },

    draw(g, { layout: L, dpr, palette: p, warmth, now }) {
      if (!L) return false;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = warmth > 0 ? mixColour(p.background, p.played, warmth) : p.background;
      g.fillRect(0, 0, L.width, L.height);
      cords(g, L, p);
      let lit = false;
      for (let i = 0; i < L.bars.length; i++) {
        bar(g, L, p, i, now);
        lit ||= light[i].on;
      }
      dots(g, L, p, now);
      return lit || presses.length > 0;
    },
  };
}
