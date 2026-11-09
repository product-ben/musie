/**
 * The instrument shadow moved into the design system unchanged — checked by
 * running the harp experiment's OWN `shadowLayers` next to the design
 * system's `instrumentShadowLayers` and requiring the same layers.
 *
 * `sources.test.ts` holds the sound to the experiments; this holds the look
 * that Ben asked to keep as a shared style ("die Multi layer shadows … als
 * neue storybook styles (instrument shadows)").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_SHADOW_DEFAULT, instrumentShadowLayers } from '@musie/design-system';

const html = readFileSync(
  join(__dirname, '..', '..', 'public/experiments/harp/261109-0920/index.html'),
  'utf8',
);

/** The experiment's shadow functions, cut out of its script and run as they are. */
function experimentLayers(level: number): number[][] {
  const from = html.indexOf('const map = (v, a, b, c, d)');
  const to = html.indexOf('let shadowCache = null;');
  if (from < 0 || to < 0) throw new Error('harp: shadow functions not found');
  const source = html.slice(from, to)
    /* Its storage reads and the theme token are not part of the arithmetic. */
    .replace(/try \{ const s = localStorage[\s\S]*?catch \(e\) \{\}\n/, '')
    .replace(/function saveShadow\(\)[^\n]*\n/, '');
  // The experiment is our own file in this repo; that is why running it is fine.
  return new Function(`${source}; return shadowLayers(${level});`)() as number[][];
}

describe('instrument shadows = the harp’s', () => {
  it('ships the harp’s values as its defaults', () => {
    expect(html).toContain('const SH_DEFAULT = { oomph: 0.34, crispy: 0.44, res: 0.26, lx: -0.25, ly: -0.37, tint: true };');
    expect(html).toContain('const ELEV_DEFAULT = 3;');
    expect(INSTRUMENT_SHADOW_DEFAULT).toEqual({
      level: 3, oomph: 0.34, crispy: 0.44, resolution: 0.26, lightX: -0.25, lightY: -0.37, tint: true,
    });
  });

  it.each([1, 2, 3] as const)('level %i draws the same layers', (level) => {
    expect(instrumentShadowLayers({ ...INSTRUMENT_SHADOW_DEFAULT, level })).toEqual(experimentLayers(level));
  });

  it('level 0 draws nothing', () => {
    expect(instrumentShadowLayers({ ...INSTRUMENT_SHADOW_DEFAULT, level: 0 })).toEqual([]);
  });
});
