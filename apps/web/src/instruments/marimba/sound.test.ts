/**
 * The marimba's sound, read the way a person checks it: which recording each
 * bar plays and how far it is shifted, which layer a soft and a hard stroke
 * take, and that every file named is one the manifest ships.
 * (`experiment.test.ts` holds the same against the experiment's own code.)
 */
import { describe, expect, it } from 'vitest';

import samplesJson from '../../../../../supabase/content/instruments/samples.json';
import {
  asMarimbaDemo, barFiles, layerIndex, levelOf, lowpassHz, mapBars, playbackRate, trimOf, warmHz, type MarimbaSound,
} from './sound';
import { loadMarimba } from './testing';

const { definition } = loadMarimba();
const sound = definition.sound as unknown as MarimbaSound;

describe('which recording each bar plays', () => {
  const table = [
    ['d', 'C3', 2], ['e', 'G3', -3], ['g', 'G3', 0], ['a', 'B3', -2], ['h', 'B3', 0],
    ['d′', 'F4', -3], ['e′', 'F4', -1], ['g′', 'F4', 2], ['a′', 'C5', -3], ['h′', 'C5', -1],
  ] as const;

  it('nearest recording, at most three semitones away, ties to the one above', () => {
    expect(sound.SCALE.map((b) => b.n)).toEqual(table.map(([n]) => n));
    expect(mapBars(sound)).toEqual(table.map(([, src, semi]) => ({ src, semi })));
    expect(mapBars(sound).every((m) => Math.abs(m.semi) <= 3)).toBe(true);
  });

  it('whatever order the recordings come in — jsonb sorts object keys', () => {
    const notes = sound.samples.notes;
    for (const keys of [Object.keys(notes).sort(), Object.keys(notes).reverse()]) {
      const reordered = { ...sound, samples: { ...sound.samples, notes: Object.fromEntries(keys.map((k) => [k, notes[k]])) } };
      expect(mapBars(reordered)).toEqual(mapBars(sound));
    }
  });

  it('a playback rate per semitone', () => {
    expect(playbackRate(0)).toBe(1);
    expect(playbackRate(12)).toBe(2);
    expect(playbackRate(-12)).toBe(0.5);
  });
});

describe('layers', () => {
  it('mittel below 0.6, laut from 0.6', () => {
    expect(sound.samples.layers).toEqual(['mittel', 'laut']);
    expect(layerIndex(0, sound.samples)).toBe(0);
    expect(layerIndex(0.5999, sound.samples)).toBe(0);
    expect(layerIndex(0.6, sound.samples)).toBe(1);
    expect(layerIndex(1, sound.samples)).toBe(1);
  });

  it('every file is one the manifest ships for the marimba, and every one is used', () => {
    const shipped = samplesJson.samples.filter((s) => s.instrument === 'marimba').map((s) => s.file).sort();
    const used = [...new Set(barFiles(sound, definition.samples).flat())].sort();
    expect(used).toEqual(shipped);
    expect(barFiles(sound, definition.samples)[0]).toEqual(['mar-med-C3.wav', 'C3.wav']);
  });
});

describe('loudness and brightness', () => {
  it('low bars a little louder: 0.675 at d, 0.5 at h′', () => {
    expect(levelOf(0, sound)).toBeCloseTo(0.675, 12);
    expect(levelOf(9, sound)).toBeCloseTo(0.5, 12);
  });

  it('soft strokes darker, rolls darker still', () => {
    expect(lowpassHz(0, false, sound.filter)).toBe(2500);
    expect(lowpassHz(1, false, sound.filter)).toBe(12000);
    expect(lowpassHz(1, true, sound.filter)).toBe(2600);
  });

  it('calm softens the master from 14 kHz to 5.6 kHz', () => {
    expect(warmHz(0, sound.master.warm)).toBe(14000);
    expect(warmHz(1, sound.master.warm)).toBeCloseTo(5600, 9);
  });
});

describe('onset trim and peak gain', () => {
  it('starts 32 samples before the first sample above 2 % of the peak, and lifts the peak to 0.89', () => {
    const data = new Float32Array(1000);
    data.fill(0.001, 0, 300);
    data[300] = -0.4;
    data[301] = 0.005; // quieter than 2 % of the peak again, but after the onset: irrelevant
    const trim = trimOf(data, 1000, sound.normalise);
    expect(trim.offset).toBe((300 - 32) / 1000);
    expect(trim.gain).toBeCloseTo(0.89 / 0.4, 6); // the samples are Float32
  });

  it('a recording that starts at once is not trimmed below zero; silence gets unit gain', () => {
    const data = new Float32Array(100);
    data[3] = 0.5;
    expect(trimOf(data, 100, sound.normalise).offset).toBe(0);
    expect(trimOf(new Float32Array(10), 100, sound.normalise)).toEqual({ offset: 0, gain: 1 });
  });
});

describe('the demo', () => {
  it('bar 2 (g) at 0.6, as locked', () => {
    expect(asMarimbaDemo(definition.demo)).toEqual({ bar: 2, velocity: 0.6 });
    expect(() => asMarimbaDemo({})).toThrow(/demo/);
  });
});
