/**
 * Where the kalimba is, and the still wavy bridge (Ben, 2026-11-09).
 * The parts that are the experiment's are run against it in `parity.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import type { StageBox } from '../types';
import { bridgePoints, bridgeStroke, bridgeY, hitTine, layoutKalimba, tineSpan } from './geometry';

const hz = kalimba.sound.tines.map((t) => t.hz);
const phone: StageBox = { width: 390, height: 844, dpr: 3, inset: { top: 120, right: 0, bottom: 96, left: 0 } };
const L = layoutKalimba(phone, hz)!;

describe('layout', () => {
  it('nine tines across at most 560 px, centred between the insets', () => {
    const wide = layoutKalimba({ ...phone, width: 1200, inset: { ...phone.inset, left: 100, right: 300 } }, hz)!;
    expect(wide.width).toBe(560);
    expect(wide.x0).toBe(100 + (800 - 560) / 2);
    expect(L.width).toBe(390 - 32);
    expect(L.tines).toHaveLength(9);
  });

  it('keeps clear of the chrome: 28 px under the top inset, 20 px over the bottom one', () => {
    expect(L.top).toBe(120 + 28);
    expect(L.bottom).toBe(844 - 96 - 20);
  });

  it('the lowest tine — in the middle — is the longest; length goes with 1/√frequency', () => {
    const longest = L.tines.reduce((a, b, i) => (b.len > L.tines[a].len ? i : a), 0);
    expect(longest).toBe(4);
    expect(L.tines[4].len).toBe(L.avail);
    expect(L.tines[0].len).toBeCloseTo(L.avail * Math.sqrt(220 / 659.26), 9);
  });

  it('nothing to lay out in an empty box', () => {
    expect(layoutKalimba({ ...phone, width: 0, height: 0 }, hz)).toBeNull();
    expect(layoutKalimba({ ...phone, width: 20 }, hz)).toBeNull();
  });
});

describe('the bridge: a still wave, one and a half waves across the tines', () => {
  it('takes no time and no swing: the same points every time', () => {
    expect(bridgePoints(L)).toEqual(bridgePoints(L));
  });

  it('crosses its centre line at both ends of the tines and three times between', () => {
    const crossings = [0, 1 / 3, 2 / 3, 1].map((f) => bridgeY(L, L.x0 + f * L.width));
    for (const y of crossings) expect(y).toBeCloseTo(L.waveY, 9);
  });

  it('is highest in the middle, over the lowest tine, and symmetric', () => {
    const mid = L.x0 + L.width / 2;
    expect(bridgeY(L, mid)).toBeCloseTo(L.waveY - L.amp, 9);
    const ys = bridgePoints(L).map(([, y]) => y);
    expect(Math.min(...ys)).toBeCloseTo(L.waveY - L.amp, 1);
    for (const dx of [10, 50, 120, 170]) expect(bridgeY(L, mid - dx)).toBeCloseTo(bridgeY(L, mid + dx), 9);
  });

  it('stays inside the room the layout keeps for it', () => {
    for (const [, y] of bridgePoints(L)) {
      expect(y).toBeGreaterThanOrEqual(L.top);
      expect(y).toBeLessThanOrEqual(L.waveY + L.amp + 1e-9);
    }
  });

  it('reaches 0.45 pitch past the outer tines, every 4 px', () => {
    const s = bridgeStroke(L);
    expect(s.from).toBeCloseTo(L.x0 - 0.45 * L.pitch, 9);
    expect(s.to).toBeCloseTo(L.x0 + L.width + 0.45 * L.pitch, 9);
    const pts = bridgePoints(L);
    expect(pts[1][0] - pts[0][0]).toBe(4);
    expect(pts[pts.length - 1][0]).toBeGreaterThan(s.to - 4);
  });

  it('the tine tops follow it', () => {
    for (let i = 0; i < 9; i += 1) {
      const span = tineSpan(L, i);
      expect(span.y0).toBeCloseTo(bridgeY(L, L.tines[i].cx) - L.tw / 2, 9);
      expect(span.y1 - span.y0).toBeCloseTo(L.tines[i].len + L.tw / 2, 9);
    }
    expect(tineSpan(L, 4).y0).toBeLessThan(tineSpan(L, 1).y0);
  });
});

describe('hit test', () => {
  const at = (i: number, pos: number) => [L.tines[i].cx, bridgeY(L, L.tines[i].cx) + pos * L.tines[i].len] as const;

  it('a tine and how far down it', () => {
    for (let i = 0; i < 9; i += 1) {
      const h = hitTine(L, ...at(i, 0.5))!;
      expect(h.tine).toBe(i);
      expect(h.pos).toBeCloseTo(0.5, 9);
    }
  });

  it('the whole column belongs to its tine, a little to each side too', () => {
    expect(hitTine(L, L.x0 - 0.2 * L.pitch, 400)?.tine).toBe(0);
    expect(hitTine(L, L.x0 + L.width + 0.2 * L.pitch, 400)?.tine).toBe(8);
    expect(hitTine(L, L.x0 - 0.4 * L.pitch, 400)).toBeNull();
  });

  it('nothing above the instrument or below it', () => {
    expect(hitTine(L, L.tines[4].cx, L.top - 21)).toBeNull();
    expect(hitTine(L, L.tines[4].cx, L.bottom + 11)).toBeNull();
    expect(hitTine(L, L.tines[4].cx, L.top - 19)?.pos).toBeLessThan(0);
  });
});
