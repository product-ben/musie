/**
 * „Schwenken → Vibrato“: the experiment's 30 ms step, as pure functions.
 *
 * The experiment folds every `devicemotion` event into `rot` (the largest
 * reading since the last step), and every 30 ms lets `rot` decay, moves the
 * swing envelope towards it — fast up, slow down — and hands the membrane its
 * depth. The host's `motion()` is that reading already scaled to 0 … 1
 * (rotation rate ÷ 110, or acceleration ÷ 6 without a gyroscope); null when
 * there is no permission or no sensor, and then the swing is simply 0.
 */
import type { KalimbaSound, Membrane } from './sound';
import { clamp } from './sound';

export interface SwingState {
  /** The largest recent reading, decaying (`rot`). */
  rot: number;
  /** The swing envelope, 0 … 1 (`swingEnv`). */
  env: number;
  /** Timestamp of the last reading folded in, so one reading counts once. */
  seen: number | null;
}

export const SWING_AT_REST: SwingState = { rot: 0, env: 0, seen: null };

/**
 * One 30 ms step. `reading` is the host's latest motion reading or null;
 * `held` is the desktop's V key, which swings fully.
 */
export function swingStep(
  s: SwingState,
  reading: { rotation: number; at: number } | null,
  held: boolean,
  cfg: KalimbaSound['swing'],
): SwingState {
  let { rot, seen } = s;
  if (reading && reading.at !== seen) {
    rot = Math.max(rot, clamp(reading.rotation, 0, 1));
    seen = reading.at;
  }
  const target = held ? 1 : rot;
  rot *= cfg.rotDecay; // die letzte Bewegung klingt ab
  let env = s.env + (target - s.env) * (target > s.env ? cfg.rise : cfg.fall); // schnell an, langsam aus
  if (env < cfg.floor) env = 0;
  return { rot, env, seen };
}

/** The swing envelope at the experiment's default strength (`e`). */
export const swingDepth = (env: number, sound: KalimbaSound): number => env * sound.DEFAULTS.swing;

/** What the membrane is set to for a given swing envelope. */
export function membraneOf(env: number, sound: KalimbaSound): Membrane {
  const e = swingDepth(env, sound);
  const { lfo, depth, openMixFactor } = sound.membrane;
  return {
    lfoHz: lfo.baseHz + lfo.swingHz * env,
    tremolo: depth.tremolo * e,
    peakHz: depth.peakHz * e,
    pitchCents: depth.pitchCents * e,
    peakGainDb: depth.peakGainDb * e,
    openMix: Math.min(1, e * openMixFactor),
  };
}

/**
 * Android: the phone vibrates with the swing, harder while tines ring.
 * Milliseconds, or null below the threshold. The caller keeps `everyMs`.
 */
export function swingHaptic(e: number, sounding: boolean, h: KalimbaSound['haptics']['swing']): number | null {
  if (e <= h.threshold) return null;
  return Math.round(h.baseMs + h.spanMs * e * (sounding ? 1 : h.idleFactor));
}
