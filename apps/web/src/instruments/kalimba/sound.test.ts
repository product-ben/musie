/**
 * The kalimba's sound arithmetic, on the locked numbers in kalimba.json.
 * `parity.test.ts` runs the experiment's own expressions beside these; this
 * file says what they mean.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import {
  attackOf, crossfade, cutoffOf, envelopeOf, onsetOffset, pluckHaptic, positionFor, sampleFile, shelfOf, touchAt,
} from './sound';
import type { KalimbaSound } from './sound';

const sound = kalimba.sound as unknown as KalimbaSound;

describe('a touch: where on the tine is how hard', () => {
  it('at the tip: full and bright', () => {
    expect(touchAt(1, sound)).toEqual({ pos: 1, vel: 1, dull: 1 });
  });

  it('at the bridge: quieter and duller, by the default touch of 0.7', () => {
    const t = touchAt(0, sound);
    expect(t.vel).toBeCloseTo(1 - 0.7 * 0.8, 12);
    expect(t.dull).toBeCloseTo(1 - 0.7 * 0.75, 12);
  });

  it('above the bridge and below the tip count as bridge and tip, but keep their position', () => {
    expect(touchAt(-0.2, sound)).toMatchObject({ pos: -0.2, vel: touchAt(0, sound).vel });
    expect(touchAt(1.3, sound)).toMatchObject({ pos: 1.3, vel: 1, dull: 1 });
  });

  it('positionFor turns touchAt round, inside what the tine can play', () => {
    for (let p = 0; p <= 1; p += 0.05) {
      expect(positionFor(touchAt(p, sound).vel, sound)).toBeCloseTo(p, 9);
    }
    expect(positionFor(0.1, sound)).toBe(0);
    expect(positionFor(1.2, sound)).toBe(1);
  });
});

describe('tone at the default hardness 0.35', () => {
  const t = sound.tone;
  it('cutoff runs 1400 Hz → 16 kHz over the hardness', () => {
    expect(cutoffOf(0, t)).toBeCloseTo(1400, 9);
    expect(cutoffOf(1, t)).toBeCloseTo(16000, 9);
    expect(cutoffOf(0.35, t)).toBeCloseTo(1400 * Math.pow(16000 / 1400, 0.35), 9);
  });
  it('attack and warmth', () => {
    expect(attackOf(0.35, t)).toBeCloseTo(0.001 + 0.024 * 0.65, 12);
    expect(shelfOf(0.35, t)).toBe(0);
    expect(shelfOf(0.1, t)).toBeCloseTo(1, 12);
  });

  it('envelope of a full touch at the tip, length 4 s', () => {
    const e = envelopeOf(touchAt(1, sound), sound, 0.5);
    const att = attackOf(0.35, t);
    expect(e.level).toBeCloseTo(0.85 + 0.5 * 0.08, 12);
    expect(e.attack).toBeCloseTo(att, 12);
    expect(e.release).toEqual({ at: att + 0.15 * 4, tau: 1 });
    expect(e.stop).toBeCloseTo(att + 1.6 * 4 + 0.1, 12);
    expect(e.lowpass).toBeCloseTo(cutoffOf(0.35, t), 9);
  });

  it('a touch near the bridge starts softer and later, through a darker filter, never below 500 Hz', () => {
    const tip = envelopeOf(touchAt(1, sound), sound, 0);
    const bridge = envelopeOf(touchAt(0, sound), sound, 0);
    expect(bridge.level).toBeLessThan(tip.level);
    expect(bridge.attack).toBeCloseTo(tip.attack + (1 - touchAt(0, sound).dull) * 0.012, 12);
    expect(bridge.lowpass).toBeGreaterThanOrEqual(500);
    expect(bridge.lowpass).toBeLessThan(tip.lowpass);
  });

  it('past 10 s the recording rings out freely', () => {
    const free = envelopeOf(touchAt(1, sound), { ...sound, DEFAULTS: { ...sound.DEFAULTS, len: 10.5 } }, 0);
    expect(free.release).toBeNull();
    expect(free.stop).toBeNull();
  });
});

describe('the „still“ sound', () => {
  it('is closed at rest, open at full swing, equal power between', () => {
    expect(crossfade(0)).toEqual({ closed: 1, open: 0 });
    expect(crossfade(1).closed).toBeCloseTo(0, 12);
    expect(crossfade(1).open).toBeCloseTo(1, 12);
    const half = crossfade(0.5);
    expect(half.closed ** 2 + half.open ** 2).toBeCloseTo(1, 12);
  });

  it('every tine has both recordings among the samples', () => {
    const files = new Set(
      (kalimba.sound.tines as { src: string }[]).flatMap((t) => sound.layers.map((l) => sampleFile(l, t.src))),
    );
    expect(sound.layers).toEqual(['closed', 'open']);
    expect([...files].sort()).toEqual([
      'closed-A3.mp3', 'closed-A4.mp3', 'closed-B4.mp3', 'closed-C4.mp3', 'closed-E4.mp3', 'closed-E5.mp3',
      'open-A3.mp3', 'open-A4.mp3', 'open-B4.mp3', 'open-C4.mp3', 'open-E4.mp3', 'open-E5.mp3',
    ]);
  });
});

describe('onset: MP3 puts silence in front', () => {
  it('starts 32 samples before the first sample at or above 0.01', () => {
    const data = new Float32Array(1000);
    data[400] = 0.02;
    expect(onsetOffset(data, 48000, sound.onset)).toBeCloseTo((400 - 32) / 48000, 12);
  });
  it('never before the start', () => {
    const data = new Float32Array(100);
    data[10] = -0.5;
    expect(onsetOffset(data, 44100, sound.onset)).toBe(0);
  });
});

describe('the vibration of a pluck', () => {
  it('30 + 60 × velocity ms; three iOS ticks above 0.6, two below', () => {
    expect(pluckHaptic(1, sound.haptics.pluck)).toEqual({ ms: 90, ticks: 3 });
    expect(pluckHaptic(0.6, sound.haptics.pluck)).toEqual({ ms: 66, ticks: 2 });
    expect(pluckHaptic(0.44, sound.haptics.pluck)).toEqual({ ms: 56, ticks: 2 });
  });
});
