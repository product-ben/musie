/**
 * The port does what the experiment does — checked by running the
 * experiment's OWN functions, cut out of `marimba/261108-1740/index.html`,
 * beside the adapter's pure parts, on the same inputs.
 *
 * `sources.test.ts` holds the NUMBERS (marimba.json) to the experiment; this
 * holds the ARITHMETIC: which recording a bar plays and in which layer, how
 * loud and how bright, the onset trim, strike strength with its adapting
 * ranges, `me`'s roll / velocity / vibration, the calm, the layout and the hit
 * test. The experiment is our own file in this repo, which is the only reason
 * evaluating it is acceptable (the same reasoning as `shadow.test.ts`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { calmNote, calmStart, calmStep } from './calm';
import { hitBar, layoutBars } from './draw';
import { barFiles, layerIndex, levelOf, lowpassHz, mapBars, trimOf, type MarimbaSound } from './sound';
import { createStriker, startRanges, strength, type Measure } from './strike';
import { loadMarimba, seeded } from './testing';

const html = readFileSync(join(__dirname, '..', '..', '..', 'public/experiments/marimba/261108-1740/index.html'), 'utf8');

/** The source between two markers, `from` included, `to` excluded. */
function cut(from: string, to: string): string {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`marimba experiment: not found ${from} … ${to}`);
  return html.slice(a, b);
}

/** A single expression from the source, as the body of a function. */
function expression(pattern: RegExp): string {
  const m = pattern.exec(html);
  if (!m) throw new Error(`marimba experiment: not found ${pattern}`);
  return m[1];
}

const CLAMP = 'const clamp = (v, a, b) => Math.max(a, Math.min(b, v));';
const HZ = 'const hz = m => 440 * Math.pow(2, (m - 69) / 12);';
const SCALE_SRC = cut('const SCALE = [', '// ════════ Klänge');

const { definition } = loadMarimba();
const sound = definition.sound as unknown as MarimbaSound;

describe('Klänge: recordings and layers', () => {
  const klaenge = new Function(`${SCALE_SRC}${cut('const MAR5 =', 'const HOME =')}
    return { map: mapping('weich'), layers: SOUNDS.weich.layers };`)() as {
    map: { src: string; semi: number }[];
    layers: ((n: string) => string)[];
  };

  it('each bar takes the experiment’s recording and shift', () => {
    expect(mapBars(sound)).toEqual([...klaenge.map].map(({ src, semi }) => ({ src, semi })));
  });

  it('each bar and layer is the experiment’s file', () => {
    const ours = barFiles(sound, definition.samples);
    const theirs = klaenge.map.map((m) => klaenge.layers.map((layer) => layer(m.src)));
    expect(ours).toEqual(theirs);
  });

  it('the layer rule', () => {
    const li = new Function('layers', 'vel', `return ${expression(/li = (layers\.length === 1[^;]+);/)};`) as (
      layers: unknown[], vel: number,
    ) => number;
    for (let v = 0; v <= 1.0001; v += 0.01) expect(layerIndex(v, sound.samples)).toBe(li(klaenge.layers, v));
  });
});

describe('Audio: level, filter, onset', () => {
  const levelOfExp = new Function(`${SCALE_SRC}${expression(/(const levelOf = [^;]+;)/)} return levelOf;`)() as (i: number) => number;
  const lowpassExp = new Function('roll', 'layers', 'vel', `return ${expression(/lp\.frequency\.value = (roll \? [^;]+);/)};`) as (
    roll: boolean, layers: unknown[], vel: number,
  ) => number;

  it('levelOf', () => {
    for (let i = 0; i < 10; i++) expect(levelOf(i, sound)).toBeCloseTo(levelOfExp(i), 12);
  });

  it('the stroke’s lowpass, rolled and not', () => {
    const twoLayers = [0, 1];
    for (let v = 0; v <= 1.0001; v += 0.05) {
      expect(lowpassHz(v, false, sound.filter)).toBeCloseTo(lowpassExp(false, twoLayers, v), 9);
      expect(lowpassHz(v, true, sound.filter)).toBe(lowpassExp(true, twoLayers, v));
    }
  });

  it('loadOne’s peak gain and onset trim', () => {
    const body = cut('const d = buf.getChannelData(0);', '}\nconst loading');
    const loadOne = new Function('buf', 'f', `const buffers = {}; ${body} return buffers[f];`) as (
      buf: { getChannelData(c: number): Float32Array; sampleRate: number }, f: string,
    ) => { offset: number; gain: number };
    const rand = seeded(7);
    for (const lead of [0, 10, 31, 32, 33, 500]) {
      const data = new Float32Array(2000);
      for (let k = 0; k < lead; k++) data[k] = (rand() - 0.5) * 0.004;
      for (let k = lead; k < data.length; k++) data[k] = Math.sin(k / 7) * Math.exp(-(k - lead) / 400) * 0.6;
      const buf = { getChannelData: () => data, sampleRate: 44100 };
      const theirs = loadOne(buf, 'x.wav');
      const ours = trimOf(data, 44100, sound.normalise);
      expect(ours.offset).toBeCloseTo(theirs.offset, 12);
      expect(ours.gain).toBeCloseTo(theirs.gain, 12);
    }
  });
});

describe('Anschlag: strength with adapting ranges', () => {
  const exp = new Function(`${CLAMP} const STRIKE_MS = ${sound.strike.STRIKE_MS};
    let motionState = 'idle'; const motionHist = []; let lastTouch = { t: -1e9, r: 0, f: 0 };
    ${cut('const RS = {', 'const barT =')}
    return {
      set(state, hist, touch) { motionState = state; motionHist.length = 0; motionHist.push(...hist); lastTouch = touch; },
      strength,
    };`)() as {
    set(state: string, hist: { t: number; m: number }[], touch: { t: number; r: number; f: number }): void;
    strength(t0: number): number | null;
  };

  it('500 touches give the same strength, the ranges learning alike', () => {
    const rand = seeded(42);
    const ranges = startRanges(sound.strike);
    for (let n = 0; n < 500; n++) {
      const t0 = 10_000 + n * 300;
      const motionOn = rand() < 0.8;
      /* Around the window, and on its exact edges (−40, +STRIKE_MS + 10, touch ±80). */
      const edges = [-41, -40, -39, 39, 40, 41];
      const hist = Array.from({ length: Math.floor(rand() * 6) }, () => ({
        t: rand() < 0.3 ? t0 + edges[Math.floor(rand() * edges.length)] : t0 - 120 + rand() * 200,
        m: rand() * 2.5,
      }));
      const touchAt = rand() < 0.3 ? t0 - [79, 80, 81][Math.floor(rand() * 3)] : t0 - rand() * 100;
      const touch = rand() < 0.15
        ? { t: t0 - 200, r: 0, f: 0 }
        : { t: touchAt, r: rand() < 0.2 ? 0 : 5 + rand() * 30, f: rand() < 0.5 ? 0 : rand() };
      exp.set(motionOn ? 'on' : 'denied', hist, touch);
      const theirs = exp.strength(t0);
      const ours = strength(
        {
          t0,
          motionOn,
          jolts: hist.map((h) => ({ at: h.t, magnitude: h.m })),
          touch: { at: touch.t, radius: touch.r, force: touch.f },
        },
        sound.strike,
        ranges,
      );
      if (theirs === null) expect(ours).toBeNull();
      else expect(ours).toBeCloseTo(theirs, 12);
    }
  });
});

describe('Dein Schlag: roll, velocity, vibration', () => {
  const exp = new Function(`${SCALE_SRC}${CLAMP}
    let clock = 0, r = 0; const performance = { now: () => clock };
    const Math = Object.create(globalThis.Math); Math.random = () => r;
    const out = [];
    const strikeBuzz = ms => out.push(['buzz', ms]);
    const lightUp = (i, vel) => out.push(['light', i, vel]);
    const sound = (i, vel, who, roll) => out.push(['sound', i, vel, roll]);
    let answering = false; const stopAnswer = () => {};
    const cd = { started: true, running: true, left: 1 }; const cdStart = () => {};
    const listen = () => {}; const calmNote = () => {};
    ${cut('const barT = SCALE.map', '// ════════ Gespräch')}
    return { me(i, pos, s, at, rand) { clock = at; r = rand; out.length = 0; me(i, pos, s); return out.slice(); } };`)() as {
    me(i: number, pos: number, s: Measure, at: number, rand: number): (string | number | boolean)[][];
  };

  it('2000 strokes — taps, rolls, glissandi, measured and not — come out alike', () => {
    const rand = seeded(2026);
    const striker = createStriker(sound);
    let t = 5_000;
    for (let n = 0; n < 2000; n++) {
      /* Whole milliseconds, often exactly on a threshold: 170 any bar, 260 same bar, 200 between buzzes. */
      const edges = [100, 169, 170, 171, 199, 200, 201, 259, 260, 261];
      t += rand() < 0.4 ? edges[Math.floor(rand() * edges.length)] : rand() < 0.5 ? Math.round(40 + rand() * 200) : Math.round(200 + rand() * 1500);
      const i = Math.floor(rand() * (rand() < 0.5 ? 3 : 10));
      const pos = rand() * 1.2 - 0.1;
      const kind = rand();
      const measure: Measure = kind < 0.3 ? null : kind < 0.45 ? 'move' : rand();
      const r = rand();
      const theirs = exp.me(i, pos, measure, t, r);
      const ours = striker.strike(i, pos, measure, t, r);
      const buzz = theirs.find((c) => c[0] === 'buzz');
      const played = theirs.find((c) => c[0] === 'sound')!;
      expect(ours.velocity).toBeCloseTo(played[2] as number, 12);
      expect(ours.roll).toBe(played[3]);
      expect(ours.buzz).toBe(buzz ? buzz[1] : null);
    }
  });
});

describe('Ruhiger gespielt: calm', () => {
  const exp = new Function(`${CLAMP}
    let calm = 0, ctx = null, warmLp = null, raf = 1; const draw = () => {};
    let tick = null; const setInterval = fn => { tick = fn; };
    ${cut('let calmTarget = 0', '// ════════ Berühren')}
    return { calmNote, tick: () => tick(), calm: () => calm };`)() as {
    calmNote(now: number, roll: boolean): void;
    tick(): void;
    calm(): number;
  };

  it('the same strokes and ticks give the same calm', () => {
    const rand = seeded(9);
    const ours = calmStart(sound.calm);
    let t = 1_000;
    for (let n = 0; n < 3000; n++) {
      if (rand() < 0.2) {
        t += rand() < 0.1 ? 7000 : 150 + rand() * 2500;
        const roll = rand() < 0.15;
        exp.calmNote(t, roll);
        calmNote(ours, t, roll, sound.calm);
      }
      exp.tick();
      calmStep(ours, sound.calm, 1);
      expect(ours.calm).toBeCloseTo(exp.calm(), 12);
    }
    expect(ours.calm).toBeGreaterThan(0);
  });
});

describe('Zeichnen + Berühren: layout and hit test', () => {
  const exp = new Function('box', `${SCALE_SRC}${CLAMP}${HZ}
    const devicePixelRatio = box.dpr, innerWidth = box.width, innerHeight = box.height;
    const cv = {}, g = { setTransform() {} }, safeEl = {};
    const getComputedStyle = () => ({ paddingLeft: String(box.inset.left) + 'px', paddingRight: String(box.inset.right) + 'px' });
    const header = { getBoundingClientRect: () => ({ bottom: box.inset.top }) };
    const btnSettings = { getBoundingClientRect: () => ({ top: box.height - box.inset.bottom }) };
    const N = () => 10, draw = () => {}, performance = { now: () => 0 };
    let W = 0, H = 0, L = null;
    ${cut('function layout()', 'function cords()')}
    ${cut('function hit(x, y)', "cv.addEventListener('pointerdown'")}
    layout();
    return { L, hit };`) as (box: unknown) => {
    L: { x0: number; x1: number; col: number; top: number; bottom: number; bars: { cx: number; w: number; h: number; y0: number }[] };
    hit(x: number, y: number): { i: number; pos: number } | null;
  };

  const boxes = [
    { width: 844, height: 390, dpr: 3, inset: { top: 64, right: 47, bottom: 72, left: 47 } },
    { width: 1280, height: 800, dpr: 2, inset: { top: 90, right: 0, bottom: 80, left: 0 } },
    { width: 390, height: 844, dpr: 3, inset: { top: 100, right: 0, bottom: 90, left: 0 } },
    { width: 300, height: 120, dpr: 1, inset: { top: 40, right: 0, bottom: 40, left: 0 } },
  ];

  it.each(boxes.map((b) => [`${b.width}×${b.height}`, b] as const))('%s', (_name, box) => {
    const theirs = exp(box);
    const ours = layoutBars(box, sound.SCALE);
    expect({ x0: ours.x0, x1: ours.x1, col: ours.col, top: ours.top, bottom: ours.bottom }).toEqual({
      x0: theirs.L.x0, x1: theirs.L.x1, col: theirs.L.col, top: theirs.L.top, bottom: theirs.L.bottom,
    });
    ours.bars.forEach((b, i) => {
      const t = theirs.L.bars[i];
      for (const k of ['cx', 'w', 'h', 'y0'] as const) expect(b[k]).toBeCloseTo(t[k], 9);
    });
    /* A grid, plus every edge of the hit area exactly and half a pixel either side. */
    const L = ours;
    const xs = [L.x0 - 8, L.x1 + 8, ...L.bars.flatMap((b) => [b.cx - b.w / 2, b.cx + b.w / 2])];
    const ys = [L.top - 24, L.bottom + 12, ...L.bars.flatMap((b) => [b.y0, b.y0 + b.h])];
    const around = (v: number[]) => v.flatMap((p) => [p - 0.5, p, p + 0.5]);
    const gridX = Array.from({ length: Math.ceil((box.width + 40) / 13) }, (_, k) => -20 + k * 13);
    const gridY = Array.from({ length: Math.ceil((box.height + 40) / 11) }, (_, k) => -20 + k * 11);
    for (const x of [...gridX, ...around(xs)]) {
      for (const y of [...gridY, ...around(ys)]) {
        const a = hitBar(ours, x, y);
        const b = theirs.hit(x, y);
        if (b === null) expect(a).toBeNull();
        else {
          expect(a?.i).toBe(b.i);
          expect(a?.pos).toBeCloseTo(b.pos, 9);
        }
      }
    }
  });
});
