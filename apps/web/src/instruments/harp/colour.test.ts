/**
 * The palette arrives as resolved CSS colour strings (`host.palette()`), not
 * as the experiment's hex constants — so the blend needs a parser for what a
 * browser reports. Its agreement with the experiment's `mix` is in
 * `experiment.test.ts`; this is the parser on its own.
 */
import { describe, expect, it } from 'vitest';
import { createMixer, oklabToHex, parseColour, rgbToOklab } from './colour';

describe('parseColour', () => {
  it.each([
    ['#BDBCAF', [189, 188, 175]],
    ['#bdbcaf', [189, 188, 175]],
    ['#bdbcaf80', [189, 188, 175]],
    ['#abc', [170, 187, 204]],
    ['#abcd', [170, 187, 204]],
    ['rgb(189, 188, 175)', [189, 188, 175]],
    ['rgba(189, 188, 175, 0.5)', [189, 188, 175]],
    ['rgb(189 188 175)', [189, 188, 175]],
    ['rgb(189 188 175 / 50%)', [189, 188, 175]],
    ['  RGB(189, 188, 175)  ', [189, 188, 175]],
    ['rgb(100%, 0%, 50%)', [255, 0, 127.5]],
    ['color(srgb 1 0 0.5)', [255, 0, 127.5]],
  ])('%s', (css, rgb) => expect(parseColour(css)).toEqual(rgb));

  it.each(['', 'red', 'var(--instrument-string)', '#12', '#ggg', 'rgb(1, 2)', 'color(display-p3 1 0 0)', 'oklch(0.7 0.1 50)'])(
    'refuses %j',
    (css) => expect(parseColour(css)).toBeNull(),
  );

  it('round-trips through OKLab to the same hex', () => {
    for (const hex of ['#faf7f1', '#111412', '#bdbcaf', '#e3b294', '#8c9785', '#000000', '#ffffff']) {
      expect(oklabToHex(rgbToOklab(parseColour(hex)!))).toBe(hex);
    }
  });
});

describe('createMixer', () => {
  const mix = createMixer();
  it('returns the palette strings themselves at the ends', () => {
    expect(mix(0, 'rgb(189, 188, 175)', 'rgb(227, 178, 148)')).toBe('rgb(189, 188, 175)');
    expect(mix(-1, 'rgb(189, 188, 175)', 'rgb(227, 178, 148)')).toBe('rgb(189, 188, 175)');
    expect(mix(1, 'rgb(189, 188, 175)', 'rgb(227, 178, 148)')).toBe('rgb(227, 178, 148)');
  });
  it('switches at the middle when a colour cannot be read, instead of guessing', () => {
    expect(mix(0.4, 'oklch(0.7 0.1 50)', 'rgb(227, 178, 148)')).toBe('oklch(0.7 0.1 50)');
    expect(mix(0.6, 'oklch(0.7 0.1 50)', 'rgb(227, 178, 148)')).toBe('rgb(227, 178, 148)');
  });
});
