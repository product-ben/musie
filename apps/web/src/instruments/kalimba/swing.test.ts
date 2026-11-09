/**
 * „Schwenken → Vibrato“: the 30 ms step. `parity.test.ts` runs the
 * experiment's own interval body against the adapter; this says what it does.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import type { KalimbaSound } from './sound';
import { SWING_AT_REST, membraneOf, swingDepth, swingHaptic, swingStep } from './swing';

const sound = kalimba.sound as unknown as KalimbaSound;
const cfg = sound.swing;

describe('the swing envelope', () => {
  it('rises fast towards a reading and falls slowly after it', () => {
    let s = swingStep(SWING_AT_REST, { rotation: 1, at: 1 }, false, cfg);
    expect(s.env).toBeCloseTo(0.45, 12);
    expect(s.rot).toBeCloseTo(0.8, 12);
    const peak = s.env;
    s = swingStep(s, { rotation: 1, at: 1 }, false, cfg); // the same reading: not counted again
    expect(s.env).toBeCloseTo(peak + (0.8 - peak) * 0.45, 12);
    for (let k = 0; k < 10; k += 1) s = swingStep(s, null, false, cfg);
    expect(s.env).toBeGreaterThan(0);
    expect(s.env).toBeLessThan(peak);
  });

  it('a reading above 1 counts as 1, below 0 as 0', () => {
    expect(swingStep(SWING_AT_REST, { rotation: 4, at: 1 }, false, cfg).env).toBeCloseTo(0.45, 12);
    expect(swingStep(SWING_AT_REST, { rotation: -1, at: 1 }, false, cfg).env).toBe(0);
  });

  it('settles to exactly 0 below the floor', () => {
    let s = swingStep(SWING_AT_REST, { rotation: 0.1, at: 1 }, false, cfg);
    for (let k = 0; k < 200 && s.env > 0; k += 1) s = swingStep(s, null, false, cfg);
    expect(s.env).toBe(0);
  });

  it('no sensor, no permission: the swing is simply 0', () => {
    let s = SWING_AT_REST;
    for (let k = 0; k < 20; k += 1) s = swingStep(s, null, false, cfg);
    expect(s).toEqual(SWING_AT_REST);
  });

  it('V held swings fully', () => {
    let s = SWING_AT_REST;
    for (let k = 0; k < 40; k += 1) s = swingStep(s, null, true, cfg);
    expect(s.env).toBeGreaterThan(0.999);
  });
});

describe('the membrane at full swing, default strength 0.8', () => {
  it('opens tremolo, resonance, pitch and the open recording', () => {
    const m = membraneOf(1, sound);
    expect(swingDepth(1, sound)).toBe(0.8);
    expect(m.lfoHz).toBeCloseTo(4.5 + 3, 12);
    expect(m.tremolo).toBeCloseTo(0.55 * 0.8, 12);
    expect(m.peakHz).toBeCloseTo(700 * 0.8, 12);
    expect(m.pitchCents).toBeCloseTo(22 * 0.8, 12);
    expect(m.peakGainDb).toBeCloseTo(10 * 0.8, 12);
    expect(m.openMix).toBeCloseTo(Math.min(1, 0.8 * 1.2), 12);
  });
  it('is closed and still at rest', () => {
    expect(membraneOf(0, sound)).toEqual({ lfoHz: 4.5, tremolo: 0, peakHz: 0, pitchCents: 0, peakGainDb: 0, openMix: 0 });
  });
});

describe('Android vibrates with the swing', () => {
  const h = sound.haptics.swing;
  it('above 0.12, harder while tines ring', () => {
    expect(swingHaptic(0.12, true, h)).toBeNull();
    expect(swingHaptic(0.5, true, h)).toBe(Math.round(30 + 70 * 0.5));
    expect(swingHaptic(0.5, false, h)).toBe(Math.round(30 + 70 * 0.5 * 0.6));
  });
});
