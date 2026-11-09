import { INSTRUMENT_TAP_DEFAULT } from '@musie/design-system';
/**
 * The wiring: what `host.played`, `host.holding`, the demo, Weiter and the
 * finger lifting set in motion — with every browser part faked (node, no DOM).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { PlayMode } from '../../lib/content';
import type { AnswerConfig, InstrumentAdapter, InstrumentDefinition, InstrumentHost, Stroke, Voice } from '../types';
import type { EngineAudio } from './audio';
import { createInstrumentSession } from './host';
import type { SessionEnv } from './host';
import { createMotionSensor } from './motion';
import type { MotionSample } from './motion';
import { fakeTime, seeded } from './testing';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const json = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Record<string, unknown>;
const answer = {
  ...json('supabase/content/instruments/answer.json'),
  ...(json('supabase/content/instruments/harp.json').answer as Record<string, unknown>),
} as unknown as AnswerConfig;

const definition: InstrumentDefinition = {
  id: 'harp',
  family: 'string',
  sound: {},
  answer,
  demo: { string: 1, velocity: 0.6 },
  samples: [{ file: 'C3.m4a', path: '/instruments/harp/C3.m4a', midi: 48, layer: 'aufnahme', bytes: 1, sha256: '' }],
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(opts: { mode?: PlayMode; vibration?: boolean; motion?: boolean; audible?: boolean; tick?: boolean } = {}) {
  const time = fakeTime();
  let mode: PlayMode = opts.mode ?? 'with_musie';
  let vibration = opts.vibration ?? true;
  let audible = opts.audible ?? true;
  const frames: ((now: number) => void)[] = [];
  const tick = vi.fn();
  const decodedBuffer = { duration: 1 } as unknown as AudioBuffer;
  const audio: EngineAudio = {
    context: {} as AudioContext,
    audible: () => audible,
    unlockNow: vi.fn(),
    load: () => Promise.resolve(),
    decoded: (path) => (path === '/instruments/harp/C3.m4a' ? decodedBuffer : undefined),
    dispose: vi.fn(),
  };
  let emitMotion: (s: MotionSample) => void = () => {};
  const motion = createMotionSensor({
    available: true,
    requestPermission: null,
    query: null,
    listen: (fn) => {
      emitMotion = fn;
      return () => {
        emitMotion = () => {};
      };
    },
    storage: { get: () => null, set: () => {} },
  });
  const paletteDispose = vi.fn();
  const env: SessionEnv = {
    now: time.now,
    timers: time.timers,
    random: seeded(5),
    requestFrame: (fn) => frames.push(fn),
    cancelFrame: () => {},
    audio: () => audio,
    motion: () => motion,
    vibration: (timers) => ({ vibrate: null, hasSwitch: true, tick, timers }),
    watchPalette: () => ({
      palette: () => ({ rest: 'r', played: 'p', answer: 'a', background: 'b', detail: 'd' }),
      shadow: () => null,
      tap: () => INSTRUMENT_TAP_DEFAULT,
      dispose: paletteDispose,
    }),
  };

  let host: InstrumentHost | null = null;
  const answered: Stroke[] = [];
  const voices: { fade: ReturnType<typeof vi.fn> }[] = [];
  let drawsLeft = 2;
  const adapter = {
    id: 'harp',
    degrees: 7,
    ready: vi.fn(() => Promise.resolve()),
    layout: vi.fn(),
    draw: vi.fn(() => drawsLeft-- > 0),
    pointerDown: vi.fn(),
    pointerMove: vi.fn(),
    pointerUp: vi.fn(),
    keyDown: vi.fn(() => false),
    keyUp: vi.fn(),
    playAnswer: vi.fn((stroke: Stroke) => {
      answered.push(stroke);
      const voice = { fade: vi.fn() };
      voices.push(voice);
      return voice as Voice;
    }),
    playDemo: vi.fn(() => ({ degree: 1 })),
    dispose: vi.fn(),
    ...(opts.tick ? { tick: vi.fn() } : {}),
  } satisfies InstrumentAdapter;

  const scope = new EventTarget() as unknown as HTMLElement;
  const canvas = { width: 0, height: 0, getContext: () => ({}) } as unknown as HTMLCanvasElement;
  const onClock = vi.fn();
  const onDemo = vi.fn();
  const onAnswered = vi.fn();
  const session = createInstrumentSession(
    {
      definition,
      factory: (_d, h) => {
        host = h;
        return adapter;
      },
      scope,
      canvas,
      durationSeconds: 90,
      getMode: () => mode,
      getVibration: () => vibration,
      ...(opts.motion === undefined ? {} : { getMotion: () => opts.motion === true }),
      onClock,
      onDemo,
      onAnswered,
    },
    env,
  );
  if (host === null) throw new Error('the factory was not called');
  const theHost: InstrumentHost = host;
  /** The person plays `degrees`, `gap` ms apart. */
  const play = (degrees: number[], gap = 300) =>
    degrees.forEach((degree, k) => {
      if (k > 0) time.advance(gap);
      theHost.played({ degree, velocity: 0.6, at: time.now() });
    });
  const runFrames = () => {
    while (frames.length) frames.shift()?.(time.now());
  };
  return {
    time, session, host: theHost, adapter, answered, voices, scope, canvas, tick, onClock, onDemo, onAnswered, play,
    runFrames, frames, motion, emitMotion: (s: MotionSample) => emitMotion(s), paletteDispose, decodedBuffer,
    setMode: (m: PlayMode) => { mode = m; },
    setVibration: (v: boolean) => { vibration = v; },
    setAudible: (v: boolean) => { audible = v; },
  };
}

describe('the demo', () => {
  it('sounds once, starts no clock, and leads to no answer', async () => {
    const s = setup();
    await settle();
    s.session.startOnboarding();
    s.time.advance(100);
    expect(s.adapter.playDemo).toHaveBeenCalledTimes(1);
    expect(s.onDemo).toHaveBeenCalledWith({ degree: 1 });
    s.time.advance(60_000);
    expect(s.session.clock.state().phase).toBe('unstarted');
    expect(s.adapter.playAnswer).not.toHaveBeenCalled();
    expect(s.session.playSecondsAt(s.time.now())).toBe(0);
  });

  it('an own note before it sounded cancels it at once', async () => {
    const s = setup({ audible: false });
    await settle();
    s.session.startOnboarding();
    s.time.advance(200);
    s.play([3]);
    s.time.advance(5000);
    expect(s.adapter.playDemo).not.toHaveBeenCalled();
  });

  it('a finger coming down cancels it too, as does any touch on the stage', async () => {
    const a = setup({ audible: false });
    await settle();
    a.session.startOnboarding();
    a.host.holding(1);
    a.time.advance(5000);
    expect(a.adapter.playDemo).not.toHaveBeenCalled();

    const b = setup({ audible: false });
    await settle();
    b.session.startOnboarding();
    b.session.touched();
    b.time.advance(5000);
    expect(b.adapter.playDemo).not.toHaveBeenCalled();
  });
});

describe('played()', () => {
  it('the first own note starts the clock and the play time', () => {
    const s = setup();
    s.time.advance(4000);
    const at = s.time.now();
    s.play([2]);
    expect(s.session.clock.state().phase).toBe('running');
    expect(s.session.clock.state().firstOwnAt).toBe(at);
    expect(s.onClock).toHaveBeenCalledWith(expect.objectContaining({ phase: 'running' }));
  });

  it('with Musie, a pause brings an answer through playAnswer — never through played', () => {
    const s = setup();
    s.play([1, 3, 2, 4]);
    s.time.advance(1800);
    expect(s.onAnswered).toHaveBeenCalledTimes(1);
    s.time.advance(10_000);
    expect(s.answered.length).toBeGreaterThanOrEqual(1);
    expect(s.session.clock.state().firstOwnAt).toBe(1000); // answer notes are not own notes
  });

  it('solo never answers', () => {
    const s = setup({ mode: 'solo' });
    s.play([1, 3, 2, 4]);
    s.time.advance(90_000);
    expect(s.adapter.playAnswer).not.toHaveBeenCalled();
    expect(s.session.clock.state().phase).toBe('expired'); // the clock ran all the same
  });

  it('a note or a finger coming down interrupts the answer, which fades', () => {
    const s = setup();
    s.play([1, 3, 2, 4, 6, 5, 4, 3], 400);
    s.time.advance(1800);
    expect(s.answered.length).toBe(1);
    s.host.holding(1);
    expect(s.voices[0].fade).toHaveBeenCalledWith(answer.interruptFadeTau);
    s.time.advance(1000);
    expect(s.answered.length).toBe(1);
  });

  it('switching to solo and quieting drops the pending answer', () => {
    const s = setup();
    s.play([1, 3, 2]);
    s.setMode('solo');
    s.session.quiet();
    s.time.advance(60_000);
    expect(s.adapter.playAnswer).not.toHaveBeenCalled();
  });
});

describe('the clock in the session', () => {
  it('ticks to 0:00 by itself, and own notes after that do not restart it', () => {
    const s = setup({ mode: 'solo' });
    s.play([1]);
    s.time.advance(89_999);
    expect(s.session.clock.state().phase).toBe('running');
    s.time.advance(1);
    expect(s.session.clock.state().phase).toBe('expired');
    s.play([2]);
    expect(s.session.clock.state().phase).toBe('expired');
    expect(s.time.pending()).toBe(0);
  });

  it('pause, then an own note resumes; subscribers hear every change', () => {
    const s = setup({ mode: 'solo' });
    const seen: string[] = [];
    s.session.clock.subscribe((state) => seen.push(state.phase));
    s.play([1]);
    s.session.clock.dispatch({ type: 'TOGGLE', at: s.time.now() });
    s.time.advance(10_000);
    s.play([2]);
    expect(seen).toEqual(['running', 'paused', 'running']);
  });

  it('Weiter stops the conversation and freezes the play time', () => {
    const s = setup();
    s.play([1, 3, 2, 4]);
    s.time.advance(1000);
    s.session.clock.dispatch({ type: 'CONTINUE', at: s.time.now() });
    s.time.advance(60_000);
    expect(s.adapter.playAnswer).not.toHaveBeenCalled();
    expect(s.session.playSecondsAt(s.time.now())).toBe(2); // 3 × 300 ms + 1000 ms, rounded
  });
});

describe('the rest of the host', () => {
  it('vibrates on the next touchend (iPhone), and not with the switch off', () => {
    const s = setup();
    s.host.vibrate(40, 0); // Android only: the iPhone is owed nothing
    s.scope.dispatchEvent(new Event('touchend'));
    expect(s.tick).not.toHaveBeenCalled();
    s.host.vibrate(40);
    expect(s.tick).not.toHaveBeenCalled();
    s.scope.dispatchEvent(new Event('touchend'));
    expect(s.tick).toHaveBeenCalledTimes(1);
    s.setVibration(false);
    s.host.vibrate(40, 1);
    s.scope.dispatchEvent(new Event('touchend'));
    expect(s.tick).toHaveBeenCalledTimes(1);
  });

  it('draws after the first layout, until draw says nothing moves', () => {
    const s = setup();
    s.host.requestDraw();
    expect(s.frames).toHaveLength(0); // no layout yet
    s.session.layout({ width: 320, height: 200, dpr: 2, inset: { top: 0, right: 0, bottom: 0, left: 0 } });
    expect(s.canvas.width).toBe(0); // the stage sizes the canvas, not the engine
    expect(s.adapter.layout).toHaveBeenCalledTimes(1);
    s.runFrames();
    expect(s.adapter.draw).toHaveBeenCalledTimes(3); // true, true, false
  });

  it('hands out samples by file, the palette, and motion', () => {
    const s = setup();
    expect(s.host.buffer('C3.m4a')).toBe(s.decodedBuffer);
    expect(s.host.buffer('nope.m4a')).toBeUndefined();
    expect(s.host.palette().rest).toBe('r');
    expect(s.host.shadow()).toBeNull();
    expect(s.host.motion()).toBeNull();
    s.emitMotion({ at: 5, acceleration: { x: 0, y: 3, z: 0 }, rotationRate: { alpha: 11, beta: 0, gamma: 0 } });
    expect(s.host.motion()).toEqual({ rotation: 0.1, jolt: 3, at: 5 });
    expect(s.host.joltsSince(0)).toEqual([{ at: 5, magnitude: 3 }]);
  });

  it('with the motion switch off, the sensor is not listened to and reads as absent', () => {
    const s = setup({ motion: false });
    s.emitMotion({ at: 5, acceleration: { x: 0, y: 3, z: 0 }, rotationRate: { alpha: 11, beta: 0, gamma: 0 } });
    expect(s.motion.reading()).toBeNull();
    expect(s.host.motion()).toBeNull();
    expect(s.host.joltsSince(0)).toEqual([]);
  });

  it('ticks the adapter every 100 ms when it wants that', () => {
    const s = setup({ tick: true });
    s.time.advance(1000);
    expect((s.adapter as unknown as { tick: ReturnType<typeof vi.fn> }).tick).toHaveBeenCalledTimes(10);
  });

  it('dispose lets go of everything', () => {
    const s = setup({ tick: true });
    s.play([1, 2, 3]);
    s.host.vibrate(30);
    s.session.dispose();
    expect(s.adapter.dispose).toHaveBeenCalledTimes(1);
    expect(s.paletteDispose).toHaveBeenCalledTimes(1);
    expect(s.time.pending()).toBe(0);
    s.scope.dispatchEvent(new Event('touchend'));
    expect(s.tick).not.toHaveBeenCalled();
    s.play([4]);
    s.time.advance(60_000);
    expect(s.adapter.playAnswer).not.toHaveBeenCalled();
    s.session.dispose();
    expect(s.adapter.dispose).toHaveBeenCalledTimes(1);
  });
});
