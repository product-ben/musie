/**
 * The palette by family, and the shadow's three ways of being absent. The
 * probe and the observers need a browser; what they feed is tested here.
 */
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_SHADOW_DEFAULT, instrumentShadowLayers } from '@musie/design-system';
import { cssColorToHex, paletteFrom, shadowFrom } from './palette';

const resolve = (token: string) => `resolved(${token})`;

describe('paletteFrom', () => {
  it('a string instrument rests in --instrument-string', () => {
    expect(paletteFrom('string', resolve)).toEqual({
      rest: 'resolved(--instrument-string)',
      played: 'resolved(--instrument-played)',
      answer: 'resolved(--instrument-answer)',
      background: 'resolved(--instrument-surface)',
      detail: 'resolved(--instrument-detail)',
    });
  });

  it('a key instrument rests in --instrument-key', () => {
    expect(paletteFrom('key', resolve).rest).toBe('resolved(--instrument-key)');
  });
});

describe('cssColorToHex', () => {
  it.each([
    ['rgb(250, 247, 241)', '#faf7f1'],
    ['rgba(17, 20, 18, 1)', '#111412'],
    ['rgb(17 20 18)', '#111412'],
    ['#FAF7F1', '#faf7f1'],
    ['#abc', '#aabbcc'],
    ['oklch(0.9 0.01 90)', null],
  ])('%s → %s', (css, hex) => {
    expect(cssColorToHex(css)).toBe(hex);
  });
});

const tokens = (level: number) => ({
  getPropertyValue: (name: string) =>
    ({
      '--instrument-shadow-level': ` ${level}`,
      '--instrument-shadow-oomph': '0.34',
      '--instrument-shadow-crispy': '0.44',
      '--instrument-shadow-resolution': '0.26',
      '--instrument-shadow-light-x': '-0.25',
      '--instrument-shadow-light-y': '-0.37',
      '--instrument-shadow-tint': '1',
    })[name] ?? '',
});
const normal = { contrastMore: false, forcedColors: false };

describe('shadowFrom', () => {
  it('draws the harp’s layers at the token’s level, tinted from the surface', () => {
    const shadow = shadowFrom(tokens(3), 'rgb(250, 247, 241)', normal);
    expect(shadow?.layers).toEqual(instrumentShadowLayers(INSTRUMENT_SHADOW_DEFAULT));
    const [r, , b] = shadow?.rgb ?? [0, 0, 0];
    expect(r).toBeGreaterThan(b); // the sand's warm hue, darkened
    expect(r).toBeLessThan(250);
  });

  it('is absent at level 0', () => {
    expect(shadowFrom(tokens(0), 'rgb(250, 247, 241)', normal)).toBeNull();
  });

  it('is absent under prefers-contrast: more', () => {
    expect(shadowFrom(tokens(3), 'rgb(250, 247, 241)', { contrastMore: true, forcedColors: false })).toBeNull();
  });

  it('is absent under forced colours', () => {
    expect(shadowFrom(tokens(3), 'rgb(250, 247, 241)', { contrastMore: false, forcedColors: true })).toBeNull();
  });
});
