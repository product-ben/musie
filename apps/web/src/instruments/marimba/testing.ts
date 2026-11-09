/**
 * Test support for the marimba's `*.test.ts` — imported by tests only, never
 * by the adapter. Not a `.test.ts` itself so vitest does not collect it; it
 * stays free of Node APIs because the app's typecheck sees it too.
 *
 * The definition is the LOCKED config and the sample manifest, the two files
 * the migration is written from — so the tests play exactly what the database
 * will hand the adapter.
 */
import { INSTRUMENT_TAP_DEFAULT } from '@musie/design-system';
import type { InstrumentTapParams } from '@musie/design-system';
import marimbaJson from '../../../../../supabase/content/instruments/marimba.json';
import samplesJson from '../../../../../supabase/content/instruments/samples.json';
import type {
  AnswerConfig, InstrumentDefinition, InstrumentHost, InstrumentPalette, Stroke,
} from '../types';
import type { MarimbaEnv } from './index';

export function loadMarimba(): { definition: InstrumentDefinition } {
  const samples = samplesJson.samples
    .filter((s) => s.instrument === 'marimba')
    .map(({ file, path, midi, layer, bytes, sha256 }) => ({ file, path, midi, layer, bytes, sha256 }));
  return {
    definition: {
      id: 'marimba',
      family: 'key',
      sound: structuredClone(marimbaJson.sound) as unknown as Record<string, unknown>,
      answer: marimbaJson.answer as unknown as AnswerConfig,
      demo: { ...marimbaJson.demo },
      samples,
    },
  };
}

/** mulberry32: a small seeded PRNG, so random inputs are the same every run. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── a fake AudioContext: just enough nodes, recording what was scheduled ── */

export class FakeParam {
  calls: (string | number)[][] = [];
  constructor(public value = 0) {}
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; return this; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['ramp', v, t]); return this; }
  setTargetAtTime(v: number, t: number, tau: number) { this.calls.push(['target', v, t, tau]); return this; }
  cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); return this; }
}

export class FakeNode {
  out: unknown[] = [];
  connect<T>(n: T): T { this.out.push(n); return n; }
  disconnect() { this.out = []; }
}

export class FakeGain extends FakeNode { gain = new FakeParam(1); }
export class FakeBiquad extends FakeNode { type = 'lowpass'; Q = new FakeParam(1); frequency = new FakeParam(350); }
export class FakeDynamics extends FakeNode {
  threshold = new FakeParam(); knee = new FakeParam(); ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam();
}
export class FakeSource extends FakeNode {
  buffer: unknown = null;
  playbackRate = new FakeParam(1);
  detune = new FakeParam(0);
  started: [number, number] | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(when: number, offset: number) { this.started = [when, offset]; }
  stop(when: number) { this.stoppedAt = when; }
}

export class FakeAudio {
  currentTime = 0;
  destination = new FakeNode();
  sources: FakeSource[] = [];
  filters: FakeBiquad[] = [];
  gains: FakeGain[] = [];
  dynamics: FakeDynamics[] = [];
  createGain() { const n = new FakeGain(); this.gains.push(n); return n; }
  createBiquadFilter() { const n = new FakeBiquad(); this.filters.push(n); return n; }
  createDynamicsCompressor() { const n = new FakeDynamics(); this.dynamics.push(n); return n; }
  createBufferSource() { const n = new FakeSource(); this.sources.push(n); return n; }
}

/** A decoded recording: 64 samples of near-silence, then a decaying tone peaking at `peak`. */
export function fakeBuffer(name: string, peak = 0.5): AudioBuffer {
  const data = new Float32Array(4000);
  for (let k = 64; k < data.length; k++) data[k] = peak * Math.exp(-(k - 64) / 600) * (k % 2 ? 1 : -1);
  return { name, sampleRate: 48000, length: data.length, numberOfChannels: 1, duration: data.length / 48000,
    getChannelData: () => data } as unknown as AudioBuffer;
}

export const PALETTE: InstrumentPalette = {
  rest: 'rgb(138, 140, 130)',
  played: 'rgb(227, 178, 148)',
  answer: 'rgb(140, 151, 133)',
  background: 'rgb(250, 247, 241)',
  detail: 'rgb(167, 168, 155)',
};

export interface HostLog {
  played: Stroke[];
  vibrate: number[];
  holding: number[];
  draws: number;
  joltsAsked: number[];
}

/** A host as the engine will provide it, with every call recorded and the inputs settable. */
export function fakeHost(audio = new FakeAudio()) {
  const log: HostLog = { played: [], vibrate: [], holding: [], draws: 0, joltsAsked: [] };
  const buffers = new Map<string, AudioBuffer>();
  const state = {
    audible: true,
    motion: null as { rotation: number; jolt: number; at: number } | null,
    jolts: [] as { at: number; magnitude: number }[],
    /** What `host.tap()` hands over: the tokens' defaults unless a test sets other values. */
    tap: INSTRUMENT_TAP_DEFAULT as InstrumentTapParams,
  };
  const host: InstrumentHost = {
    audio: audio as unknown as AudioContext,
    audible: () => state.audible,
    buffer: (file) => buffers.get(file),
    palette: () => PALETTE,
    shadow: () => null,
    tap: () => state.tap,
    vibrate: (ms) => { log.vibrate.push(ms); },
    motion: () => state.motion,
    joltsSince: (t) => { log.joltsAsked.push(t); return state.jolts.filter((j) => j.at >= t); },
    played: (s) => { log.played.push(s); },
    holding: (n) => { log.holding.push(n); },
    requestDraw: () => { log.draws += 1; },
  };
  const loadAll = (files: string[]) => files.forEach((f) => buffers.set(f, fakeBuffer(f)));
  return { host, audio, log, state, buffers, loadAll };
}

/** A clock and a timer queue the test advances by hand. */
export function fakeEnv(start = 1000) {
  let clock = start;
  let seq = 0;
  const queue: { at: number; seq: number; fn: () => void }[] = [];
  const env: MarimbaEnv & { advance(ms: number): void; pending(): number; random(): number } = {
    now: () => clock,
    later(fn, ms) {
      const item = { at: clock + ms, seq: seq++, fn };
      queue.push(item);
      return () => {
        const k = queue.indexOf(item);
        if (k >= 0) queue.splice(k, 1);
      };
    },
    random: () => 0.5,
    advance(ms) {
      const until = clock + ms;
      for (;;) {
        queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
        const next = queue[0];
        if (!next || next.at > until) break;
        queue.shift();
        clock = Math.max(clock, next.at);
        next.fn();
      }
      clock = until;
    },
    pending: () => queue.length,
  };
  return env;
}
