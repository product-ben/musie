/**
 * Where the strings stand and how a finger reads them — the experiment's
 * `layout`, `zone`, `maxPull`, `tension`, `strength`, `nearest` and the
 * velocity half of `crossings`. Pure: every function takes the string
 * positions it needs, so the tests run them without a canvas.
 */
import type { StageBox } from '../types';
import type { HarpSound } from './sound';

/**
 * The side margin: an eighth of the width for seven strings, at least 28 px,
 * at most 64 px. Literals of the experiment's `layout`, not part of the
 * locked sound.
 */
export const PAD = { min: 28, max: 64 } as const;

/**
 * x of each string, low to high, left to right. The experiment spread them
 * over the window; here over the stage less its left and right insets. The
 * strings still run the full height, edge to edge, as they did.
 */
export function stringXs(box: Pick<StageBox, 'width' | 'inset'>, count: number): number[] {
  const left = box.inset.left;
  const width = box.width - box.inset.left - box.inset.right;
  const pad = Math.max(PAD.min, Math.min(width / (count + 1), PAD.max));
  return Array.from({ length: count }, (_, i) => left + pad + ((width - 2 * pad) * i) / (count - 1));
}

type Pull = HarpSound['velocity']['pull'];

const gap = (xs: readonly number[]) => xs[1] - xs[0];

/** How far from a string a touch still takes it. */
export function zone(xs: readonly number[], pull: Pull): number {
  return gap(xs) * pull.zoneOfGap;
}

/** Almost one string gap, at most 60 px — pulled further, the string slips. */
export function maxPull(xs: readonly number[], pull: Pull): number {
  return Math.min(gap(xs) * pull.maxOfGap, pull.maxPx);
}

/** 0 … 1: how far a string is pulled. */
export function tension(dx: number, xs: readonly number[], pull: Pull): number {
  return Math.min(1, Math.abs(dx) / maxPull(xs, pull));
}

/** Release velocity: barely pulled is soft and dark, far is loud and bright. */
export function strength(dx: number, xs: readonly number[], pull: Pull): number {
  return pull.base + pull.span * Math.pow(tension(dx, xs, pull), pull.power);
}

/** The string within reach of `x`, or −1. */
export function nearest(x: number, xs: readonly number[], pull: Pull): number {
  let best = -1;
  let d = Infinity;
  xs.forEach((sx, i) => {
    const dd = Math.abs(sx - x);
    if (dd < d) {
      d = dd;
      best = i;
    }
  });
  return d <= zone(xs, pull) ? best : -1;
}

export interface Point {
  x: number;
  y: number;
  t: number;
}

/** A strum's velocity from the finger's speed, px per ms. */
export function strumVelocity(from: Point, to: Point, strum: HarpSound['velocity']['strum']): number {
  const speed = Math.hypot(to.x - from.x, to.y - from.y) / Math.max(1, to.t - from.t);
  return Math.min(1, strum.base + speed / strum.speedDivisor);
}

/** The strings a move from `fromX` to `toX` passes, low to high. */
export function crossed(fromX: number, toX: number, xs: readonly number[]): number[] {
  const lo = Math.min(fromX, toX);
  const hi = Math.max(fromX, toX);
  const out: number[] = [];
  xs.forEach((sx, i) => {
    if (sx > lo && sx <= hi) out.push(i);
  });
  return out;
}
