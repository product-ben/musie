/**
 * How a stroke is made: how hard it was, whether it belongs to a roll, how
 * loud it sounds, how long it vibrates.
 *
 * Source: the experiment's „Anschlag“ (`strength`, `scaled`, RS/RA/RF,
 * STRIKE_MS) and „Dein Schlag“ (`me`). Strength is 1:1 (Ben, 2026-11-09):
 * jolt, finger area and force weighted 50 : 35 : 15, each on a range that
 * adapts to the hand playing. What changes is only where the readings come
 * from — the host's motion recorder (`joltsSince`) and the pointer's own
 * `radius` / `force` instead of a `devicemotion` listener and a `touchstart`
 * listener of the adapter's own.
 *
 * Pure: the ranges are the only state, and they are passed in.
 */
import type { MarimbaSound, Range, StrikeConfig } from './sound';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** The experiment's three adaptive ranges, copied so each sheet opening learns afresh. */
export interface StrikeRanges {
  motion: Range;
  area: Range;
  force: Range;
}

export function startRanges(cfg: StrikeConfig): StrikeRanges {
  return { motion: { ...cfg.RS }, area: { ...cfg.RA }, force: { ...cfg.RF } };
}

/**
 * `scaled`: where `v` sits in its range, 0 … 1. The range first widens to take
 * `v`, then both ends drift a little toward it, so it grows with the playing
 * and slowly contracts again. Mutates `range`, as the experiment's did.
 */
export function scaled(v: number, range: Range, adapt: number): number {
  range.lo = Math.min(range.lo, v);
  range.hi = Math.max(range.hi, v);
  const s = clamp((v - range.lo) / Math.max(1e-6, range.hi - range.lo), 0, 1);
  range.lo += (v - range.lo) * adapt;
  range.hi += (v - range.hi) * adapt;
  return s;
}

export interface StrikeReadings {
  /** `performance.now()` at the touch. */
  t0: number;
  /** The host has a motion sensor reading (`host.motion() !== null`). */
  motionOn: boolean;
  /** Jolt peaks from `host.joltsSince(…)`; empty or null without the sensor. */
  jolts: readonly { at: number; magnitude: number }[] | null | undefined;
  /** The pointer's own contact, when it is a touch. */
  touch: { at: number; radius: number; force: number } | null;
}

/** `strength`: 0 very soft … 1 very hard; null when nothing was measured. */
export function strength(r: StrikeReadings, cfg: StrikeConfig, ranges: StrikeRanges): number | null {
  const parts: [weight: number, value: number][] = [];
  if (r.motionOn && r.jolts) {
    const from = r.t0 - cfg.window.beforeMs;
    const to = r.t0 + cfg.STRIKE_MS + cfg.window.afterMs;
    const peak = r.jolts.filter((h) => h.at >= from && h.at <= to).reduce((s, h) => Math.max(s, h.magnitude), -1);
    if (peak >= 0) parts.push([cfg.weights.motion, scaled(peak, ranges.motion, cfg.adapt)]);
  }
  if (r.touch && Math.abs(r.touch.at - r.t0) < cfg.window.touchMs) {
    if (r.touch.radius > 0) parts.push([cfg.weights.area, scaled(r.touch.radius, ranges.area, cfg.adapt)]);
    if (r.touch.force > 0) parts.push([cfg.weights.force, scaled(r.touch.force, ranges.force, cfg.adapt)]);
  }
  if (parts.length === 0) return null;
  return parts.reduce((s, [w, v]) => s + w * v, 0) / parts.reduce((s, [w]) => s + w, 0);
}

/** 0 in the middle of a bar, 1 at either end. `pos` is 0 at the top, 1 at the bottom. */
export function edgeOf(pos: number): number {
  return Math.abs(clamp(pos, 0, 1) - 0.5) * 2;
}

/**
 * A roll is fast single strokes, alternating two mallets (here two fingers):
 * the same bar again within `sameBarMs`, or any bar within `anyBarMs`.
 */
export function isRoll(now: number, lastOnBar: number, lastAny: number, roll: MarimbaSound['roll']): boolean {
  return now - lastOnBar < roll.sameBarMs || now - lastAny < roll.anyBarMs;
}

/** What `me` was told about the stroke: a measured strength, nothing, or a glissando move. */
export type Measure = number | null | 'move';

/**
 * `me`'s velocity. `random` is one draw of `Math.random()`.
 *  - glissando: as strong as the stroke before, decaying a little;
 *  - measured: hard = loud, soft = quiet, a little quieter at the ends; inside
 *    a roll the strokes even out, the first stays the accent;
 *  - unmeasured: loud in the middle, quieter at the ends; a roll sits at a
 *    steady middle level.
 */
export function strokeVelocity(
  measure: Measure,
  edge: number,
  roll: boolean,
  lastVelocity: number,
  random: number,
  sound: Pick<MarimbaSound, 'strike' | 'roll' | 'glissando'>,
): number {
  if (measure === 'move') {
    const g = sound.glissando;
    return clamp(lastVelocity * g.decay, g.min, g.max);
  }
  if (typeof measure === 'number') {
    const m = sound.strike.measured;
    const base = (m.base + m.span * measure) * (1 - m.edgeDrop * edge * edge);
    if (roll) {
      const r = sound.roll;
      return clamp(lastVelocity * r.keep + base * r.scale * r.add, r.min, r.max);
    }
    return clamp(base * (1 - m.jitter + random * m.jitter), m.min, m.max);
  }
  const u = sound.strike.unmeasured;
  if (roll) return u.rollBase + random * u.rollJitter;
  return clamp(1 - u.edgeDrop * edge * edge, u.min, u.max) * (1 - u.jitter + random * u.jitter);
}

/**
 * How long a stroke vibrates, or null: inside a roll the phone buzzes only
 * every `roll.everyMs`, softly, or it would hum.
 */
export function buzzMs(velocity: number, roll: boolean, now: number, lastBuzz: number, haptics: MarimbaSound['haptics']): number | null {
  if (roll && now - lastBuzz <= haptics.roll.everyMs) return null;
  return roll ? haptics.roll.ms : Math.round(haptics.strike.baseMs + haptics.strike.velMs * velocity);
}

/** The experiment's `lastVel` before the first stroke. */
const FIRST_LAST_VELOCITY = 0.7;

/** What one of the person's strokes turned out to be. */
export interface StrokeOutcome {
  velocity: number;
  roll: boolean;
  /** Milliseconds to vibrate, or null for a roll stroke inside its quiet window. */
  buzz: number | null;
}

export interface Striker {
  /** `me`'s bookkeeping for one stroke on bar `i` at `pos` (0 top … 1 bottom). */
  strike(i: number, pos: number, measure: Measure, now: number, random: number): StrokeOutcome;
}

/**
 * `me` without its side effects: the roll test against the last stroke on this
 * bar and on any bar, the velocity, the vibration length and its roll
 * throttle. The adapter does the rest (light, sound, `host.played`, calm).
 */
export function createStriker(sound: Pick<MarimbaSound, 'SCALE' | 'strike' | 'roll' | 'glissando' | 'haptics'>): Striker {
  const barAt = sound.SCALE.map(() => -1e9);
  let lastAny = -1e9;
  let lastBuzz = -1e9;
  let lastVelocity = FIRST_LAST_VELOCITY;
  return {
    strike(i, pos, measure, now, random) {
      const roll = isRoll(now, barAt[i] ?? -1e9, lastAny, sound.roll);
      barAt[i] = now;
      const velocity = strokeVelocity(measure, edgeOf(pos), roll, lastVelocity, random, sound);
      lastVelocity = velocity;
      const buzz = buzzMs(velocity, roll, now, lastBuzz, sound.haptics);
      if (buzz !== null) lastBuzz = now;
      lastAny = now;
      return { velocity, roll, buzz };
    },
  };
}
