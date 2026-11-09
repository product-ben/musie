/**
 * The demo note when the focus sheet opens — the harp's `introStrings` /
 * `introCancel` (`public/experiments/harp/261109-0920`), reduced to the
 * contract's one call, `adapter.playDemo()`.
 *
 * It waits until the sound can be heard AND the instrument is ready, polling
 * every 50 ms as the harp does, but never longer than 1500 ms: after that the
 * demo plays anyway (silent if the browser still holds the sound back — the
 * person still SEES where to touch). It plays once.
 *
 * Ben, 2026-11-09: the demo does not start the timer and does not trigger an
 * answer — it never goes through `host.played` — and any own touch cancels it
 * at once. Cancelled before it sounded, it never sounds.
 */
import type { Timers } from './time';

export type OnboardingState = 'idle' | 'waiting' | 'played' | 'cancelled';

export interface OnboardingDeps {
  /** The browser lets the sound out (the host's `audible`). */
  audible: () => boolean;
  /** Settles when the instrument can sound — samples decoded, `adapter.ready()`. A rejection counts as ready: the demo then shows without sound. */
  ready: Promise<unknown>;
  playDemo: () => { degree: number };
  /** The demo sounded — for the screen reader. */
  onDemo?: (meta: { degree: number }) => void;
  now: () => number;
  timers: Timers;
  /** The harp's: 1500 ms at most. */
  maxWaitMs?: number;
  /** The harp's: every 50 ms. */
  pollMs?: number;
}

export interface Onboarding {
  start(): void;
  cancel(): void;
  state(): OnboardingState;
}

export function createOnboarding(deps: OnboardingDeps): Onboarding {
  const maxWaitMs = deps.maxWaitMs ?? 1500;
  const pollMs = deps.pollMs ?? 50;
  let state: OnboardingState = 'idle';
  let isReady = false;
  let timer: number | null = null;
  const settle = () => {
    isReady = true;
  };
  deps.ready.then(settle, settle);

  return {
    start() {
      if (state !== 'idle') return;
      state = 'waiting';
      const t0 = deps.now();
      const go = () => {
        timer = null;
        if (state !== 'waiting') return;
        if ((!deps.audible() || !isReady) && deps.now() - t0 < maxWaitMs) {
          timer = deps.timers.setTimeout(go, pollMs);
          return;
        }
        state = 'played';
        const meta = deps.playDemo();
        deps.onDemo?.(meta);
      };
      go();
    },
    cancel() {
      if (timer !== null) deps.timers.clearTimeout(timer);
      timer = null;
      if (state === 'idle' || state === 'waiting') state = 'cancelled';
    },
    state: () => state,
  };
}
