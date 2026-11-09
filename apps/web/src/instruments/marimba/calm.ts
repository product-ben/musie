/**
 * „Ruhiger gespielt“: longer and more even gaps between the person's strokes
 * slowly soften the sound (the master's warm lowpass) and warm the ground.
 * No number, no display. Playing faster again only slowly undoes it; pauses
 * change nothing; a roll is one long note, not a tempo.
 *
 * Source: the experiment's `calmNote` and its 100 ms `setInterval`. Here the
 * interval is the host's `tick(now)`, which is called "every ~100 ms" — so a
 * step is scaled by the time that really passed, and is exactly the
 * experiment's step when it was 100 ms.
 */
import type { CalmConfig } from './sound';
import { clamp } from './strike';

export interface CalmState {
  /** What the sound and the ground show, 0 … 1; moves toward `target`. */
  calm: number;
  target: number;
  /** Smoothed slowness of the gaps, 0 … 1. */
  slow: number;
  /** Smoothed deviation between neighbouring gaps (|log ratio|). */
  deviation: number;
  lastGap: number;
  lastAt: number | null;
}

export function calmStart(cfg: CalmConfig): CalmState {
  return { calm: 0, target: 0, slow: 0, deviation: cfg.deviationStart, lastGap: 0, lastAt: null };
}

/** `calmNote`: one of the person's strokes, at `now`. */
export function calmNote(s: CalmState, now: number, roll: boolean, cfg: CalmConfig): void {
  if (roll) return;
  if (s.lastAt !== null) {
    const gap = now - s.lastAt;
    if (gap < cfg.maxGapMs) {
      s.slow += (clamp((gap - cfg.gapFloorMs) / cfg.gapSpanMs, 0, 1) - s.slow) * cfg.smooth;
      if (s.lastGap) s.deviation += (Math.abs(Math.log(gap / s.lastGap)) - s.deviation) * cfg.smooth;
      s.lastGap = gap;
    } else s.lastGap = 0;
  }
  s.lastAt = now;
  s.target = s.slow * (cfg.slowShare + cfg.evenShare * clamp(1 - s.deviation / cfg.deviationMax, 0, 1));
}

/**
 * The interval's body: `calm` moves toward `target` — up in about
 * `riseSeconds`, back in about `fallSeconds`. `steps` is elapsed time in
 * `tickMs` units (1 = the experiment's interval). True when calm moved.
 */
export function calmStep(s: CalmState, cfg: CalmConfig, steps = 1): boolean {
  const d = s.target - s.calm;
  if (Math.abs(d) < cfg.epsilon) return false;
  const rate = cfg.step / (d > 0 ? cfg.riseSeconds : cfg.fallSeconds);
  s.calm = s.target - d * Math.pow(1 - rate, steps);
  return true;
}
