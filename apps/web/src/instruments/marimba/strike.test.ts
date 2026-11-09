/**
 * Strike strength and the stroke it makes, case by case — the readable half;
 * `experiment.test.ts` runs thousands of random strokes through the
 * experiment's own `strength` and `me` beside these.
 */
import { describe, expect, it } from 'vitest';

import type { MarimbaSound } from './sound';
import { buzzMs, createStriker, edgeOf, isRoll, scaled, startRanges, strength, strokeVelocity } from './strike';
import { loadMarimba } from './testing';

const sound = loadMarimba().definition.sound as unknown as MarimbaSound;
const cfg = sound.strike;

describe('adaptive ranges', () => {
  it('a reading is placed in its range, which widens to take it and drifts toward it', () => {
    const r = { lo: 10, hi: 26 };
    expect(scaled(18, r, 0.02)).toBeCloseTo(0.5, 12);
    expect(r).toEqual({ lo: 10 + 8 * 0.02, hi: 26 - 8 * 0.02 });
    const wide = { lo: 10, hi: 26 };
    expect(scaled(40, wide, 0.02)).toBe(1);
    expect(wide.hi).toBe(40);
  });

  it('each sheet opening starts from the experiment’s ranges, not from the last one’s', () => {
    const a = startRanges(cfg);
    scaled(100, a.area, cfg.adapt);
    expect(startRanges(cfg).area).toEqual({ lo: 10, hi: 26 });
    expect(cfg.RA).toEqual({ lo: 10, hi: 26 });
  });
});

describe('strength', () => {
  const t0 = 1000;
  const none = { t0, motionOn: false, jolts: [], touch: null };

  it('nothing measured: null', () => {
    expect(strength(none, cfg, startRanges(cfg))).toBeNull();
    expect(strength({ ...none, touch: { at: t0, radius: 0, force: 0 } }, cfg, startRanges(cfg))).toBeNull();
  });

  it('the jolt counts only with the sensor on, and only from 40 ms before to STRIKE_MS + 10 after', () => {
    const jolts = [{ at: t0 + 20, magnitude: 1.2 }];
    expect(strength({ ...none, jolts }, cfg, startRanges(cfg))).toBeNull();
    expect(strength({ ...none, motionOn: true, jolts }, cfg, startRanges(cfg))).toBe(1);
    expect(strength({ ...none, motionOn: true, jolts: [{ at: t0 + 41, magnitude: 1.2 }] }, cfg, startRanges(cfg))).toBeNull();
    expect(strength({ ...none, motionOn: true, jolts: null }, cfg, startRanges(cfg))).toBeNull();
  });

  it('jolt, finger area and force weigh 50 : 35 : 15', () => {
    const s = strength(
      { t0, motionOn: true, jolts: [{ at: t0, magnitude: 1.2 }], touch: { at: t0, radius: 10, force: 1 } },
      cfg,
      startRanges(cfg),
    );
    expect(s).toBeCloseTo((0.5 * 1 + 0.35 * 0 + 0.15 * 1) / 1, 12);
  });
});

describe('the stroke', () => {
  it('edge: 0 in the middle, 1 at either end, clamped', () => {
    expect(edgeOf(0.5)).toBe(0);
    expect(edgeOf(0)).toBe(1);
    expect(edgeOf(1.4)).toBe(1);
  });

  it('a roll: the same bar within 260 ms, or any bar within 170 ms', () => {
    expect(isRoll(1259, 1000, 0, sound.roll)).toBe(true);
    expect(isRoll(1260, 1000, 0, sound.roll)).toBe(false);
    expect(isRoll(1169, -1e9, 1000, sound.roll)).toBe(true);
    expect(isRoll(1170, -1e9, 1000, sound.roll)).toBe(false);
  });

  it('velocity stays inside each kind’s bounds', () => {
    for (let k = 0; k <= 20; k++) {
      const x = k / 20;
      expect(strokeVelocity(x, x, false, 0.7, x, sound)).toBeGreaterThanOrEqual(0.15);
      expect(strokeVelocity(x, x, false, 0.7, x, sound)).toBeLessThanOrEqual(1);
      expect(strokeVelocity(x, x, true, 1, x, sound)).toBeLessThanOrEqual(0.85);
      expect(strokeVelocity('move', 0, false, x * 2, 0, sound)).toBeGreaterThanOrEqual(0.2);
      expect(strokeVelocity('move', 0, false, x * 2, 0, sound)).toBeLessThanOrEqual(0.9);
      expect(strokeVelocity(null, x, false, 0.7, x, sound)).toBeGreaterThanOrEqual(0.6 * 0.96);
    }
  });

  it('vibration: 30–80 ms by velocity; inside a roll 20 ms, at most every 200 ms', () => {
    expect(buzzMs(0, false, 0, -1e9, sound.haptics)).toBe(30);
    expect(buzzMs(1, false, 0, -1e9, sound.haptics)).toBe(80);
    expect(buzzMs(1, true, 1200, 1000, sound.haptics)).toBeNull();
    expect(buzzMs(1, true, 1201, 1000, sound.haptics)).toBe(20);
  });

  it('the striker keeps the history a roll and a glissando need', () => {
    const s = createStriker(sound);
    const first = s.strike(4, 0.5, 0.8, 1000, 0.5);
    expect(first.roll).toBe(false);
    const second = s.strike(4, 0.5, 0.8, 1100, 0.5);
    expect(second.roll).toBe(true);
    expect(second.velocity).toBeCloseTo(first.velocity * 0.6 + (0.18 + 0.82 * 0.8) * 0.85 * 0.4, 12);
    expect(second.buzz).toBeNull();
    const move = s.strike(5, 0.5, 'move', 1500, 0.5);
    expect(move.velocity).toBeCloseTo(second.velocity * 0.92, 12);
  });
});
