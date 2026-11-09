/**
 * Degrees are pitch order; tines run lowest-in-the-middle. The engine never
 * sees a tine, so this mapping is the whole of what the answer knows of the
 * kalimba's shape.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import { degreeOfTine, isPitchOrder, pitchOrderFromHz, pitchOrderOf, tineOfDegree } from './degrees';
import { KEYS, tineOfKey } from './input';

const hz = kalimba.sound.tines.map((t) => t.hz);
const order = kalimba.answer.pitchOrder;

describe('pitch order', () => {
  it('kalimba.json’s is the tines sorted by frequency', () => {
    expect(pitchOrderFromHz(hz)).toEqual(order);
    expect(order).toEqual([4, 5, 3, 6, 2, 7, 1, 8, 0]);
  });

  it('falls back to the frequencies when the configured one is missing or not a permutation', () => {
    expect(pitchOrderOf(hz, undefined)).toEqual(order);
    expect(pitchOrderOf(hz, [4, 4, 3, 6, 2, 7, 1, 8, 0])).toEqual(order);
    expect(pitchOrderOf(hz, [0, 1, 2])).toEqual(order);
    expect(isPitchOrder([8, 7, 6, 5, 4, 3, 2, 1, 0], 9)).toBe(true);
    expect(pitchOrderOf(hz, [8, 7, 6, 5, 4, 3, 2, 1, 0])).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });

  it('degree 0 is the middle tine, degree 8 the left one; the round trip holds', () => {
    expect(tineOfDegree(order, 0)).toBe(4);
    expect(tineOfDegree(order, 8)).toBe(0);
    expect(degreeOfTine(order, kalimba.demo.tine)).toBe(0);
    for (let d = 0; d < 9; d += 1) expect(degreeOfTine(order, tineOfDegree(order, d)!)).toBe(d);
  });

  it('the answer ends on its home degrees: d′, g′, d″', () => {
    const names = kalimba.answer.home.map((d) => kalimba.sound.tines[tineOfDegree(order, d)!].n);
    expect(names).toEqual(kalimba.answer.homeNames);
  });

  it('no tine for a degree that does not exist', () => {
    for (const d of [-1, 9, 1.5, Number.NaN]) expect(tineOfDegree(order, d)).toBeUndefined();
  });
});

describe('keys', () => {
  it('A to L play the tines left to right, in either case', () => {
    expect(KEYS.map(tineOfKey)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(tineOfKey('G')).toBe(4);
    expect(tineOfKey('v')).toBe(-1);
    expect(tineOfKey('ö')).toBe(-1);
  });
});
