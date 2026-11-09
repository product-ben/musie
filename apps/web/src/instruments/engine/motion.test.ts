/**
 * The motion sensor: its permission as the intro step shows it, and its
 * readings as the kalimba and the marimba read them.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMotionSensor } from './motion';
import type { MotionEnv, MotionSample } from './motion';

function env(overrides: Partial<MotionEnv> = {}) {
  let emit: ((s: MotionSample) => void) | null = null;
  let store: string | null = null;
  const listen = vi.fn((fn: (s: MotionSample) => void) => {
    emit = fn;
    return () => {
      emit = null;
    };
  });
  const e: MotionEnv = {
    available: true,
    requestPermission: null,
    query: null,
    listen,
    storage: { get: () => store, set: (v) => { store = v; } },
    ...overrides,
  };
  return {
    env: e,
    listen,
    stored: () => store,
    setStored: (v: string) => { store = v; },
    emit: (s: MotionSample) => emit?.(s),
    listening: () => emit !== null,
  };
}

const sample = (at: number, acc: [number, number, number] | null, rot: [number, number, number] | null = null): MotionSample => ({
  at,
  acceleration: acc && { x: acc[0], y: acc[1], z: acc[2] },
  rotationRate: rot && { alpha: rot[0], beta: rot[1], gamma: rot[2] },
});

describe('motion permission', () => {
  it('is unavailable without DeviceMotionEvent', () => {
    const m = createMotionSensor(env({ available: false }).env);
    expect(m.permission()).toBe('unavailable');
    expect(m.reading()).toBeNull();
  });

  it('Safari: prompt until asked; the answer is remembered on the device', async () => {
    const e = env({ requestPermission: () => Promise.resolve('granted') });
    const m = createMotionSensor(e.env);
    expect(m.permission()).toBe('prompt');
    const seen = vi.fn();
    m.subscribe(seen);
    await expect(m.ask()).resolves.toBe('granted');
    expect(seen).toHaveBeenCalledWith('granted');
    expect(e.stored()).toBe('granted');
    expect(createMotionSensor(e.env).permission()).toBe('granted');
  });

  it('Safari: a refusal is shown and remembered', async () => {
    const e = env({ requestPermission: () => Promise.resolve('denied') });
    const m = createMotionSensor(e.env);
    await expect(m.ask()).resolves.toBe('denied');
    expect(createMotionSensor(e.env).permission()).toBe('denied');
  });

  it('Safari: asked outside a gesture, nothing is decided', async () => {
    const m = createMotionSensor(env({ requestPermission: () => Promise.reject(new Error('NotAllowedError')) }).env);
    await expect(m.ask()).resolves.toBe('prompt');
  });

  it('arriving data counts as granted, whatever was stored', () => {
    const e = env({ requestPermission: () => Promise.resolve('denied') });
    e.setStored('denied');
    const m = createMotionSensor(e.env);
    m.listen();
    e.emit(sample(10, [0.1, 0.2, 0.3]));
    expect(m.permission()).toBe('granted');
    expect(e.stored()).toBe('granted');
  });

  it('Safari forgot the grant: a gesture asks again, silently', () => {
    const request = vi.fn(() => Promise.resolve('granted'));
    const e = env({ requestPermission: request });
    e.setStored('granted');
    const m = createMotionSensor(e.env);
    m.listen();
    m.rearm();
    expect(request).toHaveBeenCalledTimes(1);
    e.emit(sample(10, [0, 0, 1]));
    m.rearm();
    expect(request).toHaveBeenCalledTimes(1); // data flows: nothing to ask
  });

  it('elsewhere: nothing to ask — data means granted, none means unavailable', async () => {
    const e = env();
    const m = createMotionSensor(e.env);
    expect(m.permission()).toBe('unavailable');
    await expect(m.ask()).resolves.toBe('unavailable');
    m.listen();
    e.emit(sample(5, null, null)); // a desktop's empty event
    expect(m.permission()).toBe('unavailable');
    e.emit(sample(10, [0, 0, 0.5]));
    expect(m.permission()).toBe('granted');
  });

  it('elsewhere: a site setting that blocks the sensor shows as denied', async () => {
    const m = createMotionSensor(env({ query: () => Promise.resolve('denied') }).env);
    await Promise.resolve();
    await Promise.resolve();
    expect(m.permission()).toBe('denied');
  });

  it('listens only while somebody needs it', () => {
    const e = env();
    const m = createMotionSensor(e.env);
    const a = m.listen();
    const b = m.listen();
    expect(e.listen).toHaveBeenCalledTimes(1);
    a();
    a();
    expect(e.listening()).toBe(true);
    b();
    expect(e.listening()).toBe(false);
  });
});

describe('motion readings', () => {
  function granted() {
    const e = env();
    const m = createMotionSensor(e.env);
    m.listen();
    return { e, m };
  }

  it('rotation is the kalimba’s: the fastest rate ÷ 110, clamped', () => {
    const { e, m } = granted();
    e.emit(sample(10, [0, 0, 0], [-55, 20, 10]));
    expect(m.reading()?.rotation).toBeCloseTo(0.5);
    e.emit(sample(20, [0, 0, 0], [300, 0, 0]));
    expect(m.reading()?.rotation).toBe(1);
  });

  it('rotation is the largest since the previous read, as the kalimba kept it between its steps', () => {
    const { e, m } = granted();
    e.emit(sample(10, [0, 0, 0], [33, 0, 0]));
    e.emit(sample(20, [0, 0, 0], [88, 0, 0]));
    e.emit(sample(30, [0, 0, 0], [11, 0, 0]));
    expect(m.reading()).toEqual({ rotation: 0.8, jolt: 0, at: 30 });
    e.emit(sample(40, [0, 0, 0], [22, 0, 0]));
    expect(m.reading()?.rotation).toBeCloseTo(0.2); // the peak was handed over: a new window
    expect(m.reading()?.rotation).toBeCloseTo(0.2); // nothing new: the last one again, not a false 0
  });

  it('without a gyroscope, rotation falls back to acceleration ÷ 6; jolt is the raw magnitude', () => {
    const { e, m } = granted();
    e.emit(sample(10, [3, 0, 4], null));
    expect(m.reading()).toEqual({ rotation: 5 / 6, jolt: 5, at: 10 });
  });

  it('keeps one second of jolts, raw, for the marimba’s strike', () => {
    const { e, m } = granted();
    e.emit(sample(0, [0.3, 0.4, 0]));
    e.emit(sample(600, [1, 0, 0]));
    e.emit(sample(1200, [0, 2, 0]));
    expect(m.joltsSince(0)).toEqual([{ at: 600, magnitude: 1 }, { at: 1200, magnitude: 2 }]); // 0 fell out of the second
    expect(m.joltsSince(1000)).toEqual([{ at: 1200, magnitude: 2 }]);
  });

  it('reads nothing without permission', () => {
    const e = env({ requestPermission: () => Promise.resolve('granted') });
    const m = createMotionSensor(e.env);
    expect(m.reading()).toBeNull();
    expect(m.joltsSince(0)).toEqual([]);
  });
});
