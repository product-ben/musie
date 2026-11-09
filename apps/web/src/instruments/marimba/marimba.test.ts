/**
 * The adapter against the contract: a fake host records what the marimba asks
 * of it, a fake AudioContext records what it schedules, and the clock and
 * timers move only when the test says so.
 *
 * What is held here is the WIRING — who is told what, and when: the person's
 * strokes are reported and vibrate, the answer and the demo do neither; a
 * touch waits for the jolt; a locked context keeps the stroke for its unlock;
 * the layer, the rate, the filter and the envelope reach the graph. The
 * arithmetic itself is held against the experiment in `experiment.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import type { StageBox, StagePointer } from '../types';
import { layoutBars, mixColour } from './draw';
import { createMarimba, createMarimbaWith } from './index';
import { barFiles, levelOf, lowpassHz, playbackRate, type MarimbaSound } from './sound';
import { FakeAudio, PALETTE, fakeEnv, fakeHost, loadMarimba } from './testing';

const LANDSCAPE: StageBox = { width: 844, height: 390, dpr: 3, inset: { top: 64, right: 47, bottom: 72, left: 47 } };
const PORTRAIT: StageBox = { width: 390, height: 844, dpr: 3, inset: { top: 100, right: 0, bottom: 90, left: 0 } };

function setup({ loaded = true, box = LANDSCAPE }: { loaded?: boolean; box?: StageBox } = {}) {
  const { definition } = loadMarimba();
  const sound = definition.sound as unknown as MarimbaSound;
  const files = barFiles(sound, definition.samples);
  const fake = fakeHost();
  if (loaded) fake.loadAll(files.flat());
  const env = fakeEnv();
  const m = createMarimbaWith(definition, fake.host, env);
  m.layout(box);
  const L = layoutBars(box, sound.SCALE);
  const on = (i: number, pos = 0.5) => ({ x: L.bars[i].cx, y: L.bars[i].y0 + L.bars[i].h * pos });
  const pointer = (id: number, i: number, type: StagePointer['type'] = 'mouse', extra: Partial<StagePointer> = {}): StagePointer =>
    ({ id, ...on(i), t: env.now(), type, ...extra });
  /** The bufferSources that were started, with the file each plays. */
  const started = () => fake.audio.sources.filter((s) => s.started).map((s) => ({ src: s, file: (s.buffer as { name: string }).name }));
  /** The per-stroke lowpass and envelope belonging to source `k` (created in that order after the master). */
  const strokeNodes = (k: number) => ({ lp: fake.audio.filters[1 + k], env: fake.audio.gains[2 + k] });
  return { m, sound, files, env, L, on, pointer, started, strokeNodes, ...fake };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('the person’s stroke', () => {
  it('a mouse stroke sounds, lights, vibrates and is reported — at once', () => {
    const t = setup();
    t.m.pointerDown(t.pointer(1, 3));
    const vel = 1 * (0.96 + 0.5 * 0.04); // unmeasured, middle of the bar, random 0.5
    expect(t.log.played).toEqual([{ degree: 3, velocity: vel, roll: false, at: 1000 }]);
    expect(t.log.vibrate).toEqual([Math.round(30 + 50 * vel)]);
    expect(t.log.holding).toEqual([1]);
    expect(t.log.draws).toBeGreaterThan(0);

    const [s] = t.started();
    expect(s.file).toBe('B3.wav'); // a = 57: B3 two semitones down, the loud layer from 0.6
    expect(s.src.playbackRate.value).toBeCloseTo(playbackRate(-2), 12);
    expect(s.src.started).toEqual([0, (64 - 32) / 48000]);
    const { lp, env } = t.strokeNodes(0);
    expect(lp.frequency.value).toBeCloseTo(lowpassHz(vel, false, t.sound.filter), 9);
    expect(env.gain.calls).toEqual([['set', 0, 0], ['ramp', vel * levelOf(3, t.sound) * (0.89 / 0.5), 0.0015]]);

    t.m.pointerUp(t.pointer(1, 3));
    expect(t.log.holding).toEqual([1, 0]);
  });

  it('a touch waits STRIKE_MS for the jolt, measures it, and a soft one takes the mittel layer', () => {
    const t = setup();
    t.state.motion = { rotation: 0, jolt: 0, at: 1000 };
    t.state.jolts = [{ at: 1010, magnitude: 0.05 }, { at: 1100, magnitude: 5 }]; // the second is outside the window
    t.m.pointerDown(t.pointer(1, 0, 'touch', { radius: 10, force: 0 }));
    expect(t.log.joltsAsked).toEqual([]);
    t.env.advance(29);
    expect(t.log.played).toHaveLength(0);
    t.env.advance(1);
    expect(t.log.joltsAsked).toEqual([1000 - 40]);
    const vel = 0.18 * (0.97 + 0.5 * 0.03); // strength 0: both readings at the bottom of their ranges
    expect(t.log.played).toEqual([{ degree: 0, velocity: vel, roll: false, at: 1030 }]);
    expect(t.started().map((s) => s.file)).toEqual(['mar-med-C3.wav']);
  });

  it('a hard touch is loud; without the sensor it waits only noMotionWaitMs and measures the finger', () => {
    const t = setup();
    t.m.pointerDown(t.pointer(1, 5, 'touch', { radius: 26, force: 1 }));
    t.env.advance(7);
    expect(t.log.played).toHaveLength(0);
    t.env.advance(1);
    expect(t.log.played[0].velocity).toBeCloseTo(1 * (0.97 + 0.5 * 0.03), 12);
    expect(t.started().map((s) => s.file)).toEqual(['F4.wav']);
  });

  it('a pen strikes at once, like a mouse', () => {
    const t = setup();
    t.m.pointerDown(t.pointer(1, 4, 'pen'));
    expect(t.log.played).toHaveLength(1);
  });

  it('a roll: fast strokes even out, darker and softer, and vibrate only every 200 ms', () => {
    const t = setup();
    for (let k = 0; k < 4; k++) {
      t.m.pointerDown(t.pointer(k, 6));
      t.m.pointerUp(t.pointer(k, 6));
      t.env.advance(100);
    }
    expect(t.log.played.map((p) => p.roll)).toEqual([false, true, true, true]);
    expect(t.log.played.slice(1).map((p) => p.velocity)).toEqual([0.54, 0.54, 0.54]);
    expect(t.log.vibrate).toEqual([Math.round(30 + 50 * 0.98), 20]); // at 0 and at +300; +100, +200 are inside the window
    expect(t.strokeNodes(1).lp.frequency.value).toBe(2600);
    expect(t.strokeNodes(1).env.gain.calls[1][2]).toBe(0.008);
  });

  it('a glissando: moving onto another bar strikes it, decaying', () => {
    const t = setup();
    t.m.pointerDown(t.pointer(1, 0));
    t.env.advance(400);
    t.m.pointerMove({ ...t.pointer(1, 0), ...t.on(0, 0.8) }); // same bar: nothing
    expect(t.log.played).toHaveLength(1);
    t.m.pointerMove({ ...t.pointer(1, 1), ...t.on(1) });
    expect(t.log.played).toHaveLength(2);
    expect(t.log.played[1].velocity).toBeCloseTo(Math.min(0.9, Math.max(0.2, t.log.played[0].velocity * 0.92)), 12);
    t.m.pointerMove({ ...t.pointer(2, 4), ...t.on(4) }); // a pointer that never went down
    expect(t.log.played).toHaveLength(2);
  });

  it('held pointers are reported, misses included, as the answer must wait for them', () => {
    const t = setup();
    t.m.pointerDown({ id: 1, x: 5, y: 5, t: 0, type: 'touch' }); // in the header, off the bars
    expect(t.log.holding).toEqual([1]);
    t.env.advance(50);
    expect(t.log.played).toHaveLength(0);
    t.m.pointerDown(t.pointer(2, 2));
    t.m.pointerUp(t.pointer(2, 2));
    t.m.pointerUp({ id: 1, x: 5, y: 5, t: 0, type: 'touch' });
    expect(t.log.holding).toEqual([1, 2, 1, 0]);
  });
});

describe('keys', () => {
  it('a s d f g h j k l ö play the bars; Shift strikes the end; a held key does not repeat', () => {
    const t = setup();
    expect(t.m.keyDown('a', false)).toBe(true);
    expect(t.m.keyDown('a', false)).toBe(true);
    expect(t.log.played.map((p) => p.degree)).toEqual([0]);
    t.m.keyUp('a');
    t.env.advance(1000);
    expect(t.m.keyDown('A', true)).toBe(true);
    const edge = 0.8;
    expect(t.log.played[1].velocity).toBeCloseTo((1 - 0.3 * edge * edge) * 0.98, 12);
    t.env.advance(1000);
    expect(t.m.keyDown('ö', false)).toBe(true);
    expect(t.m.keyDown('x', false)).toBe(false);
    expect(t.m.keyDown('Enter', false)).toBe(false);
    expect(t.log.played.map((p) => p.degree)).toEqual([0, 0, 9]);
  });
});

describe('Musie’s notes', () => {
  it('an answer note: the answer colour and the sound, no vibration, not reported', () => {
    const t = setup();
    const voice = t.m.playAnswer({ degree: 5, velocity: 0.5, at: 1000 });
    expect(voice).not.toBeNull();
    expect(t.log.played).toEqual([]);
    expect(t.log.vibrate).toEqual([]);
    expect(t.started().map((s) => s.file)).toEqual(['mar-med-F4.wav']);
    expect(t.strokeNodes(0).lp.frequency.value).toBeCloseTo(lowpassHz(0.5, false, t.sound.filter), 9);

    t.audio.currentTime = 2;
    voice!.fade(0.15);
    expect(t.strokeNodes(0).env.gain.calls.slice(-1)).toEqual([['target', 0, 2, 0.15]]);
    expect(t.audio.sources[0].stoppedAt).toBeCloseTo(2 + 0.15 * 8, 12);

    const frames: string[] = [];
    const g = recordFills(frames);
    t.m.draw(g, 1000);
    const lit = mixColour(PALETTE.rest, PALETTE.answer, Math.min(1, (0.35 + 0.65 * 0.5) * 1.15));
    expect(frames).toContain(lit);
  });

  it('a rolled answer stroke is played as a roll stroke', () => {
    const t = setup();
    t.m.playAnswer({ degree: 0, velocity: 0.42, roll: true, at: 1000 });
    expect(t.strokeNodes(0).lp.frequency.value).toBe(2600);
  });

  it('an answer outside the bars is ignored', () => {
    const t = setup();
    expect(t.m.playAnswer({ degree: 10, velocity: 0.5, at: 0 })).toBeNull();
    expect(t.m.playAnswer({ degree: -1, velocity: 0.5, at: 0 })).toBeNull();
    expect(t.started()).toHaveLength(0);
  });

  it('the demo: bar g at the demo velocity, played colour, no vibration, not reported', () => {
    const t = setup();
    expect(t.m.playDemo()).toEqual({ degree: 2 });
    expect(t.log.played).toEqual([]);
    expect(t.log.vibrate).toEqual([]);
    expect(t.started().map((s) => s.file)).toEqual(['G3.wav']); // 0.6 is the loud layer's threshold
    expect(t.started()[0].src.playbackRate.value).toBe(1);
    const frames: string[] = [];
    t.m.draw(recordFills(frames), 1000);
    expect(frames).toContain(mixColour(PALETTE.rest, PALETTE.played, Math.min(1, (0.35 + 0.65 * 0.6) * 1.15)));
  });

  it('the answer and the demo do not count as the person’s playing for a roll', () => {
    const t = setup();
    t.m.playDemo();
    t.m.playAnswer({ degree: 3, velocity: 0.5, at: 1000 });
    t.m.pointerDown(t.pointer(1, 2));
    expect(t.log.played[0].roll).toBe(false);
  });
});

describe('audio', () => {
  it('the master chain: bus → warm lowpass → compressor → makeup → limiter → destination, from the config', () => {
    const t = setup();
    const [warm] = t.audio.filters;
    const [comp, limit] = t.audio.dynamics;
    const [makeup, bus] = t.audio.gains;
    expect(bus.out).toEqual([warm]);
    expect(warm.out).toEqual([comp]);
    expect(comp.out).toEqual([makeup]);
    expect(makeup.out).toEqual([limit]);
    expect(limit.out).toEqual([t.audio.destination]);
    expect(warm.frequency.value).toBe(14000);
    expect(warm.Q.value).toBe(0.5);
    expect(makeup.gain.value).toBe(1.3);
    expect([comp.threshold.value, comp.knee.value, comp.ratio.value, comp.attack.value, comp.release.value]).toEqual([-16, 10, 2, 0.003, 0.25]);
    expect([limit.threshold.value, limit.knee.value, limit.ratio.value, limit.attack.value, limit.release.value]).toEqual([-2, 0, 20, 0.001, 0.1]);
  });

  it('every stroke’s chain ends on the bus', () => {
    const t = setup();
    t.m.pointerDown(t.pointer(1, 1));
    const bus = t.audio.gains[1];
    const src = t.audio.sources[0];
    const { lp, env } = t.strokeNodes(0);
    expect(src.out).toEqual([lp]);
    expect(lp.out).toEqual([env]);
    expect(env.out).toEqual([bus]);
  });

  it('no more than 32 voices: the oldest fades first', () => {
    const t = setup();
    for (let k = 0; k < 40; k++) t.m.playAnswer({ degree: k % 10, velocity: 0.7, at: 0 });
    const stopped = t.audio.sources.map((s) => s.stoppedAt);
    expect(stopped.slice(0, 8)).toEqual(Array(8).fill(0.04 * 8));
    expect(stopped.slice(8).every((s) => s === null)).toBe(true);
  });

  it('a stroke before the unlock is kept and played once audio runs', () => {
    const t = setup();
    t.state.audible = false;
    t.m.pointerDown(t.pointer(1, 4));
    expect(t.started()).toHaveLength(0);
    expect(t.log.played).toHaveLength(1); // the engine hears it anyway: the clock may start
    t.state.audible = true;
    t.m.pointerUp(t.pointer(1, 4));
    t.env.advance(0);
    expect(t.started().map((s) => s.file)).toEqual(['B3.wav']);
  });

  it('a kept stroke older than pendingMs is dropped', () => {
    const t = setup();
    t.state.audible = false;
    t.m.pointerDown(t.pointer(1, 4));
    t.env.advance(700);
    t.state.audible = true;
    t.m.tick(t.env.now());
    expect(t.started()).toHaveLength(0);
  });

  it('answers and the demo are not kept while audio is locked', () => {
    const t = setup();
    t.state.audible = false;
    expect(t.m.playAnswer({ degree: 1, velocity: 0.5, at: 0 })).toBeNull();
    t.m.playDemo();
    t.state.audible = true;
    t.m.tick(t.env.now());
    expect(t.started()).toHaveLength(0);
  });

  it('a stroke whose recording is not decoded yet is silent but still lights and is reported', () => {
    const t = setup({ loaded: false });
    t.m.pointerDown(t.pointer(1, 1));
    expect(t.audio.sources).toHaveLength(0);
    expect(t.log.played).toHaveLength(1);
  });
});

describe('ready and dispose', () => {
  it('ready() waits until the host has decoded every recording', async () => {
    const t = setup({ loaded: false });
    let ok = false;
    void t.m.ready().then(() => { ok = true; });
    t.env.advance(200);
    await flush();
    expect(ok).toBe(false);
    const unique = [...new Set(t.files.flat())];
    expect(unique).toHaveLength(10); // five recordings, two layers each
    t.loadAll(unique.slice(0, 9));
    t.env.advance(50);
    await flush();
    expect(ok).toBe(false);
    t.loadAll(t.files.flat());
    t.env.advance(50);
    await flush();
    expect(ok).toBe(true);
  });

  it('dispose releases a waiting ready(), cancels a stroke still waiting for its jolt, and stops listening', async () => {
    const t = setup({ loaded: false });
    let ok = false;
    void t.m.ready().then(() => { ok = true; });
    t.m.pointerDown(t.pointer(1, 3, 'touch'));
    t.m.dispose();
    await flush();
    expect(ok).toBe(true);
    t.env.advance(100);
    expect(t.log.played).toHaveLength(0);
    t.m.pointerDown(t.pointer(2, 3));
    expect(t.m.keyDown('a', false)).toBe(false);
    expect(t.log.played).toHaveLength(0);
    expect(t.env.pending()).toBe(0);
  });

  it('dispose fades what still sounds', () => {
    const t = setup();
    t.m.playAnswer({ degree: 1, velocity: 0.5, at: 0 });
    t.m.dispose();
    expect(t.audio.sources[0].stoppedAt).toBeCloseTo(0.04 * 8, 12);
  });
});

describe('calm', () => {
  it('slow, even playing softens the master and warms the ground; fast playing does not', () => {
    const slow = setup();
    const fast = setup();
    for (let n = 0; n < 24; n++) {
      slow.m.keyDown('asdfghjklö'[n % 10], false);
      slow.m.keyUp('asdfghjklö'[n % 10]);
      for (let k = 0; k < 16; k++) { slow.env.advance(100); slow.m.tick(slow.env.now()); }
    }
    for (let n = 0; n < 24 * 8; n++) {
      fast.m.keyDown('asdfghjklö'[n % 10], false);
      fast.m.keyUp('asdfghjklö'[n % 10]);
      for (let k = 0; k < 2; k++) { fast.env.advance(100); fast.m.tick(fast.env.now()); }
    }
    const warmCalls = (t: ReturnType<typeof setup>) => t.audio.filters[0].frequency.calls;
    expect(warmCalls(fast)).toEqual([]);
    const last = warmCalls(slow).at(-1)!;
    expect(last[0]).toBe('target');
    expect(last[1]).toBeLessThan(14000);
    expect(last[3]).toBe(0.3);

    const fills: string[] = [];
    slow.m.draw(recordFills(fills), slow.env.now());
    expect(fills[0]).not.toBe(PALETTE.background);
    const fastFills: string[] = [];
    fast.m.draw(recordFills(fastFills), fast.env.now());
    expect(fastFills[0]).toBe(PALETTE.background);
  });
});

describe('orientation', () => {
  it('portrait on a touch screen asks for the rotate hint; landscape or a fine pointer does not', () => {
    const t = setup({ box: PORTRAIT });
    expect(t.m.orientationHint).toBe(true);
    t.m.layout(LANDSCAPE);
    expect(t.m.orientationHint).toBe(false);
    const { definition } = loadMarimba();
    const fake = fakeHost();
    const env = { ...fakeEnv(), coarsePointer: () => false };
    const desk = createMarimbaWith(definition, fake.host, env);
    desk.layout(PORTRAIT);
    expect(desk.orientationHint).toBe(false);
  });

  it('a portrait box is still drawn, bars across its width', () => {
    const t = setup({ box: PORTRAIT });
    const fills: string[] = [];
    t.m.draw(recordFills(fills), 0);
    expect(fills.filter((f) => f === PALETTE.rest)).toHaveLength(10);
  });
});

describe('the factory', () => {
  it('createMarimba is the browser-bound factory and declares ten degrees', () => {
    const { definition } = loadMarimba();
    const m = createMarimba(definition, fakeHost(new FakeAudio()).host);
    expect(m.id).toBe('marimba');
    expect(m.degrees).toBe(10);
    m.dispose();
  });

  it('a definition that is not the marimba’s fails loudly', () => {
    const { definition } = loadMarimba();
    expect(() => createMarimba({ ...definition, sound: {} }, fakeHost().host)).toThrow(/marimba/);
    expect(() => createMarimba({ ...definition, samples: definition.samples.slice(1) }, fakeHost().host)).toThrow(/no sample/);
  });
});

/** A 2D context that records the fillStyle of every fill and fillRect, and ignores the rest. */
function recordFills(out: string[]): CanvasRenderingContext2D {
  const g: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', globalAlpha: 1 };
  const noop = () => {};
  for (const op of ['setTransform', 'beginPath', 'roundRect', 'arc', 'moveTo', 'lineTo', 'stroke']) g[op] = noop;
  g.fill = () => { if (typeof g.fillStyle === 'string') out.push(g.fillStyle); };
  g.fillRect = () => { out.push(g.fillStyle as string); };
  g.createRadialGradient = () => ({ addColorStop: noop });
  return g as unknown as CanvasRenderingContext2D;
}
