/**
 * „Ruhiger gespielt“ in words: slow and even raises calm, fast or uneven does
 * not, a roll and a long pause change nothing, it rises in about 15 s and
 * falls in about 35 s — and a host that ticks at another rate than 100 ms
 * gets the same curve.
 */
import { describe, expect, it } from 'vitest';

import { calmNote, calmStart, calmStep, type CalmState } from './calm';
import type { MarimbaSound } from './sound';
import { loadMarimba } from './testing';

const cfg = (loadMarimba().definition.sound as unknown as MarimbaSound).calm;

function play(gaps: number[], roll = false): CalmState {
  const s = calmStart(cfg);
  let t = 1000;
  calmNote(s, t, roll, cfg);
  for (const g of gaps) calmNote(s, (t += g), roll, cfg);
  return s;
}

describe('the target', () => {
  it('slow and even playing raises it toward 1; fast playing leaves it at 0', () => {
    expect(play(Array(40).fill(1600)).target).toBeGreaterThan(0.99);
    expect(play(Array(40).fill(300)).target).toBe(0);
  });

  it('uneven gaps count for less than even ones', () => {
    const even = play(Array(40).fill(1200)).target;
    const uneven = play(Array.from({ length: 40 }, (_, k) => (k % 2 ? 700 : 1700))).target;
    expect(uneven).toBeLessThan(even);
  });

  it('a roll is a long note, not a tempo; a pause of 6 s or more is not a gap', () => {
    expect(play(Array(10).fill(1600), true)).toEqual(calmStart(cfg));
    const paused = play([1600, 1600, 7000]);
    expect(paused.lastGap).toBe(0);
    expect(paused.slow).toBeCloseTo(play([1600, 1600]).slow, 12);
  });
});

describe('the curve', () => {
  const run = (from: number, to: number, seconds: number, stepMs = 100) => {
    const s = { ...calmStart(cfg), calm: from, target: to };
    for (let t = 0; t < seconds * 1000; t += stepMs) calmStep(s, cfg, stepMs / cfg.tickMs);
    return s.calm;
  };

  it('rises with a time constant of about 15 s and falls with one of about 35 s', () => {
    expect(run(0, 1, 15)).toBeCloseTo(1 - Math.exp(-1), 2);
    expect(run(1, 0, 35)).toBeCloseTo(Math.exp(-1), 2);
  });

  it('a 200 ms tick gives the curve a 100 ms tick gives', () => {
    expect(run(0, 1, 10, 200)).toBeCloseTo(run(0, 1, 10, 100), 12);
    expect(run(0.8, 0.1, 10, 250)).toBeCloseTo(run(0.8, 0.1, 10, 50), 12);
  });

  it('settles: within epsilon it no longer moves', () => {
    const s = { ...calmStart(cfg), calm: 0.5, target: 0.5 + cfg.epsilon / 2 };
    expect(calmStep(s, cfg)).toBe(false);
    expect(s.calm).toBe(0.5);
  });
});
