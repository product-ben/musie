/**
 * The instruments sound exactly like the newest experiment — checked against
 * the experiment, not against a copy of it.
 *
 * Ben, 2026-11-09: samples and sound configuration are LOCKED to each
 * instrument's newest experiment (PRD, "Verbindliche Quelle"). The configs in
 * `supabase/content/instruments/*.json` are what the migration writes and what
 * the app plays; this file reads the experiments' own HTML, pulls the literal
 * constants out of the script, and requires the JSON to say the same.
 *
 * ── WHY THE TREE AND NOT THE COMMIT ───────────────────────────────────────
 * CI checks out one commit deep, so `git show 5590e20:…` is not available
 * there. The experiments are in the tree at exactly the pinned commits' content
 * (PR #71 and #72 were merged into this branch for that reason), and a change
 * to an experiment file is a change this test will see.
 *
 * ── AND THE SAMPLES BY HASH ───────────────────────────────────────────────
 * Every file in `apps/web/public/instruments/` must hash to the bytes it was
 * copied from — the harp's from its base64, the other two from their
 * `samples/` folders. Re-encoding a file, or swapping one, turns this red.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (path: string) => readFileSync(join(ROOT, path));
const text = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

const html = {
  harp: text('apps/web/public/experiments/harp/261109-0920/index.html'),
  kalimba: text('apps/web/public/experiments/kalimba/261106-1121/index.html'),
  marimba: text('apps/web/public/experiments/marimba/261108-1740/index.html'),
};

/**
 * The value of a JS literal that follows `marker` in the source — an object or
 * array, matched by brackets, then evaluated. The experiments are our own files
 * in this repo, which is the only reason evaluating them is acceptable here.
 */
function literal(source: string, marker: string): unknown {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`not found: ${marker}`);
  let i = source.indexOf(marker) + marker.length;
  while (source[i] !== '{' && source[i] !== '[') i += 1;
  const open = source[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let end = i;
  for (; end < source.length; end += 1) {
    if (source[end] === open) depth += 1;
    else if (source[end] === close) { depth -= 1; if (depth === 0) break; }
  }
  return new Function(`return (${source.slice(i, end + 1)});`)();
}

/** A number assigned in the source, e.g. `makeup.gain.value = 1.7`. */
function number(source: string, pattern: RegExp): number {
  const m = pattern.exec(source);
  if (!m) throw new Error(`not found: ${pattern}`);
  return Number(m[1]);
}

const master = (source: string) => ({
  compressor: {
    threshold: number(source, /comp\.threshold\.value = (-?[\d.]+)/),
    knee: number(source, /comp\.knee\.value = (-?[\d.]+)/),
    ratio: number(source, /comp\.ratio\.value = (-?[\d.]+)/),
    attack: number(source, /comp\.attack\.value = (-?[\d.]+)/),
    release: number(source, /comp\.release\.value = (-?[\d.]+)/),
  },
  makeup: number(source, /makeup\.gain\.value = (-?[\d.]+)/),
  limiter: {
    threshold: number(source, /limit\.threshold\.value = (-?[\d.]+)/),
    knee: number(source, /limit\.knee\.value = (-?[\d.]+)/),
    ratio: number(source, /limit\.ratio\.value = (-?[\d.]+)/),
    attack: number(source, /limit\.attack\.value = (-?[\d.]+)/),
    release: number(source, /limit\.release\.value = (-?[\d.]+)/),
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any -- the configs are JSON */
const config = {
  harp: json<any>('supabase/content/instruments/harp.json'),
  kalimba: json<any>('supabase/content/instruments/kalimba.json'),
  marimba: json<any>('supabase/content/instruments/marimba.json'),
  answer: json<any>('supabase/content/instruments/answer.json'),
};

describe('harp = harp/261109-0920', () => {
  const src = html.harp;
  it('tuning', () => {
    expect(number(src, /ROOT = (\d+)/)).toBe(config.harp.sound.tuning.ROOT);
    expect(number(src, /COUNT = (\d+)/)).toBe(config.harp.sound.tuning.COUNT);
    expect(literal(src, 'const SCALE =')).toEqual(config.harp.sound.tuning.SCALE);
  });
  it('the preset it starts with', () => {
    expect((literal(src, 'const PRESETS =') as { p: unknown }[])[0].p).toEqual(config.harp.sound.preset);
  });
  it('Klangfarbe „Weich“', () => {
    const weich = (literal(src, 'const SOUNDS =') as Record<string, Record<string, unknown>>).weich;
    const { attack, cut, shelf, gain } = config.harp.sound.timbre;
    expect(weich).toMatchObject({ attack, cut, shelf, gain, wet: config.harp.sound.preset.wet, room: config.harp.sound.preset.room });
  });
  it('master chain', () => expect(master(src)).toEqual(config.harp.sound.master));
  it('the engine it starts with', () => {
    expect(src).toContain(`const state = { engine: '${config.harp.sound.engine}' }`);
  });
  it('the answer ends on its home strings', () => {
    expect(literal(src, 'const HOME =')).toEqual(config.harp.answer.home);
  });
});

describe('kalimba = kalimba/261106-1121', () => {
  const src = html.kalimba;
  it('defaults', () => {
    const defaults = literal(src, 'const DEFAULTS =') as Record<string, unknown>;
    expect(defaults).toMatchObject(config.kalimba.sound.DEFAULTS);
  });
  it('tines of the pentatonic tuning', () => {
    const tunings = literal(src, 'const TUNINGS =') as Record<string, { tines: unknown }>;
    expect(tunings.penta.tines).toEqual(config.kalimba.sound.tines);
  });
  it('tuning corrections of the two layers the default sound uses', () => {
    const cents = literal(src, 'const CENTS =') as Record<string, unknown>;
    expect(cents.closed).toEqual(config.kalimba.sound.CENTS.closed);
    expect(cents.open).toEqual(config.kalimba.sound.CENTS.open);
    expect(literal(src, 'const NOTES =')).toEqual(config.kalimba.sound.NOTES);
  });
  it('master chain and membrane', () => {
    expect(master(src)).toEqual(config.kalimba.sound.master);
    expect(number(src, /memPeak\.frequency\.value = ([\d.]+)/)).toBe(config.kalimba.sound.membrane.peak.hz);
    expect(number(src, /memPeak\.Q\.value = ([\d.]+)/)).toBe(config.kalimba.sound.membrane.peak.q);
    expect(number(src, /lfo\.frequency\.value = ([\d.]+)/)).toBe(config.kalimba.sound.membrane.lfo.hz);
  });
  it('the pitch order the answer counts in is the tines sorted by frequency', () => {
    const tines = config.kalimba.sound.tines as { hz: number }[];
    const byPitch = tines.map((t, i) => [t.hz, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    expect(config.kalimba.answer.pitchOrder).toEqual(byPitch);
  });
});

describe('marimba = marimba/261108-1740', () => {
  const src = html.marimba;
  it('defaults and bars', () => {
    expect(literal(src, 'const DEFAULTS =')).toEqual(config.marimba.sound.DEFAULTS);
    expect(literal(src, 'const SCALE =')).toEqual(config.marimba.sound.SCALE);
    expect(literal(src, 'const MAR5 =')).toEqual(config.marimba.sound.samples.notes);
  });
  it('master chain', () => {
    const { warm, ...chain } = config.marimba.sound.master;
    expect(master(src)).toEqual(chain);
    expect(number(src, /warmLp\.frequency\.value = (\d+)/)).toBe(warm.hz);
  });
  it('strike measurement', () => {
    expect(number(src, /const STRIKE_MS = (\d+)/)).toBe(config.marimba.sound.strike.STRIKE_MS);
    const ranges = /const RS = (\{[^}]+\}), RA = (\{[^}]+\}), RF = (\{[^}]+\})/.exec(src);
    expect(ranges).not.toBeNull();
    const [rs, ra, rf] = ranges!.slice(1).map((s) => new Function(`return (${s});`)() as unknown);
    expect([rs, ra, rf]).toEqual([config.marimba.sound.strike.RS, config.marimba.sound.strike.RA, config.marimba.sound.strike.RF]);
  });
  it('the answer: home bars and the pause rule', () => {
    expect(literal(src, 'const HOME =')).toEqual(config.marimba.answer.home);
    const p = config.answer.pause;
    expect(src).toContain(`clamp(Math.max(m * ${p.medianFactor}, longest * ${p.longestFactor}, ${p.minMs}), ${p.minMs}, ${p.maxMs})`);
    expect(src).toContain(`phrase.length > ${config.answer.phraseMemory}`);
    expect(src).toContain(`Math.min(ph.length, ${config.answer.maxNotes})`);
  });
});

describe('samples are the experiments’ own bytes', () => {
  const manifest = json<{ samples: { path: string; sha256: string; bytes: number; from: string }[] }>(
    'supabase/content/instruments/samples.json',
  );

  it('32 files: 6 harp, 16 kalimba, 10 marimba', () => {
    const count = (id: string) => manifest.samples.filter((s) => s.path.startsWith(`/instruments/${id}/`)).length;
    expect([count('harp'), count('kalimba'), count('marimba')]).toEqual([6, 16, 10]);
  });

  it.each(manifest.samples.map((s) => [s.path, s] as const))('%s', (_path, s) => {
    const shipped = read(`apps/web/public${s.path}`);
    expect(shipped.length).toBe(s.bytes);
    expect(sha256(shipped)).toBe(s.sha256);

    if (s.from.includes('#SAMPLES[')) {
      const midi = /#SAMPLES\[(\d+)]/.exec(s.from)![1];
      const samples = literal(html.harp, 'const SAMPLES =') as Record<string, string>;
      expect(sha256(Buffer.from(samples[midi], 'base64'))).toBe(s.sha256);
    } else {
      expect(sha256(read(`apps/web/public/experiments/${s.from}`))).toBe(s.sha256);
    }
  });
});
