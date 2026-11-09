/**
 * The harp's sound — `instrument_sounds.sound` for `harp`, typed, and the
 * audio graph the experiment builds from it.
 *
 * Source: `apps/web/public/experiments/harp/261109-0920/index.html`, functions
 * `initAudio`, `impulse`, `dynGain`, `fade` and `play`, with the engine
 * 'aufnahme' (the six recorded samples), Klangfarbe „Weich“ and the preset
 * „euer“ (Ben, 2026-11-09: only the experiment's DEFAULT sound). Every number
 * comes from `supabase/content/instruments/harp.json`, which
 * `sources.test.ts` holds against the experiment; `experiment.test.ts` holds
 * this graph against the experiment's own `play`.
 *
 * ── WHAT IS NOT PORTED ────────────────────────────────────────────────────
 * The Karplus-Strong engine 'generiert' and the chorus of „Schwebend“ — the
 * default sound uses neither. `setRoom`'s delayed rebuild exists for a room
 * slider; there is no slider, so the impulse is built once.
 *
 * ── WHO OWNS THE OUTPUT ───────────────────────────────────────────────────
 * `InstrumentHost` hands over the AudioContext and no output node, so the
 * whole chain down to `audio.destination` — compressor, makeup, limiter, dry
 * and reverb — is built here, exactly as the experiment's `initAudio` does.
 */

export interface Compressor {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

/** `harp.json` → `sound`. Field names are the experiment's. */
export interface HarpSound {
  tuning: {
    ROOT: number;
    SCALE: readonly number[];
    COUNT: number;
    /** One per string, low to high — also the answer's degrees. */
    midis: readonly number[];
    names: readonly string[];
  };
  engine: 'aufnahme';
  samples: { pick: 'nearest'; notes: Readonly<Record<string, number>> };
  preset: {
    /** Seconds until a note has died away (about −40 dB). */
    decay: number;
    /** How much quieter every older note gets when a new one sounds. */
    duck: number;
    /** Voice limit. */
    voices: number;
    wet: number;
    /** Reverb length, seconds. */
    room: number;
    /** A new note on a string silences that string's previous note. */
    damp: boolean;
    sound: string;
    dynR: number;
    dynK: number;
  };
  timbre: {
    attack: number;
    /** Lowpass cutoff at velocity 0 and 1. */
    cut: readonly [number, number];
    shelf: number;
    gain: number;
    shelfHz: number;
    lowpassQ: number;
  };
  envelope: { releaseStartFactor: number; releaseTauDivisor: number; stopFactor: number; stopPad: number };
  voiceRules: { dampTau: number; duckTau: number; limitTau: number };
  pan: { from: number; span: number };
  reverb: {
    noiseLowpass: number;
    decayPower: number;
    fadeInSec: number;
    level: number;
    channels: number;
    rebuildDelayMs: number;
  };
  master: { compressor: Compressor; makeup: number; limiter: Compressor };
  velocity: {
    dynamics: { floor: number; span: number };
    pluck: { min: number; max: number };
    pull: { base: number; span: number; power: number; maxPx: number; maxOfGap: number; zoneOfGap: number };
    strum: { base: number; speedDivisor: number; retriggerMs: number };
  };
  haptics: {
    /** `[threshold, ticks]`: the first whose threshold the velocity exceeds. */
    pluck: { baseMs: number; velMs: number; ticks: readonly (readonly [number, number])[] };
    pullStep: { ms: number; steps: number };
  };
  visual: { MOTION: number; width: readonly [number, number]; fadeInMs: number; fadeOutMs: number; steps: number };
}

/** `harp.json` → `demo`: the onboarding note. */
export interface HarpDemo {
  /** String index, 0 = lowest — the second string. */
  string: number;
  velocity: number;
}

/**
 * `fade` stops a source this many time constants after it starts falling —
 * a literal in the experiment's `fade`, not part of the locked config.
 */
const FADE_STOP_TAUS = 8;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** The experiment's `pluck` clamps every velocity before it sounds. */
export function clampVelocity(vel: number, sound: HarpSound): number {
  return clamp(vel, sound.velocity.pluck.min, sound.velocity.pluck.max);
}

/**
 * Loudness from velocity: `(s0 + (1 − s0) · z)^k`, z the velocity above the
 * floor, s0 chosen so the softest note sits `dynR` dB below the loudest.
 */
export function dynGain(vel: number, sound: HarpSound): number {
  const { floor, span } = sound.velocity.dynamics;
  const { dynR, dynK } = sound.preset;
  const z = clamp((vel - floor) / span, 0, 1);
  const s0 = Math.pow(10, -dynR / (20 * dynK));
  return Math.pow(s0 + (1 - s0) * z, dynK);
}

/** Lowpass cutoff: soft plucks are darker. */
export function cutoff(vel: number, sound: HarpSound): number {
  const [lo, hi] = sound.timbre.cut;
  return lo + (hi - lo) * vel;
}

/** Stereo position of string `i`: low left, high right. */
export function panOf(i: number, sound: HarpSound): number {
  return sound.pan.from + (sound.pan.span * i) / (sound.tuning.COUNT - 1);
}

/** `[ms, ticks]` for a pluck — the experiment's `pluckBuzz`: stronger = longer. */
export function pluckBuzz(vel: number, sound: HarpSound): [ms: number, ticks: number] {
  const { baseMs, velMs, ticks } = sound.haptics.pluck;
  const hit = ticks.find(([threshold]) => vel > threshold) ?? ticks[ticks.length - 1];
  return [Math.round(baseMs + velMs * vel), hit[1]];
}

export interface LoadedSample<B = AudioBuffer> {
  midi: number;
  buffer: B;
}

/**
 * The recording nearest in pitch. On a tie the LOWER sample wins: the
 * experiment keeps the first of equal distance in the order its samples
 * finished decoding, which is ascending as they are requested (48 … 65) —
 * here that order is made explicit instead of left to the decoder.
 */
export function pickSample<B>(midi: number, loaded: readonly LoadedSample<B>[]): LoadedSample<B> | null {
  let best: LoadedSample<B> | null = null;
  for (const s of [...loaded].sort((a, b) => a.midi - b.midi)) {
    if (best === null || Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
  }
  return best;
}

/**
 * The reverb's impulse, per channel: low-passed noise under a `(1 − t)^p`
 * decay with a 15 ms fade-in — the experiment's `impulse`, generated at
 * runtime from noise as it was (Ben, 2026-11-09).
 */
export function impulseChannels(
  sampleRate: number,
  seconds: number,
  reverb: HarpSound['reverb'],
  random: () => number = Math.random,
): Float32Array[] {
  const n = Math.floor(sampleRate * seconds);
  const fadeIn = sampleRate * reverb.fadeInSec;
  const out: Float32Array[] = [];
  for (let c = 0; c < reverb.channels; c += 1) {
    const d = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      lp += reverb.noiseLowpass * (random() * 2 - 1 - lp);
      d[i] = lp * Math.pow(1 - t, reverb.decayPower) * (i < fadeIn ? i / fadeIn : 1) * reverb.level;
    }
    out.push(d);
  }
  return out;
}

/** One sounding note. */
export interface HarpVoice {
  string: number;
  src: AudioBufferSourceNode;
  duck: GainNode;
  /** Its share after ducking, 0 … 1. */
  level: number;
  dead: boolean;
}

export interface HarpSoundGraph {
  /** Sound string `i` at a velocity already clamped. Null without a sample. */
  play(i: number, vel: number): HarpVoice | null;
  /** Fade a voice out — the answer's interruption, the voice limit. */
  fade(voice: HarpVoice, tau: number): void;
  /** Fade everything and let go of the chain. */
  dispose(): void;
}

function setCompressor(node: DynamicsCompressorNode, c: Compressor): void {
  node.threshold.value = c.threshold;
  node.knee.value = c.knee;
  node.ratio.value = c.ratio;
  node.attack.value = c.attack;
  node.release.value = c.release;
}

/**
 * The experiment's `initAudio` (master chain, dry and reverb) and `play`
 * (one voice per pluck), on the host's AudioContext. `samples` returns the
 * recordings decoded so far — the experiment, too, played with whatever had
 * arrived.
 */
export function createHarpSound(
  audio: AudioContext,
  sound: HarpSound,
  samples: () => readonly LoadedSample[],
  random: () => number = Math.random,
): HarpSoundGraph {
  const { preset, timbre, envelope, voiceRules, master } = sound;

  /* Created in the experiment's order — `experiment.test.ts` compares the
     two graphs node by node. */
  const comp = audio.createDynamicsCompressor();
  setCompressor(comp, master.compressor);
  const makeup = audio.createGain();
  makeup.gain.value = master.makeup;
  const limit = audio.createDynamicsCompressor();
  setCompressor(limit, master.limiter);
  const dry = audio.createGain();
  dry.connect(comp);
  const wetBus = audio.createGain();
  wetBus.gain.value = preset.wet;
  const conv = audio.createConvolver();
  const channels = impulseChannels(audio.sampleRate, preset.room, sound.reverb, random);
  const ir = audio.createBuffer(channels.length, channels[0].length, audio.sampleRate);
  channels.forEach((d, c) => ir.getChannelData(c).set(d));
  conv.buffer = ir;
  wetBus.connect(conv);
  conv.connect(comp);
  comp.connect(makeup);
  makeup.connect(limit);
  limit.connect(audio.destination);

  let voices: HarpVoice[] = [];

  function fade(v: HarpVoice, t: number, tau: number): void {
    v.duck.gain.cancelScheduledValues(t);
    v.duck.gain.setTargetAtTime(0, t, tau);
    try {
      v.src.stop(t + tau * FADE_STOP_TAUS);
    } catch {
      /* already stopped — as the experiment's try/catch */
    }
    v.dead = true;
  }

  function play(i: number, vel: number): HarpVoice | null {
    const best = pickSample(sound.tuning.midis[i], samples());
    if (best === null) return null;
    const midi = sound.tuning.midis[i];
    const t = audio.currentTime;

    voices = voices.filter((v) => !v.dead);
    if (preset.damp) voices.filter((v) => v.string === i).forEach((v) => fade(v, t, voiceRules.dampTau));
    for (const v of voices) {
      if (!v.dead && preset.duck) {
        v.level *= 1 - preset.duck;
        v.duck.gain.setTargetAtTime(v.level, t, voiceRules.duckTau);
      }
    }
    voices = voices.filter((v) => !v.dead);
    while (voices.length >= preset.voices) fade(voices.shift() as HarpVoice, t, voiceRules.limitTau);

    const src = audio.createBufferSource();
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = timbre.lowpassQ;
    src.buffer = best.buffer;
    src.playbackRate.value = Math.pow(2, (midi - best.midi) / 12);
    lp.frequency.value = cutoff(vel, sound);
    const peak = dynGain(vel, sound) * timbre.gain;
    const length = best.buffer.duration / src.playbackRate.value;

    const env = audio.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + timbre.attack);
    env.gain.setTargetAtTime(
      0,
      t + timbre.attack + envelope.releaseStartFactor * preset.decay,
      preset.decay / envelope.releaseTauDivisor,
    );
    const duck = audio.createGain();
    duck.gain.value = 1;
    const shelf = audio.createBiquadFilter();
    shelf.type = 'lowshelf';
    shelf.frequency.value = timbre.shelfHz;
    shelf.gain.value = timbre.shelf;

    src.connect(lp);
    lp.connect(shelf);
    shelf.connect(env);
    env.connect(duck);
    let tail: AudioNode = duck;
    if (typeof audio.createStereoPanner === 'function') {
      const p = audio.createStereoPanner();
      p.pan.value = panOf(i, sound);
      duck.connect(p);
      tail = p;
    }
    tail.connect(dry);
    tail.connect(wetBus);
    src.start(t);
    src.stop(t + Math.min(length, preset.decay * envelope.stopFactor + envelope.stopPad));

    const v: HarpVoice = { string: i, src, duck, level: 1, dead: false };
    voices.push(v);
    src.onended = () => {
      v.dead = true;
    };
    return v;
  }

  return {
    play,
    fade: (v, tau) => fade(v, audio.currentTime, tau),
    dispose() {
      const t = audio.currentTime;
      voices.filter((v) => !v.dead).forEach((v) => fade(v, t, voiceRules.limitTau));
      voices = [];
      const after = voiceRules.limitTau * FADE_STOP_TAUS * 1000;
      setTimeout(() => limit.disconnect(), after);
    },
  };
}
