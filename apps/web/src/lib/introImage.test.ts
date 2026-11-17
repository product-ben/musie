/**
 * The Einsteigen picture on a tablet: as tall as the copy, 16:9, never wider
 * than 30% of the row (Ben, 2026-11-17).
 */
import { describe, expect, it } from 'vitest';
import { introImageWidth } from './introImage';

describe('introImageWidth', () => {
  /* The 834 frame: a two-line copy 93.86 tall in a 736 row. 16:9 at that
     height is 166.9, well under the cap of 220.8. */
  it('is 16:9 of the copy height while that fits', () => {
    expect(introImageWidth(93.86, 736)).toBe(167);
  });

  /* A long description: 16:9 of 150 would be 266.7, past 30% of 432. */
  it('stops at 30% of the row', () => {
    expect(introImageWidth(150, 432)).toBe(129.5);
  });

  it('rounds to the half pixel, so a sub-pixel height does not flicker', () => {
    expect(introImageWidth(93.8, 736)).toBe(introImageWidth(93.9, 736));
  });

  /* On a phone the copy is `display: contents` and measures 0×0. */
  it('says nothing when there is nothing to measure', () => {
    expect(introImageWidth(0, 736)).toBeNull();
    expect(introImageWidth(94, 0)).toBeNull();
    expect(introImageWidth(Number.NaN, 736)).toBeNull();
  });
});
