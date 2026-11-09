/**
 * The harp as an `InstrumentAdapter` — what the contract asks of it beyond
 * the experiment: the demo and the answer stay out of `host.played` and never
 * vibrate, own notes always reach it, keys 1–7 make the harp playable without
 * a pointer, a fixed look drawn from the palette and the host's shadow.
 *
 * Its behaviour against the experiment is `experiment.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INSTRUMENT_SHADOW_DEFAULT, instrumentShadowLayers, INSTRUMENT_TAP_DEFAULT } from '@musie/design-system';
import type { AnswerConfig, InstrumentHost, InstrumentSample, StagePointer, Stroke } from '../types';
import { createHarp } from './index';
import { createHarpInput } from './input';
import { pluckBuzz, type HarpSound } from './sound';
import { stringXs, strength } from './geometry';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as T;
const harp = read<{ sound: HarpSound; answer: Record<string, unknown>; demo: { string: number; velocity: number } }>(
  'supabase/content/instruments/harp.json',
);
const samples = read<{ samples: (InstrumentSample & { instrument: string })[] }>('supabase/content/instruments/samples.json').samples.filter(
  (s) => s.instrument === 'harp',
);
const sound = harp.sound;

/* ── a host that records ───────────────────────────────────────────────── */

const param = (value: number) => ({
  value,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  setTargetAtTime() {},
  cancelScheduledValues() {},
});

class MiniAudio {
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  sources = 0;
  disconnected = 0;
  private node(params: Record<string, number>) {
    return {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, param(v)])),
      connect: () => {},
      disconnect: () => {
        this.disconnected += 1;
      },
      start() {},
      stop() {},
    };
  }
  createGain = () => this.node({ gain: 1 });
  createBiquadFilter = () => this.node({ frequency: 350, Q: 1, gain: 0 });
  createStereoPanner = () => this.node({ pan: 0 });
  createDynamicsCompressor = () => this.node({ threshold: 0, knee: 0, ratio: 1, attack: 0, release: 0 });
  createConvolver = () => this.node({});
  createBufferSource = () => {
    this.sources += 1;
    return this.node({ playbackRate: 1 });
  };
  createBuffer = (channels: number, length: number) => ({
    getChannelData: (() => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return (c: number) => data[c];
    })(),
  });
}

function setup(over: Partial<InstrumentHost> = {}, loaded = samples.map((s) => s.file)) {
  const audio = new MiniAudio();
  const calls = { played: [] as Stroke[], vibrate: [] as [number, number | undefined][], holding: [] as number[], draws: 0 };
  const host: InstrumentHost = {
    audio: audio as unknown as AudioContext,
    audible: () => true,
    buffer: (file) => (loaded.includes(file) ? ({ duration: 3 } as AudioBuffer) : undefined),
    palette: () => ({
      rest: 'rgb(189, 188, 175)',
      played: 'rgb(227, 178, 148)',
      answer: 'rgb(140, 151, 133)',
      background: 'rgb(250, 247, 241)',
      detail: 'rgb(167, 168, 155)',
    }),
    shadow: () => null,
    tap: () => INSTRUMENT_TAP_DEFAULT,
    vibrate: (ms, ticks) => calls.vibrate.push([ms, ticks]),
    motion: () => null,
    joltsSince: () => [],
    played: (s) => calls.played.push(s),
    holding: (n) => calls.holding.push(n),
    requestDraw: () => {
      calls.draws += 1;
    },
    ...over,
  };
  const harpAdapter = createHarp(
    {
      id: 'harp',
      family: 'string',
      sound: harp.sound as unknown as Record<string, unknown>,
      answer: harp.answer as unknown as AnswerConfig,
      demo: harp.demo as unknown as Record<string, unknown>,
      samples,
    },
    host,
  );
  const box = { width: 390, height: 700, dpr: 2, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
  harpAdapter.layout(box);
  const xs = stringXs(box, sound.tuning.COUNT);
  return { harp: harpAdapter, audio, calls, xs, box };
}

const touch = (id: number, x: number, y: number, t: number): StagePointer => ({ id, x, y, t, type: 'touch' });

/** A 2D context that only counts what it is asked to do. */
function recorder() {
  const counts: Record<string, number> = {};
  const g = new Proxy(
    {},
    {
      get: (_, key) => () => {
        counts[String(key)] = (counts[String(key)] ?? 0) + 1;
      },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
  return { g, counts };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the adapter', () => {
  it('is the harp: seven degrees, low to high', () => {
    const { harp: h } = setup();
    expect(h.id).toBe('harp');
    expect(h.degrees).toBe(7);
  });

  it('the demo: string 2, sounding, no vibration, not heard as the person’s', () => {
    const { harp: h, audio, calls } = setup();
    expect(h.playDemo()).toEqual({ degree: 1 });
    expect(harp.demo.string).toBe(1);
    expect(audio.sources).toBe(1);
    expect(calls.played).toEqual([]);
    expect(calls.vibrate).toEqual([]);
    expect(calls.draws).toBeGreaterThan(0);
  });

  it('an answer note: sounds and hands back a voice to fade; no vibration, not heard', () => {
    const { harp: h, audio, calls } = setup();
    const voice = h.playAnswer({ degree: 5, velocity: 0.6, at: 0 });
    expect(voice).not.toBeNull();
    voice!.fade(0.15);
    expect(audio.sources).toBe(1);
    expect(calls.played).toEqual([]);
    expect(calls.vibrate).toEqual([]);
  });

  it('an answer outside the seven strings plays nothing', () => {
    const { harp: h, audio } = setup();
    for (const degree of [-1, 7, 2.5, Number.NaN]) expect(h.playAnswer({ degree, velocity: 0.6, at: 0 })).toBeNull();
    expect(audio.sources).toBe(0);
  });

  it('before audio is unlocked nothing sounds, but the string still swings', () => {
    const { harp: h, audio, calls } = setup({ audible: () => false });
    expect(h.playAnswer({ degree: 2, velocity: 0.6, at: 0 })).toBeNull();
    expect(audio.sources).toBe(0);
    expect(calls.draws).toBeGreaterThan(0);
  });

  it('a pull: holding reported, the step ticks, the release vibrates and is heard', () => {
    const { harp: h, calls, xs } = setup();
    h.pointerDown(touch(1, xs[3], 300, 0));
    expect(calls.holding).toEqual([1]);
    h.pointerMove(touch(1, xs[3] + 20, 300, 16));
    expect(calls.vibrate).toEqual([[sound.haptics.pullStep.ms, 1]]);
    h.pointerUp(touch(1, xs[3] + 20, 300, 30));
    expect(calls.holding).toEqual([1, 0]);
    const vel = strength(20, xs, sound.velocity.pull);
    expect(calls.played).toHaveLength(1);
    expect(calls.played[0]).toMatchObject({ degree: 3, velocity: vel });
    expect(calls.vibrate[1]).toEqual(pluckBuzz(vel, sound));
  });

  it('a strum: every string crossed is heard, in order', () => {
    const { harp: h, calls, xs } = setup();
    h.pointerDown(touch(1, xs[0] + 24, 300, 0));
    h.pointerMove(touch(1, xs[4] + 1, 300, 40));
    h.pointerUp(touch(1, xs[4] + 1, 300, 50));
    expect(calls.played.map((s) => s.degree)).toEqual([1, 2, 3, 4]);
  });

  it('keys 1–7 play the strings, low to high, once per press', () => {
    const { harp: h, calls } = setup();
    expect(h.keyDown('5', false)).toBe(true);
    expect(h.keyDown('5', false)).toBe(true); /* auto-repeat */
    h.keyUp('5');
    expect(h.keyDown('5', false)).toBe(true);
    expect(h.keyDown('1', false)).toBe(true);
    expect(h.keyDown('7', false)).toBe(true);
    expect(calls.played.map((s) => [s.degree, s.velocity])).toEqual([
      [4, harp.demo.velocity],
      [4, harp.demo.velocity],
      [0, harp.demo.velocity],
      [6, harp.demo.velocity],
    ]);
    for (const key of ['0', '8', '9', 's', 'Enter', ' ']) expect(h.keyDown(key, false)).toBe(false);
  });

  it('A is taken (the desktop strum), and strums the mouse’s hover', () => {
    const { harp: h, calls, xs } = setup();
    expect(h.keyDown('A', true)).toBe(true);
    const mouse = (x: number, t: number): StagePointer => ({ id: 1, x, y: 200, t, type: 'mouse' });
    h.pointerMove(mouse(5, 0));
    h.pointerMove(mouse(xs[2] + 1, 30));
    h.keyUp('A');
    h.pointerMove(mouse(xs[6] + 1, 60));
    expect(calls.played.map((s) => s.degree)).toEqual([0, 1, 2]);
  });

  it('draws seven strings, and asks for frames only while something moves', () => {
    const { harp: h } = setup();
    const { g, counts } = recorder();
    expect(h.draw(g, 0)).toBe(false); /* nothing moves yet */
    expect(counts.stroke).toBe(7);
    expect(counts.drawImage).toBeUndefined(); /* shadow() is null: no shadow */
    h.playDemo();
    expect(h.draw(g, performance.now())).toBe(true);
  });

  it('a shadow: one cross-section per string width and layer, painted once, a strip per still string', () => {
    const rows: { width: number }[] = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const c = {
          width: 0,
          height: 0,
          getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }),
        };
        rows.push(c);
        return c;
      },
    });
    const layers = instrumentShadowLayers(INSTRUMENT_SHADOW_DEFAULT);
    const { harp: h } = setup({ shadow: () => ({ layers, rgb: [40, 38, 30] }) });
    const { g, counts } = recorder();
    h.draw(g, 0);
    expect(layers.length).toBeGreaterThan(1);
    expect(rows).toHaveLength(7 * layers.length);
    expect(counts.drawImage).toBe(7 * layers.length);
    h.draw(g, 16);
    expect(rows).toHaveLength(7 * layers.length);
  });

  it('ready() waits for the samples — and not forever', async () => {
    await expect(setup().harp.ready()).resolves.toBeUndefined();

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const { harp: h } = setup({}, []);
    let done = false;
    void h.ready().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(600);
    expect(done).toBe(true);
  });

  it('dispose settles a ready() still waiting', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const { harp: h } = setup({}, []);
    let done = false;
    void h.ready().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(100);
    h.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it('dispose lets go of the chain', () => {
    vi.useFakeTimers();
    const { harp: h, audio } = setup();
    h.playDemo();
    h.dispose();
    vi.runAllTimers();
    expect(audio.disconnected).toBe(1);
  });
});

describe('input beyond the experiment', () => {
  it('two fingers on one string: each lets go without throwing (the experiment threw on the second)', () => {
    const xs = stringXs({ width: 390, inset: { top: 0, right: 0, bottom: 0, left: 0 } }, 7);
    const plucks: [number, number][] = [];
    const input = createHarpInput(sound, harp.demo, () => xs, {
      pluck: (i, vel) => plucks.push([i, vel]),
      hold: () => {},
      tick: () => {},
      holding: () => {},
    });
    input.down(touch(1, xs[3], 300, 0));
    input.down(touch(2, xs[3] + 2, 400, 5));
    input.move(touch(1, xs[3] + 10, 300, 10));
    input.up(touch(1, xs[3] + 10, 300, 20));
    /* Finger 2 never moved: the string is no longer held, so its own 0 px. */
    input.up(touch(2, xs[3] + 2, 400, 30));
    const pull = sound.velocity.pull;
    expect(plucks).toEqual([
      [3, strength(10, xs, pull)],
      [3, strength(0, xs, pull)],
    ]);
  });
});
