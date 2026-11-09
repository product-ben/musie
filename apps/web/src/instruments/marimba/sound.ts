/**
 * The marimba's sound: `instrument_sounds.sound` / `.demo` for `marimba`,
 * typed, and the audio graph the experiment builds from them.
 *
 * Source: `apps/web/public/experiments/marimba/261108-1740/index.html`,
 * sections „Klänge“ (`mapping`) and „Audio“ (`initAudio`, `loadOne`, `sound`,
 * `fade`, `levelOf`). Every number comes from the locked config
 * (`supabase/content/instruments/marimba.json`, held against that file by
 * `sources.test.ts`); nothing here restates one. Only the DEFAULT sound
 * „Marimba, weich“ is ported (Ben, 2026-11-09): two layers per recording,
 * `mittel` below `layerAt`, `laut` from it.
 *
 * The pure parts — which recording a bar plays, which layer a stroke takes,
 * how loud and how bright, where a recording really starts — are exported for
 * `sound.test.ts`. `createMarimbaAudio` is the one seam that touches an
 * `AudioContext`.
 */
import type { InstrumentSample, Voice } from '../types';

export interface Range {
  lo: number;
  hi: number;
}

interface Dynamics {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

/** „Ruhiger gespielt“: how calm the playing is, from the gaps between strokes. */
export interface CalmConfig {
  gapFloorMs: number;
  gapSpanMs: number;
  smooth: number;
  deviationStart: number;
  deviationMax: number;
  slowShare: number;
  evenShare: number;
  maxGapMs: number;
  riseSeconds: number;
  fallSeconds: number;
  step: number;
  tickMs: number;
  epsilon: number;
  /** The experiment's share of calm the background warms by. */
  background: number;
}

/** „Anschlag“: how hard a touch was, from jolt, finger area and force. */
export interface StrikeConfig {
  STRIKE_MS: number;
  noMotionWaitMs: number;
  weights: { motion: number; area: number; force: number };
  RS: Range;
  RA: Range;
  RF: Range;
  adapt: number;
  window: { beforeMs: number; afterMs: number; touchMs: number; historyMs: number };
  measured: { base: number; span: number; edgeDrop: number; jitter: number; min: number; max: number };
  unmeasured: { rollBase: number; rollJitter: number; edgeDrop: number; min: number; max: number; jitter: number };
}

/** `marimba.json` → `sound`. Field names follow the experiment's constants. */
export interface MarimbaSound {
  DEFAULTS: { bars: number; dialog: boolean; sound: string };
  SCALE: { n: string; midi: number }[];
  samples: {
    /** Recording name → the MIDI note it really sounds. */
    notes: Record<string, number>;
    oct: number;
    pick: string;
    /** `instrument_samples.layer`, softest first. */
    layers: string[];
    layerAt: number;
  };
  normalise: { peak: number; onsetFraction: number; backSamples: number };
  level: { base: number; lowBoost: number };
  filter: { lowpassQ: number; rollHz: number; baseHz: number; velHz: number };
  envelope: { attack: number; rollAttack: number };
  voices: { max: number; fadeTau: number };
  master: {
    compressor: Dynamics;
    makeup: number;
    limiter: Dynamics;
    warm: { hz: number; q: number; calmCut: number; tau: number };
  };
  calm: CalmConfig;
  strike: StrikeConfig;
  roll: { sameBarMs: number; anyBarMs: number; keep: number; add: number; scale: number; min: number; max: number };
  glissando: { decay: number; min: number; max: number };
  haptics: { strike: { baseMs: number; velMs: number }; roll: { ms: number; everyMs: number } };
  pendingMs: number;
  visual: { dotMs: number; glowTau: number };
}

/** `marimba.json` → `demo`: the onboarding stroke. */
export interface MarimbaDemo {
  bar: number;
  velocity: number;
}

/**
 * The jsonb is written by a migration only and cast, as `lib/instruments.ts`
 * explains; this checks the handful of fields whose absence would fail
 * somewhere less obvious than here.
 */
export function asMarimbaSound(sound: Record<string, unknown>): MarimbaSound {
  const s = sound as Partial<MarimbaSound>;
  if (!Array.isArray(s.SCALE) || !s.DEFAULTS || !s.samples || !s.master || !s.strike || !s.calm) {
    throw new Error('marimba: instrument_sounds.sound is not the marimba’s shape');
  }
  return s as MarimbaSound;
}

export function asMarimbaDemo(demo: Record<string, unknown>): MarimbaDemo {
  if (typeof demo.bar !== 'number' || typeof demo.velocity !== 'number') {
    throw new Error('marimba: instrument_sounds.demo needs bar and velocity');
  }
  return { bar: demo.bar, velocity: demo.velocity };
}

/** One bar's recording and how far it is shifted, in semitones. */
export interface BarSource {
  src: string;
  semi: number;
}

/**
 * The experiment's `mapping`: every bar takes the nearest recording; on a tie
 * the one ABOVE wins and is played lower (`d < 0`). Independent of the order
 * of `notes`, which matters because jsonb does not keep key order.
 */
export function mapBars(sound: MarimbaSound): BarSource[] {
  return sound.SCALE.slice(0, sound.DEFAULTS.bars).map((bar) => {
    const m = bar.midi + sound.samples.oct;
    let best: BarSource | null = null;
    for (const [src, midi] of Object.entries(sound.samples.notes)) {
      const d = m - midi;
      if (best === null || Math.abs(d) < Math.abs(best.semi) || (Math.abs(d) === Math.abs(best.semi) && d < 0)) {
        best = { src, semi: d };
      }
    }
    if (best === null) throw new Error('marimba: sound.samples.notes is empty');
    return best;
  });
}

/** Which layer a stroke takes: the experiment's two-layer rule, `+(vel >= 0.6)`. */
export function layerIndex(velocity: number, samples: MarimbaSound['samples']): number {
  return Math.min(samples.layers.length - 1, velocity >= samples.layerAt ? 1 : 0);
}

/**
 * bar → layer → file name, from the sample index the database holds — so the
 * file names are the manifest's, not a pattern restated here. A missing
 * combination is a broken migration and fails loudly.
 */
export function barFiles(sound: MarimbaSound, samples: readonly InstrumentSample[]): string[][] {
  return mapBars(sound).map(({ src }) => {
    const midi = sound.samples.notes[src];
    return sound.samples.layers.map((layer) => {
      const hit = samples.find((s) => s.midi === midi && s.layer === layer);
      if (!hit) throw new Error(`marimba: no sample for ${src} (MIDI ${midi}), layer ${layer}`);
      return hit.file;
    });
  });
}

/** `levelOf`: low bars a little louder — the phone speaker swallows the low end. */
export function levelOf(bar: number, sound: MarimbaSound): number {
  const { base, lowBoost } = sound.level;
  return base * (1 + lowBoost * (1 - bar / (sound.SCALE.length - 1)));
}

/** The per-stroke lowpass: soft strokes darker, rolls darker still. */
export function lowpassHz(velocity: number, roll: boolean, filter: MarimbaSound['filter']): number {
  return roll ? filter.rollHz : filter.baseHz + filter.velHz * velocity * velocity;
}

export function playbackRate(semi: number): number {
  return Math.pow(2, semi / 12);
}

/** The master's warm lowpass at a given calm (0 … 1). */
export function warmHz(calm: number, warm: MarimbaSound['master']['warm']): number {
  return warm.hz * (1 - warm.calmCut * calm);
}

/** Where a recording really starts, and the gain that brings its peak to `normalise.peak`. */
export interface Trim {
  /** Seconds. */
  offset: number;
  gain: number;
}

/**
 * `loadOne`'s normalisation: every recording equally loud at its peak, and
 * played from just before the real onset (an MP3 encoder pads the front with
 * silence; the WAVs keep the rule for the same reason the experiment did).
 */
export function trimOf(data: ArrayLike<number>, sampleRate: number, n: MarimbaSound['normalise']): Trim {
  let peak = 0;
  for (let k = 0; k < data.length; k++) peak = Math.max(peak, Math.abs(data[k]));
  let i = 0;
  while (i < data.length && Math.abs(data[i]) < peak * n.onsetFraction) i++;
  return { offset: Math.max(0, i - n.backSamples) / sampleRate, gain: peak > 0 ? n.peak / peak : 1 };
}

export interface MarimbaAudio {
  /** True when the recording this stroke would take is decoded. */
  loaded(bar: number, velocity: number): boolean;
  /** True once every recording is decoded; analyses each on the way. */
  prepare(): boolean;
  /** One stroke, started now. A real bar is not damped by the next stroke: voices overlap. */
  strike(bar: number, velocity: number, roll: boolean): Voice | null;
  /** Move the master's warm lowpass to this calm. */
  warm(calm: number): void;
  dispose(): void;
}

interface Live {
  env: GainNode;
  src: AudioBufferSourceNode;
}

/**
 * The experiment's `initAudio` + `sound` + `fade`, on the host's context:
 *
 *   stroke: source → lowpass → envelope ─┐
 *                                         bus → warm lowpass → compressor → makeup → limiter → destination
 *
 * The host gives no output node (`InstrumentHost.audio` only), so the chain
 * ends at `audio.destination`.
 */
export function createMarimbaAudio(
  audio: AudioContext,
  sound: MarimbaSound,
  files: readonly (readonly string[])[],
  buffer: (file: string) => AudioBuffer | undefined,
): MarimbaAudio {
  const { compressor, makeup, limiter, warm } = sound.master;
  const comp = audio.createDynamicsCompressor();
  comp.threshold.value = compressor.threshold;
  comp.knee.value = compressor.knee;
  comp.ratio.value = compressor.ratio;
  comp.attack.value = compressor.attack;
  comp.release.value = compressor.release;
  const gain = audio.createGain();
  gain.gain.value = makeup;
  const limit = audio.createDynamicsCompressor();
  limit.threshold.value = limiter.threshold;
  limit.knee.value = limiter.knee;
  limit.ratio.value = limiter.ratio;
  limit.attack.value = limiter.attack;
  limit.release.value = limiter.release;
  const bus = audio.createGain();
  const warmLp = audio.createBiquadFilter();
  warmLp.type = 'lowpass';
  warmLp.Q.value = warm.q;
  warmLp.frequency.value = warm.hz;
  bus.connect(warmLp);
  warmLp.connect(comp);
  comp.connect(gain);
  gain.connect(limit);
  limit.connect(audio.destination);

  const sources = mapBars(sound);
  const trims = new WeakMap<AudioBuffer, Trim>();
  const voices: Live[] = [];
  let disposed = false;

  const fileFor = (bar: number, velocity: number) => files[bar]?.[layerIndex(velocity, sound.samples)];

  function decoded(file: string | undefined): { buf: AudioBuffer; trim: Trim } | null {
    if (file === undefined) return null;
    const buf = buffer(file);
    if (!buf) return null;
    let trim = trims.get(buf);
    if (!trim) {
      trim = trimOf(buf.getChannelData(0), buf.sampleRate, sound.normalise);
      trims.set(buf, trim);
    }
    return { buf, trim };
  }

  function fade(v: Live, now: number, tau: number) {
    try {
      v.env.gain.cancelScheduledValues(now);
      v.env.gain.setValueAtTime(v.env.gain.value, now);
      v.env.gain.setTargetAtTime(0, now, tau);
      v.src.stop(now + tau * 8);
    } catch {
      /* already stopped */
    }
  }

  return {
    loaded: (bar, velocity) => !disposed && decoded(fileFor(bar, velocity)) !== null,

    prepare: () => files.every((layers) => layers.every((file) => decoded(file) !== null)),

    strike(bar, velocity, roll) {
      if (disposed) return null;
      const b = decoded(fileFor(bar, velocity));
      if (!b) return null;
      const now = audio.currentTime;
      const src = audio.createBufferSource();
      src.buffer = b.buf;
      src.playbackRate.value = playbackRate(sources[bar].semi);
      const lp = audio.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = sound.filter.lowpassQ;
      lp.frequency.value = lowpassHz(velocity, roll, sound.filter);
      const env = audio.createGain();
      const level = velocity * levelOf(bar, sound) * b.trim.gain;
      const attack = roll ? sound.envelope.rollAttack : sound.envelope.attack;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(level, now + attack);
      src.connect(lp);
      lp.connect(env);
      env.connect(bus);
      src.start(now, b.trim.offset);
      const v: Live = { env, src };
      voices.push(v);
      src.onended = () => {
        const k = voices.indexOf(v);
        if (k >= 0) voices.splice(k, 1);
      };
      while (voices.length > sound.voices.max) fade(voices.shift()!, now, sound.voices.fadeTau);
      return { fade: (tau: number) => fade(v, audio.currentTime, tau) };
    },

    warm(calm) {
      if (disposed) return;
      warmLp.frequency.setTargetAtTime(warmHz(calm, warm), audio.currentTime, warm.tau);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      const now = audio.currentTime;
      const tau = sound.voices.fadeTau;
      voices.splice(0).forEach((v) => fade(v, now, tau));
      /* Let the fade finish before the chain leaves the destination. */
      setTimeout(() => {
        try {
          limit.disconnect();
        } catch {
          /* already disconnected */
        }
      }, tau * 8 * 1000);
    },
  };
}
