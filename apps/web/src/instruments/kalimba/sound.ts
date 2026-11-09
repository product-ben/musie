/**
 * The kalimba's sound: `supabase/content/instruments/kalimba.json` typed, the
 * arithmetic of the experiment's „Audio“ section as pure functions, and the
 * audio graph that plays it.
 *
 * Source: `apps/web/public/experiments/kalimba/261106-1121/index.html`
 * (`initAudio`, `loadOne`, `play`, `damp`, `cutoff`, `attackOf`, `shelfOf`).
 * Every number comes from the JSON, which `sources.test.ts` and
 * `kalimba/parity.test.ts` hold against that file. Only the experiment's
 * DEFAULT is built (Ben, 2026-11-09): tuning „penta“, sound „still“ — the
 * `closed` and `open` recordings crossfaded by the swing — and its sliders
 * fixed at `DEFAULTS`.
 *
 * ── WHAT IS PURE AND WHAT IS NOT ──────────────────────────────────────────
 * Everything above `createKalimbaAudio` is arithmetic and unit-tested in
 * Node. `createKalimbaAudio` is the only code here that touches Web Audio,
 * and the adapter reaches it through `KalimbaOutput`, so the adapter's own
 * tests run against a fake.
 */
import type { Voice } from '../types';

/* ── kalimba.json, typed ─────────────────────────────────────────────── */

/** One tine: its note, its frequency, the recording it comes from and the shift. */
export interface KalimbaTine {
  n: string;
  hz: number;
  src: string;
  semi: number;
}

export type KalimbaLayer = 'closed' | 'open';

interface Dynamics {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

/** `instrument_sounds.sound` for the kalimba — kalimba.json's `sound`. */
export interface KalimbaSound {
  DEFAULTS: { hard: number; len: number; swing: number; touch: number; tuning: string; sound: string };
  /** Left to right; the lowest tine is in the middle. */
  tines: KalimbaTine[];
  NOTES: string[];
  CENTS: Record<KalimbaLayer, Record<string, number>>;
  layers: KalimbaLayer[];
  onset: { threshold: number; backSamples: number };
  tone: {
    cutoff: { from: number; to: number };
    attack: { base: number; span: number };
    shelf: { hz: number; below: number; gain: number };
    lowpassQ: number;
    lowpassFloor: number;
    dullFactor: number;
    dullAttack: number;
    level: { base: number; jitter: number };
    release: { fullAbove: number; startFactor: number; tauDivisor: number; stopFactor: number; stopPad: number };
    damp: { tau: number; stop: number };
  };
  velocity: { touchFactor: number; posPower: number };
  membrane: {
    peak: { hz: number; q: number };
    lfo: { hz: number; baseHz: number; swingHz: number; rateTau: number };
    depth: { tremolo: number; peakHz: number; pitchCents: number; peakGainDb: number; tau: number; peakGainTau: number };
    openMixFactor: number;
    crossfadeTau: number;
  };
  swing: {
    tickMs: number;
    rotDecay: number;
    rise: number;
    fall: number;
    floor: number;
    /** Applied by the host's `motion()`, not here — see index.ts. */
    rotationDivisor: number;
    accelerationDivisor: number;
  };
  master: { compressor: Dynamics; makeup: number; limiter: Dynamics };
  haptics: {
    /** `ticks`: [velocity above which, iOS ticks], first match wins. */
    pluck: { baseMs: number; velMs: number; ticks: [number, number][] };
    swing: { threshold: number; baseMs: number; spanMs: number; idleFactor: number; everyMs: number };
  };
  /** How long a note touched before audio was unlocked may still sound. */
  pendingMs: number;
  /**
   * Still in the locked sound (kalimba.json, the instruments migration) and
   * NOT READ since round 2: the dot is the design system's tap, and how long
   * it lives is `--instrument-tap-duration` (`host.tap().durationMs`).
   */
  visual: { dotMs: number };
}

/** `instrument_sounds.demo` for the kalimba: which tine, and where on it. */
export interface KalimbaDemo {
  tine: number;
  position: number;
}

/* ── the experiment's arithmetic ─────────────────────────────────────── */

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Härte → Tiefpass (`cutoff`). */
export const cutoffOf = (hard: number, tone: KalimbaSound['tone']): number =>
  tone.cutoff.from * Math.pow(tone.cutoff.to / tone.cutoff.from, hard);

/** Härte → Einsatz (`attackOf`). */
export const attackOf = (hard: number, tone: KalimbaSound['tone']): number =>
  tone.attack.base + tone.attack.span * (1 - hard);

/** Wenig Härte: etwas Wärme (`shelfOf`). */
export const shelfOf = (hard: number, tone: KalimbaSound['tone']): number =>
  hard < tone.shelf.below ? tone.shelf.gain * (1 - hard / tone.shelf.below) : 0;

/**
 * Where a tine was touched and what follows from it. `pos` is 0 at the bridge
 * and 1 at the tip, unclamped as the hit test gives it (the dot clamps it);
 * further up is quieter (`vel`) and duller (`dull`). A phone cannot measure
 * pressure, so where you touch IS how hard you play.
 */
export interface Touch {
  pos: number;
  vel: number;
  dull: number;
}

export function touchAt(pos: number, sound: KalimbaSound): Touch {
  const p = clamp(pos, 0, 1);
  const { touch } = sound.DEFAULTS;
  return {
    pos,
    vel: 1 - touch * (1 - Math.pow(p, sound.velocity.posPower)) * sound.velocity.touchFactor,
    dull: 1 - touch * (1 - p) * sound.tone.dullFactor,
  };
}

/**
 * The position that gives `velocity` — `touchAt` turned round, so an answer
 * note at a given velocity sounds, dulls and leaves its dot exactly as the
 * person's own touch there would. Below the softest the kalimba can play
 * (at the bridge) it is the bridge; above the tip, the tip.
 */
export function positionFor(velocity: number, sound: KalimbaSound): number {
  const reach = sound.DEFAULTS.touch * sound.velocity.touchFactor;
  if (reach <= 0) return 1;
  const base = clamp(1 - (1 - velocity) / reach, 0, 1);
  return Math.pow(base, 1 / sound.velocity.posPower);
}

/** One note's envelope and filters, in seconds from its start. */
export interface Envelope {
  level: number;
  attack: number;
  /** Null when `len` is past `fullAbove`: the recording rings out freely. */
  release: { at: number; tau: number } | null;
  stop: number | null;
  lowpass: number;
  shelf: number;
}

/** `play`'s envelope. `jitter` is `Math.random()` in the graph. */
export function envelopeOf(touch: Touch, sound: KalimbaSound, jitter: number): Envelope {
  const { hard, len } = sound.DEFAULTS;
  const t = sound.tone;
  const attack = attackOf(hard, t) + (1 - touch.dull) * t.dullAttack;
  const free = len > t.release.fullAbove;
  return {
    level: (t.level.base + jitter * t.level.jitter) * touch.vel,
    attack,
    release: free ? null : { at: attack + t.release.startFactor * len, tau: len / t.release.tauDivisor },
    stop: free ? null : attack + t.release.stopFactor * len + t.release.stopPad,
    lowpass: Math.max(t.lowpassFloor, cutoffOf(hard, t) * touch.dull),
    shelf: shelfOf(hard, t),
  };
}

/** The „still“ sound: closed and open, equal-power by how far the swing opened it. */
export function crossfade(openMix: number): Record<KalimbaLayer, number> {
  return { closed: Math.cos((openMix * Math.PI) / 2), open: Math.sin((openMix * Math.PI) / 2) };
}

/**
 * MP3 puts silence in front: play from the real attack (`loadOne`). Seconds
 * into the buffer at which to start.
 */
export function onsetOffset(data: ArrayLike<number>, sampleRate: number, onset: KalimbaSound['onset']): number {
  let i = 0;
  while (i < data.length && Math.abs(data[i]) < onset.threshold) i += 1;
  return Math.max(0, i - onset.backSamples) / sampleRate;
}

/** `InstrumentSample.file` of one recording: `closed-A3.mp3`. */
export const sampleFile = (layer: KalimbaLayer, note: string): string => `${layer}-${note}.mp3`;

/** The vibration of an own note: `buzz(Math.round(30 + 60 * vel), vel > 0.6 ? 3 : 2)`. */
export function pluckHaptic(vel: number, pluck: KalimbaSound['haptics']['pluck']): { ms: number; ticks: number } {
  const ms = Math.round(pluck.baseMs + pluck.velMs * vel);
  const match = pluck.ticks.find(([above]) => vel > above) ?? pluck.ticks[pluck.ticks.length - 1];
  return { ms, ticks: match ? match[1] : 1 };
}

/* ── the audio graph ─────────────────────────────────────────────────── */

/** What one 30 ms swing step asks of the membrane (`swing.ts`, `membraneOf`). */
export interface Membrane {
  lfoHz: number;
  tremolo: number;
  peakHz: number;
  pitchCents: number;
  peakGainDb: number;
  openMix: number;
}

/** The adapter's view of the sound — the seam its tests replace. */
export interface KalimbaOutput {
  /** Whether any recording of this tine's note is decoded yet. */
  canSound(tine: number): boolean;
  /** Sound a tine. Damps the tine first if it still rings. Null if nothing could sound. */
  pluck(tine: number, touch: Touch): Voice | null;
  /** The 30 ms update: LFO, tremolo, resonance, pitch and the open-mix crossfade. */
  membrane(m: Membrane): void;
  /** How many tines are ringing (the swing vibrates harder while any are). */
  sounding(): number;
  dispose(): void;
}

interface LiveLayer {
  layer: KalimbaLayer;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

interface LiveVoice {
  env: GainNode;
  layers: LiveLayer[];
  live: number;
}

/**
 * The experiment's `initAudio` and `play`, on the host's AudioContext.
 *
 *   tine: source(s) ─ gain(crossfade) ─ lowpass ─ lowshelf ─ envelope ─┐
 *   membrane: in ─ tremolo ─ peaking ─ compressor ─ makeup ─ limiter ─ destination
 *   LFO ─┬─ tremolo depth → tremolo.gain
 *        ├─ peak depth    → peaking.frequency
 *        └─ pitch depth   → every source's detune
 *
 * The master chain is built here, not by the host: `InstrumentHost` hands an
 * AudioContext and no output node, so `destination` is the only place to go.
 */
export function createKalimbaAudio(
  ctx: AudioContext,
  sound: KalimbaSound,
  buffer: (file: string) => AudioBuffer | undefined,
): KalimbaOutput {
  const { master, membrane: mem, tone } = sound;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = master.compressor.threshold;
  comp.knee.value = master.compressor.knee;
  comp.ratio.value = master.compressor.ratio;
  comp.attack.value = master.compressor.attack;
  comp.release.value = master.compressor.release;
  const makeup = ctx.createGain();
  makeup.gain.value = master.makeup;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = master.limiter.threshold;
  limit.knee.value = master.limiter.knee;
  limit.ratio.value = master.limiter.ratio;
  limit.attack.value = master.limiter.attack;
  limit.release.value = master.limiter.release;

  // Membran: alle Zungen klingen über sie. Schwenken öffnet ein Vibrato.
  const memIn = ctx.createGain();
  const memTrem = ctx.createGain();
  memTrem.gain.value = 1;
  const memPeak = ctx.createBiquadFilter();
  memPeak.type = 'peaking';
  memPeak.frequency.value = mem.peak.hz;
  memPeak.Q.value = mem.peak.q;
  memPeak.gain.value = 0;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = mem.lfo.hz;
  const lfoTrem = ctx.createGain();
  lfoTrem.gain.value = 0;
  lfo.connect(lfoTrem);
  lfoTrem.connect(memTrem.gain);
  const lfoPeak = ctx.createGain();
  lfoPeak.gain.value = 0;
  lfo.connect(lfoPeak);
  lfoPeak.connect(memPeak.frequency);
  const lfoPitch = ctx.createGain();
  lfoPitch.gain.value = 0;
  lfo.connect(lfoPitch); // goes to every source's detune
  lfo.start();
  memIn.connect(memTrem);
  memTrem.connect(memPeak);
  memPeak.connect(comp);
  comp.connect(makeup);
  makeup.connect(limit);
  limit.connect(ctx.destination);

  const offsets = new WeakMap<AudioBuffer, number>();
  const offsetOf = (b: AudioBuffer): number => {
    let at = offsets.get(b);
    if (at === undefined) {
      at = onsetOffset(b.getChannelData(0), b.sampleRate, sound.onset);
      offsets.set(b, at);
    }
    return at;
  };

  const voices = new Map<number, LiveVoice>();
  let openMix = 0;
  let disposed = false;

  /** Der Daumen stoppt die Zunge: a fast fade, then the sources stop. */
  const damp = (v: LiveVoice, tau: number, stopAfter: number) => {
    const now = ctx.currentTime;
    v.env.gain.cancelScheduledValues(now);
    v.env.gain.setValueAtTime(v.env.gain.value, now);
    v.env.gain.setTargetAtTime(0, now, tau);
    for (const l of v.layers) {
      try { l.src.stop(now + stopAfter); } catch { /* already stopped */ }
    }
  };

  const recordings = (tine: number) => {
    const t = sound.tines[tine];
    if (!t) return [];
    return sound.layers
      .map((layer) => ({ layer, b: buffer(sampleFile(layer, t.src)) }))
      .filter((r): r is { layer: KalimbaLayer; b: AudioBuffer } => r.b !== undefined);
  };

  return {
    canSound: (tine) => !disposed && recordings(tine).length > 0,

    pluck(tine, touch) {
      if (disposed) return null;
      const found = recordings(tine);
      if (found.length === 0) return null;
      const T = sound.tines[tine];
      const now = ctx.currentTime;
      const rate = Math.pow(2, T.semi / 12);
      const old = voices.get(tine);
      if (old) damp(old, tone.damp.tau, tone.damp.stop); // der Daumen stoppt die Zunge, bevor er sie neu anschlägt

      const e = envelopeOf(touch, sound, Math.random());
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = tone.lowpassQ;
      lp.frequency.value = e.lowpass;
      const shelf = ctx.createBiquadFilter();
      shelf.type = 'lowshelf';
      shelf.frequency.value = tone.shelf.hz;
      shelf.gain.value = e.shelf;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(e.level, now + e.attack);
      if (e.release) env.gain.setTargetAtTime(0, now + e.release.at, e.release.tau);
      lp.connect(shelf);
      shelf.connect(env);
      env.connect(memIn);

      const v: LiveVoice = { env, layers: [], live: 0 };
      const mix = crossfade(openMix);
      for (const { layer, b } of found) {
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.playbackRate.value = rate;
        src.detune.value = sound.CENTS[layer][T.src] ?? 0;
        lfoPitch.connect(src.detune);
        const gain = ctx.createGain();
        gain.gain.value = mix[layer];
        src.connect(gain);
        gain.connect(lp);
        src.start(now, offsetOf(b)); // offset in the recording's time, whatever the shift
        if (e.stop !== null) src.stop(now + e.stop);
        src.onended = () => {
          try { lfoPitch.disconnect(src.detune); } catch { /* already gone */ }
          gain.disconnect();
          v.live -= 1;
          if (v.live <= 0) {
            env.disconnect();
            if (voices.get(tine) === v) voices.delete(tine);
          }
        };
        v.layers.push({ layer, src, gain });
        v.live += 1;
      }
      voices.set(tine, v);
      return {
        /* An interrupted answer: the same fade as the thumb's damp, at the
           engine's time constant, stopping after the same multiple of it. */
        fade: (tau) => damp(v, tau, (tau * tone.damp.stop) / tone.damp.tau),
      };
    },

    membrane(m) {
      if (disposed) return;
      const now = ctx.currentTime;
      const d = mem.depth;
      lfo.frequency.setTargetAtTime(m.lfoHz, now, mem.lfo.rateTau);
      lfoTrem.gain.setTargetAtTime(m.tremolo, now, d.tau); // Lautstärke schwingt um bis zu ±55 %
      lfoPeak.gain.setTargetAtTime(m.peakHz, now, d.tau); // Resonanz wandert ±700 Hz
      lfoPitch.gain.setTargetAtTime(m.pitchCents, now, d.tau); // Tonhöhe ±22 Cent
      memPeak.gain.setTargetAtTime(m.peakGainDb, now, d.peakGainTau);
      openMix = m.openMix;
      const mix = crossfade(openMix);
      voices.forEach((v) => v.layers.forEach((l) => l.gain.gain.setTargetAtTime(mix[l.layer], now, mem.crossfadeTau)));
    },

    sounding: () => voices.size,

    dispose() {
      if (disposed) return;
      disposed = true;
      voices.forEach((v) => damp(v, tone.damp.tau, tone.damp.stop));
      voices.clear();
      try { lfo.stop(); } catch { /* never started */ }
      limit.disconnect();
    },
  };
}
