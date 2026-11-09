/**
 * The unlock the experiments do, and samples fetched once per path.
 */
import { describe, expect, it, vi } from 'vitest';
import type { InstrumentSample } from '../types';
import { createEngineAudio, UNLOCK_EVENTS } from './audio';
import type { AudioEnv } from './audio';

function fakeContext() {
  let state: AudioContextState = 'suspended';
  let resolveResume = () => {};
  const silent = { buffer: null as unknown, connect: vi.fn(), start: vi.fn() };
  const ctx = {
    get state() {
      return state;
    },
    destination: {},
    resume: vi.fn(() => new Promise<void>((r) => { resolveResume = () => { state = 'running'; r(); }; })),
    createBufferSource: vi.fn(() => silent),
    createBuffer: vi.fn((channels: number, length: number, rate: number) => ({ channels, length, rate })),
    decodeAudioData: vi.fn((bytes: ArrayBuffer) => Promise.resolve({ decodedFrom: bytes.byteLength })),
  };
  return { ctx, silent, finishResume: () => resolveResume() };
}

function setup() {
  const f = fakeContext();
  const target = new EventTarget();
  const session = { type: 'auto' };
  const fetched: string[] = [];
  const env: AudioEnv = {
    createContext: () => f.ctx as unknown as AudioContext,
    audioSession: session,
    target,
    fetch: (path) => {
      fetched.push(path);
      return path.endsWith('missing.m4a') ? Promise.reject(new Error(`${path}: 404`)) : Promise.resolve(new ArrayBuffer(path.length));
    },
  };
  return { ...f, target, session, fetched, audio: createEngineAudio(env) };
}

const sample = (file: string): InstrumentSample => ({ file, path: `/instruments/harp/${file}`, midi: 60, layer: 'aufnahme', bytes: 1, sha256: '' });

describe('engine audio', () => {
  it('asks for playback, so the silent switch does not mute it', () => {
    expect(setup().session.type).toBe('playback');
  });

  it('a gesture resumes the context and plays one silent sample; audible while that resolves', async () => {
    const s = setup();
    expect(s.audio.audible()).toBe(false);
    s.target.dispatchEvent(new Event('touchend'));
    expect(s.ctx.resume).toHaveBeenCalledTimes(1);
    expect(s.ctx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
    expect(s.silent.start).toHaveBeenCalledWith(0);
    expect(s.audio.audible()).toBe(true); // unlocking
    s.finishResume();
    await Promise.resolve();
    expect(s.audio.audible()).toBe(true); // running
    s.target.dispatchEvent(new Event('click'));
    expect(s.ctx.resume).toHaveBeenCalledTimes(1); // running: nothing to do
  });

  it('listens to the experiments’ five gestures, and lets go on dispose', () => {
    const s = setup();
    for (const type of UNLOCK_EVENTS) s.target.dispatchEvent(new Event(type));
    expect(s.ctx.resume).toHaveBeenCalledTimes(5);
    s.audio.dispose();
    s.target.dispatchEvent(new Event('keydown'));
    expect(s.ctx.resume).toHaveBeenCalledTimes(5);
  });

  it('unlockNow does the same from a click handler', () => {
    const s = setup();
    s.audio.unlockNow();
    expect(s.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('fetches and decodes each path once', async () => {
    const s = setup();
    await s.audio.load([sample('C3.m4a'), sample('E3.m4a')]);
    await s.audio.load([sample('C3.m4a')]);
    expect(s.fetched).toEqual(['/instruments/harp/C3.m4a', '/instruments/harp/E3.m4a']);
    expect(s.audio.decoded('/instruments/harp/C3.m4a')).toBeDefined();
    expect(s.audio.decoded('/instruments/harp/G3.m4a')).toBeUndefined();
  });

  it('a failed sample rejects the load and is tried again next time', async () => {
    const s = setup();
    await expect(s.audio.load([sample('missing.m4a')])).rejects.toThrow('404');
    await expect(s.audio.load([sample('missing.m4a')])).rejects.toThrow('404');
    expect(s.fetched).toHaveLength(2);
  });
});
