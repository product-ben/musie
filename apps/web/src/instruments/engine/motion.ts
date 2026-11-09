/**
 * The motion sensor: whether it may be read, and what it reads.
 *
 * READINGS, 1:1 from the experiments:
 * - rotation, the kalimba's (`public/experiments/kalimba/261106-1121`,
 *   `onMotion`): the fastest of the three rotation rates ÷ 110 °/s, or —
 *   without a gyroscope — the acceleration's magnitude ÷ 6 m/s², clamped to
 *   0 … 1. The experiment kept the LARGEST value between its 30 ms swing
 *   steps (`rot = Math.max(rot, s)` per event), so `reading()` hands over the
 *   largest rotation since the previous `reading()` — a consuming read, with
 *   one reader, the adapter. When no event arrived in between it repeats the
 *   last one rather than reporting a false 0 (the kalimba takes a max, so a
 *   repeat changes nothing). Decaying it (`rot *= 0.8`) stays the adapter's.
 * - jolt, the marimba's (`public/experiments/marimba/261108-1740`,
 *   `onMotion`): the magnitude of `acceleration` (gravity excluded), raw
 *   m/s², of the latest event; and the same values kept for 1000 ms — the
 *   window its strike strength reads around a touch (`joltsSince`). Raw,
 *   because the marimba scales them against a range it adapts to the hand
 *   (its `RS`). types.ts still says 0 … 1 for `jolt`; the integrator decided
 *   raw (2026-11-09).
 *
 * PERMISSION (Ben, 2026-11-09): asked on the intro step from a button, its
 * state shown — 'granted' | 'denied' | 'prompt' (not asked yet) |
 * 'unavailable'. Safari has `DeviceMotionEvent.requestPermission` and no way
 * to QUERY the permission, so the answer is remembered per device in
 * localStorage, and devicemotion data arriving is taken as granted whatever
 * was stored. Elsewhere there is nothing to ask: data arriving means granted,
 * the Permissions API's 'accelerometer' saying 'denied' means denied (a site
 * setting in Chrome), and no data means 'unavailable' (a desktop).
 *
 * Safari forgets a grant across sessions of the browser, while the stored
 * answer says granted. `rearm()` — called from a gesture — asks again when
 * granted was stored but nothing arrives; Safari then answers without a
 * prompt if it still holds the grant (the experiments asked on the first
 * `touchend` for the same reason).
 *
 * Listening is reference-counted (`listen()` returns its release): the intro
 * step listens while it shows the state, a session while it plays, and the
 * sensor is off between them.
 */
import { browserNow } from './time';

export type MotionPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

/** One `devicemotion` event, reduced to what is read. */
export interface MotionSample {
  at: number;
  acceleration: { x: number | null; y: number | null; z: number | null } | null;
  rotationRate: { alpha: number | null; beta: number | null; gamma: number | null } | null;
}

export interface MotionReading {
  /** 0 … 1 — the kalimba's swing; the largest since the previous read. */
  rotation: number;
  /** m/s² — the marimba's jolt, of the latest event. */
  jolt: number;
  /** The latest event's moment. */
  at: number;
}

export interface Jolt {
  at: number;
  /** m/s², gravity excluded. */
  magnitude: number;
}

export interface MotionEnv {
  /** `typeof DeviceMotionEvent !== 'undefined'`. */
  available: boolean;
  /** Safari's `DeviceMotionEvent.requestPermission`; null where there is none. Call only from a gesture. */
  requestPermission: (() => Promise<string>) | null;
  /** The Permissions API's 'accelerometer' state, where it exists; null where it does not. */
  query: (() => Promise<string | null>) | null;
  listen(onSample: (sample: MotionSample) => void): () => void;
  storage: { get(): string | null; set(value: string): void };
}

export interface MotionSensor {
  permission(): MotionPermission;
  /** Called whenever `permission()` changes. */
  subscribe(listener: (permission: MotionPermission) => void): () => void;
  /** Ask — from the intro step's button, i.e. inside a gesture. Resolves to the new state. */
  ask(): Promise<MotionPermission>;
  /** From a gesture: ask again silently when granted was stored but nothing arrives. */
  rearm(): void;
  /** Start listening; returns the release. */
  listen(): () => void;
  /** The reading since the previous call (see the header); null without permission or before the first event. */
  reading(): MotionReading | null;
  /** Jolts at or after `t`, within the last second. */
  joltsSince(t: number): Jolt[];
}

/** The kalimba's divisors and the marimba's window (`sound.swing`, `sound.strike.window`). */
export const MOTION = { rotationDivisor: 110, accelerationDivisor: 6, historyMs: 1000 } as const;

const STORAGE_KEY = 'musie-motion-permission';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function createMotionSensor(env: MotionEnv): MotionSensor {
  const needsAsk = env.requestPermission !== null;
  const stored = env.storage.get();
  let state: MotionPermission;
  if (!env.available) state = 'unavailable';
  else if (needsAsk) state = stored === 'granted' || stored === 'denied' ? stored : 'prompt';
  else state = stored === 'granted' ? 'granted' : 'unavailable';

  const listeners = new Set<(p: MotionPermission) => void>();
  let flowing = false;
  let latest: MotionReading | null = null;
  /** The largest rotation since the previous `reading()`; null when none arrived. */
  let peak: number | null = null;
  let history: Jolt[] = [];
  let users = 0;
  let unlisten: (() => void) | null = null;
  let asking: Promise<MotionPermission> | null = null;

  const set = (next: MotionPermission, remember: boolean) => {
    if (remember) env.storage.set(next);
    if (next === state) return;
    state = next;
    listeners.forEach((fn) => fn(next));
  };

  if (env.available && !needsAsk && env.query !== null) {
    env.query().then(
      (q) => {
        if (q === 'denied' && !flowing) set('denied', false);
      },
      () => undefined,
    );
  }

  function onSample(s: MotionSample) {
    const a = s.acceleration;
    const r = s.rotationRate;
    const hasAcc = a !== null && a.x !== null;
    const hasRot = r !== null && (r.alpha !== null || r.beta !== null);
    if (!hasAcc && !hasRot) return; // a desktop's empty event is not data
    flowing = true;
    if (state !== 'granted') set('granted', true);
    const m = hasAcc ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0;
    if (hasAcc) {
      history.push({ at: s.at, magnitude: m });
      while (history.length && s.at - history[0].at > MOTION.historyMs) history.shift();
    }
    const rotation = clamp01(
      hasRot
        ? Math.max(Math.abs(r.alpha ?? 0), Math.abs(r.beta ?? 0), Math.abs(r.gamma ?? 0)) / MOTION.rotationDivisor
        : m / MOTION.accelerationDivisor,
    );
    peak = Math.max(peak ?? 0, rotation);
    latest = { rotation, jolt: m, at: s.at };
  }

  function reading(): MotionReading | null {
    if (state !== 'granted' || latest === null) return null;
    const out = { ...latest, rotation: peak ?? latest.rotation };
    peak = null;
    return out;
  }

  function ask(): Promise<MotionPermission> {
    if (!env.available || env.requestPermission === null) return Promise.resolve(state);
    if (asking) return asking;
    asking = env.requestPermission().then(
      (answer) => {
        asking = null;
        set(answer === 'granted' ? 'granted' : 'denied', true);
        return state;
      },
      () => {
        asking = null; // not inside a gesture: nothing was decided
        return state;
      },
    );
    return asking;
  }

  return {
    permission: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ask,
    rearm() {
      if (needsAsk && state === 'granted' && !flowing && asking === null) void ask();
    },
    listen() {
      users += 1;
      if (users === 1 && env.available) unlisten = env.listen(onSample);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        users -= 1;
        if (users > 0) return;
        unlisten?.();
        unlisten = null;
        flowing = false;
        latest = null;
        peak = null;
        history = [];
      };
    },
    reading,
    joltsSince: (t) => (state === 'granted' ? history.filter((h) => h.at >= t).map((h) => ({ ...h })) : []),
  };
}

type SafariMotionEvent = typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };

export function browserMotionEnv(): MotionEnv {
  const DME = typeof DeviceMotionEvent === 'undefined' ? undefined : (DeviceMotionEvent as SafariMotionEvent);
  const request = DME?.requestPermission;
  const permissions = typeof navigator === 'undefined' ? undefined : navigator.permissions;
  return {
    available: DME !== undefined,
    requestPermission: typeof request === 'function' ? () => request.call(DME) : null,
    query: typeof permissions?.query === 'function'
      ? async () => {
          try {
            return (await permissions.query({ name: 'accelerometer' as PermissionName })).state;
          } catch {
            return null; // a browser that does not know the name
          }
        }
      : null,
    listen(onSample) {
      const handler = (e: DeviceMotionEvent) =>
        onSample({ at: browserNow(), acceleration: e.acceleration, rotationRate: e.rotationRate });
      window.addEventListener('devicemotion', handler);
      return () => window.removeEventListener('devicemotion', handler);
    },
    storage: {
      get() {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      },
      set(value) {
        try {
          localStorage.setItem(STORAGE_KEY, value);
        } catch {
          // private browsing: remembered for this page only
        }
      },
    },
  };
}

let shared: MotionSensor | null = null;

/** The page's one sensor — the intro step and the play step share its state. */
export function motionSensor(): MotionSensor {
  shared ??= createMotionSensor(browserMotionEnv());
  return shared;
}
