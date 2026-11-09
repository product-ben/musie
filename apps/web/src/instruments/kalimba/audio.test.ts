/**
 * The audio graph, wired against a fake AudioContext that records every node,
 * connection and automation event — Node has no Web Audio, and the point
 * here is the wiring and the numbers, not the DSP.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import type { KalimbaSound } from './sound';
import { createKalimbaAudio, crossfade, envelopeOf, sampleFile, touchAt } from './sound';

const sound = kalimba.sound as unknown as KalimbaSound;

type Event = [string, ...number[]];
class Param {
  events: Event[] = [];
  constructor(public value = 0) {}
  setValueAtTime(v: number, t: number) { this.events.push(['set', v, t]); }
  linearRampToValueAtTime(v: number, t: number) { this.events.push(['ramp', v, t]); }
  setTargetAtTime(v: number, t: number, tau: number) { this.events.push(['target', v, t, tau]); }
  cancelScheduledValues(t: number) { this.events.push(['cancel', t]); }
}
class FakeNode {
  outs: unknown[] = [];
  constructor(public kind: string) {}
  connect(to: unknown) { this.outs.push(to); return to; }
  disconnect(to?: unknown) { this.outs = to === undefined ? [] : this.outs.filter((o) => o !== to); }
}
class Source extends FakeNode {
  buffer: unknown = null;
  playbackRate = new Param(1);
  detune = new Param(0);
  started: number[] = [];
  stops: number[] = [];
  onended: (() => void) | null = null;
  start(when: number, offset: number) { this.started = [when, offset]; }
  stop(when: number) { this.stops.push(when); }
}

function fakeContext() {
  const made: FakeNode[] = [];
  const make = <T extends FakeNode>(n: T): T => { made.push(n); return n; };
  const ctx = {
    currentTime: 2,
    destination: new FakeNode('destination'),
    createDynamicsCompressor: () => make(Object.assign(new FakeNode('dynamics'), {
      threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param(),
    })),
    createGain: () => make(Object.assign(new FakeNode('gain'), { gain: new Param(1) })),
    createBiquadFilter: () => make(Object.assign(new FakeNode('biquad'), {
      type: 'lowpass', frequency: new Param(350), Q: new Param(1), gain: new Param(0),
    })),
    createOscillator: () => make(Object.assign(new FakeNode('oscillator'), {
      frequency: new Param(440), running: false, start() { this.running = true; }, stop() { this.running = false; },
    })),
    createBufferSource: () => make(new Source('source')),
  };
  return { ctx, made, sources: () => made.filter((n): n is Source => n instanceof Source) };
}

/** A decoded recording whose attack starts at sample 480. */
const recording = () => {
  const data = new Float32Array(4800);
  data[480] = 0.5;
  return { sampleRate: 48000, getChannelData: () => data } as unknown as AudioBuffer;
};

function setup(files: string[] = sound.NOTES.flatMap((n) => sound.layers.map((l) => sampleFile(l, n)))) {
  const f = fakeContext();
  const buffers = new Map(files.map((file) => [file, recording()]));
  const out = createKalimbaAudio(f.ctx as unknown as AudioContext, sound, (file) => buffers.get(file));
  return { ...f, out };
}

describe('the chain', () => {
  it('membrane → compressor → makeup → limiter → destination, at the experiment’s settings', () => {
    const { made, ctx } = setup();
    const dyn = made.filter((n) => n.kind === 'dynamics') as unknown as Record<string, Param>[];
    const values = (d: Record<string, Param>) => ({
      threshold: d.threshold.value, knee: d.knee.value, ratio: d.ratio.value, attack: d.attack.value, release: d.release.value,
    });
    expect(values(dyn[0])).toEqual(sound.master.compressor);
    expect(values(dyn[1])).toEqual(sound.master.limiter);
    expect((dyn[1] as unknown as FakeNode).outs).toEqual([ctx.destination]);
    const peak = made.find((n) => n.kind === 'biquad') as unknown as { type: string; frequency: Param; Q: Param };
    expect([peak.type, peak.frequency.value, peak.Q.value]).toEqual(['peaking', 800, 1.1]);
    const lfo = made.find((n) => n.kind === 'oscillator') as unknown as { frequency: Param; running: boolean };
    expect([lfo.frequency.value, lfo.running]).toEqual([5.5, true]);
  });
});

describe('a pluck', () => {
  it('the middle tine at its tip: A3 closed and open, unshifted, from the attack, stopped after its release', () => {
    const { out, sources } = setup();
    expect(out.pluck(4, touchAt(1, sound))).not.toBeNull();
    const [closed, open] = sources();
    expect([closed.playbackRate.value, open.playbackRate.value]).toEqual([1, 1]);
    expect([closed.detune.value, open.detune.value]).toEqual([sound.CENTS.closed.A3, sound.CENTS.open.A3]);
    const e = envelopeOf(touchAt(1, sound), sound, 0);
    expect(closed.started).toEqual([2, (480 - 32) / 48000]);
    expect(closed.stops).toEqual([2 + e.stop!]);
    const gains = [closed, open].map((s) => (s.outs[0] as { gain: Param }).gain.value);
    expect(gains).toEqual([crossfade(0).closed, crossfade(0).open]);
    expect(out.sounding()).toBe(1);
  });

  it('g′ comes from A4 two semitones down, each layer with its own tuning correction', () => {
    const { out, sources } = setup();
    out.pluck(2, touchAt(1, sound));
    const [closed, open] = sources();
    expect(closed.playbackRate.value).toBeCloseTo(Math.pow(2, -2 / 12), 12);
    expect([closed.detune.value, open.detune.value]).toEqual([11, 8]);
  });

  it('envelope: from 0, up to the level, then the release', () => {
    const { out, made } = setup();
    out.pluck(4, touchAt(0.5, sound));
    const e = envelopeOf(touchAt(0.5, sound), sound, 0);
    const env = made.find((n) => n.kind === 'gain' && (n as unknown as { gain: Param }).gain.events.length > 0) as unknown as { gain: Param };
    const [set, ramp, target] = env.gain.events;
    expect(set).toEqual(['set', 0, 2]);
    expect(ramp[0]).toBe('ramp');
    expect(ramp[1]).toBeGreaterThanOrEqual(0.85 * touchAt(0.5, sound).vel);
    expect(ramp[1]).toBeLessThanOrEqual(0.93 * touchAt(0.5, sound).vel);
    expect(ramp[2]).toBeCloseTo(2 + e.attack, 12);
    expect(target).toEqual(['target', 0, 2 + e.release!.at, e.release!.tau]);
  });

  it('striking a ringing tine damps it first, as a thumb would', () => {
    const { out, sources, ctx } = setup();
    out.pluck(4, touchAt(1, sound));
    const first = sources();
    ctx.currentTime = 3;
    out.pluck(4, touchAt(1, sound));
    for (const s of first) expect(s.stops.at(-1)).toBeCloseTo(3 + sound.tone.damp.stop, 12);
    const layerGain = first[0].outs[0] as FakeNode;
    const lowpass = layerGain.outs[0] as FakeNode;
    const shelf = lowpass.outs[0] as FakeNode;
    const envelope = (shelf.outs[0] as unknown as { gain: Param }).gain;
    expect(envelope.events.slice(-3)).toEqual([['cancel', 3], ['set', envelope.value, 3], ['target', 0, 3, sound.tone.damp.tau]]);
    expect(out.sounding()).toBe(1);
  });

  it('an answer note fades at the engine’s time constant', () => {
    const { out, sources } = setup();
    const v = out.pluck(0, touchAt(1, sound))!;
    v.fade(0.15);
    for (const s of sources()) expect(s.stops.at(-1)).toBeCloseTo(2 + (0.15 * sound.tone.damp.stop) / sound.tone.damp.tau, 12);
  });

  it('a voice leaves once all its sources have ended', () => {
    const { out, sources } = setup();
    out.pluck(4, touchAt(1, sound));
    sources().forEach((s) => s.onended?.());
    expect(out.sounding()).toBe(0);
  });

  it('nothing sounds for a tine whose recordings are not decoded', () => {
    const { out, sources } = setup(['closed-A3.mp3']);
    expect(out.canSound(0)).toBe(false);
    expect(out.pluck(0, touchAt(1, sound))).toBeNull();
    expect(out.canSound(4)).toBe(true);
    out.pluck(4, touchAt(1, sound));
    expect(sources()).toHaveLength(1);
  });
});

describe('the membrane', () => {
  it('moves the LFO, the depths and the crossfade of every ringing tine', () => {
    const { out, made, sources } = setup();
    out.pluck(4, touchAt(1, sound));
    const m = { lfoHz: 7, tremolo: 0.3, peakHz: 400, pitchCents: 10, peakGainDb: 5, openMix: 0.5 };
    out.membrane(m);
    const lfo = made.find((n) => n.kind === 'oscillator') as unknown as { frequency: Param };
    expect(lfo.frequency.events.at(-1)).toEqual(['target', 7, 2, sound.membrane.lfo.rateTau]);
    const [closed, open] = sources().map((s) => (s.outs[0] as unknown as { gain: Param }).gain.events.at(-1));
    expect(closed).toEqual(['target', crossfade(0.5).closed, 2, sound.membrane.crossfadeTau]);
    expect(open).toEqual(['target', crossfade(0.5).open, 2, sound.membrane.crossfadeTau]);
    out.pluck(1, touchAt(1, sound)); // a new note starts at the current mix
    const late = sources().slice(-2).map((s) => (s.outs[0] as unknown as { gain: Param }).gain.value);
    expect(late).toEqual([crossfade(0.5).closed, crossfade(0.5).open]);
  });
});

describe('dispose', () => {
  it('silences the chain and stops the LFO', () => {
    const { out, made } = setup();
    out.dispose();
    const limiter = made.filter((n) => n.kind === 'dynamics')[1];
    expect(limiter.outs).toEqual([]);
    expect((made.find((n) => n.kind === 'oscillator') as unknown as { running: boolean }).running).toBe(false);
    expect(out.pluck(4, touchAt(1, sound))).toBeNull();
  });
});
