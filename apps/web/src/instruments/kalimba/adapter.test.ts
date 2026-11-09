/**
 * The adapter against the contract: what it tells the host, what it asks of
 * it, and what reaches the sound — with a fake host, a fake sound output and
 * a hand-wound clock.
 */
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_TAP_DEFAULT, instrumentTapAt, paintInstrumentTap } from '@musie/design-system';
import type { InstrumentTapParams } from '@musie/design-system';
import answer from '../../../../../supabase/content/instruments/answer.json';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import manifest from '../../../../../supabase/content/instruments/samples.json';
import type { AnswerConfig, InstrumentDefinition, InstrumentHost, InstrumentPalette, StageBox, Stroke } from '../types';
import { glowAt, glowMix, mixColour, parseColour } from './draw';
import { createKalimbaWith, READY } from './index';
import { KEY_POSITION } from './input';
import { bridgeY, layoutKalimba } from './geometry';
import type { KalimbaOutput, KalimbaSound, Membrane, Touch } from './sound';
import { pluckHaptic, positionFor, touchAt } from './sound';

const sound = kalimba.sound as unknown as KalimbaSound;
const definition: InstrumentDefinition = {
  id: 'kalimba',
  family: 'key',
  sound: kalimba.sound as unknown as Record<string, unknown>,
  answer: { ...answer, ...kalimba.answer } as unknown as AnswerConfig,
  demo: kalimba.demo,
  samples: manifest.samples
    .filter((s) => s.instrument === 'kalimba')
    .map(({ file, path, midi, layer, bytes, sha256 }) => ({ file, path, midi, layer, bytes, sha256 })),
};
const PALETTE: InstrumentPalette = {
  rest: 'rgb(100, 100, 100)', played: 'rgb(200, 100, 0)', answer: 'rgb(0, 150, 50)',
  background: 'rgb(250, 250, 240)', detail: 'rgb(120, 120, 110)',
};
const BOX: StageBox = { width: 390, height: 844, dpr: 2, inset: { top: 120, right: 0, bottom: 96, left: 0 } };
const L = layoutKalimba(BOX, sound.tines.map((t) => t.hz))!;
/** Where tine `i` is at position `pos`. */
const on = (i: number, pos: number) => ({ x: L.tines[i].cx, y: bridgeY(L, L.tines[i].cx) + pos * L.tines[i].len });

function setup() {
  let clock = 1000;
  const log = {
    played: [] as Stroke[],
    vibrate: [] as [number, number | undefined][],
    holding: [] as number[],
    draws: 0,
    plucks: [] as { tine: number; touch: Touch }[],
    membranes: [] as Membrane[],
    disposed: false,
  };
  const state = {
    audible: true,
    motion: null as { rotation: number; jolt: number; at: number } | null,
    canSound: true,
    sounding: 0,
    buffers: new Set<string>(),
    tap: INSTRUMENT_TAP_DEFAULT as InstrumentTapParams,
  };
  const voice = { fade: () => {} };
  const host: InstrumentHost = {
    audio: {} as AudioContext,
    audible: () => state.audible,
    buffer: (file) => (state.buffers.has(file) ? ({} as AudioBuffer) : undefined),
    palette: () => PALETTE,
    shadow: () => null,
    tap: () => state.tap,
    vibrate: (ms, ticks) => { log.vibrate.push([ms, ticks]); },
    motion: () => state.motion,
    joltsSince: () => [],
    played: (s) => { log.played.push(s); },
    holding: (n) => { log.holding.push(n); },
    requestDraw: () => { log.draws += 1; },
  };
  const output: KalimbaOutput = {
    canSound: () => state.canSound,
    pluck: (tine, touch) => { log.plucks.push({ tine, touch }); return voice; },
    membrane: (m) => { log.membranes.push(m); },
    sounding: () => state.sounding,
    dispose: () => { log.disposed = true; },
  };
  const timers: { ms: number; fn: () => void; live: boolean }[] = [];
  const adapter = createKalimbaWith(definition, host, {
    output,
    every: (ms, fn) => {
      const t = { ms, fn, live: true };
      timers.push(t);
      return () => { t.live = false; };
    },
    now: () => clock,
  });
  adapter.layout(BOX);
  /** One 30 ms swing step. */
  const step = () => {
    clock += 30;
    timers.filter((t) => t.ms === 30 && t.live).forEach((t) => t.fn());
  };
  const advance = (ms: number) => { clock += ms; };
  const poll = () => timers.filter((t) => t.ms === READY.pollMs && t.live).forEach((t) => t.fn());
  return { adapter, host, log, state, voice, timers, step, advance, poll, now: () => clock };
}

const pointer = (id: number, p: { x: number; y: number }) => ({ id, ...p, t: 0, type: 'touch' as const });

/** A 2D context that records the tines' colours and every disc it fills, whole. */
function canvas() {
  const strokes: string[] = [];
  const discs: { arc: number[]; alpha: number; stops: string[] }[] = [];
  let arc: number[] = [];
  let stops: string[] = [];
  const g = {
    setTransform() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    arc(...args: number[]) { arc = args; },
    fill() { discs.push({ arc, alpha: g.globalAlpha, stops }); },
    stroke() { strokes.push(String(g.strokeStyle)); },
    createRadialGradient() {
      stops = [];
      return { addColorStop: (_at: number, c: string) => { stops.push(c); } };
    },
    strokeStyle: '' as unknown, fillStyle: '' as unknown, lineWidth: 1, lineCap: '', lineJoin: '', globalAlpha: 1,
  };
  return { g: g as unknown as CanvasRenderingContext2D, strokes, discs };
}

describe('own notes', () => {
  it('report their degree in pitch order — the middle tine is degree 0, the left one degree 8', () => {
    const k = setup();
    k.adapter.pointerDown(pointer(1, on(4, 1)));
    k.adapter.pointerUp(pointer(1, on(4, 1)));
    k.adapter.pointerDown(pointer(2, on(0, 1)));
    expect(k.log.played.map((s) => s.degree)).toEqual([0, 8]);
    expect(k.log.played[0]).toMatchObject({ velocity: 1, at: 1000 });
    expect(k.log.plucks.map((p) => p.tine)).toEqual([4, 0]);
  });

  it('are as loud as where they were touched, and vibrate by the experiment’s formula', () => {
    const k = setup();
    k.adapter.pointerDown(pointer(1, on(6, 0.25)));
    const touch = touchAt(0.25, sound);
    expect(k.log.played[0].velocity).toBeCloseTo(touch.vel, 9);
    expect(k.log.plucks[0].touch.pos).toBeCloseTo(0.25, 9);
    const h = pluckHaptic(touch.vel, sound.haptics.pluck);
    expect(k.log.vibrate).toEqual([[h.ms, h.ticks]]);
  });

  it('a swipe plays each tine it crosses once', () => {
    const k = setup();
    k.adapter.pointerDown(pointer(1, on(2, 0.5)));
    k.adapter.pointerMove(pointer(1, { ...on(2, 0.6) }));
    k.adapter.pointerMove(pointer(1, on(3, 0.6)));
    k.adapter.pointerMove(pointer(1, on(4, 0.6)));
    k.adapter.pointerMove(pointer(1, on(4, 0.7)));
    expect(k.log.plucks.map((p) => p.tine)).toEqual([2, 3, 4]);
    k.adapter.pointerMove(pointer(9, on(5, 0.5))); // a pointer that never went down
    expect(k.log.plucks).toHaveLength(3);
  });

  it('a press outside the tines plays nothing but still holds, and slides onto a tine', () => {
    const k = setup();
    k.adapter.pointerDown(pointer(1, { x: 5, y: 5 }));
    expect(k.log.played).toHaveLength(0);
    expect(k.log.holding).toEqual([1]);
    k.adapter.pointerMove(pointer(1, on(1, 0.5)));
    expect(k.log.plucks.map((p) => p.tine)).toEqual([1]);
  });

  it('report the fingers down', () => {
    const k = setup();
    k.adapter.pointerDown(pointer(1, on(1, 0.5)));
    k.adapter.pointerDown(pointer(2, on(7, 0.5)));
    k.adapter.pointerUp(pointer(1, on(1, 0.5)));
    k.adapter.pointerUp(pointer(1, on(1, 0.5)));
    k.adapter.pointerUp(pointer(2, on(7, 0.5)));
    expect(k.log.holding).toEqual([1, 2, 1, 0]);
  });

  it('light the tine and leave a dot, in the played colour', () => {
    const k = setup();
    const draws = k.log.draws;
    k.adapter.pointerDown(pointer(1, on(4, 1)));
    expect(k.log.draws).toBeGreaterThan(draws);
    const c = canvas();
    expect(k.adapter.draw(c.g, k.now() + 16)).toBe(true);
    expect(c.strokes[4]).not.toBe(PALETTE.rest);
    expect(c.strokes[3]).toBe(PALETTE.rest);
    expect(c.discs).toHaveLength(1);
    expect(k.adapter.draw(canvas().g, k.now() + 6000)).toBe(false);
  });

  it('leave the design system’s tap, on the parameters host.tap() hands over, where and as hard as touched', () => {
    const k = setup();
    k.state.tap = { ...INSTRUMENT_TAP_DEFAULT, durationMs: 400, size: 10, start: 1, growthByStrength: 2, opacity: 0.6 };
    const t0 = k.now();
    k.adapter.pointerDown(pointer(1, on(6, 0.25)));
    k.adapter.keyDown('s', true); // a key is an own note too: tine 1, Shift — near the bridge
    const c = canvas();
    k.adapter.draw(c.g, t0 + 120);

    const want = canvas();
    for (const [tine, pos] of [[6, 0.25], [1, KEY_POSITION.shift]] as const) {
      const frame = instrumentTapAt(k.state.tap, { ageMs: 120, strength: touchAt(pos, sound).vel });
      const y = bridgeY(L, L.tines[tine].cx) + pos * L.tines[tine].len;
      paintInstrumentTap(want.g, L.tines[tine].cx, y, frame, parseColour(PALETTE.rest)!, parseColour(PALETTE.played)!);
    }
    expect(c.discs).toHaveLength(2);
    expect(c.discs[0].arc[0]).toBe(L.tines[6].cx);
    expect(c.discs[0].arc[1]).toBeCloseTo(on(6, 0.25).y, 9);
    expect(c.discs).toEqual(want.discs);

    const gone = canvas();
    k.adapter.draw(gone.g, t0 + 400); // host.tap().durationMs, not the experiment's 700
    expect(gone.discs).toEqual([]);
  });
});

describe('before audio is unlocked', () => {
  it('a touch is kept and sounds once audio runs, within 700 ms', () => {
    const k = setup();
    k.state.audible = false;
    k.adapter.pointerDown(pointer(1, on(5, 1)));
    expect(k.log.plucks).toHaveLength(0);
    expect(k.log.played).toHaveLength(1); // the engine hears it at once
    k.step();
    expect(k.log.plucks).toHaveLength(0);
    k.state.audible = true;
    k.step();
    k.step();
    expect(k.log.plucks.map((p) => p.tine)).toEqual([5]);
    expect(k.log.vibrate).toHaveLength(1); // not again when it sounds
  });

  it('and is dropped after 700 ms', () => {
    const k = setup();
    k.state.audible = false;
    k.adapter.pointerDown(pointer(1, on(5, 1)));
    k.advance(sound.pendingMs);
    k.state.audible = true;
    k.step();
    expect(k.log.plucks).toHaveLength(0);
  });

  it('nothing is kept while the recordings are not decoded', () => {
    const k = setup();
    k.state.audible = false;
    k.state.canSound = false;
    k.adapter.pointerDown(pointer(1, on(5, 1)));
    k.state.audible = true;
    k.state.canSound = true;
    k.step();
    expect(k.log.plucks).toHaveLength(0);
  });
});

describe('the answer', () => {
  it('has nine degrees', () => {
    expect(setup().adapter.degrees).toBe(9);
  });

  it('sounds the degree’s tine at the stroke’s velocity — no vibration, no `played`', () => {
    const k = setup();
    const v = k.adapter.playAnswer({ degree: 0, velocity: 0.7, at: 0 });
    k.adapter.playAnswer({ degree: 8, velocity: 1, at: 0 });
    k.adapter.playAnswer({ degree: 2, velocity: 0.2, at: 0 });
    expect(v).toBe(k.voice);
    expect(k.log.plucks.map((p) => p.tine)).toEqual([4, 0, 3]);
    expect(k.log.plucks[0].touch.vel).toBeCloseTo(0.7, 9);
    expect(k.log.plucks[0].touch.pos).toBeCloseTo(positionFor(0.7, sound), 9);
    expect(k.log.plucks[2].touch.pos).toBe(0); // softer than the bridge: at the bridge
    expect(k.log.vibrate).toEqual([]);
    expect(k.log.played).toEqual([]);
  });

  it('nothing for a degree the kalimba does not have', () => {
    const k = setup();
    expect(k.adapter.playAnswer({ degree: 9, velocity: 1, at: 0 })).toBeNull();
    expect(k.log.plucks).toEqual([]);
  });

  it('lights its tine in the answer colour — and leaves no dot', () => {
    const k = setup();
    k.adapter.playAnswer({ degree: 0, velocity: 1, at: 0 });
    k.adapter.playAnswer({ degree: 5, velocity: 0.6, at: 0 });
    const c = canvas();
    expect(k.adapter.draw(c.g, k.now() + 16)).toBe(true);
    expect(c.strokes[4]).toBe('rgb(0,150,50)');
    expect(c.discs).toEqual([]);
  });

  it('is silent, not queued, before audio runs', () => {
    const k = setup();
    k.state.audible = false;
    expect(k.adapter.playAnswer({ degree: 0, velocity: 1, at: 0 })).toBeNull();
    k.state.audible = true;
    k.step();
    expect(k.log.plucks).toEqual([]);
  });
});

describe('the demo', () => {
  it('one note on the middle tine at its tip: degree 0, no vibration, no `played`', () => {
    const k = setup();
    expect(k.adapter.playDemo()).toEqual({ degree: 0 });
    expect(k.log.plucks).toHaveLength(1);
    expect(k.log.plucks[0]).toMatchObject({ tine: kalimba.demo.tine, touch: { pos: kalimba.demo.position, vel: 1 } });
    expect(k.log.vibrate).toEqual([]);
    expect(k.log.played).toEqual([]);
  });

  it('lights its tine in the played colour, so the person sees where to touch — and leaves no dot', () => {
    const k = setup();
    k.adapter.playDemo();
    const c = canvas();
    expect(k.adapter.draw(c.g, k.now() + 16)).toBe(true);
    const vel = touchAt(kalimba.demo.position, sound).vel;
    expect(c.strokes[kalimba.demo.tine]).toBe(mixColour(PALETTE.rest, PALETTE.played, glowMix(glowAt(16, vel))!));
    expect(c.discs).toEqual([]);
  });
});

describe('keys', () => {
  it('A to L play the tines left to right; Shift strikes near the bridge; a held key plays once', () => {
    const k = setup();
    expect(k.adapter.keyDown('a', false)).toBe(true);
    expect(k.adapter.keyDown('a', false)).toBe(true);
    k.adapter.keyUp('a');
    expect(k.adapter.keyDown('G', true)).toBe(true);
    expect(k.adapter.keyDown('x', false)).toBe(false);
    expect(k.log.plucks.map((p) => [p.tine, p.touch.pos])).toEqual([[0, 1], [4, 0.15]]);
    expect(k.log.played.map((s) => s.degree)).toEqual([8, 0]);
  });

  it('V held swings the kalimba, and letting go lets it settle', () => {
    const k = setup();
    expect(k.adapter.keyDown('v', false)).toBe(true);
    for (let i = 0; i < 20; i += 1) k.step();
    expect(k.log.membranes.at(-1)!.openMix).toBeGreaterThan(0.9);
    k.adapter.keyUp('V');
    for (let i = 0; i < 300; i += 1) k.step();
    expect(k.log.membranes.at(-1)!.openMix).toBe(0);
  });
});

describe('the swing', () => {
  it('reads the host’s motion and vibrates on Android every 140 ms at most, asking no iOS tick', () => {
    const k = setup();
    k.state.motion = { rotation: 1, jolt: 0, at: 1 };
    k.state.sounding = 1;
    k.step();
    k.step();
    k.step();
    expect(k.log.membranes.at(-1)!.tremolo).toBeGreaterThan(0);
    expect(k.log.vibrate).toHaveLength(1);
    expect(k.log.vibrate[0][1]).toBe(0);
    for (let i = 0; i < 4; i += 1) k.step();
    expect(k.log.vibrate).toHaveLength(2);
  });

  it('without a sensor the membrane stays closed and nothing vibrates', () => {
    const k = setup();
    for (let i = 0; i < 10; i += 1) k.step();
    expect(k.log.membranes).toHaveLength(10);
    expect(k.log.membranes.every((m) => m.openMix === 0 && m.tremolo === 0)).toBe(true);
    expect(k.log.vibrate).toEqual([]);
  });
});

describe('ready', () => {
  const needed = ['A3', 'B4', 'A4', 'E4', 'C4', 'E5'].flatMap((n) => [`closed-${n}.mp3`, `open-${n}.mp3`]);

  it('resolves once every recording the tines play is decoded', async () => {
    const k = setup();
    let done = false;
    const ready = k.adapter.ready().then(() => { done = true; });
    k.poll();
    await Promise.resolve();
    expect(done).toBe(false);
    needed.forEach((f) => k.state.buffers.add(f));
    k.poll();
    await ready;
    expect(done).toBe(true);
  });

  it('says which recordings never arrived', async () => {
    const k = setup();
    needed.slice(1).forEach((f) => k.state.buffers.add(f));
    const ready = k.adapter.ready();
    k.advance(READY.timeoutMs + 1);
    k.poll();
    await expect(ready).rejects.toThrow('closed-A3.mp3');
  });

  it('refuses at once when the definition lists no row for a recording', async () => {
    const k = setup();
    const bare = createKalimbaWith({ ...definition, samples: [] }, k.host, {
      output: { canSound: () => false, pluck: () => null, membrane() {}, sounding: () => 0, dispose() {} },
      every: () => () => {},
      now: () => 0,
    });
    await expect(bare.ready()).rejects.toThrow('no sample row');
  });
});

describe('dispose', () => {
  it('stops the swing step and the sound, and ignores what comes after', () => {
    const k = setup();
    k.adapter.dispose();
    expect(k.log.disposed).toBe(true);
    expect(k.timers.filter((t) => t.ms === 30).every((t) => !t.live)).toBe(true);
    k.adapter.pointerDown(pointer(1, on(4, 1)));
    expect(k.adapter.keyDown('a', false)).toBe(false);
    expect(k.adapter.playAnswer({ degree: 0, velocity: 1, at: 0 })).toBeNull();
    expect(k.log.played).toEqual([]);
    expect(k.log.plucks).toEqual([]);
  });
});
