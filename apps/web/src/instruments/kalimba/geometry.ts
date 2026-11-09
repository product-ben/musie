/**
 * Where the kalimba is: the experiment's `layout`, `waveAt` and `hit`, pure.
 *
 * ── THE BRIDGE ────────────────────────────────────────────────────────────
 * The experiment (261106-1121) draws the bridge as one circular arc. Lucia
 * preferred the still wavy line of the version before it (OPEN-QUESTIONS,
 * „the bridge went from a still wavy line to a single arc“, PR #69), and Ben
 * decided for it on 2026-11-09: a sine of one and a half waves across the
 * tines that does NOT move with the swing. It is the wave of 261105-1745 with
 * its swing term and its running phase taken out, at the full amplitude the
 * layout already reserves above and below `waveY`. With the phase at 0 the
 * crest falls on the middle tine — the lowest, the longest — so the bridge is
 * still highest in the middle, as the arc was, and symmetric. The tine tops
 * follow the wave.
 *
 * Every other number is the experiment's.
 */
import type { StageBox } from '../types';
import { clamp } from './sound';

/** The experiment's layout constants, in CSS pixels or fractions of the pitch. */
export const GEOMETRY = {
  /** Below the header (`header.bottom + 28`) … */
  headerGap: 28,
  /** … and above the footer (`footTop - 20`). */
  footGap: 20,
  /** `min(W - 32, 560)`. */
  gutter: 32,
  maxWidth: 560,
  tineWidth: { ofPitch: 0.42, min: 10, max: 22 },
  amp: { ofPitch: 0.22, min: 6, max: 14 },
  /** `waveY = top + amp + 4`. */
  wavePad: 4,
  minAvail: 80,
  /** The bridge reaches past the outer tines by this much of a pitch. */
  bridgeReach: 0.45,
  bridgeWidth: { ofTine: 0.55, min: 6, max: 11 },
  /** The bridge is sampled every 4 px. */
  bridgeStep: 4,
  /** One and a half waves across the tines. */
  bridgeWaves: 1.5,
  /** The hit area: 20 px above the top, 10 px below the bottom, 0.3 pitch to the sides. */
  hit: { above: 20, below: 10, side: 0.3 },
} as const;

export interface TineBox {
  /** Centre line. */
  cx: number;
  /** From the bridge down to the tip. */
  len: number;
}

export interface KalimbaLayout {
  top: number;
  bottom: number;
  x0: number;
  width: number;
  pitch: number;
  /** Tine width. */
  tw: number;
  /** The bridge's amplitude. */
  amp: number;
  /** The bridge's centre line. */
  waveY: number;
  /** Length of the longest tine. */
  avail: number;
  tines: TineBox[];
}

/**
 * `layout()` on a stage box: the insets stand where the experiment measured
 * its header (top) and its settings button (bottom). Null while the box is
 * too small to hold anything.
 */
export function layoutKalimba(box: StageBox, hz: readonly number[]): KalimbaLayout | null {
  const G = GEOMETRY;
  const n = hz.length;
  const inner = box.width - box.inset.left - box.inset.right;
  const width = Math.min(inner - G.gutter, G.maxWidth);
  if (n === 0 || !(width > 0) || !(box.height > 0)) return null;
  const top = box.inset.top + G.headerGap;
  const bottom = box.height - box.inset.bottom - G.footGap;
  const x0 = box.inset.left + (inner - width) / 2;
  const pitch = width / n;
  const tw = clamp(pitch * G.tineWidth.ofPitch, G.tineWidth.min, G.tineWidth.max);
  const amp = clamp(pitch * G.amp.ofPitch, G.amp.min, G.amp.max);
  const waveY = top + amp + G.wavePad;
  const avail = Math.max(G.minAvail, bottom - waveY - amp);
  const minHz = Math.min(...hz);
  return {
    top, bottom, x0, width, pitch, tw, amp, waveY, avail,
    tines: hz.map((f, i) => ({ cx: x0 + pitch * (i + 0.5), len: avail * Math.sqrt(minHz / f) })),
  };
}

/** The bridge: a still sine, one and a half waves across the tines, highest in the middle. */
export function bridgeY(L: KalimbaLayout, x: number): number {
  return L.waveY + L.amp * Math.sin((2 * Math.PI * (x - L.x0)) / (L.width / GEOMETRY.bridgeWaves));
}

/** The bridge's stroke: where it starts and ends, and how wide it is. */
export function bridgeStroke(L: KalimbaLayout): { from: number; to: number; lineWidth: number } {
  const ext = L.pitch * GEOMETRY.bridgeReach;
  const w = GEOMETRY.bridgeWidth;
  return { from: L.x0 - ext, to: L.x0 + L.width + ext, lineWidth: clamp(L.tw * w.ofTine, w.min, w.max) };
}

/** The bridge as points, every `bridgeStep` px — what the canvas strokes. */
export function bridgePoints(L: KalimbaLayout): [number, number][] {
  const { from, to } = bridgeStroke(L);
  const points: [number, number][] = [];
  for (let x = from; x <= to + 0.5; x += GEOMETRY.bridgeStep) points.push([x, bridgeY(L, x)]);
  return points;
}

/** A tine's stroke: from just above the bridge (round cap) to its tip. */
export function tineSpan(L: KalimbaLayout, i: number): { x: number; y0: number; y1: number } {
  const T = L.tines[i];
  const y = bridgeY(L, T.cx);
  return { x: T.cx, y0: y - L.tw * 0.5, y1: y + T.len };
}

/**
 * Which tine a point touches, and where on it: `pos` 0 at the bridge, 1 at
 * the tip — unclamped, below the tip counts as the tip once it is played.
 */
export function hitTine(L: KalimbaLayout, x: number, y: number): { tine: number; pos: number } | null {
  const h = GEOMETRY.hit;
  if (y < L.top - h.above || y > L.bottom + h.below) return null;
  if (x < L.x0 - L.pitch * h.side || x > L.x0 + L.width + L.pitch * h.side) return null;
  const tine = clamp(Math.floor((x - L.x0) / L.pitch), 0, L.tines.length - 1);
  const T = L.tines[tine];
  return { tine, pos: (y - bridgeY(L, T.cx)) / T.len };
}
